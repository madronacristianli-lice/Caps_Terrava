const db = require('../models');
const { createNotification } = require('./notificationController');

exports.create = async (req, res) => {
  try {
    const { listing_id, message } = req.body;
    const listing = await db.LandListing.findByPk(listing_id);
    if (!listing || listing.archived) return res.status(404).json({ error: 'Listing not found' });
    const inquiry = await db.Inquiry.create({
      listing_id,
      buyer_id: req.user.id,
      message
    });

    if (listing.seller_id) {
      await createNotification({
        user_id: listing.seller_id,
        title: `New message about ${listing.title}`,
        message: 'A buyer sent a message about your listing. Open Messages to reply.',
        type: 'system',
        data: { category: 'message', inquiry_id: inquiry.id, listing_id: listing.id }
      });
    }

    res.json(inquiry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMine = async (req, res) => {
  try {
    const include = [
      { model: db.User, as: 'buyer', attributes: ['id', 'full_name', 'email', 'photo_url'] }
    ];
    let where = {};

    if (req.user.role === 'seller') {
      include.push({
        model: db.LandListing,
        as: 'listing',
        attributes: ['id', 'title', 'location_text', 'price', 'area_sqm', 'status', 'polygon_geojson', 'branch', 'seller_id'],
        where: { seller_id: req.user.id, archived: false },
        required: true
      });
    } else {
      where = { buyer_id: req.user.id };
      include.push({
        model: db.LandListing,
        as: 'listing',
        where: { archived: false },
        required: true,
        attributes: ['id', 'title', 'location_text', 'price', 'area_sqm', 'status', 'polygon_geojson', 'branch', 'seller_id']
      });
    }

    const inquiries = await db.Inquiry.findAll({
      where,
      include,
      order: [['created_at', 'DESC']]
    });
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const count = await db.Inquiry.count({
      where: { reply: null },
      include: [{
        model: db.LandListing,
        as: 'listing',
        where: { seller_id: req.user.id, archived: false },
        attributes: []
      }]
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.reply = async (req, res) => {
  try {
    const inquiry = await db.Inquiry.findByPk(req.params.id, {
      include: [{ model: db.LandListing, as: 'listing' }]
    });
    if (!inquiry) return res.status(404).json({ error: 'Inquiry not found' });
    if (inquiry.listing.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await inquiry.update({ reply: req.body.reply, is_read: true });

    await createNotification({
      user_id: inquiry.buyer_id,
      title: `Reply about ${inquiry.listing.title}`,
      message: 'The seller replied to your message. Open Messages to view the response.',
      type: 'system',
      data: { category: 'message', inquiry_id: inquiry.id, listing_id: inquiry.listing.id }
    });

    res.json(inquiry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
