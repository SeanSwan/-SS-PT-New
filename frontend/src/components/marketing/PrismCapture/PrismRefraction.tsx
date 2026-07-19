/**
 * PrismRefraction — "spectrum out": the success state. One beam (email) has split into three rays, each exactly
 * one tap, none gating the others (Kimi). Book is the ONE primary; Trainer + Share are secondary. Book routes to
 * the existing consultation flow with the email prefilled via query (no OrientationForm changes this epic);
 * Trainer deep-links `/contact?intent=trainer` (the canonical path records itself); Share copies the referral
 * link built from the 201's share code (native share sheet on mobile, clipboard elsewhere).
 */
import { useState } from 'react';
import styled from 'styled-components';
import { PRISM_COPY } from './prismCopy';

const Rays = styled.div`
  display: grid;
  gap: 10px;
  width: 100%;
  max-width: 520px;
`;

const rayBase = `
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: var(--prism-target);
  padding: 10px 16px;
  border-radius: var(--prism-r-field);
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  font: 600 15px/1.2 var(--prism-font-display);
  transition: transform 140ms var(--prism-ease), box-shadow 200ms var(--prism-ease), border-color 200ms;
  &:active { transform: translateY(1px); }
`;

const RayPrimary = styled.a`
  ${rayBase}
  border: 0;
  background: var(--prism-ice);
  color: var(--prism-on-ice);
  box-shadow: 0 0 0 1px var(--prism-ice-14), 0 10px 30px -14px var(--prism-wing);
  &:hover { box-shadow: 0 0 0 1px var(--prism-ice), 0 14px 40px -12px var(--prism-wing); }
`;

const RaySecondaryLink = styled.a`
  ${rayBase}
  border: 1px solid var(--prism-ice-14);
  background: var(--prism-glass);
  color: var(--prism-ink);
  &:hover { border-color: var(--prism-ice); }
`;

const RaySecondaryButton = styled.button`
  ${rayBase}
  border: 1px solid var(--prism-ice-14);
  background: var(--prism-glass);
  color: var(--prism-ink);
  &:hover { border-color: var(--prism-ice); }
`;

const Sub = styled.span`
  font-weight: 400;
  font-size: 12.5px;
  color: var(--prism-ink-2);
`;

const Title = styled.p`
  margin: 0 0 4px;
  font: 600 17px/1.2 var(--prism-font-display);
  color: var(--prism-ink);
`;

interface PrismRefractionProps {
  email: string;
  shareCode: string | null;
  /** Base path for the consultation/orientation flow. Prefill via ?email=. */
  bookHref?: string;
}

export function PrismRefraction({ email, shareCode, bookHref = '/contact' }: PrismRefractionProps) {
  const [copied, setCopied] = useState(false);

  const bookUrl = `${bookHref}?intent=book&email=${encodeURIComponent(email)}`;
  const shareUrl =
    shareCode && typeof window !== 'undefined' ? `${window.location.origin}/?ref=${encodeURIComponent(shareCode)}` : '';

  const onShare = async () => {
    if (!shareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SwanStudios', url: shareUrl });
        return;
      }
    } catch {
      /* user dismissed the native sheet — fall through to copy */
    }
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op; the link is still shown to the user by the browser share UI when available */
    }
  };

  return (
    <Rays>
      <Title>{PRISM_COPY.successTitle}</Title>
      <RayPrimary href={bookUrl}>
        {PRISM_COPY.rayBook}
        <Sub>{PRISM_COPY.rayBookSub}</Sub>
      </RayPrimary>
      <RaySecondaryLink href="/contact?intent=trainer">
        {PRISM_COPY.rayTrainer}
        <Sub>{PRISM_COPY.rayTrainerSub}</Sub>
      </RaySecondaryLink>
      {shareUrl ? (
        <RaySecondaryButton type="button" onClick={onShare}>
          {copied ? PRISM_COPY.shareCopied : PRISM_COPY.rayShare}
          <Sub>{copied ? shareUrl : PRISM_COPY.rayShareSub}</Sub>
        </RaySecondaryButton>
      ) : null}
    </Rays>
  );
}
