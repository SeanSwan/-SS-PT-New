/**
 * ============================================================================
 * FILE: ClientWorkoutPlanPdfDialog.styles.ts
 * PURPOSE: Mobile-first protected PDF viewer styles for client plan arcs.
 * ============================================================================
 */

import styled from 'styled-components';

export const PdfOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: stretch;
  padding: 0;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent);
  backdrop-filter: blur(14px);

  @media (min-width: 768px) {
    padding: 24px;
    place-items: center;
  }
`;

export const PdfDialogShell = styled.section`
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  background: var(--bg-elevated, #1A1A24);

  @media (min-width: 768px) {
    width: min(1180px, calc(100vw - 48px));
    height: min(860px, calc(100vh - 48px));
    border-radius: 12px;
    box-shadow: 0 28px 90px color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  }
`;

export const PdfDialogHeader = styled.header`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, var(--bg-elevated, #1A1A24));

  @media (min-width: 768px) {
    align-items: center;
    padding: 16px 18px;
  }
`;

export const PdfTitleBlock = styled.div`
  min-width: 0;
  display: grid;
  gap: 4px;
`;

export const PdfKicker = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const PdfTitle = styled.h3`
  margin: 0;
  color: var(--text-heading, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  line-height: 1.25;
  overflow-wrap: anywhere;

  @media (min-width: 768px) {
    font-size: 19px;
  }
`;

export const PdfActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const PdfIconButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, var(--accent-primary, #60C0F0) 8%);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const PdfDownloadLink = styled.a`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent);
  color: var(--accent-gold, #C6A84B);
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--accent-gold, #C6A84B);
    outline-offset: 2px;
  }
`;

export const PdfFrameWrap = styled.div`
  min-height: 0;
  background: var(--bg-base, #0A0A0F);
`;

export const PdfFrame = styled.iframe`
  width: 100%;
  height: 100%;
  display: block;
  border: 0;
  background: var(--bg-base, #0A0A0F);
`;
