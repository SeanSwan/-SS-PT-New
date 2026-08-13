/**
 * useSocialPublish — every call the composer makes to the publishing API.
 * ============================================================================
 * Extracted from SocialPostGenerator.tsx, which had reached the 300-line rule
 * and could not grow a retry affordance without breaching it.
 *
 * This is worth having as its own unit regardless of the line count, because it
 * concentrates the one decision that has already cost a user their work: WHEN
 * TO DISCARD THE DRAFT. The publish route used to hardcode `success: true`, the
 * composer branched on that flag, and its success branch cleared the caption —
 * so a post where every platform failed reported success and destroyed the
 * text. `166565e53` made the server truthful; this keeps the client truthful by
 * making `onPublished` the single place the draft can be cleared, fired only
 * for a status that actually published.
 *
 * Retry follows the same rule: it is offered only when the server handed back a
 * real jobId for a partly- or fully-failed publish. Never after a compliance
 * block (a retry cannot fix disallowed content) and never after a transport
 * error, where no jobId was observed — inventing one would retry a different
 * job, and the retry endpoint re-posts to live accounts.
 */
import { useCallback, useRef, useState } from 'react';
import apiService from '../../../../services/api.service';
import { describeFailure, describeThrown } from './SocialPostGenerator.outcome';
import type { ComplianceResult } from './SocialPostGenerator.types';

/**
 * A publish outcome that can be retried, and how much of it failed.
 *
 * `content` is the text that was actually sent. The retry endpoint re-publishes
 * the job's STORED content (socialJobRetry.mjs:54), not whatever is in the
 * composer now — so the caller needs this to tell the user when a retry would
 * send something other than what they are currently looking at.
 */
export type RetryTarget = { jobId: string; failedCount: number; content: string };

type PlatformResult = { provider?: string; status?: string; error?: string };

type PublishBody = {
  status?: string;
  message?: string;
  compliance?: { blockers?: string[] };
  data?: { jobId?: string; results?: PlatformResult[] };
};

type PublishArgs = {
  content: string;
  platformIds: string[];
  /** ISO string; present only when the post is scheduled for later. */
  scheduledAt?: string;
  /** Human-readable time to echo back on a successful schedule. */
  scheduleLabel?: string;
};

const didPublish = (status?: string) => status === 'published' || status === 'scheduled';

/**
 * A failure is retryable only if the server named the job. `failedCount` counts
 * the accounts that did NOT publish, so a partial failure offers to retry just
 * those — retrying the whole job would double-post to the ones that succeeded.
 */
const toRetryTarget = (body: PublishBody, content: string): RetryTarget | null => {
  const jobId = body?.data?.jobId;
  if (!jobId) return null;
  if (body?.status !== 'failed' && body?.status !== 'partial_failed') return null;
  const failedCount = (body.data?.results || []).filter(item => item?.status !== 'published').length;
  return failedCount > 0 ? { jobId: String(jobId), failedCount, content } : null;
};

export const useSocialPublish = ({ onPublished }: { onPublished: () => void }) => {
  const [publishing, setPublishing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  // Drives the banner's tone. Without it a catastrophic failure renders in the
  // same neutral chrome as "published successfully", which is the visual
  // version of the lie this work removed from the wire.
  const [failed, setFailed] = useState(false);
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);
  const [retryTarget, setRetryTarget] = useState<RetryTarget | null>(null);

  // Guards against a second request while one is in flight. A ref rather than
  // the state flags because both of these POST to live social accounts, and a
  // double-fire inside a single render tick would double-post.
  const inFlight = useRef(false);

  const runComplianceCheck = useCallback(async (caption: string, tags: string[]) => {
    if (!caption.trim()) return;
    try {
      const response = await apiService.post('/api/admin/social-publishing/compliance-check', {
        content: `${caption}\n\n${tags.join(' ')}`,
        isAIGenerated: false,
      });
      const body = response.data;
      if (body.success) setComplianceResult(body.data);
    } catch {
      // Compliance check is optional and must not block manual review.
    }
  }, []);

  const publish = useCallback(async ({ content, platformIds, scheduledAt, scheduleLabel }: PublishArgs) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPublishing(true);
    setPublishStatus(null);
    setRetryTarget(null);
    setFailed(false);
    try {
      const response = await apiService.post('/api/admin/social-publishing/publish', {
        content,
        platformIds,
        isAIGenerated: false,
        ...(scheduledAt ? { scheduledAt } : {}),
      });
      const body: PublishBody = response.data;
      // Read `status`, never `success` — see the header. The draft is discarded
      // only on an outcome that actually published.
      if (didPublish(body.status)) {
        // Never answer 'published' for a status of 'scheduled' — the post has
        // not gone out yet, and saying it has is the same lie in a new place.
        setPublishStatus(
          body.status === 'scheduled'
            ? (scheduleLabel ? `Post scheduled for ${scheduleLabel}!` : 'Post scheduled.')
            : 'Post published successfully!',
        );
        setComplianceResult(null);
        onPublished();
      } else {
        setPublishStatus(describeFailure(body));
        setRetryTarget(toRetryTarget(body, content));
        setFailed(true);
      }
    } catch (err) {
      // Axios rejects any non-2xx, so a 422 compliance refusal lands here
      // carrying a reason. Calling that "Network error" would be the same class
      // of lie this whole change exists to remove.
      setPublishStatus(describeThrown(err));
      setFailed(true);
    } finally {
      setPublishing(false);
      inFlight.current = false;
    }
  }, [onPublished]);

  const retry = useCallback(async () => {
    const target = retryTarget;
    if (!target || inFlight.current) return;
    inFlight.current = true;
    setRetrying(true);
    try {
      // No body: the server recomputes which accounts still need publishing from
      // its own Attempt rows, so the client cannot ask it to re-post to an
      // account that already succeeded.
      const response = await apiService.post(`/api/admin/social-publishing/publish/${target.jobId}/retry`);
      const body: PublishBody = response.data;
      if (didPublish(body.status)) {
        setPublishStatus('Retry succeeded — all platforms published.');
        setRetryTarget(null);
        setComplianceResult(null);
        setFailed(false);
        onPublished();
      } else {
        setPublishStatus(describeFailure(body));
        // Keep the offer alive only while something is still retryable. The
        // content stays the ORIGINAL job's — a retry never sends new text.
        setRetryTarget(toRetryTarget(body, target.content));
        setFailed(true);
      }
    } catch (err) {
      setPublishStatus(describeThrown(err));
      setFailed(true);
      const status = (err as { response?: { data?: PublishBody } })?.response?.data?.status;
      // The job is gone; there is nothing left to retry against.
      if (status === 'not_found') setRetryTarget(null);
    } finally {
      setRetrying(false);
      inFlight.current = false;
    }
  }, [retryTarget, onPublished]);

  return {
    publishing,
    retrying,
    publishStatus,
    failed,
    complianceResult,
    setComplianceResult,
    retryTarget,
    runComplianceCheck,
    publish,
    retry,
  };
};

export default useSocialPublish;
