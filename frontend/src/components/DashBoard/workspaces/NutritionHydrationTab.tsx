/**
 * ============================================================================
 * FILE: NutritionHydrationTab.tsx
 * PURPOSE: Daily hydration tracker — glass-by-glass water intake logging
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a visual daily water intake tracker with
 * clickable glass icons. Stores progress in localStorage per date.
 * HOW IT FITS IN THE APP: NutritionWorkspace → Hydration tab
 * KEY DECISIONS: localStorage for MVP (API integration in future sprint)
 *
 * ┌─── SUB-COMPONENT: NutritionHydrationTab ────────────────────┐
 * │ PARENT: NutritionWorkspace                                   │
 * │ PURPOSE: Track daily water intake with visual glass grid     │
 * │ Props: None                                                  │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Glass icon] → Toggle glass filled/empty → Update localStorage│
 * │ [Reset] → Clear today's intake → Reset all glasses           │
 * └──────────────────────────────────────────────────────────────┘
 */
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { Droplets, RotateCcw, Trophy } from 'lucide-react';
import { useHydration } from '../../../hooks/useHydration';

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────
const GLASS_OZ = 8;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const NutritionHydrationTab: React.FC = () => {
  const { filled, dailyGoal: DAILY_GOAL, updateFilled } = useHydration();

  const toggleGlass = useCallback((index: number) => {
    // If clicking the last filled glass, unfill it; otherwise fill up to index
    if (index + 1 === filled) {
      updateFilled(index);
    } else {
      updateFilled(index + 1);
    }
  }, [filled, updateFilled]);

  const pct = Math.round((filled / DAILY_GOAL) * 100);
  const goalMet = filled >= DAILY_GOAL;

  return (
    <Wrapper>
      <HeroCard>
        <HeroIcon $goalMet={goalMet}>
          {goalMet ? <Trophy size={32} /> : <Droplets size={32} />}
        </HeroIcon>
        <HeroText>
          <HeroTitle>{goalMet ? 'Goal Reached!' : 'Daily Hydration'}</HeroTitle>
          <HeroSub>{filled} of {DAILY_GOAL} glasses ({filled * GLASS_OZ} oz)</HeroSub>
        </HeroText>
        <ProgressRing>
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none"
              stroke="var(--border-soft, rgba(96,192,240,0.12))" strokeWidth="6" />
            <ProgressCircle cx="50" cy="50" r="42" fill="none"
              stroke={goalMet ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)'}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${pct * 2.64} ${264 - pct * 2.64}`}
              strokeDashoffset="66"
            />
          </svg>
          <RingLabel>{pct}%</RingLabel>
        </ProgressRing>
      </HeroCard>

      <GlassGrid>
        {Array.from({ length: DAILY_GOAL }, (_, i) => (
          <GlassBtn
            key={i}
            $filled={i < filled}
            $goalMet={goalMet}
            onClick={() => toggleGlass(i)}
            aria-label={`Glass ${i + 1} — ${i < filled ? 'filled' : 'empty'}`}
          >
            <Droplets size={28} />
            <GlassNum>{i + 1}</GlassNum>
          </GlassBtn>
        ))}
      </GlassGrid>

      <TipCard>
        <TipTitle>Hydration Tips</TipTitle>
        <TipList>
          <li>Drink a glass of water first thing in the morning</li>
          <li>Keep a water bottle at your desk or gym bag</li>
          <li>Drink 16 oz 30 min before training for peak performance</li>
          <li>Dehydration of just 2% body weight reduces strength output</li>
        </TipList>
      </TipCard>

      {filled > 0 && (
        <ResetBtn type="button" onClick={() => updateFilled(0)}>
          <RotateCcw size={14} /> Reset Today
        </ResetBtn>
      )}
    </Wrapper>
  );
};

export default NutritionHydrationTab;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const HeroCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 14px;
`;

const HeroIcon = styled.div<{ $goalMet: boolean }>`
  width: 56px; height: 56px;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: ${({ $goalMet }) => $goalMet
    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, transparent), color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent))'
    : 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent))'};
  color: ${({ $goalMet }) => $goalMet ? 'var(--accent-gold, #C6A84B)' : 'var(--accent-primary, #60C0F0)'};
  flex-shrink: 0;
`;

const HeroText = styled.div`flex: 1;`;
const HeroTitle = styled.h2`
  font-size: 1.15rem; font-weight: 700; margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;
const HeroSub = styled.p`
  font-size: 0.85rem; margin: 4px 0 0;
  color: var(--text-secondary, rgba(224,236,244,0.6));
`;

const ProgressRing = styled.div`
  position: relative;
  width: 72px; height: 72px;
  flex-shrink: 0;
  svg { width: 100%; height: 100%; }
`;
const ProgressCircle = styled.circle`
  transition: stroke-dasharray 400ms cubic-bezier(0.16, 1, 0.3, 1);
`;
const RingLabel = styled.div`
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem; font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const GlassGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  @media (max-width: 480px) { grid-template-columns: repeat(2, 1fr); }
`;

const GlassBtn = styled.button<{ $filled: boolean; $goalMet: boolean }>`
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px;
  min-height: 80px;
  border-radius: 12px;
  border: 1px solid ${({ $filled }) => $filled
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $filled }) => $filled
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
    : 'var(--bg-surface, #1A1A24)'};
  color: ${({ $filled }) => $filled
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--text-muted, rgba(224,236,244,0.75))'};
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    transform: translateY(-2px);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const GlassNum = styled.span`
  font-size: 0.7rem; font-weight: 600;
  font-family: 'Fira Code', monospace;
`;

const TipCard = styled.div`
  padding: 16px 20px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px;
`;
const TipTitle = styled.h3`
  font-size: 0.85rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  margin: 0 0 10px;
`;
const TipList = styled.ul`
  margin: 0; padding-left: 18px;
  li {
    font-size: 0.85rem;
    color: var(--text-primary, #E0ECF4);
    margin-bottom: 6px;
    line-height: 1.5;
    &:last-child { margin-bottom: 0; }
  }
`;

const ResetBtn = styled.button`
  display: inline-flex; align-items: center; gap: 6px;
  align-self: flex-start;
  padding: 8px 16px;
  min-height: 44px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 8px;
  background: transparent;
  color: var(--text-muted, rgba(224,236,244,0.75));
  font-size: 0.8rem;
  cursor: pointer;
  transition: color 200ms, border-color 200ms;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    border-color: var(--text-secondary, rgba(224,236,244,0.6));
  }
`;
