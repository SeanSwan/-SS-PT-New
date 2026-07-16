/**
 * ============================================================================
 * FILE: AdminTrainerPayoutsPanel.tsx (Dashboard batch 2026-07-13, P1-2)
 * PURPOSE: Admin Trainer Payouts console — the first admin UI over the
 *          commission ledger that has recorded every attributed sale since
 *          launch (TrainerCommission). Studio totals, per-trainer balances,
 *          expandable unpaid ledgers, and a mark-paid flow (method +
 *          reference) against POST /api/commissions/mark-paid.
 * HOW IT FITS: /dashboard/admin/trainer-payouts (UniversalDashboardLayout
 *          admin route) + BUSINESS section entry in WORKSPACE_CONFIG.
 * DATA TRUTH: all numbers from /api/commissions/summary and
 *          /api/commissions/trainer/:id. Explicit loading/empty/error states.
 * ============================================================================
 */
import React, { useCallback, useState } from 'react';
import { Banknote } from 'lucide-react';
import useAdminCommissions, { PAYOUT_METHODS, PayoutMethod, TrainerCommissionSummary } from './useAdminCommissions';
import type { TrainerCommissionRow } from '../trainer-dashboard/useTrainerEarnings';
import {
  PageWrap, PageTitle, PageSubtitle, TotalsGrid, TotalCard, TotalLabel, TotalValue,
  TrainerCard, TrainerHeaderRow, TrainerName, TrainerMeta, MoneyRight, UnpaidChip,
  LedgerList, LedgerRow, LedgerText, LedgerMoney, PayoutForm, PayoutSelect,
  PayoutInput, PrimaryButton, StateNote, Disclosure,
} from './AdminTrainerPayoutsPanel.styles';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const trainerDisplayName = (t: TrainerCommissionSummary): string => {
  const name = [t.firstName, t.lastName].filter(Boolean).join(' ').trim();
  return name || `Trainer #${t.trainerId}`;
};

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

interface TrainerLedgerProps {
  trainer: TrainerCommissionSummary;
  fetchLedger: (trainerId: number) => Promise<TrainerCommissionRow[]>;
  markPaid: (ids: number[], method: PayoutMethod, reference?: string) => Promise<number>;
  onSettled: (updatedCount: number, requestedCount: number) => void;
}

