/**
 * clientOnboardingFollowUpNotificationService.mjs
 * ===============================================
 * Creates in-app follow-up tasks for onboarding coverage fields that the
 * trainer explicitly marked client_requested. This service never sends email
 * or SMS, and it redacts sensitive medical field labels from notification
 * bodies unless the secure dashboard is opened.
 */
import {
  CLIENT_ONBOARDING_QUESTION_BANK_CATEGORIES,
  getClientOnboardingCoverageFields,
} from '../../shared/clientOnboardingQuestionBank.mjs';
import { getClientOnboardingCoverageItem } from '../models/index.mjs';

const categoryLabels = new Map(CLIENT_ONBOARDING_QUESTION_BANK_CATEGORIES.map((item) => [item.key, item.label]));
const fieldDefinitions = new Map(getClientOnboardingCoverageFields().map((item) => [item.coverageKey, item]));

const cleanKey = (value) => String(value || '').trim().replace(/[^A-Za-z0-9:_./-]/g, '').slice(0, 80);
const cleanText = (value, fallback = '') => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.slice(0, 160) : fallback;
};

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function metadataFor(item = {}) {
  return isPlainObject(item.metadata) ? item.metadata : {};
}

function definitionFor(item = {}) {
  const key = cleanKey(item.coverageKey || item.fieldKey || item.key);
  return fieldDefinitions.get(key) || null;
}

function categoryLabelFor(item = {}) {
  const key = cleanText(item.category || definitionFor(item)?.category, 'general');
  return categoryLabels.get(key) || key.replace(/_/g, ' ');
}

function isSensitive(item = {}) {
  const metadata = metadataFor(item);
  return item.isSensitive === true
    || metadata.isSensitive === true
    || definitionFor(item)?.isSensitive === true;
}

function messageFor(item = {}) {
  const categoryLabel = categoryLabelFor(item);
  if (isSensitive(item)) {
    return `Please complete a secure onboarding follow-up for ${categoryLabel} in your dashboard.`;
  }
  const label = cleanText(item.label || definitionFor(item)?.label, 'this onboarding item');
  return `Please update ${label} in your onboarding checklist.`;
}

export function buildCoverageFollowUpNotification({ clientId, actorId, item } = {}) {
  const coverageKey = cleanKey(item?.coverageKey || item?.fieldKey || item?.key);
  const categoryLabel = categoryLabelFor(item);
  return {
    userId: clientId,
    senderId: actorId || null,
    type: 'client',
    title: `Onboarding follow-up: ${categoryLabel}`,
    message: messageFor(item),
    link: `/dashboard/client/coach-assistant?source=onboarding-follow-up&coverageKey=${encodeURIComponent(coverageKey)}`,
  };
}

function shouldRequestClient(item = {}) {
  return cleanKey(item.coverageKey || item.fieldKey || item.key)
    && item.status === 'client_requested';
}

async function markRequested({
  clientId,
  item,
  actorId,
  notificationId,
  CoverageItemModel,
  now,
  transaction,
}) {
  const Model = CoverageItemModel || getClientOnboardingCoverageItem();
  const coverageKey = cleanKey(item.coverageKey || item.fieldKey || item.key);
  const row = await Model.findOne?.({ where: { clientId, coverageKey }, transaction });
  if (!row?.update) return false;

  const metadata = {
    ...metadataFor(row),
    ...metadataFor(item),
    followUpNotificationId: notificationId ?? null,
  };
  await row.update({
    requestedFromClient: true,
    requestedFromClientAt: row.requestedFromClientAt || now,
    resolvedAt: null,
    lastMarkedBy: actorId || row.lastMarkedBy || null,
    lastMarkedAt: now,
    metadata,
  }, { transaction });
  return true;
}

export async function createClientCoverageFollowUpNotifications({
  clientId,
  actorId,
  coverageItems = [],
  createNotificationFn,
  CoverageItemModel = null,
  transaction = null,
  now = new Date(),
} = {}) {
  const summary = { requested: 0, created: 0, skipped: 0, failed: 0, items: [] };
  if (typeof createNotificationFn !== 'function') return summary;

  for (const item of coverageItems) {
    if (!shouldRequestClient(item)) {
      summary.skipped += 1;
      continue;
    }
    summary.requested += 1;
    const payload = buildCoverageFollowUpNotification({ clientId, actorId, item });
    try {
      const result = await createNotificationFn(payload);
      if (!result?.success) {
        summary.failed += 1;
        summary.items.push({ coverageKey: cleanKey(item.coverageKey || item.key), status: 'failed', error: result?.error || 'notification_failed' });
        continue;
      }
      await markRequested({
        clientId,
        item,
        actorId,
        notificationId: result.notification?.id,
        CoverageItemModel,
        now,
        transaction,
      });
      summary.created += 1;
      summary.items.push({ coverageKey: cleanKey(item.coverageKey || item.key), status: 'created', notificationId: result.notification?.id ?? null });
    } catch (err) {
      summary.failed += 1;
      summary.items.push({ coverageKey: cleanKey(item.coverageKey || item.key), status: 'failed', error: err?.message || 'notification_failed' });
    }
  }

  return summary;
}
