/**
 * usePublicWaiverForm — SWA-140
 * ==============================
 * All state, validation, persistence, and submission for the public waiver.
 * Extracted from PublicWaiverPage.V3 so the page is composition and this is
 * the logic that actually has to be right.
 *
 * What this fixes vs the previous inline implementation:
 *  - date of birth is evaluated, so a minor can no longer sign for themselves
 *  - the versions fetch has a real error state instead of a silent dead end
 *  - each document must be opened and attested before signing
 *  - answers survive a reload/back-navigation (draft persistence)
 *  - one idempotency key per page load, so a double-tap replays
 *  - the bundle hash is echoed, so a signature can't attach to text the
 *    signer never saw
 *  - returnUrl from the waiver gate is honoured instead of ignored
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchCurrentWaiverVersions,
  submitPublicWaiver,
  describeWaiverError,
  createIdempotencyKey,
  type ActivityType,
  type WaiverSource,
  type WaiverVersionInfo,
  type WaiverSubmitResponse,
} from '../../services/publicWaiverService';

const DRAFT_KEY = 'swan.waiver.draft.v1';
const DRAFT_TTL_MS = 6 * 60 * 60 * 1000; // 6h — long enough to finish, short enough not to linger

export type LoadState = 'loading' | 'ready' | 'error' | 'empty';
export type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export interface WaiverFormFields {
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  guardianName: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  minorAssentName: string;
}

const EMPTY_FIELDS: WaiverFormFields = {
  fullName: '', dateOfBirth: '', email: '', phone: '',
  guardianName: '', emergencyContactName: '', emergencyContactPhone: '', minorAssentName: '',
};

/** Whole-year age; mirrors the server so client and server agree on who is a minor. */
export function computeAge(dob: string, at: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split('-').map(Number);
  const probe = new Date(y, m - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== m - 1 || probe.getDate() !== d) return null;
  let age = at.getFullYear() - y;
  const monthDiff = at.getMonth() + 1 - m;
  if (monthDiff < 0 || (monthDiff === 0 && at.getDate() < d)) age -= 1;
  return age;
}

/**
 * Only same-origin relative paths are accepted, so returnUrl can't be turned
 * into an open redirect off a page we deliberately send logged-in users to.
 *
 * Parsed against a sentinel origin rather than string-matched: hand-rolled
 * `startsWith('//')` checks miss the normalisations a browser performs before
 * it resolves a URL. `/\evil.com` (backslash) and `/<TAB>/evil.com` both
 * collapse to `//evil.com` — protocol-relative, i.e. off-site — and both got
 * past an earlier version of this guard. The URL parser applies the same
 * normalisation the browser will, so anything that escapes the origin is
 * caught rather than guessed at.
 */
const RETURN_URL_SENTINEL = 'https://waiver.invalid';

export function safeReturnUrl(raw: string | null): string | null {
  if (!raw) return null;

  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { return null; }

  // Control characters are stripped by browsers before parsing, which is how
  // a tab smuggles in an extra slash. Refuse them outright.
  // Browsers strip control characters before parsing a URL, which is how a
  // tab smuggles in an extra slash. Checked by code point so no control
  // character has to appear in this source file.
  for (let k = 0; k < decoded.length; k += 1) {
    const code = decoded.charCodeAt(k);
    if (code < 0x20 || code === 0x7f) return null;
  }

  let url: URL;
  try { url = new URL(decoded, RETURN_URL_SENTINEL); } catch { return null; }
  if (url.origin !== RETURN_URL_SENTINEL) return null;

  const path = `${url.pathname}${url.search}${url.hash}`;
  return path.startsWith('/') ? path : null;
}

export interface UsePublicWaiverFormOptions {
  source: WaiverSource;
  returnUrl: string | null;
  isSignatureEmpty: () => boolean;
  getSignatureData: () => string;
}

