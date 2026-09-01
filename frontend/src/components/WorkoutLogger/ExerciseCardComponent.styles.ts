import { motion } from 'framer-motion';
import styled from 'styled-components';
import { CS, reducedMotionSafe, withAlpha } from './WorkoutLoggerCS';

export const CardContainer = styled(motion.div)<{ $isSuperset?: boolean }>`
  background: ${withAlpha(CS.cardDark, 0.7)};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  /* Lens token seam: recipes may retune the panel radius; host value is the fallback. */
  border-radius: var(--world-panel-radius, 1.5rem);
  padding: 2rem;
  margin-bottom: ${({ $isSuperset }) => $isSuperset ? '0.25rem' : '1.5rem'};
  border: 1px solid ${({ $isSuperset }) => $isSuperset ? withAlpha(CS.secondary, 0.2) : withAlpha(CS.text, 0.03)};
  box-shadow: 0 8px 32px ${withAlpha(CS.bgDeep, 0.4)}, 0 0 40px ${withAlpha(CS.glow, 0.02)};
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: '';
    position: absolute;
    top: 1rem;
    left: 0;
    bottom: 1rem;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(180deg, ${CS.glow}, ${CS.gaming});
    opacity: 0.6;
    transition: opacity 0.3s;
  }

  &:hover {
    border-color: ${withAlpha(CS.glow, 0.3)};
    transform: translateY(-2px);
    box-shadow: 0 16px 48px ${withAlpha(CS.bgDeep, 0.4)}, 0 0 60px ${withAlpha(CS.glow, 0.08)};
    &::before { opacity: 1; }
  }

  ${reducedMotionSafe}

  @media (max-width: 430px) {
    padding: 1.25rem;
    border-radius: var(--world-panel-radius, 1rem);
  }
`;

export const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  @media (max-width: 768px) { flex-direction: column; }
`;

export const CircuitFields = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 2fr) minmax(90px, 0.7fr) minmax(160px, 1fr);
  gap: 0.75rem;
  margin: -0.5rem 0 1rem;

  label {
    display: grid;
    gap: 0.35rem;
    color: ${CS.textSecondary};
    font: 600 0.75rem 'Sora', sans-serif;
  }

  input, select {
    box-sizing: border-box;
    min-height: 44px;
    width: 100%;
    border: 1px solid ${withAlpha(CS.glow, 0.28)};
    border-radius: 0.55rem;
    background: ${withAlpha(CS.bgDeep, 0.72)};
    color: ${CS.text};
    padding: 0.6rem 0.75rem;
  }

  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;

export const SetStructureFields = styled.div`
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(160px, 1fr);
  gap: 0.75rem;
  padding: 0.45rem 0 0.8rem 50px;

  label { color: ${CS.textSecondary}; font: 600 0.72rem 'Sora', sans-serif; }
  select, input {
    min-height: 44px;
    width: 100%;
    margin-top: 0.3rem;
    border: 1px solid ${withAlpha(CS.gaming, 0.28)};
    border-radius: 0.5rem;
    background: ${withAlpha(CS.bgDeep, 0.72)};
    color: ${CS.text};
    padding: 0.55rem;
  }
  @media (max-width: 620px) { grid-template-columns: 1fr; padding-left: 0; }
`;

export const ExerciseTitle = styled.div`
  flex: 1;

  h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: ${CS.text};
    display: flex;
    align-items: center;
    gap: 0.5rem;
    letter-spacing: -0.01em;
    svg { color: ${CS.gaming}; }
  }
`;

export const ExerciseRatings = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 100%;

  @media (max-width: 768px) {
    width: 100%;
    gap: 1rem;
  }
`;

export const RatingGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1 1 220px;
  min-width: min(100%, 220px);
  max-width: 100%;

  @media (max-width: 430px) {
    min-width: auto;
    width: 100%;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: ${CS.textSecondary};
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: 'Sora', sans-serif;
  }
`;

export const RatingControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  max-width: 100%;
`;

export const StarRatingContainer = styled.div`
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  max-width: 100%;
  row-gap: 0.125rem;
`;

export const StarButton = styled.button<{ $filled: boolean }>`
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  svg {
    width: 20px;
    height: 20px;
    fill: ${({ $filled }) => $filled ? CS.accent : 'none'};
    stroke: ${CS.accent};
    transition: fill 0.15s, transform 0.15s;
  }

  &:hover svg { fill: ${CS.accent}; transform: scale(1.15); }
  &:focus-visible { outline: 2px solid ${CS.glow}; outline-offset: 2px; border-radius: 0.375rem; }
`;

export const SliderInput = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, ${withAlpha(CS.gaming, 0.15)}, ${withAlpha(CS.glow, 0.2)});
  outline: none;
  appearance: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
    cursor: pointer;
    box-shadow: 0 2px 8px ${withAlpha(CS.glow, 0.4)}, 0 0 12px ${withAlpha(CS.glow, 0.2)};
    border: 2px solid ${withAlpha(CS.text, 0.2)};
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${CS.glow}, ${CS.gaming});
    cursor: pointer;
    border: 2px solid ${withAlpha(CS.text, 0.2)};
    box-shadow: 0 2px 8px ${withAlpha(CS.glow, 0.4)};
  }

  &:focus-visible { outline: 2px solid ${CS.gaming}; outline-offset: 4px; }
`;

export const SliderValue = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${CS.glowLight};
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: right;
`;

export const RemoveExerciseBtn = styled.button`
  background: ${CS.errorBg};
  border: 1px solid ${CS.errorBorder};
  border-radius: 0.5rem;
  color: ${CS.errorText};
  cursor: pointer;
  padding: 0.5rem;
  align-self: flex-start;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${withAlpha(CS.error, 0.25)};
    border-color: ${withAlpha(CS.error, 0.5)};
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid ${CS.error};
    outline-offset: 2px;
    box-shadow: 0 0 0 4px ${CS.errorBg};
  }

  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export const SupersetBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.5rem;
  margin-left: 0.5rem;
  border-radius: 999px;
  background: ${withAlpha(CS.secondary, 0.15)};
  color: ${CS.gaming};
  border: 1px solid ${withAlpha(CS.secondary, 0.3)};
  text-transform: uppercase;
`;

/* Phase 3c.2: link/unlink-with-previous superset control (44px target). */
export const SupersetLinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  min-width: 44px;
  margin-top: 0.25rem;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  background: transparent;
  color: ${CS.gaming};
  border: 1px solid ${withAlpha(CS.secondary, 0.35)};

  &[aria-pressed='true'] {
    background: ${withAlpha(CS.secondary, 0.18)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.secondary};
    outline-offset: 2px;
  }
`;