const TrainerLedger: React.FC<TrainerLedgerProps> = ({ trainer, fetchLedger, markPaid, onSettled }) => {
  const [rows, setRows] = useState<TrainerCommissionRow[] | null>(null);
  const [ledgerError, setLedgerError] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [method, setMethod] = useState<PayoutMethod>('zelle');
  const [reference, setReference] = useState('');
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState(false);

  React.useEffect(() => {
    let mounted = true;
    fetchLedger(trainer.trainerId)
      .then((ledger) => {
        if (!mounted) return;
        const unpaid = ledger.filter((row) => !row.paidToTrainerAt);
        setRows(unpaid);
        setSelected(new Set(unpaid.map((row) => row.id)));
      })
      .catch(() => { if (mounted) setLedgerError(true); });
    return () => { mounted = false; };
  }, [fetchLedger, trainer.trainerId]);

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedTotal = (rows ?? [])
    .filter((row) => selected.has(row.id))
    .reduce((sum, row) => sum + row.trainerCut, 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (selected.size === 0 || settling) return;
    setSettling(true);
    setSettleError(false);
    try {
      const updatedCount = await markPaid(Array.from(selected), method, reference.trim() || undefined);
      onSettled(updatedCount, selected.size);
    } catch {
      setSettleError(true);
      setSettling(false);
    }
  };

  if (ledgerError) return <StateNote role="alert">Could not load this trainer&apos;s unpaid ledger.</StateNote>;
  if (rows === null) return <StateNote role="status">Loading ledger…</StateNote>;
  if (rows.length === 0) return <StateNote>All settled — no unpaid commissions for this trainer.</StateNote>;

  return (
    <>
      <LedgerList>
        {rows.map((row) => (
          <LedgerRow key={row.id}>
            <input
              type="checkbox"
              checked={selected.has(row.id)}
              onChange={() => toggle(row.id)}
              aria-label={`Include commission ${row.id} for ${row.clientName}`}
            />
            <LedgerText>
              <strong>{row.clientName}</strong>
              {formatDate(row.createdAt)}
              {row.sessionsGranted > 0 ? ` · ${row.sessionsGranted} sessions` : ''}
            </LedgerText>
            <LedgerMoney>{usd.format(row.trainerCut)}</LedgerMoney>
          </LedgerRow>
        ))}
      </LedgerList>
      <PayoutForm onSubmit={handleSubmit}>
        <PayoutSelect
          value={method}
          onChange={(e) => setMethod(e.target.value as PayoutMethod)}
          aria-label="Payout method"
        >
          {PAYOUT_METHODS.map((m) => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
        </PayoutSelect>
        <PayoutInput
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Reference (optional — confirmation #, memo)"
          aria-label="Payout reference"
        />
        <PrimaryButton type="submit" disabled={selected.size === 0 || settling}>
          {settling ? 'Settling…' : `Mark ${selected.size} paid · ${usd.format(selectedTotal)}`}
        </PrimaryButton>
        {settleError && <StateNote role="alert">Mark-paid failed — nothing was changed. Try again.</StateNote>}
      </PayoutForm>
    </>
  );
};

const AdminTrainerPayoutsPanel: React.FC = () => {
  const { loading, error, totals, trainers, refetch, fetchTrainerLedger, markPaid } = useAdminCommissions();
  const [openTrainerId, setOpenTrainerId] = useState<number | null>(null);
  const [settleNotice, setSettleNotice] = useState<string | null>(null);

  const handleSettled = useCallback((updatedCount: number, requestedCount: number) => {
    // Backend only stamps rows still unpaid — a concurrent settle by another
    // admin means updatedCount < requestedCount, and OUR method/reference was
    // NOT recorded on the skipped rows. Say so instead of silent success.
    setSettleNotice(
      updatedCount === 0
        ? requestedCount === 1
          ? 'Nothing was settled — that commission was already paid by someone else, so this payout method/reference was not recorded.'
          : `None were settled — all ${requestedCount} had already been paid by someone else, so this payout method/reference was not recorded.`
        : updatedCount < requestedCount
          ? `Settled ${updatedCount} of ${requestedCount} — the rest were already paid by someone else, so this payout method/reference was not recorded on them.`
          : null,
    );
    setOpenTrainerId(null);
    refetch();
  }, [refetch]);

  const handleToggleTrainer = useCallback((trainerId: number) => {
    // Opening/closing a ledger starts a new action — retire the stale notice.
    setSettleNotice(null);
    setOpenTrainerId((cur) => (cur === trainerId ? null : trainerId));
  }, []);

  return (
    <PageWrap>
      <div>
        <PageTitle>
          <Banknote size={22} aria-hidden="true" />
          Trainer Payouts
        </PageTitle>
        <PageSubtitle>
          Commission ledger across all trainers — who is owed what, and settle unpaid balances.
        </PageSubtitle>
      </div>

      {loading && <StateNote role="status">Loading commission data…</StateNote>}

      {!loading && error && (
        <TrainerCard>
          <StateNote role="alert">{error}</StateNote>
          <PrimaryButton type="button" onClick={refetch}>Try again</PrimaryButton>
        </TrainerCard>
      )}

      {!loading && !error && totals && (
        <>
          {settleNotice && <StateNote role="alert">{settleNotice}</StateNote>}
          <TotalsGrid>
            <TotalCard $tone="unpaid">
              <TotalLabel>Unpaid to trainers</TotalLabel>
              <TotalValue>{usd.format(totals.totalUnpaid)}</TotalValue>
            </TotalCard>
            <TotalCard>
              <TotalLabel>Paid out</TotalLabel>
              <TotalValue>{usd.format(totals.totalPaid)}</TotalValue>
            </TotalCard>
            <TotalCard>
              <TotalLabel>Attributed gross</TotalLabel>
              <TotalValue>{usd.format(totals.totalGross)}</TotalValue>
            </TotalCard>
            <TotalCard>
              <TotalLabel>Business cut</TotalLabel>
              <TotalValue>{usd.format(totals.totalBusinessCut)}</TotalValue>
            </TotalCard>
          </TotalsGrid>

          {trainers.length === 0 ? (
            <TrainerCard>
              <StateNote>
                No commissions recorded yet. A commission is created automatically when a client
                with an assigned trainer purchases a package.
              </StateNote>
            </TrainerCard>
          ) : (
            trainers.map((t) => (
              <TrainerCard key={t.trainerId}>
                <TrainerHeaderRow
                  type="button"
                  onClick={() => handleToggleTrainer(t.trainerId)}
                  aria-expanded={openTrainerId === t.trainerId}
                  aria-label={`Toggle ledger for ${trainerDisplayName(t)}`}
                >
                  <TrainerName>{trainerDisplayName(t)}</TrainerName>
                  <TrainerMeta>{t.commissionCount} commission{t.commissionCount === 1 ? '' : 's'}</TrainerMeta>
                  <MoneyRight>
                    <span>earned {usd.format(t.totalEarned)}</span>
                    {t.unpaid > 0 && <UnpaidChip>owed {usd.format(t.unpaid)}</UnpaidChip>}
                  </MoneyRight>
                </TrainerHeaderRow>
                {openTrainerId === t.trainerId && (
                  <TrainerLedger
                    trainer={t}
                    fetchLedger={fetchTrainerLedger}
                    markPaid={markPaid}
                    onSettled={handleSettled}
                  />
                )}
              </TrainerCard>
            ))
          )}
          <Disclosure>
            Recorded at purchase time from real orders. Marking paid stamps method + reference on the ledger.
          </Disclosure>
        </>
      )}
    </PageWrap>
  );
};

export default AdminTrainerPayoutsPanel;
