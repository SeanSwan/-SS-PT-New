/**
 * Client Notification Write Dispatcher
 * ====================================
 *
 * Swan Coach write command for sending a notification to a client. The command
 * result confirms delivery metadata without echoing client PII or message text.
 */

import { createNotification } from '../../../controllers/notificationController.mjs';
import { getAllModels } from '../../../models/index.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const stringOrDefault = (value, fallback) => String(value || fallback).trim() || fallback;

const buildNotFoundResult = (clientId) => ({
  clientId,
  found: false,
  notificationSent: false,
});

const findClient = ({ User, clientId }) => (
  User.findOne({
    where: { id: clientId, role: 'client' },
    attributes: ['id'],
  })
);

const notificationPayloadFrom = ({ clientId, params, ctx }) => ({
  userId: Number(clientId),
  title: stringOrDefault(params.title, 'Coach update'),
  message: String(params.message || '').trim(),
  type: stringOrDefault(params.type, 'admin'),
  senderId: ctx.user?.id,
});

const notificationIdFrom = (result) => result?.notification?.id ?? null;

const buildSentResult = ({ clientId, result, type }) => ({
  clientId,
  found: true,
  notificationSent: Boolean(result?.success),
  notificationId: notificationIdFrom(result),
  type,
});

export const dispatchNotifyClient = async (params = {}, ctx = {}) => {
  const { User } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);
  const client = await findClient({ User, clientId });

  if (!client) return buildNotFoundResult(clientId);

  const payload = notificationPayloadFrom({ clientId, params, ctx });
  const result = await createNotification(payload);

  return buildSentResult({ clientId, result, type: payload.type });
};
