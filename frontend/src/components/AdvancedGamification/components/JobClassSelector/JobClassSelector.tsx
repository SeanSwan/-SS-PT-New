/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: JobClassSelector                                  ║
 * ║  PURPOSE: FFXIV-style fitness job class selection card.       ║
 * ║           Users pick a class that shapes their XP bonuses    ║
 * ║           and visual identity (avatar overlay, titles)       ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-28                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │  ⚔ JOB CLASS                              Current: Paladin │
 * │                                                            │
 * │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                │
 * │  │ 🛡  │ │ 👊  │ │ 🏹  │ │ ✨  │ │ ⚔  │                │
 * │  │Paldn│ │Monk │ │Rangr│ │W.Mge│ │D.Knt│                │
 * │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                │
 * │                                                            │
 * │  PALADIN — The Unyielding Guardian                         │
 * │  Bonus: +15% XP from strength exercises                    │
 * │  Focus: Heavy compound lifts, powerlifting, strongman      │
 * │                                                            │
 * │  [ Select Paladin ]                                        │
 * └────────────────────────────────────────────────────────────┘
 *
 * CLICK-OUTCOMES:
 * [Class card] → sets selectedClass state → shows description
 * [Select button] → POST /api/gamification/users/:userId/job-class → updates
 * GAMIFICATION: Job class adds XP multiplier bonus for matching exercises
 */

import React, { useState, useCallback } from 'react';
import { Swords, Shield, Flame, Target, Sparkles, Moon } from 'lucide-react';
import styled, { keyframes, css } from 'styled-components';
import apiService from '../../../../services/api.service';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

type JobClass = 'paladin' | 'monk' | 'ranger' | 'white_mage' | 'dark_knight';

interface JobClassConfig {
  id: JobClass;
  name: string;
  title: string;
  icon: string;
  lucideIcon: React.ElementType;
  color: string;
  description: string;
  bonusText: string;
  focus: string;
  xpMultiplier: number;
  matchingCategories: string[];
}

