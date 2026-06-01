import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

export const SummaryContainer = styled.div`
  background: ${CS.card};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 1.5rem;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid ${CS.glassBorder};
  box-shadow: 0 8px 32px ${withAlpha(CS.bgDeep, 0.3)};

  @media (max-width: 430px) {
    padding: 1.25rem;
    border-radius: 1rem;
  }
`;

export const SummaryTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  font-size: 1.25rem;
  font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: ${CS.text};
  display: flex;
  align-items: center;
  gap: 0.5rem;

  svg { color: ${CS.accent}; }
`;

export const SummaryField = styled.div`
  margin-bottom: 1.5rem;
  &:last-child { margin-bottom: 0; }

  label {
    display: block;
    font-weight: 600;
    color: ${CS.textSecondary};
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-family: 'Sora', sans-serif;
  }
`;

export const IntensityControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

// Phase 16 (2026-04-16): `$unrated` dims the slider when overallIntensity
// is null, giving the control a visibly distinct "not rated" state.
export const SliderInput = styled.input<{ $unrated?: boolean }>`
  flex: 1 1 14rem;
  min-width: min(100%, 12rem);
  width: auto;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, ${withAlpha(CS.gaming, 0.15)}, ${withAlpha(CS.glow, 0.2)});
  outline: none;
  appearance: none;
  opacity: ${({ $unrated }) => ($unrated ? 0.35 : 1)};
  transition: opacity 0.2s ease;

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

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 4px;
  }
`;

export const SliderValue = styled.span<{ $unrated?: boolean }>`
  font-size: 0.85rem;
  font-weight: 700;
  color: ${({ $unrated }) => ($unrated ? withAlpha(CS.text, 0.5) : CS.glowLight)};
  font-style: ${({ $unrated }) => ($unrated ? 'italic' : 'normal')};
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  min-width: 2.5rem;
  text-align: right;
`;

// Phase 16: explicit return path from a picked rating back to "not rated".
export const ClearRatingButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0 0.75rem;
  border-radius: 0.5rem;
  background: transparent;
  border: 1px solid ${withAlpha(CS.text, 0.15)};
  color: ${withAlpha(CS.text, 0.7)};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;

  &:hover {
    border-color: ${withAlpha(CS.text, 0.35)};
    color: ${withAlpha(CS.text, 0.95)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.gaming};
    outline-offset: 4px;
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 1rem;
  background: ${withAlpha(CS.cardDark, 0.7)};
  border: 1px solid ${CS.glassBorder};
  border-radius: 0.75rem;
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 2px ${withAlpha(CS.glow, 0.15)};
  }

  &::placeholder { color: ${withAlpha(CS.text, 0.4)}; }
`;

export const InfoBadge = styled.div<{ type: 'warning' | 'info' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.875rem;
  border-radius: 2rem;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.02em;
  min-height: 44px;
  backdrop-filter: blur(8px);
  background: ${props =>
    props.type === 'warning' ? CS.warningBg :
    props.type === 'success' ? CS.successBg :
    CS.infoBg
  };
  border: 1px solid ${props =>
    props.type === 'warning' ? CS.warningBorder :
    props.type === 'success' ? CS.successBorder :
    CS.infoBorder
  };
  color: ${props =>
    props.type === 'warning' ? CS.warningText :
    props.type === 'success' ? CS.successText :
    CS.glowLight
  };
  svg { flex-shrink: 0; }
`;

export const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-top: 1.5rem;
`;
