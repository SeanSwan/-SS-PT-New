/**
 * FILE: CampaignForm.tsx
 * BLUEPRINT: Controlled create form for a MarketingCampaign (child of CampaignManager).
 *   Client-side required-name guard mirrors the server whitelist/validation; the parent
 *   owns the API call so this component stays presentational + reusable.
 */

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { CampaignObjective, CampaignStatus } from './marketing.types';
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES } from './marketing.types';
import * as S from './CampaignForm.styles';

export interface CampaignDraft {
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  offer: string;
  utmCampaign: string;
  budget: string;
  startAt: string;
  endAt: string;
}

const emptyDraft = (): CampaignDraft => ({
  name: '',
  objective: 'lead_generation',
  status: 'draft',
  offer: '',
  utmCampaign: '',
  budget: '',
  startAt: '',
  endAt: '',
});

interface Props {
  onSubmit: (draft: CampaignDraft) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
}

const CampaignForm: React.FC<Props> = ({ onSubmit, onCancel, submitting }) => {
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => nameInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const set = (key: keyof CampaignDraft, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) { setError('Campaign name is required.'); return; }
    setError(null);
    try {
      await onSubmit(draft);
    } catch {
      setError('Could not save the campaign. Please try again.');
    }
  };

  return (
    <S.Form onSubmit={submit} aria-label="Create campaign">
      <S.FormHead>
        <S.FormTitle>New Campaign</S.FormTitle>
        <S.CloseButton type="button" onClick={onCancel} aria-label="Close form"><X size={16} /></S.CloseButton>
      </S.FormHead>

      <S.FormGrid>
        <S.Field $span={2}>
          <S.Label>Name *</S.Label>
          <S.Input
            id="campaign-name"
            ref={nameInputRef}
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Q3 Booking Push"
            maxLength={180}
          />
        </S.Field>

        <S.Field>
          <S.Label>Objective</S.Label>
          <S.Select id="campaign-objective" value={draft.objective} onChange={(e) => set('objective', e.target.value)}>
            {CAMPAIGN_OBJECTIVES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </S.Select>
        </S.Field>

        <S.Field>
          <S.Label>Status</S.Label>
          <S.Select id="campaign-status" value={draft.status} onChange={(e) => set('status', e.target.value)}>
            {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </S.Select>
        </S.Field>

        <S.Field>
          <S.Label>Start</S.Label>
          <S.Input id="campaign-start" type="date" value={draft.startAt} onChange={(e) => set('startAt', e.target.value)} />
        </S.Field>

        <S.Field>
          <S.Label>End</S.Label>
          <S.Input id="campaign-end" type="date" value={draft.endAt} onChange={(e) => set('endAt', e.target.value)} />
        </S.Field>

        <S.Field>
          <S.Label>Budget ($)</S.Label>
          <S.Input id="campaign-budget" type="number" min="0" step="0.01" value={draft.budget} onChange={(e) => set('budget', e.target.value)} placeholder="0.00" />
        </S.Field>

        <S.Field>
          <S.Label>UTM campaign</S.Label>
          <S.Input id="campaign-utm" value={draft.utmCampaign} onChange={(e) => set('utmCampaign', e.target.value)} placeholder="q3-booking" maxLength={120} />
        </S.Field>

        <S.Field $span={2}>
          <S.Label>Offer</S.Label>
          <S.Textarea id="campaign-offer" value={draft.offer} onChange={(e) => set('offer', e.target.value)} rows={2} placeholder="What is this campaign selling or promoting?" />
        </S.Field>
      </S.FormGrid>

      {error && <S.FormError>{error}</S.FormError>}

      <S.FormActions>
        <S.GhostButton type="button" onClick={onCancel} disabled={submitting}>Cancel</S.GhostButton>
        <S.SubmitButton type="submit" disabled={submitting}>{submitting ? 'Saving…' : 'Create campaign'}</S.SubmitButton>
      </S.FormActions>
    </S.Form>
  );
};

export default CampaignForm;
