/**
 * SUB-COMPONENT STYLES: SafetyGateModal
 * PURPOSE: Crystalline Swan styling for the Cortex safety-gate review modal.
 * Directive: SWAN-CORTEX-UNIFIED-BRAIN-MASTER-DIRECTIVE-2026-07-12 §13.5.9.
 * Rule 6: every color is var(--token, #fallback). Dual-Button Glow enforced
 * (purple primary → cyan glow; blue secondary → purple focus ring).
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const GateOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay-obsidian, rgba(10, 10, 15, 0.8));
  backdrop-filter: blur(8px);

  @media (prefers-reduced-motion: reduce) {
    backdrop-filter: none;
    background: var(--overlay-obsidian-solid, rgba(10, 10, 15, 0.92));
  }
`;

export const GateCard = styled(motion.div)`
  width: 100%;
  max-width: 520px;
  max-height: min(86vh, 640px);
  overflow-y: auto;
  background: var(--surface-dark, #1A1A24);
  border: 1px solid var(--surface-elevated, #003080);
  border-radius: 16px;
  padding: 28px 24px 24px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.5),
    0 0 12px 2px var(--glow-purple, rgba(139, 92, 246, 0.38));

  @media (max-width: 375px) {
    padding: 20px 16px 16px;
  }
`;

export const GateIconRing = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto 14px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--accent-glow, #8B5CF6);
  background: var(--card-dark, #141419);
  border: 1px solid var(--accent-glow, #8B5CF6);
`;

export const GateTitle = styled.h2`
  margin: 0 0 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 24px;
  text-align: center;
  color: var(--text-primary, #E0ECF4);
`;

export const GateLede = styled.p`
  margin: 0 0 16px;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  line-height: 1.55;
  text-align: center;
  color: var(--text-primary, #E0ECF4);
  opacity: 0.85;
`;

export const SignalList = styled.ul`
  margin: 0 0 16px;
  padding: 12px 14px;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: var(--card-dark, #141419);
  border: 1px solid var(--surface-elevated, #003080);
  border-radius: 12px;
`;

export const SignalItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  color: var(--text-primary, #E0ECF4);

  &::before {
    content: '';
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    margin-top: 6px;
    border-radius: 50%;
    background: var(--accent-glow, #8B5CF6);
  }
`;

export const ReasonLabel = styled.label`
  display: block;
  margin: 0 0 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #E0ECF4);
`;

export const ReasonTextArea = styled.textarea`
  width: 100%;
  min-height: 84px;
  resize: vertical;
  padding: 12px;
  border-radius: 10px;
  font-family: 'Sora', sans-serif;
  font-size: 15px;
  color: var(--text-primary, #E0ECF4);
  background: var(--card-dark, #141419);
  border: 1px solid var(--surface-elevated, #003080);

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px var(--accent-glow, #8B5CF6);
  }

  &::placeholder {
    color: var(--text-primary, #E0ECF4);
    opacity: 0.45;
  }
`;

export const GateActions = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 18px;
  flex-wrap: wrap;

  & > button {
    flex: 1 1 180px;
  }
`;

const BaseButton = styled.button`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 12px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  transition: transform 120ms ease, box-shadow 160ms ease;

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/** Secondary: blue background → purple glow (Dual-Button Glow). */
export const HoldButton = styled(BaseButton)`
  background: var(--surface-elevated, #003080);
  color: var(--text-primary, #E0ECF4);
  border: 1px solid var(--accent-primary-deep, #002060);

  &:hover:not(:disabled),
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 12px 2px var(--glow-purple, rgba(139, 92, 246, 0.45));
  }
`;

/** Primary: purple background → cyan glow (Dual-Button Glow). */
export const OverrideButton = styled(BaseButton)`
  background: var(--accent-glow, #8B5CF6);
  color: var(--text-primary, #E0ECF4);
  border: none;

  &:hover:not(:disabled),
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 12px 2px var(--glow-cyan, rgba(96, 192, 240, 0.5));
  }
`;
