/**
 * PrintOrdersPanel — admin print-order fulfillment view (Slice 3d).
 * List every print order with buyer/photo/product/amount + status, and act on it:
 * retry a stuck Prodigi submission, mark shipped (optional tracking), or refund
 * (Stripe, inline two-step confirm). Swan data-card standard: dark surface, tokens,
 * 44px targets, low-motion, responsive.
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { Printer, RefreshCcw, RotateCcw, Truck } from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';
import { usePrintOrders } from '../hooks/usePrintOrders';
import PrintOrderStatusBadge from './PrintOrderStatusBadge';
import type { PrintOrder } from '../types';
import {
  Banner, DangerButton, EmptyState, GhostButton, HelperText, Input, Panel, PrimaryButton, SectionTitle, Select, Spinner,
} from '../styles';

const money = (v?: string | null) => (v == null ? '—' : `$${Number(v).toFixed(2)}`);
const when = (s?: string | null) => (s ? new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

function shipTo(addr?: Record<string, unknown> | null): string {
  if (!addr) return '';
  const a = (addr.address as Record<string, unknown>) || addr;
  const name = (addr.name as string) || '';
  const city = (a?.city as string) || '';
  const state = (a?.state as string) || '';
  const country = (a?.country as string) || '';
  const loc = [city, state].filter(Boolean).join(', ');
  return [name, [loc, country].filter(Boolean).join(' · ')].filter(Boolean).join(' — ');
}

const FILTERS: Array<{ v: string; label: string }> = [
  { v: 'all', label: 'All' }, { v: 'paid', label: 'Paid' }, { v: 'processing', label: 'Processing' },
  { v: 'shipped', label: 'Shipped' }, { v: 'delivered', label: 'Delivered' }, { v: 'cancelled', label: 'Cancelled' },
];

const PrintOrdersPanel: React.FC = () => {
  const po = usePrintOrders();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin'; // refunds are admin-only (matches the backend gate)
  const [confirmRefund, setConfirmRefund] = useState<number | null>(null);
  const [tracking, setTracking] = useState<Record<number, string>>({});

  return (
    <Panel>
      <Head>
        <SectionTitle><Printer size={18} aria-hidden="true" /> Print orders</SectionTitle>
        <Controls>
          <Select
            aria-label="Filter print orders by status"
            value={po.filter}
            onChange={(e) => po.setFilter(e.target.value as never)}
            style={{ minWidth: 150 }}
          >
            {FILTERS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
          </Select>
          <GhostButton type="button" onClick={() => po.reload()} disabled={po.loading}>
            <RefreshCcw size={16} aria-hidden="true" /> Refresh
          </GhostButton>
        </Controls>
      </Head>

      {po.error && <Banner $tone="error" role="alert">{po.error}</Banner>}

      {po.loading && po.orders.length === 0 ? (
        <Center><Spinner aria-label="Loading print orders" /></Center>
      ) : po.orders.length === 0 ? (
        <EmptyState>
          <Printer size={26} aria-hidden="true" />
          No print orders yet{po.filter !== 'all' ? ` with status "${po.filter}"` : ''}. Paid orders appear here for fulfillment.
        </EmptyState>
      ) : (
        <List>
          {po.orders.map((o: PrintOrder) => {
            const canRetry = o.status === 'paid' || o.status === 'processing';
            const canShip = o.status === 'paid' || o.status === 'processing';
            const canRefund = isAdmin && (o.status === 'paid' || o.status === 'processing' || o.status === 'shipped');
            const busy = po.busyId === o.id;
            const ship = shipTo(o.shippingAddress);
            return (
              <Card key={o.id}>
                <Thumb>
                  {o.photo?.thumbnailUrl
                    ? <img src={o.photo.thumbnailUrl} alt={o.photo.displayName || `Photo ${o.photo.photoNumber}`} loading="lazy" />
                    : <Printer size={20} aria-hidden="true" />}
                </Thumb>
                <Info>
                  <Row1>
                    <strong>{o.productType} · {o.size}</strong>
                    <PrintOrderStatusBadge status={o.status} />
                  </Row1>
                  <Meta>
                    <span>{o.event?.name || 'Event'}</span>
                    <span>·</span>
                    <span>{o.visitor?.email || 'buyer'}</span>
                    <span>·</span>
                    <span>{money(o.priceUsd)} ({o.quantity}×)</span>
                    <span>·</span>
                    <span>{when(o.createdAt)}</span>
                  </Meta>
                  {ship && <Meta $muted>Ship to: {ship}</Meta>}
                  {o.trackingNumber && <Meta $muted>Tracking: {o.trackingNumber}</Meta>}
                </Info>
                <Actions>
                  {canRetry && (
                    <GhostButton type="button" onClick={() => po.retry(o.id)} disabled={busy} title="Retry print-lab submission">
                      <RotateCcw size={15} aria-hidden="true" /> Retry
                    </GhostButton>
                  )}
                  {canShip && (
                    <ShipRow>
                      <Input
                        aria-label="Tracking number"
                        placeholder="Tracking #"
                        value={tracking[o.id] ?? ''}
                        onChange={(e) => setTracking((t) => ({ ...t, [o.id]: e.target.value }))}
                        style={{ minHeight: 44, maxWidth: 140 }}
                      />
                      <PrimaryButton type="button" onClick={() => po.markShipped(o.id, tracking[o.id]?.trim() || undefined)} disabled={busy}>
                        <Truck size={15} aria-hidden="true" /> Ship
                      </PrimaryButton>
                    </ShipRow>
                  )}
                  {canRefund && (
                    confirmRefund === o.id ? (
                      <ConfirmWrap>
                        <DangerButton type="button" onClick={async () => { const ok = await po.refund(o.id); if (ok) setConfirmRefund(null); }} disabled={busy}>
                          Confirm refund
                        </DangerButton>
                        <GhostButton type="button" onClick={() => setConfirmRefund(null)} disabled={busy}>Cancel</GhostButton>
                      </ConfirmWrap>
                    ) : (
                      <DangerButton type="button" onClick={() => setConfirmRefund(o.id)} disabled={busy}>Refund</DangerButton>
                    )
                  )}
                </Actions>
              </Card>
            );
          })}
        </List>
      )}
      <HelperText>Refunds are final (Stripe) and mark the order cancelled. A refund does not auto-cancel a print already at the lab.</HelperText>
    </Panel>
  );
};

const Head = styled.div`display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem;`;
const Controls = styled.div`display: flex; align-items: center; gap: 0.5rem;`;
const Center = styled.div`display: flex; justify-content: center; padding: 2rem;`;
const List = styled.ul`list-style: none; margin: 0.85rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem;`;
const Card = styled.li`
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 0.85rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.14));
  border-radius: 12px;
  background: var(--surface-dark, #1a1a24);
  @media (max-width: 720px) { grid-template-columns: 48px 1fr; }
`;
const Thumb = styled.div`
  width: 56px; height: 56px; border-radius: 10px; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: var(--card-bg, #141419); color: var(--text-faint, #64748b);
  img { width: 100%; height: 100%; object-fit: cover; }
  @media (max-width: 720px) { width: 48px; height: 48px; }
`;
const Info = styled.div`min-width: 0; display: flex; flex-direction: column; gap: 0.25rem;`;
const Row1 = styled.div`
  display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;
  color: var(--text-primary, #e0ecf4); font-size: 0.95rem; text-transform: capitalize;
`;
const Meta = styled.div<{ $muted?: boolean }>`
  display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;
  font-size: 0.8rem; color: ${({ $muted }) => ($muted ? 'var(--text-faint, #64748b)' : 'var(--text-muted, #8fa3b8)')};
  min-width: 0; span { overflow: hidden; text-overflow: ellipsis; }
`;
const Actions = styled.div`
  display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; justify-content: flex-end;
  @media (max-width: 720px) { grid-column: 1 / -1; justify-content: flex-start; }
`;
const ShipRow = styled.div`display: flex; align-items: center; gap: 0.35rem;`;
const ConfirmWrap = styled.div`display: flex; align-items: center; gap: 0.35rem;`;

export default PrintOrdersPanel;
