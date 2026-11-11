const db = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('./notificationController');
const { buildPhotoGeotags } = require('../utils/exif');
const { persistUploadedFiles } = require('../services/storage');

const getUploadUrls = (files, folder = 'listings') => persistUploadedFiles(files, folder);

const parseOptionalJson = (value, field) => {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    const error = new Error(`${field} must be valid JSON`);
    error.statusCode = 400;
    throw error;
  }
};

const valueOrCurrent = (currentValue, ...values) => {
  const value = values.find((item) => item !== undefined && item !== null && item !== '');
  return value === undefined ? currentValue : value;
};

const notifyAdmins = async ({ title, message, type = 'system', data = null }) => {
  try {
    const admins = await db.User.findAll({ where: { role: 'admin' }, attributes: ['id'] });
    await Promise.all(
      admins.map((admin) => createNotification({ user_id: admin.id, title, message, type, data }))
    );
  } catch (err) {
    console.error('Failed to notify admins:', err);
  }
};

const canManageListing = async (listing, user) => {
  if (!listing || !user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'seller') return false;
  // Listings are shared across seller branches. Any authenticated seller may
  // coordinate the buyer or submit an edit; seller edits are still reset to
  // pending review below and require administrator verification before public use.
  return true;
};

exports.create = async (req, res) => {
  try {
    const {
      title, description, price, area_sqm, location_text, polygon_geojson,
      zoning_classification, land_title_status, total_contract_price, reservation_fee,
      minimum_down_payment_pct, cash_term_enabled, cash_term_discount_pct,
      in_house_financing_enabled, in_house_max_term_years, in_house_interest_rate_pct,
      bank_government_loan_enabled, penalty_rate_pct, monthly_payment_amount, terrain_topography, lot_configuration,
      lot_block_number, extra_data
    } = req.body;
    const seller = await db.User.findByPk(req.user.id, { attributes: ['id', 'branch'] });
    const parsedExtras = parseOptionalJson(extra_data, 'extra_data') || {};
    const parsedPolygon = parseOptionalJson(polygon_geojson, 'polygon_geojson');
    const coordinates = parsedPolygon?.coordinates?.[0];

    if (parsedPolygon && (
      parsedPolygon.type !== 'Polygon' ||
      !Array.isArray(coordinates) ||
      coordinates.length < 4 ||
      !coordinates.every((point) => Array.isArray(point) && point.length >= 2 && point.every(Number.isFinite))
    )) {
      return res.status(400).json({ error: 'polygon_geojson must be a valid Polygon with at least 3 coordinate points' });
    }

    const parsedUtilities = parsedExtras.utilities || {};

    if (!title?.trim() || price === undefined || price === '' || area_sqm === undefined || area_sqm === '' || !location_text?.trim()) {
      return res.status(400).json({ error: 'Title, contract price, area, and location are required.' });
    }

    const photoUrls = req.files ? await getUploadUrls(req.files) : [];
    const photoGeotags = req.files ? await buildPhotoGeotags(req.files, photoUrls) : [];

    const listing = await db.LandListing.create({
      seller_id: req.user.id,
      title: title.trim(),
      description: valueOrCurrent(null, description),
      price: valueOrCurrent(null, price),
      area_sqm: valueOrCurrent(null, area_sqm),
      location_text: location_text.trim(),
      branch: seller?.branch || req.body.branch || 'Main Tagum',
      polygon_geojson: parsedPolygon,
      photos: photoUrls,
      photo_geotags: photoGeotags,
      zoning_classification: valueOrCurrent(null, zoning_classification, parsedExtras.zoning_classification),
      land_title_status: valueOrCurrent(null, land_title_status, parsedExtras.land_title_status),
      total_contract_price: valueOrCurrent(null, total_contract_price, parsedExtras.total_contract_price),
      reservation_fee: valueOrCurrent(null, reservation_fee, parsedExtras.reservation_fee),
      minimum_down_payment_pct: valueOrCurrent(null, minimum_down_payment_pct, parsedExtras.minimum_down_payment_pct),
      cash_term_enabled: cash_term_enabled === 'true' || cash_term_enabled === true || parsedExtras.cash_term_enabled || false,
      cash_term_discount_pct: valueOrCurrent(null, cash_term_discount_pct, parsedExtras.cash_term_discount_pct),
      in_house_financing_enabled: in_house_financing_enabled === 'true' || in_house_financing_enabled === true || parsedExtras.in_house_financing_enabled || false,
      in_house_max_term_years: valueOrCurrent(null, in_house_max_term_years, parsedExtras.in_house_max_term_years),
      in_house_interest_rate_pct: valueOrCurrent(null, in_house_interest_rate_pct, parsedExtras.in_house_interest_rate_pct),
      bank_government_loan_enabled: bank_government_loan_enabled === 'true' || bank_government_loan_enabled === true || parsedExtras.bank_government_loan_enabled || false,
      penalty_rate_pct: valueOrCurrent(null, penalty_rate_pct, parsedExtras.penalty_rate_pct),
      monthly_payment_amount: valueOrCurrent(null, monthly_payment_amount, parsedExtras.monthly_payment_amount),
      terrain_topography: valueOrCurrent(null, terrain_topography, parsedExtras.terrain_topography),
      lot_configuration: valueOrCurrent(null, lot_configuration, parsedExtras.lot_configuration),
      utilities: Object.keys(parsedUtilities).length > 0 ? parsedUtilities : {},
      lot_block_number: valueOrCurrent(null, lot_block_number, parsedExtras.lot_block_number)
    });

    // Notify admins about new listing pending verification
    await notifyAdmins({
      title: 'New Listing Pending Verification',
      message: `Seller ${req.user.full_name || req.user.email} created "${title}" in ${listing.branch}. Review and verify the listing.`,
      type: 'listing',
      data: { listing_id: listing.id, seller_id: req.user.id }
    });

    res.json(listing);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const isAdmin = req.user && req.user.role === 'admin';
    const isSeller = req.user && req.user.role === 'seller';
    let where = { is_verified: true };
    if (req.query.all === 'true' && (isAdmin || isSeller)) where = {};

    if (!isAdmin) {
      where.archived = false;
    } else if (req.query.archived === 'true') {
      where.archived = true;
    } else if (req.query.archived === 'false') {
      where.archived = false;
    } else if (req.query.archived !== 'all') {
      where.archived = false;
    }

    const listings = await db.LandListing.findAll({
      where,
      include: [
        { model: db.User, as: 'seller', attributes: ['id', 'full_name', 'email', 'phone', 'branch', 'photo_url'] },
        { model: db.User, as: 'assignedBuyer', attributes: ['id', 'full_name', 'email', 'phone', 'photo_url'] },
        { model: db.InstallmentAccount, as: 'installmentAccounts', required: false, where: { status: { [Op.notIn]: ['defaulted'] } } }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAssigned = async (req, res) => {
  try {
    const listings = await db.LandListing.findAll({
      where: { assigned_buyer_id: req.user.id, archived: false },
      include: [
        { model: db.User, as: 'seller', attributes: ['id', 'full_name', 'email', 'phone', 'photo_url'] },
        { model: db.User, as: 'assignedBuyer', attributes: ['id', 'full_name', 'email', 'phone', 'photo_url'] },
        { model: db.Transaction, as: 'transactions', attributes: ['id', 'amount', 'status', 'payment_method', 'reference_number', 'created_at'] },
        { model: db.InstallmentAccount, as: 'installmentAccounts', required: false, where: { status: { [Op.notIn]: ['defaulted'] } } }
      ],
      order: [['created_at', 'DESC']]
    });
    res.json(listings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assignBuyer = async (req, res) => {
  try {
    const listing = await db.LandListing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!(await canManageListing(listing, req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { buyer_id } = req.body;
    const buyer = await db.User.findByPk(buyer_id);
    if (!buyer || buyer.role !== 'buyer') {
      return res.status(400).json({ error: 'Invalid buyer' });
    }
    await listing.update({ assigned_buyer_id: buyer_id, status: 'reserved' });
    res.json({ message: 'Listing assigned to buyer', listing });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.unassignBuyer = async (req, res) => {
  try {
    const listing = await db.LandListing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!(await canManageListing(listing, req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await listing.update({ assigned_buyer_id: null, status: 'available' });
    res.json({ message: 'Buyer unassigned, listing reset to available' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const listing = await db.LandListing.findByPk(req.params.id, {
      include: [
        { model: db.User, as: 'seller', attributes: ['id', 'full_name', 'email', 'phone', 'branch', 'photo_url'] },
        { model: db.User, as: 'assignedBuyer', attributes: ['id', 'full_name', 'email', 'phone', 'phone2', 'birthdate', 'address', 'photo_url'] }
      ]
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    const isAdmin = req.user && req.user.role === 'admin';
    const isSeller = req.user && req.user.role === 'seller';
    if (listing.archived && !isAdmin) return res.status(404).json({ error: 'Listing not found' });
    if (!listing.is_verified && !isAdmin && !isSeller) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const listing = await db.LandListing.findByPk(req.params.id, {
      include: [{ model: db.Transaction, as: 'transactions', attributes: ['id'] }]
    });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!(await canManageListing(listing, req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (listing.transactions && listing.transactions.length > 0) {
      return res.status(400).json({ error: 'This listing cannot be edited because payments have already been recorded.' });
    }

    const {
      title, description, price, area_sqm, location_text, polygon_geojson, status, is_verified,
      zoning_classification, land_title_status, total_contract_price, reservation_fee,
      minimum_down_payment_pct, cash_term_enabled, cash_term_discount_pct,
      in_house_financing_enabled, in_house_max_term_years, in_house_interest_rate_pct,
      bank_government_loan_enabled, penalty_rate_pct, monthly_payment_amount, terrain_topography, lot_configuration,
      lot_block_number, extra_data
    } = req.body;
    const seller = await db.User.findByPk(req.user.id, { attributes: ['id', 'branch'] });
    const parsedExtras = parseOptionalJson(extra_data, 'extra_data') || {};
    const parsedUtilities = parsedExtras.utilities || {};

    const updates = {
      title: valueOrCurrent(listing.title, title),
      description: valueOrCurrent(listing.description, description),
      price: valueOrCurrent(listing.price, price),
      area_sqm: valueOrCurrent(listing.area_sqm, area_sqm),
      location_text: valueOrCurrent(listing.location_text, location_text),
      branch: seller?.branch || listing.branch,
      status: valueOrCurrent(listing.status, status),
      zoning_classification: valueOrCurrent(listing.zoning_classification, zoning_classification, parsedExtras.zoning_classification),
      land_title_status: valueOrCurrent(listing.land_title_status, land_title_status, parsedExtras.land_title_status),
      total_contract_price: valueOrCurrent(listing.total_contract_price, total_contract_price, parsedExtras.total_contract_price),
      reservation_fee: valueOrCurrent(listing.reservation_fee, reservation_fee, parsedExtras.reservation_fee),
      minimum_down_payment_pct: valueOrCurrent(listing.minimum_down_payment_pct, minimum_down_payment_pct, parsedExtras.minimum_down_payment_pct),
      cash_term_enabled: cash_term_enabled !== undefined ? cash_term_enabled === 'true' || cash_term_enabled === true : valueOrCurrent(listing.cash_term_enabled, parsedExtras.cash_term_enabled),
      cash_term_discount_pct: valueOrCurrent(listing.cash_term_discount_pct, cash_term_discount_pct, parsedExtras.cash_term_discount_pct),
      in_house_financing_enabled: in_house_financing_enabled !== undefined ? in_house_financing_enabled === 'true' || in_house_financing_enabled === true : valueOrCurrent(listing.in_house_financing_enabled, parsedExtras.in_house_financing_enabled),
      in_house_max_term_years: valueOrCurrent(listing.in_house_max_term_years, in_house_max_term_years, parsedExtras.in_house_max_term_years),
      in_house_interest_rate_pct: valueOrCurrent(listing.in_house_interest_rate_pct, in_house_interest_rate_pct, parsedExtras.in_house_interest_rate_pct),
      bank_government_loan_enabled: bank_government_loan_enabled !== undefined ? bank_government_loan_enabled === 'true' || bank_government_loan_enabled === true : valueOrCurrent(listing.bank_government_loan_enabled, parsedExtras.bank_government_loan_enabled),
      penalty_rate_pct: valueOrCurrent(listing.penalty_rate_pct, penalty_rate_pct, parsedExtras.penalty_rate_pct),
      monthly_payment_amount: valueOrCurrent(listing.monthly_payment_amount, monthly_payment_amount, parsedExtras.monthly_payment_amount),
      terrain_topography: valueOrCurrent(listing.terrain_topography, terrain_topography, parsedExtras.terrain_topography),
      lot_configuration: valueOrCurrent(listing.lot_configuration, lot_configuration, parsedExtras.lot_configuration),
      utilities: Object.keys(parsedUtilities).length > 0 ? parsedUtilities : listing.utilities,
      lot_block_number: valueOrCurrent(listing.lot_block_number, lot_block_number, parsedExtras.lot_block_number)
    };
    if (polygon_geojson) updates.polygon_geojson = parseOptionalJson(polygon_geojson, 'polygon_geojson');

    const wasVerified = listing.is_verified;
    const isAdminVerifying = is_verified !== undefined && req.user.role === 'admin' && String(is_verified) === 'true' && !wasVerified;
    if (isAdminVerifying) updates.is_verified = true;
    if (req.user.role === 'seller') updates.is_verified = false;

    // Merge existing photos with new uploads and removals
    let photos = listing.photos || [];
    let photoGeotags = listing.photo_geotags || [];
    if (req.body.removed_existing_photos) {
      const removed = parseOptionalJson(req.body.removed_existing_photos, 'removed_existing_photos') || [];
      photos = photos.filter((url) => !removed.includes(url));
      photoGeotags = photoGeotags.filter((tag) => !removed.includes(tag.url));
    }
    if (req.files && req.files.length > 0) {
      const newPhotoUrls = await getUploadUrls(req.files);
      photos = [...photos, ...newPhotoUrls];
      const newGeotags = await buildPhotoGeotags(req.files, newPhotoUrls);
      photoGeotags = [...photoGeotags, ...newGeotags];
    }
    if (photos.length > 0) {
      updates.photos = photos;
      updates.photo_geotags = photoGeotags;
    }

    await listing.update(updates);

    // Notify seller when admin verifies their listing
    if (isAdminVerifying) {
      await createNotification({
        user_id: listing.seller_id,
        title: 'Listing Verified',
        message: `Your listing "${updates.title || listing.title}" has been verified by admin and is now published.`,
        type: 'listing',
        data: { listing_id: listing.id }
      });
    }

    // Notify admins when a seller updates an existing listing
    if (req.user.role === 'seller') {
      await notifyAdmins({
        title: 'Listing Updated',
        message: `Seller ${req.user.full_name || req.user.email} updated "${updates.title || listing.title}" in ${updates.branch || listing.branch}. Please review the changes.`,
        type: 'listing',
        data: { listing_id: listing.id, seller_id: req.user.id }
      });
    }

    res.json(listing);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const listing = await db.LandListing.findByPk(req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    if (!(await canManageListing(listing, req.user))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await listing.destroy();
    res.json({ message: 'Listing deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
