/**
 * WorkoutPlanPdfDialog.styles.ts
 *
 * Mobile-first Crystalline Swan styling for the trainer/admin PDF plan viewer
 * and metadata editor.
 */

import styled from 'styled-components';
import { PLANNER_GOLD } from './plannerGold';

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 12px;
  background: color-mix(in srgb, var(--bg-base, #030712) 86%, transparent);
  backdrop-filter: blur(14px);

  @media (min-width: 900px) {
    align-items: center;
    padding: 28px;
  }
`;

export const Dialog = styled.div`
  width: min(1040px, 100%);
  height: calc(100dvh - 24px);
  max-height: 920px;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  background: linear-gradient(180deg, var(--bg-elevated, #1A1A24), var(--bg-base, #030712));
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);

  @media (min-width: 900px) {
    height: min(82vh, 900px);
    border-radius: 18px;
  }
`;

export const Header = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.16));
`;

export const TitleGroup = styled.div`
  min-width: 0;
`;

export const Eyebrow = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${PLANNER_GOLD};
`;

export const Title = styled.h2`
  margin: 4px 0 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: clamp(1rem, 2.8vw, 1.3rem);
  color: var(--text-primary, #E0ECF4);
  overflow-wrap: anywhere;
`;

export const IconButton = styled.button`
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #030712) 42%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const Body = styled.div`
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 14px;
  padding: 14px;
  overflow: auto;
`;

export const ViewerFrame = styled.object`
  width: 100%;
  min-height: 320px;
  height: 100%;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.18));
  border-radius: 12px;
  background: var(--bg-base, #030712);

  @media (min-width: 900px) {
    min-height: 420px;
  }
`;

export const ViewerStatus = styled.div`
  min-height: 320px;
  display: grid;
  place-items: center;
  padding: 18px;
  border: 1px dashed var(--border-soft, rgba(96, 192, 240, 0.22));
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-base, #030712) 80%, transparent);
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
  font-family: 'Sora', sans-serif;
  font-size: 0.86rem;
  line-height: 1.5;
  text-align: center;

  @media (min-width: 900px) {
    min-height: 420px;
  }
`;

export const FallbackLink = styled.a`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 10px;
  color: var(--accent-primary, #60C0F0);
`;

export const Form = styled.form`
  display: grid;
  gap: 14px;
  align-content: start;
`;

export const Field = styled.label`
  display: grid;
  gap: 7px;
  font-family: 'Sora', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-secondary, rgba(224, 236, 244, 0.76));
`;

export const Input = styled.input`
  min-height: 48px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.22));
  border-radius: 10px;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  align-content: flex-start;
`;

export const Button = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid ${({ $primary }) =>
    $primary ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96, 192, 240, 0.22))'};
  background: ${({ $primary }) =>
    $primary
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'
      : 'transparent'};
  color: ${({ $primary }) => ($primary ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)')};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 750;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;