interface JobClassSelectorProps {
  userId: number;
  currentJobClass?: JobClass | null;
  onClassChange?: (jobClass: JobClass) => void;
  className?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Job Class Definitions
// ─────────────────────────────────────────────────────────────

const JOB_CLASSES: JobClassConfig[] = [
  {
    id: 'paladin',
    name: 'Paladin',
    title: 'The Unyielding Guardian',
    icon: '🛡',
    lucideIcon: Shield,
    color: '#60C0F0',
    description: 'Masters of defense and endurance. Paladins thrive under heavy loads and long training sessions. Their strength is their shield.',
    bonusText: '+15% XP from strength exercises',
    focus: 'Heavy compound lifts, powerlifting, strongman',
    xpMultiplier: 1.15,
    matchingCategories: ['strength', 'chest', 'back', 'legs'],
  },
  {
    id: 'monk',
    name: 'Monk',
    title: 'The Flowing Fist',
    icon: '👊',
    lucideIcon: Flame,
    color: '#C6A84B',
    description: 'Speed, precision, and bodyweight mastery. Monks combine martial discipline with explosive power. Their body is their weapon.',
    bonusText: '+15% XP from bodyweight & martial arts',
    focus: 'Calisthenics, martial arts, HIIT, plyometrics',
    xpMultiplier: 1.15,
    matchingCategories: ['bodyweight', 'cardio', 'full_body', 'plyometrics'],
  },
  {
    id: 'ranger',
    name: 'Ranger',
    title: 'The Enduring Scout',
    icon: '🏹',
    lucideIcon: Target,
    color: '#4CAF50',
    description: 'Built for distance and endurance. Rangers excel at sustained effort — running, cycling, swimming. They outlast everyone.',
    bonusText: '+15% XP from cardio & endurance',
    focus: 'Running, cycling, swimming, steady-state cardio',
    xpMultiplier: 1.15,
    matchingCategories: ['cardio', 'endurance', 'running', 'cycling'],
  },
  {
    id: 'white_mage',
    name: 'White Mage',
    title: 'The Restoring Light',
    icon: '✨',
    lucideIcon: Sparkles,
    color: '#E0ECF4',
    description: 'Healers and recovery specialists. White Mages focus on flexibility, corrective exercise, and mind-body connection.',
    bonusText: '+15% XP from recovery & flexibility',
    focus: 'Stretching, corrective exercise, stability, balance',
    xpMultiplier: 1.15,
    matchingCategories: ['stretching', 'recovery', 'stability', 'balance'],
  },
  {
    id: 'dark_knight',
    name: 'Dark Knight',
    title: 'The Abyssal Blade',
    icon: '⚔',
    lucideIcon: Moon,
    color: '#8B5CF6',
    description: 'Power through intensity. Dark Knights push limits with max effort — heavy singles, supersets, and grueling circuits.',
    bonusText: '+15% XP from high-intensity training',
    focus: 'Max strength, supersets, circuits, power training',
    xpMultiplier: 1.15,
    matchingCategories: ['power', 'olympic', 'circuit', 'maximal_strength'],
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const selectedGlow = keyframes`
  0%, 100% { box-shadow: 0 0 12px var(--class-color); }
  50% { box-shadow: 0 0 24px var(--class-color); }
`;

const Container = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 16px;
  padding: 20px 24px;
`;

const Header = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 20px;
`;

const SectionTitle = styled.h3`
  font-family: 'Sora', sans-serif; font-size: 14px; font-weight: 600;
  letter-spacing: 1.5px; text-transform: uppercase;
  color: var(--text-secondary, #94a3b8); margin: 0;
  display: flex; align-items: center; gap: 8px;
  svg { color: var(--accent-secondary, #8B5CF6); }
`;

const CurrentBadge = styled.span<{ $color: string }>`
  font-family: 'Sora', sans-serif; font-size: 12px; font-weight: 500;
  color: ${({ $color }) => $color};
  padding: 4px 10px; border-radius: 100px;
  background: color-mix(in srgb, ${({ $color }) => $color} 12%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 25%, transparent);
`;

const ClassGrid = styled.div`
  display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;
`;

const ClassCard = styled.button<{ $color: string; $selected: boolean; $active: boolean }>`
  flex: 1; min-width: 56px; max-width: 72px;
  padding: 10px 4px; border-radius: 12px;
  background: ${({ $selected, $color }) => $selected
    ? `color-mix(in srgb, ${$color} 15%, var(--bg-base, #0A0A0F))`
    : 'var(--bg-base, #0A0A0F)'
  };
  border: 1.5px solid ${({ $selected, $active, $color }) =>
    $active ? $color : $selected ? `color-mix(in srgb, ${$color} 50%, transparent)` : 'transparent'
  };
  cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 4px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 44px;
  --class-color: ${({ $color }) => `color-mix(in srgb, ${$color} 30%, transparent)`};

  ${({ $active }) => $active && css`animation: ${selectedGlow} 2s ease-in-out infinite;`}

  &:hover { transform: translateY(-2px); background: color-mix(in srgb, ${({ $color }) => $color} 10%, var(--bg-base, #0A0A0F)); }
  &:active { transform: scale(0.96); }

  .class-icon { font-size: 20px; }
  .class-name {
    font-family: 'Sora', sans-serif; font-size: 9px; font-weight: 600;
    letter-spacing: 0.5px; text-transform: uppercase;
    color: ${({ $selected, $color }) => $selected ? $color : 'var(--text-muted, #64748b)'};
  }
`;

const DescriptionCard = styled.div<{ $color: string }>`
  background: var(--bg-base, #0A0A0F);
  border: 1px solid color-mix(in srgb, ${({ $color }) => $color} 20%, transparent);
  border-radius: 12px; padding: 16px;
`;

const ClassName = styled.h4<{ $color: string }>`
  font-family: 'Plus Jakarta Sans', sans-serif; font-size: 18px; font-weight: 700;
  color: ${({ $color }) => $color}; margin: 0 0 4px;
`;

const ClassSubtitle = styled.p`
  font-family: 'Cormorant Garamond', serif; font-style: italic;
  font-size: 14px; color: var(--text-muted, #64748b); margin: 0 0 12px;
`;

const ClassDesc = styled.p`
  font-family: 'Sora', sans-serif; font-size: 13px; line-height: 1.6;
  color: var(--text-secondary, #94a3b8); margin: 0 0 12px;
`;

const BonusTag = styled.div<{ $color: string }>`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px;
  background: color-mix(in srgb, ${({ $color }) => $color} 10%, transparent);
  font-family: 'Fira Code', monospace; font-size: 12px; font-weight: 500;
  color: ${({ $color }) => $color}; margin-bottom: 8px;
`;

const FocusText = styled.p`
  font-family: 'Sora', sans-serif; font-size: 11px;
  color: var(--text-muted, #64748b); margin: 0;
`;

const SelectBtn = styled.button<{ $color: string }>`
  width: 100%; margin-top: 16px; padding: 12px;
  border-radius: 10px; border: none; cursor: pointer;
  background: ${({ $color }) => $color};
  color: #0A0A0F; font-family: 'Sora', sans-serif;
  font-size: 14px; font-weight: 600; min-height: 48px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover { transform: translateY(-1px); box-shadow: 0 4px 16px color-mix(in srgb, ${({ $color }) => $color} 40%, transparent); }
  &:active { transform: scale(0.98); }
  &:disabled { opacity: 0.5; cursor: default; transform: none; box-shadow: none; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

const JobClassSelector: React.FC<JobClassSelectorProps> = ({
  userId,
  currentJobClass = null,
  onClassChange,
  className,
}) => {
  const [selectedId, setSelectedId] = useState<JobClass | null>(currentJobClass);
  const [saving, setSaving] = useState(false);

  const selectedClass = JOB_CLASSES.find(c => c.id === selectedId);
  const currentClass = JOB_CLASSES.find(c => c.id === currentJobClass);
  const isCurrentSelection = selectedId === currentJobClass;

  const handleSelect = useCallback(async () => {
    if (!selectedId || isCurrentSelection || !userId) return;
    setSaving(true);
    try {
      const res = await apiService.put(`/api/gamification/users/${userId}/job-class`, {
        jobClass: selectedId,
      }, {
        validateStatus: status => status < 500,
      });
      if (res.status >= 200 && res.status < 300) {
        onClassChange?.(selectedId);
      }
    } catch (err) {
      console.error('[JobClass] Save failed:', err);
    } finally {
      setSaving(false);
    }
  }, [selectedId, isCurrentSelection, userId, onClassChange]);

  return (
    <Container className={className}>
      <Header>
        <SectionTitle><Swords size={16} /> JOB CLASS</SectionTitle>
        {currentClass && (
          <CurrentBadge $color={currentClass.color}>
            {currentClass.icon} {currentClass.name}
          </CurrentBadge>
        )}
      </Header>

      <ClassGrid>
        {JOB_CLASSES.map(cls => (
          <ClassCard
            key={cls.id}
            $color={cls.color}
            $selected={selectedId === cls.id}
            $active={currentJobClass === cls.id}
            onClick={() => setSelectedId(cls.id)}
            title={cls.name}
          >
            <span className="class-icon">{cls.icon}</span>
            <span className="class-name">{cls.name}</span>
          </ClassCard>
        ))}
      </ClassGrid>

      {selectedClass && (
        <DescriptionCard $color={selectedClass.color}>
          <ClassName $color={selectedClass.color}>{selectedClass.name}</ClassName>
          <ClassSubtitle>{selectedClass.title}</ClassSubtitle>
          <ClassDesc>{selectedClass.description}</ClassDesc>
          <BonusTag $color={selectedClass.color}>
            <Sparkles size={14} />
            {selectedClass.bonusText}
          </BonusTag>
          <FocusText>Focus: {selectedClass.focus}</FocusText>

          {!isCurrentSelection && (
            <SelectBtn
              $color={selectedClass.color}
              onClick={handleSelect}
              disabled={saving}
            >
              {saving ? 'Saving...' : `Select ${selectedClass.name}`}
            </SelectBtn>
          )}
        </DescriptionCard>
      )}
    </Container>
  );
};

JobClassSelector.displayName = 'JobClassSelector';

export default JobClassSelector;
