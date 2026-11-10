const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { create, getAll, getById, update, remove, assignBuyer, unassignBuyer, getAssigned } = require('../controllers/listingController');

const optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

router.post('/', authenticate, authorize('seller', 'admin'), upload.array('photos', 10), create);
router.get('/', optionalAuth, getAll);
router.get('/assigned/me', authenticate, getAssigned);
router.get('/:id', optionalAuth, getById);
router.put('/:id', authenticate, authorize('seller', 'admin'), upload.array('photos', 10), update);
router.delete('/:id', authenticate, authorize('seller', 'admin'), remove);
router.post('/:id/assign', authenticate, authorize('seller', 'admin'), assignBuyer);
router.delete('/:id/assign', authenticate, authorize('seller', 'admin'), unassignBuyer);

module.exports = router;
