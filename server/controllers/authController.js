const db = require('../models');
const fs = require('fs');
const path = require('path');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken, generateLedgerToken } = require('../utils/jwt');
const crypto = require('crypto');
const { sendOtpSms } = require('../services/textbee');
const { OAuth2Client } = require('google-auth-library');

const PROFILE_FIELDS = ['id', 'email', 'full_name', 'first_name', 'middle_name', 'last_name',
  'extension_name', 'role', 'phone', 'phone2', 'birthdate', 'address', 'branch',
  'occupation', 'spouse_first_name', 'spouse_middle_name', 'spouse_last_name',
  'spouse_extension_name', 'spouse_email', 'spouse_phone', 'spouse_occupation', 'photo_url'];

const computeAge = (birthdate) => {
  if (!birthdate) return null;
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
};

const formatUser = (user) => ({
  id: user.id,
  email: user.email,
  full_name: user.full_name,
  first_name: user.first_name,
  middle_name: user.middle_name,
  last_name: user.last_name,
  extension_name: user.extension_name,
  role: user.role,
  phone: user.phone,
  phone2: user.phone2,
  birthdate: user.birthdate,
  age: computeAge(user.birthdate),
  address: user.address,
  branch: user.branch,
  occupation: user.occupation,
  spouse_first_name: user.spouse_first_name,
  spouse_middle_name: user.spouse_middle_name,
  spouse_last_name: user.spouse_last_name,
  spouse_extension_name: user.spouse_extension_name,
  spouse_email: user.spouse_email,
  spouse_phone: user.spouse_phone,
  spouse_occupation: user.spouse_occupation,
  photo_url: user.photo_url
});

const validatePassword = (pwd) => {
  if (!pwd || pwd.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pwd)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return 'Password must contain at least one number or special character';
  return '';
};

const otpHash = (code) => crypto.createHash('sha256').update(`${code}:${process.env.JWT_SECRET}`).digest('hex');
const normalizePhone = (phone) => {
  const raw = String(phone || '').replace(/[\s()-]/g, '');
  if (raw.startsWith('+63')) return `+63${raw.slice(3).replace(/\D/g, '')}`;
  if (raw.startsWith('0063')) return `+63${raw.slice(4).replace(/\D/g, '')}`;
  if (raw.startsWith('0')) return `+63${raw.slice(1).replace(/\D/g, '')}`;
  if (raw.startsWith('9')) return `+63${raw.replace(/\D/g, '')}`;
  return raw;
};

const createPendingOtp = async (req) => {
  const { email, password, full_name, first_name, middle_name, last_name,
    extension_name, phone, phone2, birthdate, address, occupation,
    spouse_first_name, spouse_middle_name, spouse_last_name, spouse_extension_name,
    spouse_email, spouse_phone, spouse_occupation } = req.body;
  if (!email || !phone || !full_name) throw new Error('Name, email, and phone are required');
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPhone = normalizePhone(phone);
  if (!/^\+\d{10,15}$/.test(normalizedPhone)) throw new Error('Use an international phone number, e.g. +639171234567');
  const existing = await db.User.findOne({ where: { email: normalizedEmail } });
  if (existing) throw new Error('Email already registered');
  const password_hash = await hashPassword(password);
  const code = String(crypto.randomInt(100000, 1000000));
  const existingOtp = await db.OtpVerification.findOne({ where: { email: normalizedEmail } });
  const payload = { email: normalizedEmail, password_hash, full_name, first_name, middle_name, last_name,
    extension_name, phone: normalizedPhone, phone2, birthdate, address, occupation,
    spouse_first_name, spouse_middle_name, spouse_last_name, spouse_extension_name,
    spouse_email, spouse_phone, spouse_occupation };
  const values = { phone: normalizedPhone, email: normalizedEmail, code_hash: otpHash(code), payload,
    expires_at: new Date(Date.now() + 5 * 60 * 1000), attempts: 0, last_sent_at: new Date() };
  if (existingOtp) await existingOtp.update(values); else await db.OtpVerification.create(values);
  await sendOtpSms(normalizedPhone, code);
};

exports.register = async (req, res) => {
  try {
    const { email, password, full_name, first_name, middle_name, last_name,
      extension_name, phone, phone2, birthdate, address, occupation,
      spouse_first_name, spouse_middle_name, spouse_last_name, spouse_extension_name,
      spouse_email, spouse_phone, spouse_occupation } = req.body;

    const pwdError = validatePassword(password);
    if (pwdError) return res.status(400).json({ error: pwdError });

    await createPendingOtp(req);
    res.status(202).json({ message: 'Verification code sent', phone: normalizePhone(phone) });
  } catch (error) {
    res.status(error.message.includes('TextBee') ? 502 : 400).json({ error: error.message });
  }
};

