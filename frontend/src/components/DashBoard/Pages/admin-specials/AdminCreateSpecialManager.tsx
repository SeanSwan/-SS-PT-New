/**
 * AdminCreateSpecialManager — admin "Create Special" form (S2).
 * Per-client bonus-session special pricing. The $175 sticker never drops; the admin
 * types the effective $/session and the system computes bonus sessions live. Floor
 * policy + validity gate mirror the server (specialPricing.ts); the server re-validates
 * and is authoritative on submit (POST /api/custom-packages).
 *
 * Mount: /dashboard/admin/create-special (route registry). Mirrors AdminSpecialsManager.
 */
import React, { useCallback, useMemo, useState } from 'react';
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

const AdminCreateSpecialManager: React.FC = () => {
  const { clientList, loadingClients } = useGlobalClient();

  const [clientId, setClientId] = useState<string>('');
  const [basePackageType, setBasePackageType] = useState<string>('10-pack');
  const [targetRate, setTargetRate] = useState<string>('');
  const [validityType, setValidityType] = useState<ValidityType>('one_time');
  const [maxRedemptions, setMaxRedemptions] = useState<number>(2);
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [belowThresholdApproved, setBelowThresholdApproved] = useState<boolean>(false);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [name, setName] = useState<string>('SwanStudios Special');
  const [adminNote, setAdminNote] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);

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

  const blocker = useMemo((): string | null => {
    if (!clientId) return 'Pick a client';
    if (!(targetNum > 0)) return 'Set an effective $/session';
    if (gate.hardBlocked) return gate.label;
    if (gate.requiresOverride && !belowThresholdApproved) return 'Below the gate — check the override box';
    if (gate.requiresReason && !overrideReason.trim()) return 'Below the floor — a reason is required';
    if (validityType === 'time_window' && !expiresAt) return 'Time window needs an end date';
    if (validityType === 'n_times' && maxRedemptions < 2) return 'Re-buys must be 2–4';
    return null;
  }, [clientId, targetNum, gate, belowThresholdApproved, overrideReason, validityType, expiresAt, maxRedemptions]);

  const submit = useCallback(async () => {
    if (blocker) return;
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiService.post('/api/custom-packages', {
        clientId: Number(clientId),
        basePackageType,
        targetEffectiveRate: targetNum,
        validityType,
        ...(validityType === 'n_times' ? { maxRedemptions } : {}),
        ...(validityType === 'time_window' ? { expiresAt } : {}),
        ...(gate.requiresOverride ? { belowThresholdApproved: true } : {}),
        ...(gate.requiresReason ? { overrideReason: overrideReason.trim() } : {}),
        name,
        adminNote,
      });
      const data = res.data || {};
      setResult({
        totalSessions: data.pricing?.totalSessions ?? pricing.totalSessions,
        effectiveHourlyRate: data.pricing?.effectiveHourlyRate ?? pricing.effectiveHourlyRate,
        storefrontItemId: data.storefrontItemId,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Could not create the special. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [blocker, clientId, basePackageType, targetNum, validityType, maxRedemptions, expiresAt, belowThresholdApproved, overrideReason, gate.requiresReason, name, adminNote, pricing]);

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
            <S.Select id="cs-client" value={clientId} onChange={(e) => setClientId(e.target.value)}>
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

          {gate.requiresOverride && (
            <S.OverrideBox>
              <S.CheckRow>
                <input
                  type="checkbox"
                  checked={belowThresholdApproved}
                  onChange={(e) => setBelowThresholdApproved(e.target.checked)}
                />
                Override the ${gate.tier === 'below_floor' ? '100 floor' : '120 gate'} for this client
              </S.CheckRow>
              {gate.requiresReason && (
                <S.TextArea
                  aria-label="Override reason"
                  placeholder="Why this deal is below the floor (logged for audit)…"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              )}
            </S.OverrideBox>
          )}

          <S.Field>
            <S.Label htmlFor="cs-name">Name (optional)</S.Label>
            <S.Input id="cs-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </S.Field>
          <S.Field>
            <S.Label htmlFor="cs-note">Admin note (optional, not shown to client)</S.Label>
            <S.TextArea id="cs-note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
          </S.Field>

          {error && <S.Banner $kind="error">{error}</S.Banner>}
          {result && (
            <S.Banner $kind="success">
              Special created — {result.totalSessions} sessions at ~${Math.round(result.effectiveHourlyRate)}/session effective.
              {result.storefrontItemId ? ' It now appears in this client’s store. (Shareable link + notification arrive in the next slice.)' : ''}
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
