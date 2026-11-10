const express = require('express');
const router = express.Router();
const { register, verifyRegistration, resendRegistrationOtp, login, googleAuth, me, updateProfile, changePassword, unlockBlockchainLedger, uploadProfilePhoto, removeProfilePhoto } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.post('/register', register);
router.post('/register/verify', verifyRegistration);
router.post('/register/resend', resendRegistrationOtp);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authenticate, me);
router.post('/blockchain-ledger/unlock', authenticate, unlockBlockchainLedger);
router.put('/profile', authenticate, updateProfile);
router.post('/profile/photo', authenticate, upload.single('photo'), uploadProfilePhoto);
router.delete('/profile/photo', authenticate, removeProfilePhoto);
router.put('/password', authenticate, changePassword);

module.exports = router;