exports.verifyRegistration = async (req, res) => {
  try {
    const { email, code } = req.body;
    const pending = await db.OtpVerification.findOne({ where: { email: String(email || '').trim().toLowerCase() } });
    if (!pending) return res.status(400).json({ error: 'No pending verification found' });
    if (new Date(pending.expires_at) < new Date()) return res.status(400).json({ error: 'OTP expired. Request a new code.' });
    if (pending.attempts >= 5) return res.status(429).json({ error: 'Too many attempts. Request a new code.' });
    if (otpHash(String(code || '').trim()) !== pending.code_hash) {
      await pending.increment('attempts');
      return res.status(400).json({ error: 'Incorrect OTP' });
    }
    const user = await db.User.create({ ...pending.payload, role: 'buyer' });
    await pending.destroy();
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    res.json({ user: formatUser(user), token });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.resendRegistrationOtp = async (req, res) => {
  try {
    const pending = await db.OtpVerification.findOne({ where: { email: String(req.body.email || '').trim().toLowerCase() } });
    if (!pending) return res.status(404).json({ error: 'No pending verification found' });
    if (Date.now() - new Date(pending.last_sent_at).getTime() < 60000) return res.status(429).json({ error: 'Please wait 60 seconds before requesting another code' });
    const code = String(crypto.randomInt(100000, 1000000));
    await pending.update({ code_hash: otpHash(code), expires_at: new Date(Date.now() + 5 * 60 * 1000), attempts: 0, last_sent_at: new Date() });
    await sendOtpSms(pending.phone, code);
    res.json({ message: 'Verification code resent' });
  } catch (error) { res.status(502).json({ error: error.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const user = await db.User.findOne({ where: { email: normalizedEmail } });
    if (!user || !user.password_hash || !(await comparePassword(password, user.password_hash))) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    res.json({ user: formatUser(user), token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

exports.googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google credential is required' });
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'Google sign-in is not configured' });

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload) return res.status(400).json({ error: 'Invalid Google token' });

    const { sub: google_id, email, name: full_name, given_name: first_name, family_name: last_name, picture } = payload;
    if (!email) return res.status(400).json({ error: 'Google account email is required' });

    let user = await db.User.findOne({ where: { google_id } }) || await db.User.findOne({ where: { email } });

    if (user) {
      if (!user.google_id) {
        await user.update({ google_id, auth_provider: 'google', photo_url: picture || user.photo_url });
      }
    } else {
      user = await db.User.create({
        email,
        google_id,
        auth_provider: 'google',
        full_name,
        first_name,
        last_name,
        photo_url: picture || null,
        role: 'buyer'
      });
    }

    const token = generateToken({ id: user.id, email: user.email, role: user.role });
    res.json({ user: formatUser(user), token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.unlockBlockchainLedger = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password is required' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const valid = await comparePassword(password, req.user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Incorrect password' });

    const ledgerToken = generateLedgerToken({ id: req.user.id, email: req.user.email, role: req.user.role });
    res.json({ ledgerToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.me = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    res.json({ user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both current and new password are required' });
    const valid = await comparePassword(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const pwdError = validatePassword(new_password);
    if (pwdError) return res.status(400).json({ error: pwdError });
    const password_hash = await hashPassword(new_password);
    await user.update({ password_hash });
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { full_name, first_name, middle_name, last_name, extension_name,
      phone, phone2, birthdate, address, occupation,
      spouse_first_name, spouse_middle_name, spouse_last_name, spouse_extension_name,
      spouse_email, spouse_phone, spouse_occupation } = req.body;
    await user.update({ full_name, first_name, middle_name, last_name,
      extension_name, phone, phone2, birthdate, address, occupation,
      spouse_first_name, spouse_middle_name, spouse_last_name, spouse_extension_name,
      spouse_email, spouse_phone, spouse_occupation });
    res.json({ user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteOldPhoto = (photoUrl) => {
  if (!photoUrl) return;
  const fileName = path.basename(photoUrl);
  const filePath = path.join(__dirname, '..', 'uploads', fileName);
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Failed to delete old profile photo:', err);
  }
};

exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    deleteOldPhoto(user.photo_url);
    const photoUrl = `/uploads/${req.file.filename}`;
    await user.update({ photo_url: photoUrl });
    res.json({ user: formatUser(user), photo_url: photoUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeProfilePhoto = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    deleteOldPhoto(user.photo_url);
    await user.update({ photo_url: null });
    res.json({ user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
