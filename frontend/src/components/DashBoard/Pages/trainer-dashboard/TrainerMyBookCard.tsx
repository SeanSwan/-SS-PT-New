/**
 * ============================================================================
 * FILE: TrainerMyBookCard.tsx (Dashboard batch 2026-07-13, P1-3)
 * PURPOSE: "My Book" — the trainer home's business-at-a-glance card: active
 *          client count (assigned roster) + unpaid earnings balance, with a
 *          one-tap jump to the full earnings ledger. The coaching loop
 *          (sessions, interventions) lives in sibling cards; this is the
 *          money/roster loop.
 * DATA TRUTH: roster from GET /api/client-trainer-assignments/trainer/:id
 *          (assigned-only, strict), earnings from
 *          GET /api/commissions/trainer/:id. Each chip renders only when its
 *          fetch succeeds; the card self-hides entirely when both fail —
 *          a wrong number is worse than no card.
 * ============================================================================
 */
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Briefcase, ChevronRight } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { fetchClientHubClientsStrict } from '../../workspaces/ClientsWorkspace.data';

const BookCard = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  background: var(--surface-dark, #1a1a24);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 20%, transparent);
`;

const BookTitle = styled.h3`
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary, #e0ecf4);
`;

const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const StatChip = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--card-dark, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  /* Grow to fill, but shrink below 110px on narrow rails instead of forcing
     the side column past the viewport (overflow was clipped off-screen). */
  flex: 1 1 96px;
  min-width: 0;
  max-width: 100%;
`;

const ChipValue = styled.strong`
  font-family: 'Fira Code', monospace;
  font-size: 16px;
  color: var(--text-primary, #e0ecf4);
  min-width: 0;
  overflow-wrap: anywhere;
`;

const ChipLabel = styled.span`
  font-size: 11px;
  color: var(--text-secondary, #9fb6c8);
`;

const EarningsLink = styled.button`
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary, #e0ecf4);
  background: var(--primary, #002060);
  border: 1px solid color-mix(in srgb, var(--accent-glow, #8b5cf6) 45%, transparent);

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
`;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/* The roster fetcher takes a structural axios shape (config?: unknown) that
   AxiosInstance doesn't satisfy nominally — derive it, as useClientHubRoster does. */
type HubAxios = Parameters<typeof fetchClientHubClientsStrict>[0];

const TrainerMyBookCard: React.FC = () => {
  const { user, authAxios } = useAuth();
  const navigate = useNavigate();
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [unpaid, setUnpaid] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);

  const trainerId = Number(user?.id);

  useEffect(() => {
    if (!Number.isSafeInteger(trainerId) || trainerId <= 0 || typeof authAxios?.get !== 'function') {
      setSettled(true);
      return undefined;
    }
    let mounted = true;
    const roster = fetchClientHubClientsStrict(authAxios as unknown as HubAxios, 'trainer', trainerId)
      .then((clients) => { if (mounted) setClientCount(clients.length); })
      .catch(() => {});
    const earnings = Promise.resolve()
      .then(() => authAxios.get(`/api/commissions/trainer/${trainerId}`))
      .then((res: { data?: { success?: boolean; unpaid?: number } }) => {
        if (mounted && res?.data?.success && Number.isFinite(Number(res.data.unpaid))) {
          setUnpaid(Number(res.data.unpaid));
        }
      })
      .catch(() => {});
    Promise.allSettled([roster, earnings]).then(() => { if (mounted) setSettled(true); });
    return () => { mounted = false; };
  }, [authAxios, trainerId]);

  // Self-hide until settled, and entirely when nothing loaded — a wrong
  // number on the money card is worse than no card.
  if (!settled || (clientCount === null && unpaid === null)) return null;

  return (
    <BookCard aria-label="My book of business">
      <BookTitle>
        <Briefcase size={16} aria-hidden="true" />
        My Book
      </BookTitle>
      <ChipRow>
        {clientCount !== null && (
          <StatChip>
            <ChipValue>{clientCount}</ChipValue>
            <ChipLabel>Active clients</ChipLabel>
          </StatChip>
        )}
        {unpaid !== null && (
          <StatChip>
            <ChipValue>{usd.format(unpaid)}</ChipValue>
            <ChipLabel>Unpaid earnings</ChipLabel>
          </StatChip>
        )}
      </ChipRow>
      <EarningsLink
        type="button"
        onClick={() => navigate('/dashboard/trainer/earnings')}
        aria-label="Open my earnings ledger"
      >
        View earnings
        <ChevronRight size={16} aria-hidden="true" />
      </EarningsLink>
    </BookCard>
  );
};

export default TrainerMyBookCard;
