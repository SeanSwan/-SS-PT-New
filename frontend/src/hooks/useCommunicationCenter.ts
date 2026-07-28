/**
 * FILE: useCommunicationCenter.ts
 * PURPOSE: Hook-level Communications OS facade over the canonical notification center.
 */
import { useCallback, useMemo, useState } from 'react';

import {
  COMMUNICATION_INBOX_BUCKETS,
  buildCommunicationInboxBuckets,
  type CommunicationInboxBucketKey,
} from '../components/Communications/communicationInboxModel';
import { useNotificationCenter } from './useNotificationCenter';

export interface UseCommunicationCenterOptions {
  fetchOnMount?: boolean;
  subscribeToSocket?: boolean;
  initialBucket?: CommunicationInboxBucketKey;
}

const DEFAULT_BUCKET: CommunicationInboxBucketKey = 'action_required';
const KNOWN_BUCKET_KEYS = new Set<string>(COMMUNICATION_INBOX_BUCKETS.map(bucket => bucket.key));

const isCommunicationBucketKey = (bucketKey: string): bucketKey is CommunicationInboxBucketKey => (
  KNOWN_BUCKET_KEYS.has(bucketKey)
);

export const useCommunicationCenter = ({
  fetchOnMount = true,
  subscribeToSocket = true,
  initialBucket = DEFAULT_BUCKET,
}: UseCommunicationCenterOptions = {}) => {
  const notificationCenter = useNotificationCenter({ fetchOnMount, subscribeToSocket });
  const buckets = useMemo(
    () => buildCommunicationInboxBuckets(notificationCenter.notifications),
    [notificationCenter.notifications],
  );
  const [selectedBucketKey, setSelectedBucketKey] = useState<CommunicationInboxBucketKey>(initialBucket);
  const activeBucket = useMemo(
    () => buckets.find(bucket => bucket.key === selectedBucketKey) || buckets[0],
    [buckets, selectedBucketKey],
  );
  const actionRequiredCount = useMemo(
    () => buckets.find(bucket => bucket.key === DEFAULT_BUCKET)?.total || 0,
    [buckets],
  );
  const selectBucket = useCallback((bucketKey: string) => {
    if (isCommunicationBucketKey(bucketKey)) {
      setSelectedBucketKey(bucketKey);
    }
  }, []);

  return {
    ...notificationCenter,
    buckets,
    activeBucketKey: activeBucket.key,
    activeBucket,
    latestNotification: activeBucket.latest,
    actionRequiredCount,
    selectBucket,
  };
};

export default useCommunicationCenter;