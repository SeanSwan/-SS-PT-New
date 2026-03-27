/**
 * ============================================================================
 * FILE: NutritionLearnTab.tsx
 * PURPOSE: NASM-aligned nutrition education module for client dashboard
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-26
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Displays expandable nutrition education cards covering
 * macros, micronutrients, hydration, and meal timing — all NASM-aligned.
 * HOW IT FITS IN THE APP: NutritionWorkspace → Learn tab
 * KEY DECISIONS: Static content (no API), accordion UI, NASM citations
 * GAMIFICATION: Education Module completion → 50 XP
 *
 * ┌─── SUB-COMPONENT: NutritionLearnTab ────────────────────────┐
 * │ PARENT: NutritionWorkspace                                   │
 * │ PURPOSE: Nutrition education accordion cards                 │
 * │ Props: None                                                  │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Card header] → Expand/collapse content accordion            │
 * └──────────────────────────────────────────────────────────────┘
 */
import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { BookOpen, ChevronDown, Zap, Droplets, Apple, Flame } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Education Content (NASM-aligned)
// ─────────────────────────────────────────────────────────────
interface LearnModule {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  content: string[];
}

const MODULES: LearnModule[] = [
  {
    id: 'macros',
    icon: <Flame size={20} />,
    title: 'Macronutrients 101',
    subtitle: 'Protein, carbs, and fats — the energy builders',
    content: [
      'Protein (4 cal/g): Essential for muscle repair and growth. Aim for 0.7-1.0g per pound of body weight for active individuals. Best sources: chicken, fish, eggs, legumes.',
      'Carbohydrates (4 cal/g): Your body\'s preferred fuel source, especially during high-intensity training. Complex carbs (oats, rice, sweet potatoes) provide sustained energy.',
      'Fats (9 cal/g): Critical for hormone production, joint health, and nutrient absorption. Prioritize unsaturated sources: avocado, olive oil, nuts, fatty fish.',
      'NASM recommends a balanced approach: 45-65% carbs, 10-35% protein, 20-35% fats — adjusted based on your OPT training phase and goals.',
    ],
  },
  {
    id: 'micros',
    icon: <Apple size={20} />,
    title: 'Micronutrients & Recovery',
    subtitle: 'Vitamins and minerals that power performance',
    content: [
      'Vitamin D: Supports bone density, immune function, and muscle recovery. Most adults are deficient — especially in northern climates. Sources: sunlight, fatty fish, fortified foods.',
      'Magnesium: Involved in 300+ enzymatic reactions. Critical for muscle contraction and relaxation. Deficiency causes cramps and poor sleep. Sources: dark leafy greens, nuts, seeds.',
      'Iron: Carries oxygen to working muscles. Low iron = fatigue and reduced performance. Sources: red meat, spinach, lentils. Pair with vitamin C for better absorption.',
      'Zinc: Supports testosterone production, immune function, and wound healing. Sources: oysters, beef, pumpkin seeds.',
      'Omega-3s (EPA/DHA): Reduce exercise-induced inflammation and support joint health. Sources: salmon, sardines, fish oil supplements.',
    ],
  },
  {
    id: 'hydration',
    icon: <Droplets size={20} />,
    title: 'Hydration Science',
    subtitle: 'Why water intake directly impacts your gains',
    content: [
      'Even 2% dehydration reduces strength output by up to 10% and cognitive function by 25%. By the time you feel thirsty, you\'re already dehydrated.',
      'Pre-workout: Drink 16-20 oz of water 2-3 hours before training, then 8 oz 20-30 minutes before.',
      'During workout: 7-10 oz every 10-20 minutes of exercise. For sessions over 60 min, consider electrolytes.',
      'Post-workout: Replace every pound of body weight lost during exercise with 16-24 oz of fluid.',
      'Daily baseline: Aim for half your body weight (lbs) in ounces of water. A 180 lb person needs ~90 oz/day minimum.',
    ],
  },
  {
    id: 'timing',
    icon: <Zap size={20} />,
    title: 'Nutrient Timing',
    subtitle: 'When you eat matters for performance',
    content: [
      'Pre-workout (2-3 hours before): Balanced meal with complex carbs + moderate protein + low fat. Example: chicken, rice, and vegetables.',
      'Pre-workout snack (30-60 min before): Simple carbs + small protein. Example: banana with a scoop of protein.',
      'Post-workout (within 30-60 min): The anabolic window — fast-digesting protein + simple carbs to spike insulin and shuttle nutrients to muscles. Example: whey shake + fruit.',
      'NASM notes: Nutrient timing is most important for athletes training twice daily or in caloric deficit. For general fitness, total daily intake matters more than exact timing.',
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const NutritionLearnTab: React.FC = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setExpanded(prev => (prev === id ? null : id));
  }, []);

  return (
    <Wrapper>
      <Intro>
        <BookOpen size={20} style={{ flexShrink: 0 }} />
        <span>NASM-aligned nutrition education. Tap a topic to expand.</span>
      </Intro>

      {MODULES.map(mod => {
        const isOpen = expanded === mod.id;
        return (
          <ModuleCard key={mod.id}>
            <ModuleHeader
              onClick={() => toggle(mod.id)}
              aria-expanded={isOpen}
              aria-controls={`learn-${mod.id}`}
            >
              <IconWrap>{mod.icon}</IconWrap>
              <HeaderText>
                <ModTitle>{mod.title}</ModTitle>
                <ModSub>{mod.subtitle}</ModSub>
              </HeaderText>
              <Chevron $open={isOpen}><ChevronDown size={18} /></Chevron>
            </ModuleHeader>
            {isOpen && (
              <ModuleBody id={`learn-${mod.id}`}>
                {mod.content.map((para, i) => (
                  <Para key={i}>{para}</Para>
                ))}
              </ModuleBody>
            )}
          </ModuleCard>
        );
      })}
    </Wrapper>
  );
};

export default NutritionLearnTab;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Wrapper = styled.div`
  display: flex; flex-direction: column; gap: 12px;
`;

const Intro = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.85rem;
`;

const ModuleCard = styled.div`
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  overflow: hidden;
`;

const ModuleHeader = styled.button`
  display: flex; align-items: center; gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  min-height: 64px;
  transition: background 150ms;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent); }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: -2px;
  }
`;

const IconWrap = styled.div`
  width: 40px; height: 40px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

const HeaderText = styled.div`flex: 1;`;
const ModTitle = styled.div`
  font-size: 0.95rem; font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
`;
const ModSub = styled.div`
  font-size: 0.8rem; margin-top: 2px;
  color: var(--text-muted, rgba(224,236,244,0.4));
`;

const Chevron = styled.div<{ $open: boolean }>`
  color: var(--text-muted, rgba(224,236,244,0.4));
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  transform: rotate(${({ $open }) => $open ? '180deg' : '0'});
`;

const ModuleBody = styled.div`
  padding: 0 18px 18px;
  border-top: 1px solid var(--border-soft, rgba(96,192,240,0.12));
`;

const Para = styled.p`
  font-size: 0.85rem;
  line-height: 1.65;
  color: var(--text-primary, #E0ECF4);
  margin: 12px 0 0;
  &:first-child { margin-top: 14px; }
`;
