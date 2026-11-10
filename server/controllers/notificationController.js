const db = require('../models');
const { Op } = require('sequelize');

const createNotification = async ({ user_id, title, message, type = 'system', data = null }) => {
  try {
    return await db.Notification.create({ user_id, title, message, type, data });
  } catch (err) {
    console.error('Failed to create notification:', err);
    return null;
  }
};

exports.createNotification = createNotification;

const syncSellerTransactionNotifications = async (sellerId) => {
  const [transactions, existing] = await Promise.all([
    db.Transaction.findAll({
      where: { recorded_by: sellerId },
      attributes: ['id', 'listing_id', 'buyer_id', 'recorded_by', 'amount', 'status', 'created_at'],
      include: [
        { model: db.LandListing, as: 'listing', attributes: ['id', 'title'], required: false },
        { model: db.User, as: 'buyer', attributes: ['full_name'], required: false },
        { model: db.User, as: 'recorder', attributes: ['full_name', 'branch'], required: false }
      ],
      order: [['created_at', 'DESC']]
    }),
    db.Notification.findAll({
      where: { user_id: sellerId, type: 'transaction' },
      attributes: ['data']
    })
  ]);

  const notifiedTransactionIds = new Set(
    existing
      .map((notification) => notification.data?.transaction_id)
      .filter((transactionId) => transactionId !== null && transactionId !== undefined)
      .map((transactionId) => String(transactionId))
  );

  for (const transaction of transactions) {
    if (notifiedTransactionIds.has(String(transaction.id))) continue;

    const title = transaction.listing?.title || 'Terrava land listing';
    const amount = Number(transaction.amount || 0).toLocaleString();
    const status = transaction.status === 'rejected'
      ? 'has a rejected payment'
      : transaction.status === 'pending'
        ? 'has a pending payment'
        : 'recorded a payment';
    const buyerName = transaction.buyer?.full_name || 'A buyer';
    const branch = transaction.recorder?.branch || 'a Terrava branch';
    const recorder = transaction.recorder?.full_name
      ? ` by ${transaction.recorder.full_name}`
      : '';

    await createNotification({
      user_id: sellerId,
      title: `Payment update for ${title}`,
      message: `${buyerName} ${status} of ₱${amount} for "${title}". Payment received at ${branch}${recorder}.`,
      type: 'transaction',
      data: {
        transaction_id: transaction.id,
        listing_id: transaction.listing_id,
        payment_branch: transaction.recorder?.branch || null,
        recorded_by: transaction.recorded_by || null,
        backfilled: true
      }
    });
  }

  return new Set(transactions.map((transaction) => String(transaction.id)));
};

const uniqueSellerNotifications = (notifications) => {
  const seenTransactions = new Set();

  return notifications.filter((notification) => {
    if (notification.type !== 'transaction') return true;

    const transactionId = notification.data?.transaction_id;
    if (transactionId === null || transactionId === undefined) return true;

    const key = String(transactionId);
    if (seenTransactions.has(key)) return false;
    seenTransactions.add(key);
    return true;
  });
};

exports.getMine = async (req, res) => {
  try {
    // Older payments were not fanned out to every seller. Reconcile only the
    // signed-in seller's missing transaction notifications before returning
    // the list, using real transaction records as the source of truth.
    let sellerTransactionIds = null;
    if (req.user.role === 'seller') {
      try {
        sellerTransactionIds = await syncSellerTransactionNotifications(req.user.id);
      } catch (syncError) {
        // Notification reconciliation must never make the notification panel
        // unavailable if an optional association is temporarily unavailable.
        console.error('Failed to sync seller transaction notifications:', syncError);
      }
    }

    const where = { user_id: req.user.id };
    if (req.user.role === 'buyer') {
      // Listing approval is a seller workflow event and should not appear in
      // a buyer's notification feed.
      where.type = { [Op.ne]: 'listing' };
    }
    const allNotifications = await db.Notification.findAll({
      where,
      order: [['created_at', 'DESC']],
      ...(req.user.role === 'seller' ? {} : { limit: 50 })
    });
    const visibleNotifications = req.user.role === 'seller'
      ? uniqueSellerNotifications(allNotifications.filter((notification) => {
          if (notification.type === 'listing') return true;
          if (notification.type === 'system') return notification.data?.category === 'message';
          if (notification.type !== 'transaction') return false;
          const transactionId = notification.data?.transaction_id;
          if (transactionId !== null && transactionId !== undefined) {
            return sellerTransactionIds?.has(String(transactionId));
          }
          return false;
        }))
      : allNotifications;
    const notifications = visibleNotifications.slice(0, 50);
    const unreadCount = visibleNotifications.filter((notification) => !notification.is_read).length;

    res.json({ notifications, unread_count: unreadCount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const notification = await db.Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    await notification.update({ is_read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await db.Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id, is_read: false } }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
