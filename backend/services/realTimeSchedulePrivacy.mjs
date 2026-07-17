/**
 * Real-time schedule payload privacy boundary.
 *
 * Broad role rooms are invalidation channels, not record-delivery channels.
 * This module keeps private schedule details in authorized rooms and exposes
 * only opaque refresh metadata to broad trainer, client, and public rooms.
 */
const BROAD_SCHEDULE_ROOMS = new Set(['trainer', 'client', 'public']);
const BROAD_SESSION_FIELDS = ['sessionId', 'status'];
const COMPLETION_EVENT_FIELDS = ['attendanceStatus', 'actualDuration'];

function selectPrimitiveFields(source, allowedFields) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};

  return allowedFields.reduce((selected, field) => {
    const value = source[field];
    if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
      selected[field] = value;
    }
    return selected;
  }, {});
}

function selectBroadSessionData(eventData) {
  const source = eventData && typeof eventData === 'object' ? eventData : {};
  const nestedSession = source.session && typeof source.session === 'object'
    ? source.session
    : {};

  return BROAD_SESSION_FIELDS.reduce((selected, field) => {
    const value = field === 'sessionId'
      ? (source.sessionId ?? nestedSession.sessionId ?? nestedSession.id)
      : (source[field] ?? nestedSession[field]);

    if (value !== undefined) selected[field] = value;
    return selected;
  }, {});
}

/**
 * Return the payload authorized for a specific Socket.IO room.
 */
export function sanitizeSchedulePayloadForRoom(payload, room) {
  const isBroadSessionEvent = typeof payload?.type === 'string'
    && payload.type.startsWith('session:')
    && BROAD_SCHEDULE_ROOMS.has(room);

  if (!isBroadSessionEvent) return payload;

  return {
    ...payload,
    trainerId: null,
    clientId: null,
    data: selectBroadSessionData(payload.data),
  };
}

/**
 * Completion events may carry timing/status metadata, never arbitrary models.
 */
export function selectCompletionEventData(completionData) {
  return selectPrimitiveFields(completionData, COMPLETION_EVENT_FIELDS);
}

/**
 * Cancellation events accept only scalar identifiers and string reasons.
 */
export function selectCancellationEventData(reason, cancelledBy) {
  const metadata = {};

  if (typeof reason === 'string') metadata.reason = reason;
  if (['string', 'number'].includes(typeof cancelledBy)) {
    metadata.cancelledBy = cancelledBy;
  }

  return metadata;
}
