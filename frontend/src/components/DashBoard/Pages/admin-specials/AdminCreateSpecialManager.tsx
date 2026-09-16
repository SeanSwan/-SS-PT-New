/**
 * AdminCreateSpecialManager — admin "Create Special" form (S2).
 * Per-client bonus-session special pricing. The $175 sticker never drops; the admin
 * types the effective $/session and the system computes bonus sessions live. Floor
 * policy + validity gate mirror the server (specialPricing.ts); the server re-validates
 * and is authoritative on submit (POST /api/custom-packages).
 *
 * Mount: /dashboard/admin/admin-specials (route registry). Mirrors AdminSpecialsManager.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import apiService from '../../../../services/api';
import { useGlobalClient } from '../../../../context/GlobalClientContext';
import * as S from './createSpecial.styles';
import SpecialDealPreviewCard from './SpecialDealPreviewCard';
import { BASE_PACKAGES, PRESET_TIERS, VALIDITY_OPTIONS, type ValidityType } from './createSpecial.types';
import { computeBonusForTargetRate, computeSpecialPricing, evaluateRateGate } from './specialPricing';

interface CreateResult {
  totalSessions: number;
  effectiveHourlyRate: number;
  storefrontItemId?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const UNCONFIRMED_CREATE = 'Creation could not be confirmed. Check existing specials before retrying.';

/**
 * The create endpoint's pricing object is the financial receipt. A successful
 * HTTP status alone cannot confirm the special: without these fields the UI
 * must retain the form and ask the admin to inspect existing specials before
 * retrying, because the server may have already committed it.
 */
const readAuthoritativeCreateResult = (value: unknown): CreateResult | null => {
  if (!isRecord(value) || value.success !== true || !isRecord(value.pricing)) return null;

  const totalSessions = value.pricing.totalSessions;
  const effectiveHourlyRate = value.pricing.effectiveHourlyRate;
  if (
    typeof totalSessions !== 'number' || !Number.isInteger(totalSessions) || totalSessions <= 0
    || typeof effectiveHourlyRate !== 'number' || !Number.isFinite(effectiveHourlyRate) || effectiveHourlyRate <= 0
  ) return null;

  const storefrontItemId = value.storefrontItemId;
  if (storefrontItemId !== undefined &&
      (typeof storefrontItemId !== 'number' || !Number.isInteger(storefrontItemId) || storefrontItemId <= 0)) {
    return null;
  }

  return {
    totalSessions,
    effectiveHourlyRate,
    ...(storefrontItemId === undefined ? {} : { storefrontItemId }),
  };
};

