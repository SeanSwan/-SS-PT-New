/**
 * ============================================================================
 * FILE: TrainerEarningsPage.tsx (Dashboard batch 2026-07-13, P1-1)
 * PURPOSE: Trainer "My Earnings" — the first trainer-facing view of the
 *          commission ledger that already records every attributed sale
 *          (TrainerCommission via CommissionService at purchase time).
 *          Totals (earned / unpaid / paid) + per-commission ledger rows with
 *          lead-source, rate, and payout status.
 * HOW IT FITS: /dashboard/trainer/earnings (UniversalDashboardLayout trainer
 *          route) + BUSINESS section in TrainerStellarSidebar.
 * DATA TRUTH: rows come from GET /api/commissions/trainer/:trainerId
 *          (self-authorized server-side). Loading/empty/error states are
 *          explicit — no fabricated zeros, no demo data.
 * ============================================================================
 */
import React from 'react';
import { Wallet } from 'lucide-react';
import useTrainerEarnings, { TrainerCommissionRow } from './useTrainerEarnings';
import {
  PageWrap, PageTitle, PageSubtitle,
  TotalsGrid, TotalCard, TotalLabel, TotalValue,
  LedgerCard, LedgerTitle, CommissionRow, RowMain, RowClient, RowMeta,
  RowMoney, RowCut, RowGross, Pill, StateNote, RetryButton, Disclosure,
} from './TrainerEarningsPage.styles';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const LEAD_SOURCE_LABELS: Record<string, string> = {
  platform: 'Platform lead',
  trainer_brought: 'Your client',
  resign: 'Renewal',
};

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const CommissionLedgerRow: React.FC<{ row: TrainerCommissionRow }> = ({ row }) => {
  const ratePct = Math.round((Number(row.commissionRateTrainer) || 0) * 100);
  const sourceLabel = row.leadSource ? (LEAD_SOURCE_LABELS[row.leadSource] ?? row.leadSource) : null;
  return (
    <CommissionRow aria-label={`Commission for ${row.clientName}`}>
      <RowMain>
        <RowClient>{row.clientName}</RowClient>
        <RowMeta>
          {formatDate(row.createdAt)}
          {row.sessionsGranted > 0 ? ` · ${row.sessionsGranted} sessions` : ''}
          {ratePct > 0 ? ` · ${ratePct}% rate` : ''}
        </RowMeta>
      </RowMain>
      {sourceLabel && <Pill $tone="source">{sourceLabel}</Pill>}
      <Pill $tone={row.paidToTrainerAt ? 'paid' : 'unpaid'}>
        {row.paidToTrainerAt ? `Paid${row.payoutMethod ? ` · ${row.payoutMethod}` : ''}` : 'Unpaid'}
      </Pill>
      <RowMoney>
        <RowCut>{usd.format(row.trainerCut)}</RowCut>
        <RowGross>of {usd.format(row.grossAmount)} gross</RowGross>
      </RowMoney>
    </CommissionRow>
  );
};

const TrainerEarningsPage: React.FC = () => {
  const { loading, error, earnings, refetch } = useTrainerEarnings();

  return (
    <PageWrap>
      <div>
        <PageTitle>
          <Wallet size={22} aria-hidden="true" />
          My Earnings
        </PageTitle>
        <PageSubtitle>
          Your commission ledger — every attributed package sale, what you earned, and what's been paid out.
        </PageSubtitle>
      </div>

      {loading && <StateNote role="status">Loading your earnings…</StateNote>}

      {!loading && error && (
        <LedgerCard>
          <StateNote role="alert">{error}</StateNote>
          <RetryButton type="button" onClick={refetch}>Try again</RetryButton>
        </LedgerCard>
      )}

      {!loading && !error && earnings && (
        <>
          <TotalsGrid>
            <TotalCard>
              <TotalLabel>Total earned</TotalLabel>
              <TotalValue>{usd.format(earnings.totalEarned)}</TotalValue>
            </TotalCard>
            <TotalCard $tone="unpaid">
              <TotalLabel>Unpaid balance</TotalLabel>
              <TotalValue>{usd.format(earnings.unpaid)}</TotalValue>
            </TotalCard>
            <TotalCard $tone="paid">
              <TotalLabel>Paid out</TotalLabel>
              <TotalValue>{usd.format(earnings.paid)}</TotalValue>
            </TotalCard>
          </TotalsGrid>

          <LedgerCard>
            <LedgerTitle>Commission history</LedgerTitle>
            {earnings.commissions.length === 0 ? (
              <StateNote>
                No earnings recorded yet. A commission appears here automatically when a client
                assigned to you purchases a package.
              </StateNote>
            ) : (
              earnings.commissions.map((row) => <CommissionLedgerRow key={row.id} row={row} />)
            )}
            <Disclosure>
              Recorded at purchase time from real orders. Payouts are marked by the studio admin.
            </Disclosure>
          </LedgerCard>
        </>
      )}
    </PageWrap>
  );
};

export default TrainerEarningsPage;
