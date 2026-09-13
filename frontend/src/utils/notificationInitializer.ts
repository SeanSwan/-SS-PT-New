/**
 * Notification lifecycle wiring.
 *
 * The initializer owns the account boundary because App mounts this once.
 * A store subscription invalidates the prior generation before fetching a
 * newly authenticated account, so late REST results cannot cross accounts.
 */
import { store } from '../store';
import {
  fetchNotifications,
  setNotificationOwner,
} from '../store/slices/notificationSlice';
import { logger } from '@/utils/logger';

const ownerKeyFromState = () => {
  const user = store.getState().auth?.user;
  return user?.id === undefined || user?.id === null ? null : String(user.id);
};

/** Initialize polling and account-scoped notification state. */
export const initializeNotifications = () => {
  let connectionFailures = 0;
  const MAX_RETRY_COUNT = 3;
  let activeOwnerKey = ownerKeyFromState();
  let disposed = false;

  const fetchNotificationsWithRetry = async (ownerKey: string) => {
    if (disposed || activeOwnerKey !== ownerKey) return;
    try {
      const result = await store.dispatch(fetchNotifications(ownerKey));
      if (disposed || activeOwnerKey !== ownerKey) return;
      if (fetchNotifications.rejected.match(result)) {
        const payload = result.payload as { message?: unknown } | undefined;
        throw new Error(String(payload?.message || result.error.message || 'Notification fetch failed'));
      }
      connectionFailures = 0;
    } catch (error) {
      if (disposed || activeOwnerKey !== ownerKey) return;
      connectionFailures++;
      logger.warn(`[Notifications] Connection attempt ${connectionFailures} failed:`, error);
      if (connectionFailures >= MAX_RETRY_COUNT) {
        logger.warn('[Notifications] Notification polling paused until the next interval because the API is unavailable');
      }
    }
  };

  const syncOwner = () => {
    const nextOwnerKey = ownerKeyFromState();
    if (nextOwnerKey === activeOwnerKey) return;
    activeOwnerKey = nextOwnerKey;
    connectionFailures = 0;
    store.dispatch(setNotificationOwner(nextOwnerKey));
    if (nextOwnerKey) void fetchNotificationsWithRetry(nextOwnerKey);
  };

  const unsubscribe = store.subscribe(syncOwner);
  if (activeOwnerKey) {
    store.dispatch(setNotificationOwner(activeOwnerKey));
    void fetchNotificationsWithRetry(activeOwnerKey);
  } else {
    store.dispatch(setNotificationOwner(null));
  }

  const POLL_INTERVAL = 60000;
  const intervalId = setInterval(() => {
    syncOwner();
    if (activeOwnerKey) void fetchNotificationsWithRetry(activeOwnerKey);
  }, POLL_INTERVAL);

  return () => {
    disposed = true;
    clearInterval(intervalId);
    unsubscribe();
    activeOwnerKey = null;
    store.dispatch(setNotificationOwner(null));
  };
};

/** WebSocket hookup remains a separate compatibility seam for the header. */
export const connectToNotificationEvents = () => () => {};

export const setupNotifications = () => {
  const cleanupInit = initializeNotifications();
  const cleanupEvents = connectToNotificationEvents();
  return () => {
    cleanupInit();
    cleanupEvents();
  };
};
