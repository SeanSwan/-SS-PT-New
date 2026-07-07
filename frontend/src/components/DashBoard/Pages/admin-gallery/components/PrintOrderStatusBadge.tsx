/**
 * PrintOrderStatusBadge — tokenized status pill for print orders (Slice 3d).
 * Crystalline Swan palette, var(--token, #fallback). No motion (data surface).
 */
import React from 'react';
import styled from 'styled-components';
import type { PrintOrderStatus } from '../types';

const TONE: Record<PrintOrderStatus, { c: string; bg: string; b: string; label: string }> = {
  pending:    { c: 'var(--text-muted, #8fa3b8)',    bg: 'rgba(143,163,184,0.12)', b: 'rgba(143,163,184,0.30)', label: 'Pending' },
  paid:       { c: 'var(--accent-primary, #60c0f0)', bg: 'rgba(96,192,240,0.12)',  b: 'rgba(96,192,240,0.30)',  label: 'Paid' },
  processing: { c: 'var(--gilded-fern, #c6a84b)',    bg: 'rgba(198,168,75,0.12)',  b: 'rgba(198,168,75,0.30)',  label: 'Processing' },
  shipped:    { c: 'var(--accent-purple, #8b5cf6)',  bg: 'rgba(139,92,246,0.14)',  b: 'rgba(139,92,246,0.35)',  label: 'Shipped' },
  delivered:  { c: 'var(--success, #22c55e)',        bg: 'rgba(34,197,94,0.12)',   b: 'rgba(34,197,94,0.30)',   label: 'Delivered' },
  cancelled:  { c: 'var(--danger, #e5484d)',         bg: 'rgba(229,72,77,0.10)',   b: 'rgba(229,72,77,0.30)',   label: 'Cancelled' },
};

const PrintOrderStatusBadge: React.FC<{ status: PrintOrderStatus }> = ({ status }) => {
  const t = TONE[status] || TONE.pending;
  return <Pill $c={t.c} $bg={t.bg} $b={t.b}>{t.label}</Pill>;
};

const Pill = styled.span<{ $c: string; $bg: string; $b: string }>`
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  white-space: nowrap;
  color: ${({ $c }) => $c};
  background: ${({ $bg }) => $bg};
  border: 1px solid ${({ $b }) => $b};
`;

export default PrintOrderStatusBadge;
