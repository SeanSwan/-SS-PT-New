/**
 * SpecialDealPreviewCard — the live, client-facing preview of the special being built.
 * Updates in real time as the admin types the effective $/session (the signature moment).
 * Pure presentational; pricing/gate are computed by the parent via specialPricing.ts.
 */
import React from 'react';
import * as S from './createSpecial.styles';
import type { SpecialPricing, RateGate } from './specialPricing';

interface Props {
  clientName?: string;
  pricing: SpecialPricing;
  gate: RateGate;
  validitySummary: string;
}

const money = (n: number): string =>
  `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const SpecialDealPreviewCard: React.FC<Props> = ({ clientName, pricing, gate, validitySummary }) => {
  const { paidSessions, bonusSessions, totalSessions, totalPrice, effectiveHourlyRate } = pricing;

  return (
    <S.PreviewCard aria-label="Client-facing special preview">
      <S.PreviewTag>★ SwanStudios Special{clientName ? ` — ${clientName}` : ''}</S.PreviewTag>

      <S.PreviewSessions>{totalSessions} sessions</S.PreviewSessions>
      <S.PreviewBreak>
        {paidSessions} paid + <strong>{bonusSessions} bonus free</strong>
      </S.PreviewBreak>

      <S.PreviewRow>
        <span>Total price</span>
        <b>{money(totalPrice)}</b>
      </S.PreviewRow>
      <S.PreviewRow>
        <span>Effective / session</span>
        <b>{money(effectiveHourlyRate)}</b>
      </S.PreviewRow>
      <S.PreviewRow>
        <span>Sticker rate (unchanged)</span>
        <b>$175</b>
      </S.PreviewRow>
      <S.PreviewRow>
        <span>Validity</span>
        <b>{validitySummary}</b>
      </S.PreviewRow>

      <div>
        <S.GateBadge $tier={gate.tier}>{gate.label}</S.GateBadge>
      </div>
    </S.PreviewCard>
  );
};

export default SpecialDealPreviewCard;