const AdminCreateSpecialManager: React.FC = () => {
  const { clientList, loadingClients } = useGlobalClient();

  const [clientId, setClientId] = useState<string>('');
  const [basePackageType, setBasePackageType] = useState<string>('10-pack');
  const [targetRate, setTargetRate] = useState<string>('');
  const [validityType, setValidityType] = useState<ValidityType>('one_time');
  const [maxRedemptions, setMaxRedemptions] = useState<number>(2);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [name, setName] = useState<string>('SwanStudios Special');
  const [adminNote, setAdminNote] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const submittingRef = useRef(false);
  const mountedRef = useRef(false);
  const clientGenerationRef = useRef(0);

  useEffect(() => {
    // React StrictMode replays setup after cleanup on the same mounted instance.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clientGenerationRef.current += 1;
    };
  }, []);

  const selectClient = (nextClientId: string) => {
    if (nextClientId === clientId) return;
    // Invalidate synchronously: comparing IDs alone accepts an old A -> B -> A response.
    clientGenerationRef.current += 1;
    setClientId(nextClientId);
    setError(null);
    setResult(null);
  };

  const paidSessions = useMemo(
    () => BASE_PACKAGES.find((p) => p.key === basePackageType)?.paidSessions ?? 10,
    [basePackageType]
  );
  const targetNum = parseFloat(targetRate);
  const pricing = useMemo(
    () => (targetNum > 0 ? computeBonusForTargetRate(paidSessions, targetNum) : computeSpecialPricing(paidSessions, 0)),
    [paidSessions, targetNum]
  );
  const gate = useMemo(() => evaluateRateGate(pricing.effectiveHourlyRate), [pricing.effectiveHourlyRate]);

  const client = clientList.find((c) => String(c.id) === clientId);
  const clientName = client ? `${client.firstName} ${client.lastName}`.trim() : undefined;

  const validitySummary = useMemo(() => {
    switch (validityType) {
      case 'n_times': return `Up to ${maxRedemptions}× re-buys`;
      case 'time_window': return expiresAt ? `Until ${expiresAt}` : 'Time window (set end date)';
      case 'ongoing': return 'Ongoing';
      default: return 'One-time';
    }
  }, [validityType, maxRedemptions, expiresAt]);

  // No price floor — the admin is the final decider. Only real data problems block.
  const blocker = useMemo((): string | null => {
    if (!clientId) return 'Pick a client';
    if (!(targetNum > 0)) return 'Set an effective $/session';
    if (validityType === 'time_window' && !expiresAt) return 'Time window needs an end date';
    if (validityType === 'n_times' && maxRedemptions < 2) return 'Re-buys must be 2–4';
    return null;
  }, [clientId, targetNum, validityType, expiresAt, maxRedemptions]);

  const submit = useCallback(async () => {
    if (blocker || submittingRef.current) return;
    submittingRef.current = true;
    const submittedGeneration = clientGenerationRef.current;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      // Send the admin's chosen effective $/session; the SERVER computes the
      // bonus sessions authoritatively (client math is preview only).
      const res = await apiService.post('/api/custom-packages', {
        clientId: Number(clientId),
        basePackageType,
        targetEffectiveRate: targetNum,
        validityType,
        ...(validityType === 'n_times' ? { maxRedemptions } : {}),
        ...(validityType === 'time_window' ? { expiresAt } : {}),
        name,
        adminNote,
      });
      if (!mountedRef.current || clientGenerationRef.current !== submittedGeneration) return;
      const receipt = readAuthoritativeCreateResult(res.data);
      if (!receipt) {
        setError(UNCONFIRMED_CREATE);
        return;
      }
      setResult(receipt);
    } catch (e: unknown) {
      if (!mountedRef.current || clientGenerationRef.current !== submittedGeneration) return;
      const response = isRecord(e) && isRecord(e.response) ? e.response : undefined;
      const status = response?.status;
      // Network loss, timeouts and 5xx responses may occur after the commit.
      const rejected = typeof status === 'number' && status >= 400 && status < 500 && status !== 408;
      const serverMessage = response && isRecord(response.data) && typeof response.data.message === 'string'
        ? response.data.message
        : undefined;
      setError(rejected
        ? serverMessage || 'The server rejected this special. Check the form before retrying.'
        : UNCONFIRMED_CREATE);
    } finally {
      // Keep one create in flight across client selections, then release the form.
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }, [blocker, clientId, basePackageType, targetNum, validityType, maxRedemptions, expiresAt, name, adminNote]);

  return (
    <S.Page>
      <S.Header>
        <S.Title>Create Special</S.Title>
        <S.Subtitle>
          Give one client a better effective rate without dropping the $175 sticker — the discount is delivered as bonus sessions.
        </S.Subtitle>
      </S.Header>

      <S.Layout>
        <S.FormCard>
          <S.Field>
            <S.Label htmlFor="cs-client">Client</S.Label>
            <S.Select id="cs-client" value={clientId} onChange={(e) => selectClient(e.target.value)}>
              <option value="">{loadingClients ? 'Loading clients…' : 'Select a client…'}</option>
              {clientList.map((c) => (
                <option key={c.id} value={String(c.id)}>{`${c.firstName} ${c.lastName}`.trim() || `Client #${c.id}`}</option>
              ))}
            </S.Select>
          </S.Field>

          <S.Field>
            <S.Label htmlFor="cs-base">Base package</S.Label>
            <S.Select id="cs-base" value={basePackageType} onChange={(e) => setBasePackageType(e.target.value)}>
              {BASE_PACKAGES.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </S.Select>
          </S.Field>

          <S.Field>
            <S.Label htmlFor="cs-rate">Effective $ / session</S.Label>
            <S.Input
              id="cs-rate"
              type="number"
              inputMode="decimal"
              min={60}
              max={175}
              placeholder="e.g. 80"
              value={targetRate}
              onChange={(e) => setTargetRate(e.target.value)}
            />
            <S.PresetRow>
              {PRESET_TIERS.map((t) => (
                <S.PresetButton
                  key={t}
                  type="button"
                  $active={targetNum === t}
                  aria-pressed={targetNum === t}
                  onClick={() => setTargetRate(String(t))}
                >
                  {`$${t}`}
                </S.PresetButton>
              ))}
            </S.PresetRow>
            <S.Hint>Sticker stays $175 · the system adds bonus sessions to hit your target.</S.Hint>
          </S.Field>

          <S.Field>
            <S.Label>Validity</S.Label>
            <S.SegRow>
              {VALIDITY_OPTIONS.map((v) => (
                <S.SegButton
                  key={v.key}
                  type="button"
                  $active={validityType === v.key}
                  aria-pressed={validityType === v.key}
                  onClick={() => setValidityType(v.key)}
                >
                  {v.label}
                  <span>{v.hint}</span>
                </S.SegButton>
              ))}
            </S.SegRow>
            {validityType === 'n_times' && (
              <S.Select
                aria-label="Number of re-buys"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(Number(e.target.value))}
              >
                {[2, 3, 4].map((n) => (
                  <option key={n} value={n}>{`${n}× re-buys`}</option>
                ))}
              </S.Select>
            )}
            {validityType === 'time_window' && (
              <S.Input
                aria-label="Expires on"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            )}
          </S.Field>

          <S.Field>
            <S.Label htmlFor="cs-name">Name (optional)</S.Label>
            <S.Input id="cs-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </S.Field>
          <S.Field>
            <S.Label htmlFor="cs-note">Admin note (optional, not shown to client)</S.Label>
            <S.TextArea id="cs-note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
          </S.Field>

          {error && <S.Banner role="alert" aria-live="assertive" $kind="error">{error}</S.Banner>}
          {result && (
            <S.Banner role="status" aria-live="polite" $kind="success">
              Special created — {result.totalSessions} sessions at ~${Math.round(result.effectiveHourlyRate)}/session effective.
              {result.storefrontItemId ? ' It now appears in this client’s store.' : ''}
            </S.Banner>
          )}

          <S.SubmitButton type="button" disabled={submitting || !!blocker} onClick={submit}>
            {submitting ? 'Creating…' : blocker || 'Create Special'}
          </S.SubmitButton>
        </S.FormCard>

        <S.PreviewCol>
          <SpecialDealPreviewCard
            clientName={clientName}
            pricing={pricing}
            gate={gate}
            validitySummary={validitySummary}
          />
        </S.PreviewCol>
      </S.Layout>
    </S.Page>
  );
};

export default AdminCreateSpecialManager;
