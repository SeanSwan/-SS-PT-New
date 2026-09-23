/**
 * SpeedToLeadStatusCard — L5 S5
 * =============================
 * Surfaces whether the speed-to-lead email drip is ARMED, plus a PII-safe view of
 * recent email rows. Mirrors LeadPipelinePanel's fetch/auth pattern: `authAxios`
 * from context, a `useCallback` fetch invoked from an effect.
 *
 * Reads:
 *   GET /api/automation/status   -> { success, data: { armed: boolean } }
 *   GET /api/automation/preview  -> { success, data: { items: [...] } }
 *
 * MASKING HAPPENS IN THE RENDER LAYER, NOT THE API (06-bans.md). The preview
 * endpoint is already admin-gated and other consumers may legitimately need full
 * addresses later, so the full address must never reach the DOM here: the masked
 * string is computed before render and the raw value is never placed in a node or
 * an attribute.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Mail, RefreshCw } from 'lucide-react';
import styled from 'styled-components';
import { useAuth } from '../../../../context/AuthContext';

const CARD_SURFACE = 'var(--card-dark, #141419)';
const CARD_TEXT = 'var(--text-primary, #E0ECF4)';
const CARD_MUTED = 'var(--text-secondary, #9aa4b2)';
const CARD_ACCENT = 'var(--accent-primary, #60C0F0)';
const ARMED_GREEN = 'var(--state-success, #10b981)';
const OFF_GRAY = 'var(--state-idle, #6b7280)';

const Card = styled.section`
  background: ${CARD_SURFACE};
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 20px;
  color: ${CARD_TEXT};
  margin-bottom: 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
`;

const Badge = styled.span<{ $armed: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: ${({ $armed }) => ($armed ? ARMED_GREEN : OFF_GRAY)};
`;

const Dot = styled.span<{ $armed: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $armed }) => ($armed ? ARMED_GREEN : OFF_GRAY)};
`;

const Sequence = styled.span`
  font-size: 12px;
  color: ${CARD_MUTED};
`;

const Trio = styled.div`
  display: flex;
  gap: 24px;
  padding: 14px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-wrap: wrap;
  @media (max-width: 640px) {
    flex-direction: column;
    gap: 10px;
  }
`;

const Stat = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
`;

const StatValue = styled.span`
  font-size: 20px;
  font-weight: 700;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: ${CARD_MUTED};
`;

const RecentList = styled.ul`
  list-style: none;
  margin: 14px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const RecentRow = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: ${CARD_TEXT};
  @media (max-width: 640px) {
    flex-wrap: wrap;
  }
`;

const RowMeta = styled.span`
  margin-left: auto;
  font-size: 12px;
  color: ${CARD_MUTED};
`;

const Ok = styled.span`
  color: ${ARMED_GREEN};
`;

const Bad = styled.span`
  color: #f87171;
`;

const Footer = styled.div`
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
`;

const PreviewButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  background: ${CARD_ACCENT};
  color: #08121a;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  &:hover {
    filter: brightness(1.08);
  }
  @media (max-width: 640px) {
    width: 100%;
    justify-content: center;
  }
`;

const SkeletonWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const SkeletonBar = styled.div<{ $w: string }>`
  height: 14px;
  width: ${({ $w }) => $w};
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
`;

const ErrorLine = styled.p`
  margin: 0;
  font-size: 13px;
  color: #f87171;
`;

const EmptyLine = styled.p`
  margin: 14px 0 0;
  font-size: 13px;
  color: ${CARD_MUTED};
`;

const ERROR_COPY = "Couldn't load automation status — refresh or check /api/automation/status.";

interface PreviewItem {
  id: number | string;
  channel?: string;
  templateName?: string | null;
  recipient?: string | null;
  action?: string;
  reason?: string;
  createdAt?: string;
}

/**
 * Mask an address for display: first char + `***` + `@domain`.
 * Returns '' for anything that is not address-shaped — never a partial leak.
 */
export const maskAddress = (value?: string | null): string => {
  if (!value || typeof value !== 'string') return '';
  const at = value.indexOf('@');
  if (at <= 0) return '';
  return `${value[0]}***${value.slice(at)}`;
};

/** Relative time for the recents list; falls back to nothing rather than "Invalid Date". */
const relativeTime = (value?: string): string => {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const SpeedToLeadStatusCard: React.FC = () => {
  const { authAxios } = useAuth();
  const [armed, setArmed] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, previewRes] = await Promise.all([
        authAxios.get('/api/automation/status'),
        authAxios.get('/api/automation/preview'),
      ]);
      setArmed(Boolean(statusRes.data?.data?.armed));
      const all = Array.isArray(previewRes.data?.data?.items) ? previewRes.data.data.items : [];
      setItems(all.filter((row: PreviewItem) => row.channel === 'email'));
    } catch {
      setError(ERROR_COPY);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Card aria-busy="true" aria-label="Speed-to-Lead">
        <SkeletonWrap>
          <SkeletonBar $w="140px" />
          <SkeletonBar $w="240px" />
          <SkeletonBar $w="180px" />
        </SkeletonWrap>
      </Card>
    );
  }

  if (error) {
    return (
      <Card aria-label="Speed-to-Lead">
        <ErrorLine role="alert">{error}</ErrorLine>
      </Card>
    );
  }

  const pending = items.filter((r) => r.action !== 'send').length;
  const sent7d = items.filter((r) => r.action === 'send').length;
  const failed = items.filter((r) => r.action === 'fail').length;
  const recent = items.slice(0, 3);

  return (
    <Card aria-label="Speed-to-Lead">
      <Header>
        <TitleRow>
          <Mail size={18} style={{ opacity: 0.75 }} />
          Speed-to-Lead
        </TitleRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Badge $armed={armed}>
            <Dot $armed={armed} aria-hidden="true" />
            {armed ? 'ARMED' : 'DISARMED'}
          </Badge>
          <Sequence>Sequence: speed_to_lead (email)</Sequence>
        </div>
      </Header>

      <Trio>
        <Stat>
          <StatValue>{pending}</StatValue>
          <StatLabel>Pending emails</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{sent7d}</StatValue>
          <StatLabel>Sent (7d)</StatLabel>
        </Stat>
        <Stat>
          <StatValue>{failed}</StatValue>
          <StatLabel>Failed</StatLabel>
        </Stat>
      </Trio>

      {recent.length === 0 ? (
        <EmptyLine>No email activity yet — the sequence is seeded off.</EmptyLine>
      ) : (
        <RecentList aria-label="Recent email activity">
          {recent.map((row) => (
            <RecentRow key={row.id}>
              <Mail size={13} style={{ opacity: 0.6 }} aria-hidden="true" />
              <span>{row.templateName || 'unknown template'}</span>
              <span>→ {maskAddress(row.recipient)}</span>
              <RowMeta>
                {relativeTime(row.createdAt)}{' '}
                {row.action === 'fail' ? (
                  <Bad title={row.reason || 'failed'}>✗</Bad>
                ) : (
                  <Ok aria-label="ok">✓</Ok>
                )}
              </RowMeta>
            </RecentRow>
          ))}
        </RecentList>
      )}

      <Footer>
        <PreviewButton href="/api/automation/preview" target="_blank" rel="noreferrer">
          <RefreshCw size={15} aria-hidden="true" />
          Open Preview
        </PreviewButton>
      </Footer>
    </Card>
  );
};

export default SpeedToLeadStatusCard;
