import styled, { css, keyframes } from 'styled-components';
import { CS, reducedMotionSafe, withAlpha } from './WorkoutLoggerCS';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

export const Container = styled.section`
  position: relative;
  background: ${CS.cardSolid};
  background: linear-gradient(180deg, ${withAlpha(CS.bg, 0.92)} 0%, ${withAlpha(CS.surface, 0.88)} 100%);
  border: 1px solid ${withAlpha(CS.accent, 0.18)};
  border-radius: 14px;
  padding: 24px 24px 16px;
  color: ${CS.text};
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
  box-shadow: 0 1px 0 ${withAlpha(CS.accent, 0.08)} inset,
              0 18px 48px ${withAlpha(CS.bgDeep, 0.45)};

  @media (max-width: 640px) {
    padding: 18px 16px 12px;
    border-radius: 12px;
  }
`;

export const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 16px;
  border-bottom: 1px solid ${withAlpha(CS.gaming, 0.12)};
  margin-bottom: 18px;
`;

export const Title = styled.h3`
  font-family: 'Cormorant Garamond', 'Plus Jakarta Sans', serif;
  font-style: italic;
  font-weight: 500;
  font-size: clamp(20px, 2.4vw, 26px);
  letter-spacing: 0.01em;
  margin: 0;
  color: ${CS.text};
  line-height: 1.15;
`;

export const Subtitle = styled.p`
  font-size: 13.5px;
  line-height: 1.45;
  color: ${CS.textMuted};
  margin: 0;
  max-width: 70ch;
`;

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

export const TagChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${CS.text};
  background: ${withAlpha(CS.secondary, 0.14)};
  border: 1px solid ${withAlpha(CS.secondary, 0.32)};
  border-radius: 999px;
  font-family: 'Fira Code', ui-monospace, monospace;
`;

export const Spine = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1px 1fr;
  gap: 0 22px;

  &::before {
    content: '';
    grid-column: 1;
    grid-row: 1 / -1;
    width: 1px;
    background: linear-gradient(
      180deg,
      ${withAlpha(CS.accent, 0)} 0%,
      ${withAlpha(CS.accent, 0.6)} 12%,
      ${withAlpha(CS.accent, 0.85)} 50%,
      ${withAlpha(CS.accent, 0.6)} 88%,
      ${withAlpha(CS.accent, 0)} 100%
    );
  }

  @media (max-width: 480px) {
    gap: 0 16px;
  }
`;

export const StepBlock = styled.div<{ $idx: number }>`
  grid-column: 2;
  padding: 10px 0 22px;
  ${reducedMotionSafe}
  animation: ${fadeInUp} 320ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
  animation-delay: ${({ $idx }) => 60 + $idx * 70}ms;

  &:last-child { padding-bottom: 4px; }
`;

export const StepHeader = styled.div`
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
`;

export const StepLabel = styled.h4`
  font-family: 'Cormorant Garamond', 'Plus Jakarta Sans', serif;
  font-style: italic;
  font-weight: 500;
  font-size: clamp(18px, 2vw, 22px);
  letter-spacing: 0.01em;
  margin: 0;
  color: ${CS.accent};
  line-height: 1.1;
`;

export const StepCount = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${CS.text};
  background: ${withAlpha(CS.gaming, 0.1)};
  border: 1px solid ${withAlpha(CS.gaming, 0.28)};
  border-radius: 4px;
  font-family: 'Fira Code', ui-monospace, monospace;
`;

export const StepDescription = styled.p`
  font-size: 12.5px;
  line-height: 1.4;
  color: ${CS.textMuted};
  margin: 0 0 10px;
`;

export const ExerciseList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

export const ExerciseRow = styled.li<{ $idx: number }>`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 12px;
  background: ${withAlpha(CS.surface, 0.55)};
  border-left: 2px solid transparent;
  border-radius: 4px;
  transition: background 220ms ease, border-color 220ms ease;
  ${reducedMotionSafe}
  animation: ${fadeInUp} 260ms cubic-bezier(0.2, 0.7, 0.2, 1) backwards;
  animation-delay: ${({ $idx }) => 80 + $idx * 24}ms;

  &:hover, &:focus-within {
    background: ${withAlpha(CS.surface, 0.85)};
    border-left-color: ${withAlpha(CS.accent, 0.55)};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const ExerciseNameRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
`;

export const ExerciseName = styled.span`
  font-size: 14px;
  font-weight: 500;
  color: ${CS.text};
  letter-spacing: 0.005em;
`;

export const ExerciseKey = styled.code`
  font-family: 'Fira Code', ui-monospace, monospace;
  font-size: 11px;
  color: ${CS.textMuted};
  background: ${withAlpha(CS.bgDeep, 0.6)};
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid ${withAlpha(CS.gaming, 0.1)};
`;

export const ExerciseMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
  font-size: 11.5px;
  color: ${CS.textMuted};

  & > span:not(:last-child)::after {
    content: '.';
    margin-left: 14px;
    color: ${withAlpha(CS.gaming, 0.4)};
  }
`;

export const Citation = styled.span`
  font-style: italic;
  color: ${withAlpha(CS.accent, 0.85)};
`;

export const EmptyStep = styled.p`
  font-size: 12.5px;
  color: ${CS.textMuted};
  margin: 0;
  font-style: italic;
  opacity: 0.7;
`;

export const StateMessage = styled.div<{ $tone?: 'info' | 'warn' | 'error' }>`
  padding: 16px 18px;
  border-radius: 8px;
  font-size: 13.5px;
  line-height: 1.5;
  ${({ $tone }) => $tone === 'error' && css`
    color: ${CS.errorText};
    background: ${CS.errorBg};
    border: 1px solid ${CS.errorBorder};
  `}
  ${({ $tone }) => $tone === 'warn' && css`
    color: ${CS.warningText};
    background: ${CS.warningBg};
    border: 1px solid ${CS.warningBorder};
  `}
  ${({ $tone }) => (!$tone || $tone === 'info') && css`
    color: ${CS.textSecondary};
    background: ${withAlpha(CS.surface, 0.6)};
    border: 1px solid ${withAlpha(CS.gaming, 0.18)};
  `}
`;
