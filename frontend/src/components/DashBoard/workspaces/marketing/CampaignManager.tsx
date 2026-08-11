/**
 * FILE: CampaignManager.tsx
 * BLUEPRINT: Admin campaign-spine management, embedded in the Marketing Overview.
 *   Lists campaigns, creates them, quick-changes status (optimistic), and archives
 *   (soft-delete, confirmed). This is where the MarketingCampaign spine (Slice 2)
 *   becomes usable — the organizing object every later marketing feature attaches to.
 *   Low-motion data surface per the Swan Card standard; all calls go through the shared
 *   authAxios transport.
 * DATA: /api/admin/marketing-campaigns (GET/POST/PUT/DELETE, protect + adminOnly).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, Plus, Archive, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import type { MarketingCampaign, CampaignStatus } from './marketing.types';
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES } from './marketing.types';
import CampaignForm, { type CampaignDraft } from './CampaignForm';
import * as S from './CampaignManager.styles';
import ConfirmActionDialog from '../../../Shared/ConfirmActionDialog';

const OBJECTIVE_LABEL: Record<string, string> = Object.fromEntries(
  CAMPAIGN_OBJECTIVES.map((o) => [o.value, o.label]),
);

const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : null);

const toPayload = (d: CampaignDraft) => ({
  name: d.name.trim(),
  objective: d.objective,
  status: d.status,
  offer: d.offer.trim() || null,
  utmCampaign: d.utmCampaign.trim() || null,
  budget: d.budget ? Number(d.budget) : null,
  startAt: d.startAt || null,
  endAt: d.endAt || null,
});

const CampaignManager: React.FC = () => {
  const { authAxios } = useAuth();
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [showForm, setShowForm] = useState(false);
  const [pendingArchive, setPendingArchive] = useState<MarketingCampaign | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<CampaignStatus | 'all'>('all');

  const load = useCallback(() => {
    setState('loading');
    authAxios.get('/api/admin/marketing-campaigns')
      .then((res) => { setCampaigns(res.data?.data ?? []); setState('ready'); })
      .catch(() => setState('error'));
  }, [authAxios]);

  useEffect(() => { load(); }, [load]);

  const create = async (draft: CampaignDraft) => {
    setSubmitting(true);
    try {
      await authAxios.post('/api/admin/marketing-campaigns', toPayload(draft));
      setShowForm(false);
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (c: MarketingCampaign, status: CampaignStatus) => {
    setCampaigns((list) => list.map((x) => (x.id === c.id ? { ...x, status } : x))); // optimistic
    try {
      await authAxios.put(`/api/admin/marketing-campaigns/${c.id}`, { status });
    } catch {
      load(); // reconcile on failure
    }
  };

  // Archiving hides a campaign from the active list; it confirms through the
  // branded dialog rather than the browser's grey system prompt.
  const archive = async (c: MarketingCampaign) => {
    setPendingArchive(c);
  };

  const confirmArchive = async () => {
    const c = pendingArchive;
    if (!c) return;
    setPendingArchive(null);
    setCampaigns((list) => list.filter((x) => x.id !== c.id)); // optimistic
    try {
      await authAxios.delete(`/api/admin/marketing-campaigns/${c.id}`);
    } catch {
      load();
    }
  };

  const visible = filter === 'all' ? campaigns : campaigns.filter((c) => c.status === filter);

  return (
    <S.Panel aria-label="Marketing campaigns">
      <S.Header>
        <S.HeaderLeft>
          <S.IconWrap><Megaphone size={18} /></S.IconWrap>
          <div>
            <S.Title>Campaigns</S.Title>
            <S.Subtitle>The spine that ties offers, content, leads, and revenue together.</S.Subtitle>
          </div>
        </S.HeaderLeft>
        <S.NewButton type="button" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> New Campaign
        </S.NewButton>
      </S.Header>

      {showForm && <CampaignForm onSubmit={create} onCancel={() => setShowForm(false)} submitting={submitting} />}

      <S.FilterRow role="tablist" aria-label="Filter campaigns by status">
        {(['all', ...CAMPAIGN_STATUSES] as const).map((f) => (
          <S.FilterPill
            key={f}
            type="button"
            $active={filter === f}
            onClick={() => setFilter(f)}
            role="tab"
            aria-selected={filter === f}
          >
            {f}
          </S.FilterPill>
        ))}
      </S.FilterRow>

      {state === 'loading' && <S.StateBlock><Loader2 size={16} /> Loading campaigns…</S.StateBlock>}
      {state === 'error' && (
        <S.StateBlock><AlertTriangle size={16} /> Could not load campaigns — check admin access, then retry.</S.StateBlock>
      )}

      {state === 'ready' && visible.length === 0 && (
        <S.EmptyState>
          <Megaphone size={22} />
          {campaigns.length === 0
            ? 'No campaigns yet — create your first to organize your marketing.'
            : 'No campaigns match this filter.'}
        </S.EmptyState>
      )}

      {state === 'ready' && visible.length > 0 && (
        <S.List>
          {visible.map((c) => (
            <S.Row key={c.id} $status={c.status}>
              <S.RowMain>
                <S.RowName title={c.name}>{c.name}</S.RowName>
                <S.RowMeta>
                  <S.ObjectiveBadge>{OBJECTIVE_LABEL[c.objective] || c.objective}</S.ObjectiveBadge>
                  {(fmtDate(c.startAt) || fmtDate(c.endAt)) && (
                    <S.MetaText>{fmtDate(c.startAt) || '—'} → {fmtDate(c.endAt) || '—'}</S.MetaText>
                  )}
                  {c.utmCampaign && <S.MetaText>utm: {c.utmCampaign}</S.MetaText>}
                </S.RowMeta>
              </S.RowMain>
              <S.RowActions>
                <S.StatusSelect
                  value={c.status}
                  $status={c.status}
                  aria-label={`Status for ${c.name}`}
                  onChange={(e) => changeStatus(c, e.target.value as CampaignStatus)}
                >
                  {CAMPAIGN_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </S.StatusSelect>
                <S.IconButton type="button" onClick={() => archive(c)} aria-label={`Archive ${c.name}`}>
                  <Archive size={15} />
                </S.IconButton>
              </S.RowActions>
            </S.Row>
          ))}
        </S.List>
      )}
      <ConfirmActionDialog
        open={pendingArchive !== null}
        title="Archive campaign?"
        message={pendingArchive ? `Archive "${pendingArchive.name}"? It will be hidden from the active list.` : ''}
        confirmLabel="Archive campaign"
        tone="warning"
        onCancel={() => setPendingArchive(null)}
        onConfirm={confirmArchive}
      />
    </S.Panel>
  );
};

export default CampaignManager;
