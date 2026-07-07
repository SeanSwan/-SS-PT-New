/**
 * ChartExpandModal.styles
 * =======================
 * Full-screen chart drill-down dialog chrome (Phase 2.2a, Fable Vision arc).
 * z-2200 = the house full-screen-dialog precedent (clears --z-header 1250;
 * 1200 shipped UNDER the header — hostile review 2026-07-02). Mobile-first:
 * full viewport ≤767px; large centered panel on desktop. Reduced-motion safe.
 */
import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent);
  backdrop-filter: blur(4px);
  animation: ${fadeIn} 0.2s ease both;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Panel = styled.div`
  width: 100%;
  height: 100dvh;
  overflow-y: auto;
  border-radius: 0;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: linear-gradient(160deg,
    color-mix(in srgb, var(--surface-primary, #002060) 55%, var(--bg-elevated, #141419)),
    var(--bg-elevated, #141419) 70%);
  padding: 1rem;
  animation: ${slideUp} 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (min-width: 768px) {
    width: min(94vw, 72rem);
    height: auto;
    max-height: 92vh;
    border-radius: 16px;
    padding: 1.5rem;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`;

export const TitleBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const ModalTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 19px;
  font-weight: 700;
  line-height: 1.3;
`;

export const ModalSubtitle = styled.p`
  margin: 0;
  color: var(--text-secondary, #9FB6C8);
  font-size: 12.5px;
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ChartStage = styled.div`
  width: 100%;
  min-height: 240px;
`;

export const SectionLabel = styled.h3`
  margin: 4px 0 0;
  color: var(--text-secondary, #9FB6C8);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const TableWrap = styled.div`
  overflow-x: auto;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border-radius: 12px;
`;

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: var(--text-primary, #E0ECF4);

  caption {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }

  th, td {
    text-align: left;
    padding: 10px 14px;
    border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  }

  th {
    color: var(--text-secondary, #9FB6C8);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  tbody tr:last-child td {
    border-bottom: none;
  }
`;

export const ShareOutcome = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary, #9fb6c8);
`;

export const HeaderShareButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 35%, transparent);
  background: transparent;
  color: var(--text-primary, #e0ecf4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;

  &:focus-visible {
    outline: 2px solid var(--accent-glow, #8b5cf6);
    outline-offset: 2px;
  }
  &:disabled { opacity: 0.55; cursor: progress; }
`;
