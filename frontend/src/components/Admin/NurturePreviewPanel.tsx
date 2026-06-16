/**
 * NurturePreviewPanel
 * ===================
 * READ-ONLY nurture operator cockpit. Shows what the automation engine WOULD do
 * if armed — a dry-run audience + per-recipient decision + rendered templates —
 * so Sean can inspect the pipeline before flipping SWAN_AUTOMATION_CRON_ENABLED.
 *
 * Sends NOTHING and mutates NOTHING: it only reads GET /api/automation/preview
 * and /templates/preview (both admin-only). All data is PII-safe by construction
 * (recipient shown as User/Lead #id + presence booleans — never a phone number).
 *
 * Mounted inside AutomationManager (admin route /automation). Matches the
 * UniversalMasterSchedule UI kit; low-motion (admin data surface).
 */

import React from 'react';
import styled from 'styled-components';
import { RefreshCw, ShieldCheck, Send, Clock, XCircle, AlertTriangle } from 'lucide-react';
import {
  SectionTitle,
  BodyText,
  SmallText,
  HelperText,
  ErrorText,
  Card,
  CardHeader,
  CardBody,
  FlexBox,
} from '../UniversalMasterSchedule/ui';
import {
  useNurturePreview,
  type NurturePreviewAction,
  type NurturePreviewItem,
} from '../../hooks/useNurturePreview';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.5rem;
`;

const TileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
`;

const Tile = styled.div`
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.18));
  background: var(--surface-elevated, rgba(0, 32, 96, 0.35));
  border-radius: 12px;
  padding: 0.85rem 1rem;
`;

const TileValue = styled.div`
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
  line-height: 1.1;
`;

const RefreshButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0 1rem;
  border-radius: 10px;
  border: 1px solid var(--accent-primary, #60c0f0);
  background: transparent;
  color: var(--accent-primary, #60c0f0);
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.55; cursor: default; }
  &:hover:not(:disabled) { background: color-mix(in srgb, var(--accent-primary, #60c0f0) 14%, transparent); }
`;

const DryRunBadge = styled.span`
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--accent-gold, #c6a84b);
  background: color-mix(in srgb, var(--accent-gold, #c6a84b) 16%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #c6a84b) 44%, transparent);
`;

const ACTION_META: Record<NurturePreviewAction, { color: string; label: string }> = {
  send: { color: 'var(--success, #10b981)', label: 'Would send' },
  defer: { color: 'var(--accent-gold, #c6a84b)', label: 'Would defer' },
  cancel: { color: 'var(--text-muted, #8aa0b4)', label: 'Would cancel' },
  fail: { color: 'var(--error, #ef4444)', label: 'Would fail' },
};

const ActionPill = styled.span<{ $tone: string }>`
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
  color: ${({ $tone }) => $tone};
  background: ${({ $tone }) => `color-mix(in srgb, ${$tone} 18%, transparent)`};
  border: 1px solid ${({ $tone }) => `color-mix(in srgb, ${$tone} 44%, transparent)`};
`;

const ItemRow = styled.div`
  display: grid;
  grid-template-columns: minmax(110px, 1fr) minmax(90px, 0.8fr) minmax(120px, 1.2fr) auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  @media (max-width: 560px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Flag = styled.span<{ $on: boolean }>`
  font-size: 0.72rem;
  font-weight: 600;
  color: ${({ $on }) => ($on ? 'var(--success, #10b981)' : 'var(--text-muted, #8aa0b4)')};
`;

const recipientLabel = (item: NurturePreviewItem): string => {
  if (item.recipientKind === 'user' && item.userId) return `User #${item.userId}`;
  if (item.recipientKind === 'lead' && item.leadId) return `Lead #${item.leadId}`;
  return '— no recipient';
};

const SUMMARY_TILES: Array<{ key: keyof NurturePreviewItem | string; label: string; icon: React.ReactNode; field: 'wouldSend' | 'wouldDefer' | 'wouldCancel' | 'wouldFail' }> = [
  { key: 'send', label: 'Would send', icon: <Send size={14} />, field: 'wouldSend' },
  { key: 'defer', label: 'Would defer', icon: <Clock size={14} />, field: 'wouldDefer' },
  { key: 'cancel', label: 'Would cancel', icon: <XCircle size={14} />, field: 'wouldCancel' },
  { key: 'fail', label: 'Would fail', icon: <AlertTriangle size={14} />, field: 'wouldFail' },
];

const NurturePreviewPanel: React.FC = () => {
  const { preview, templates, isLoading, error, refetch } = useNurturePreview();
  const reasons = Object.entries(preview.byReason || {});

  return (
    <Container>
      <Card>
        <CardHeader>
          <FlexBox justify="space-between" align="center" wrap gap="0.5rem">
            <FlexBox align="center" gap="0.6rem">
              <SectionTitle>Nurture Preview</SectionTitle>
              <DryRunBadge>DRY-RUN · SENDS NOTHING</DryRunBadge>
            </FlexBox>
            <RefreshButton onClick={() => { void refetch(); }} disabled={isLoading} aria-label="Refresh nurture preview">
              <RefreshCw size={16} /> {isLoading ? 'Refreshing…' : 'Refresh'}
            </RefreshButton>
          </FlexBox>
        </CardHeader>
        <CardBody>
          <HelperText>
            <ShieldCheck size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
            Outbound automation is armed via <code>SWAN_AUTOMATION_CRON_ENABLED</code> on Render. This panel only
            previews what the engine <strong>would</strong> do right now — it never sends or changes anything.
          </HelperText>

          {error && <ErrorText>{error}</ErrorText>}

          <TileGrid style={{ marginTop: '1rem' }}>
            <Tile>
              <SmallText secondary>Pending due now</SmallText>
              <TileValue>{preview.total}</TileValue>
            </Tile>
            {SUMMARY_TILES.map((t) => (
              <Tile key={t.key}>
                <SmallText secondary>{t.icon} {t.label}</SmallText>
                <TileValue>{preview.summary[t.field]}</TileValue>
              </Tile>
            ))}
          </TileGrid>

          {reasons.length > 0 && (
            <FlexBox wrap gap="0.4rem" style={{ marginTop: '0.85rem' }}>
              {reasons.map(([reason, count]) => (
                <SmallText key={reason} secondary>
                  {reason}: <strong>{count}</strong>
                </SmallText>
              ))}
            </FlexBox>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><SectionTitle>Audience ({preview.items.length})</SectionTitle></CardHeader>
        <CardBody>
          {isLoading && <SmallText secondary>Loading dry-run audience…</SmallText>}
          {!isLoading && !preview.items.length && (
            <BodyText secondary>No messages are due right now — nothing would send if armed.</BodyText>
          )}
          {!isLoading && preview.items.map((item) => {
            const meta = ACTION_META[item.action] || ACTION_META.fail;
            return (
              <ItemRow key={item.id}>
                <FlexBox direction="column" gap="0.15rem">
                  <SmallText>{recipientLabel(item)}</SmallText>
                  <SmallText secondary>{item.channel}{item.templateName ? ` · ${item.templateName}` : ''}</SmallText>
                </FlexBox>
                <ActionPill $tone={meta.color}>{meta.label}</ActionPill>
                <SmallText secondary>{item.reason}</SmallText>
                <FlexBox gap="0.6rem" justify="flex-end" wrap>
                  <Flag $on={item.hasPhone}>{item.hasPhone ? 'phone ✓' : 'no phone'}</Flag>
                  <Flag $on={!item.suppressed}>{item.suppressed ? 'suppressed' : 'sendable'}</Flag>
                </FlexBox>
              </ItemRow>
            );
          })}
        </CardBody>
      </Card>

      {templates.length > 0 && (
        <Card>
          <CardHeader><SectionTitle>Template copy ({templates.length})</SectionTitle></CardHeader>
          <CardBody>
            <FlexBox direction="column" gap="0.75rem">
              {templates.map((t) => (
                <div key={t.name}>
                  <SmallText>{t.name}</SmallText>
                  <BodyText secondary>{t.message}</BodyText>
                </div>
              ))}
            </FlexBox>
          </CardBody>
        </Card>
      )}
    </Container>
  );
};

export default NurturePreviewPanel;
