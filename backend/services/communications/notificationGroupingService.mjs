const GROUP_IDEMPOTENCY_HISTORY_LIMIT = 50;

const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeKey = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim();
  return text || null;
};

const uniqueKeys = (...groups) => {
  const seen = new Set();
  const keys = [];
  for (const group of groups) {
    const values = Array.isArray(group) ? group : [group];
    for (const value of values) {
      const key = normalizeKey(value);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
};

const metadataFor = (notification) => (
  isRecord(notification?.metadata) ? { ...notification.metadata } : {}
);

const groupStateFor = (notification, metadata) => {
  const group = isRecord(metadata.notificationGroup) ? metadata.notificationGroup : {};
  return {
    count: Number.isInteger(Number(group.count)) && Number(group.count) > 0 ? Number(group.count) : 1,
    idempotencyKeys: uniqueKeys(group.idempotencyKeys, notification?.idempotencyKey),
  };
};

const messageThreadTitle = (count) => `${count} new message${count === 1 ? '' : 's'} in this conversation`;

const isMessageThreadGrouping = (grouping) => grouping?.mode === 'message_thread';

async function findOpenGroupedNotification({ Notification, notificationPayload, grouping, transaction }) {
  if (!Notification?.findOne || !isMessageThreadGrouping(grouping) || !notificationPayload.groupKey) return null;
  const query = {
    where: {
      userId: notificationPayload.userId,
      groupKey: notificationPayload.groupKey,
      category: notificationPayload.category,
      status: 'unread',
      read: false,
    },
    order: [['updatedAt', 'DESC'], ['createdAt', 'DESC']],
  };
  if (transaction) {
    query.transaction = transaction;
    query.lock = transaction.LOCK?.UPDATE || true;
  }
  return Notification.findOne(query);
}

const withGroupingTransaction = (Notification, work) => {
  const sequelize = Notification?.sequelize;
  if (!sequelize?.transaction) return work(null);
  return sequelize.transaction((transaction) => work(transaction));
};

export async function mergeGroupedNotification({ Notification, notificationPayload, grouping }) {
  return withGroupingTransaction(Notification, async (transaction) => {
    const notification = await findOpenGroupedNotification({
      Notification,
      notificationPayload,
      grouping,
      transaction,
    });
    if (!notification) return { notification: null };

    const metadata = metadataFor(notification);
    const group = groupStateFor(notification, metadata);
    const idempotencyKey = normalizeKey(notificationPayload.idempotencyKey);

    if (idempotencyKey && group.idempotencyKeys.includes(idempotencyKey)) {
      return { notification, grouped: true, idempotentReplay: true };
    }

    const idempotencyKeys = uniqueKeys(group.idempotencyKeys, idempotencyKey)
      .slice(-GROUP_IDEMPOTENCY_HISTORY_LIMIT);
    const count = Math.max(group.count + 1, idempotencyKeys.length);
    const updatePayload = {
      title: messageThreadTitle(count),
      message: notificationPayload.message,
      priority: notificationPayload.priority,
      status: 'unread',
      read: false,
      senderId: notificationPayload.senderId,
      link: notificationPayload.link,
      actions: notificationPayload.actions,
      idempotencyKey: notificationPayload.idempotencyKey,
      relatedEntityType: notificationPayload.relatedEntityType,
      relatedEntityId: notificationPayload.relatedEntityId,
      metadata: {
        ...metadata,
        ...notificationPayload.metadata,
        notificationGroup: { count, idempotencyKeys },
      },
    };

    if (typeof notification.update === 'function') {
      const updated = transaction
        ? await notification.update(updatePayload, { transaction })
        : await notification.update(updatePayload);
      return { notification: updated || notification, grouped: true };
    }

    Object.assign(notification, updatePayload);
    return { notification, grouped: true };
  });
}