export function usePublicWaiverForm({
  source, returnUrl, isSignatureEmpty, getSignatureData,
}: UsePublicWaiverFormOptions) {
  const [fields, setFields] = useState<WaiverFormFields>(EMPTY_FIELDS);
  const [selectedActivities, setSelectedActivities] = useState<Set<ActivityType>>(new Set());
  const [liabilityAccepted, setLiabilityAccepted] = useState(false);
  const [swanCoachAccepted, setSwanCoachAccepted] = useState(false);
  const [mediaAccepted, setMediaAccepted] = useState(false);
  const [guardianAttested, setGuardianAttested] = useState(false);
  const [attestedVersionIds, setAttestedVersionIds] = useState<Set<number>>(new Set());
  const [hasSignature, setHasSignature] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const [versions, setVersions] = useState<WaiverVersionInfo[]>([]);
  const [bundleHash, setBundleHash] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [submitResult, setSubmitResult] = useState<WaiverSubmitResponse | null>(null);
  const [submitError, setSubmitError] = useState<ReturnType<typeof describeWaiverError> | null>(null);

  // One key per page load. Retrying the same signature replays rather than
  // creating a second legal record.
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const inFlightRef = useRef(false);

  // ── Load documents ────────────────────────────────────────────
  const loadVersions = useCallback(async () => {
    setLoadState('loading');
    try {
      const { versions: loaded, bundleHash: hash } = await fetchCurrentWaiverVersions();
      setVersions(loaded);
      setBundleHash(hash);
      // An empty set is NOT a normal state — it means the studio cannot take
      // signatures at all. Distinguish it from a network error so the page can
      // say something true instead of disabling submit with no explanation.
      setLoadState(loaded.length === 0 ? 'empty' : 'ready');
    } catch {
      setVersions([]);
      setBundleHash(null);
      setLoadState('error');
    }
  }, []);

  useEffect(() => { void loadVersions(); }, [loadVersions]);

  // ── Draft persistence ─────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { savedAt?: number; fields?: WaiverFormFields; activities?: ActivityType[] };
      if (!parsed.savedAt || Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
        window.localStorage.removeItem(DRAFT_KEY);
        return;
      }
      if (parsed.fields) setFields({ ...EMPTY_FIELDS, ...parsed.fields });
      if (parsed.activities?.length) setSelectedActivities(new Set(parsed.activities));
    } catch {
      /* a corrupt draft must never block signing */
    }
  }, []);

  useEffect(() => {
    if (submitState === 'success') return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
        savedAt: Date.now(),
        fields,
        activities: Array.from(selectedActivities),
      }));
    } catch { /* private mode / quota — never fatal */ }
  }, [fields, selectedActivities, submitState]);

  // ── Derived ───────────────────────────────────────────────────
  const age = useMemo(() => computeAge(fields.dateOfBirth), [fields.dateOfBirth]);
  const isMinor = age !== null && age < 18;

  const relevantVersions = useMemo(() => {
    if (selectedActivities.size === 0) return [];
    return versions.filter((v) => {
      if (v.waiverType === 'core' || v.waiverType === 'ai_notice') return true;
      if (v.waiverType === 'media_release') return true;
      if (v.waiverType === 'activity_addendum' && v.activityType) {
        return selectedActivities.has(v.activityType as ActivityType);
      }
      return false;
    });
  }, [versions, selectedActivities]);

  /** Documents that must be attested — optional ones are shown, not forced. */
  const requiredVersions = useMemo(
    () => relevantVersions.filter((v) => v.waiverType !== 'media_release'),
    [relevantVersions],
  );

  const hasMissingText = useMemo(
    () => relevantVersions.some((v) => !v.displayText),
    [relevantVersions],
  );

  const allDocumentsAttested = useMemo(
    () => requiredVersions.length > 0 && requiredVersions.every((v) => attestedVersionIds.has(v.id)),
    [requiredVersions, attestedVersionIds],
  );

  const isReconsent = useMemo(
    () => relevantVersions.some((v) => v.changeSummary),
    [relevantVersions],
  );

  const validation = useMemo(() => {
    const problems: string[] = [];
    if (selectedActivities.size === 0) problems.push('activities');
    if (loadState !== 'ready' || relevantVersions.length === 0 || hasMissingText) problems.push('documents');
    if (!allDocumentsAttested) problems.push('attestation');
    if (!fields.fullName.trim()) problems.push('fullName');
    if (age === null) problems.push('dateOfBirth');
    if (!fields.email.trim() && !fields.phone.trim()) problems.push('contact');
    if (!liabilityAccepted) problems.push('liability');
    if (!hasSignature) problems.push('signature');
    if (isMinor) {
      if (!fields.guardianName.trim() || !guardianAttested) problems.push('guardian');
      if (!fields.emergencyContactName.trim() || !fields.emergencyContactPhone.trim()) problems.push('emergency');
    }
    return { problems, isValid: problems.length === 0 };
  }, [
    selectedActivities, loadState, relevantVersions, hasMissingText, allDocumentsAttested,
    fields, age, liabilityAccepted, hasSignature, isMinor, guardianAttested,
  ]);

  // ── Actions ───────────────────────────────────────────────────
  const setField = useCallback(<K extends keyof WaiverFormFields>(key: K, value: WaiverFormFields[K]) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleActivity = useCallback((activity: ActivityType) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(activity)) next.delete(activity);
      else next.add(activity);
      return next;
    });
  }, []);

  const attestVersion = useCallback((versionId: number, attested: boolean) => {
    setAttestedVersionIds((prev) => {
      const next = new Set(prev);
      if (attested) next.add(versionId);
      else next.delete(versionId);
      return next;
    });
  }, []);

  const submit = useCallback(async (): Promise<WaiverSubmitResponse | null> => {
    setAttempted(true);
    if (!validation.isValid || isSignatureEmpty() || inFlightRef.current) return null;

    inFlightRef.current = true;
    setSubmitState('submitting');
    setSubmitError(null);

    try {
      const result = await submitPublicWaiver({
        fullName: fields.fullName.trim(),
        dateOfBirth: fields.dateOfBirth,
        email: fields.email.trim() || undefined,
        phone: fields.phone.trim() || undefined,
        activityTypes: Array.from(selectedActivities),
        signatureData: getSignatureData(),
        liabilityAccepted,
        aiConsentAccepted: swanCoachAccepted,
        mediaConsentAccepted: mediaAccepted,
        source,
        submittedByGuardian: isMinor || undefined,
        guardianName: isMinor ? fields.guardianName.trim() : undefined,
        // The guardian's typed name backs up their drawn signature as the
        // contracting party; the minor is recorded as the participant.
        guardianTypedSignature: isMinor ? fields.guardianName.trim() : undefined,
        minorAssentName: isMinor ? fields.minorAssentName.trim() || undefined : undefined,
        emergencyContactName: isMinor ? fields.emergencyContactName.trim() : undefined,
        emergencyContactPhone: isMinor ? fields.emergencyContactPhone.trim() : undefined,
        idempotencyKey: idempotencyKeyRef.current,
        bundleHash,
      });

      if (!result.success) {
        setSubmitError({ title: "Your signature didn't save", detail: result.error || 'Please try again.', retryable: true });
        setSubmitState('error');
        return null;
      }

      try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* non-fatal */ }
      setSubmitResult(result);
      setSubmitState('success');
      return result;
    } catch (err) {
      const described = describeWaiverError(err);
      setSubmitError(described);
      setSubmitState('error');
      // A stale bundle means the documents changed under the signer — reload
      // them so the retry signs what is actually current.
      if ((err as { response?: { data?: { code?: string } } })?.response?.data?.code === 'WAIVER_BUNDLE_STALE') {
        setAttestedVersionIds(new Set());
        void loadVersions();
      }
      return null;
    } finally {
      inFlightRef.current = false;
    }
  }, [
    validation.isValid, isSignatureEmpty, getSignatureData, fields, selectedActivities,
    liabilityAccepted, swanCoachAccepted, mediaAccepted, source, isMinor, bundleHash, loadVersions,
  ]);

  return {
    fields, setField,
    selectedActivities, toggleActivity,
    liabilityAccepted, setLiabilityAccepted,
    swanCoachAccepted, setSwanCoachAccepted,
    mediaAccepted, setMediaAccepted,
    guardianAttested, setGuardianAttested,
    attestedVersionIds, attestVersion,
    hasSignature, setHasSignature,
    age, isMinor,
    versions, relevantVersions, requiredVersions, hasMissingText, isReconsent,
    loadState, reloadVersions: loadVersions,
    submitState, submitResult, submitError, submit,
    validation, attempted,
    returnUrl,
  };
}

export default usePublicWaiverForm;
