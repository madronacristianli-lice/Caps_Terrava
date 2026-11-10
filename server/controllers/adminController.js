const db = require('../models');
const { Op } = require('sequelize');
const { hashPassword } = require('../utils/password');

const BRANCHES = ['Main Tagum', 'Panabo', 'Sto. Tomas', 'Davao City', 'Mati City', 'Digos City'];

const validatePassword = (password) => {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Password must contain at least one number or special character';
  return '';
};

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
  photo_url: user.photo_url,
  archived: user.archived,
  created_at: user.created_at,
  updated_at: user.updated_at
});

exports.createSeller = async (req, res) => {
  try {
    const {
      email, password, first_name, middle_name, last_name, extension_name,
      phone, phone2, birthdate, address, occupation, branch,
      spouse_first_name, spouse_middle_name, spouse_last_name, spouse_extension_name,
      spouse_email, spouse_phone, spouse_occupation
    } = req.body;

    if (!first_name?.trim() || !last_name?.trim() || !email?.trim() || !phone?.trim() || !birthdate || !address?.trim() || !occupation?.trim()) {
      return res.status(400).json({ error: 'Complete the required seller profile fields.' });
    }
    if (!BRANCHES.includes(branch)) return res.status(400).json({ error: 'Select a valid branch assignment.' });

    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.User.findOne({ where: { email: normalizedEmail } });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const full_name = [first_name, middle_name, last_name, extension_name].filter(Boolean).join(' ');
    const seller = await db.User.create({
      email: normalizedEmail,
      password_hash: await hashPassword(password),
      full_name,
      first_name: first_name.trim(),
      middle_name: middle_name?.trim() || null,
      last_name: last_name.trim(),
      extension_name: extension_name?.trim() || null,
      role: 'seller',
      branch,
      phone: phone.trim(),
      phone2: phone2?.trim() || null,
      birthdate,
      address: address.trim(),
      occupation: occupation.trim(),
      spouse_first_name: spouse_first_name?.trim() || null,
      spouse_middle_name: spouse_middle_name?.trim() || null,
      spouse_last_name: spouse_last_name?.trim() || null,
      spouse_extension_name: spouse_extension_name?.trim() || null,
      spouse_email: spouse_email?.trim().toLowerCase() || null,
      spouse_phone: spouse_phone?.trim() || null,
      spouse_occupation: spouse_occupation?.trim() || null
    });

    res.status(201).json({ user: formatUser(seller) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'buyer') {
      return res.status(403).json({ error: 'Buyer profiles cannot be edited by an administrator.' });
    }
    if (user.role === 'admin' && req.user.id !== user.id) {
      return res.status(403).json({ error: 'Only the admin can update their own profile.' });
    }

    const {
      first_name, middle_name, last_name, extension_name,
      phone, phone2, birthdate, address, occupation, branch,
      spouse_first_name, spouse_middle_name, spouse_last_name, spouse_extension_name,
      spouse_email, spouse_phone, spouse_occupation
    } = req.body;

    const full_name = [first_name, middle_name, last_name, extension_name].filter(Boolean).join(' ') || user.full_name;

    await user.update({
      full_name,
      first_name: first_name?.trim() || user.first_name,
      middle_name: middle_name?.trim() || null,
      last_name: last_name?.trim() || user.last_name,
      extension_name: extension_name?.trim() || null,
      phone: phone?.trim() || user.phone,
      phone2: phone2?.trim() || null,
      birthdate: birthdate || user.birthdate,
      address: address?.trim() || user.address,
      occupation: occupation?.trim() || user.occupation,
      branch: branch || user.branch,
      spouse_first_name: spouse_first_name?.trim() || null,
      spouse_middle_name: spouse_middle_name?.trim() || null,
      spouse_last_name: spouse_last_name?.trim() || null,
      spouse_extension_name: spouse_extension_name?.trim() || null,
      spouse_email: spouse_email?.trim().toLowerCase() || null,
      spouse_phone: spouse_phone?.trim() || null,
      spouse_occupation: spouse_occupation?.trim() || null
    });

    res.json({ user: formatUser(user) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const where = req.query.role ? { role: req.query.role } : {};
    if (req.query.archived === 'true') {
      where.archived = true;
    } else if (req.query.archived === 'false' || !('archived' in req.query)) {
      where.archived = false;
    }
    const users = await db.User.findAll({
      where,
      attributes: [
        'id', 'email', 'full_name', 'role', 'phone', 'phone2', 'birthdate', 'address', 'branch', 'occupation',
        'first_name', 'middle_name', 'last_name', 'extension_name',
        'spouse_first_name', 'spouse_middle_name', 'spouse_last_name', 'spouse_extension_name',
        'spouse_email', 'spouse_phone', 'spouse_occupation', 'photo_url', 'archived', 'created_at'
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBuyers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { role: 'buyer' };
    if (search) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    const buyers = await db.User.findAll({
      where,
      attributes: [
        'id', 'email', 'full_name', 'role', 'phone', 'created_at',
        'first_name', 'middle_name', 'last_name', 'extension_name',
        'phone2', 'birthdate', 'address', 'photo_url'
      ],
      order: [['full_name', 'ASC']]
    });
    res.json(buyers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.archiveUser = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(403).json({ error: 'Cannot archive admin accounts' });
    await user.update({ archived: true });
    res.json({ message: 'User archived' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.restoreUser = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.update({ archived: false });
    res.json({ message: 'User restored' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const user = await db.User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.update({ role: req.body.role });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const [users, listings, transactions, inquiries] = await Promise.all([
      db.User.count(),
      db.LandListing.count(),
      db.Transaction.count(),
      db.Inquiry.count()
    ]);

    const totalSales = await db.Transaction.sum('amount', { where: { status: 'verified' } }) || 0;
    const pendingListings = await db.LandListing.count({ where: { is_verified: false } });

    res.json({
      users,
      listings,
      verifiedListings: await db.LandListing.count({ where: { is_verified: true } }),
      pendingListings,
      transactions,
      totalSales,
      inquiries
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSalesReport = async (req, res) => {
  try {
    const transactions = await db.Transaction.findAll({
      where: { status: 'verified' },
      include: [
        { model: db.LandListing, as: 'listing', attributes: ['id', 'title'] },
        { model: db.User, as: 'buyer', attributes: ['id', 'full_name', 'photo_url'] },
        { model: db.User, as: 'seller', attributes: ['id', 'full_name', 'photo_url'] }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.archiveListing = async (req, res) => {
  try {
    const listing = await db.LandListing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    await listing.update({ archived: true });
    res.json({ message: 'Listing archived' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.restoreListing = async (req, res) => {
  try {
    const listing = await db.LandListing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    await listing.update({ archived: false });
    res.json({ message: 'Listing restored' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
