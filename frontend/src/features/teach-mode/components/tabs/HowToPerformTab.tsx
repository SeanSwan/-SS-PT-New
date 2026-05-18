/**
 * ============================================================================
 * FILE: HowToPerformTab.tsx
 * PURPOSE: Deep exercise instruction tab — instructions, cues, muscles,
 *          biomechanics, safety, equipment (AI Village Phase 1 default tab)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * ┌─── SUB-COMPONENT: HowToPerformTab ─────────────────────────┐
 * │ PARENT: TeachModeSidebar (refactored)                       │
 * │ PURPOSE: Show step-by-step instructions, coaching cues,     │
 * │   muscles worked, biomechanics, safety, and equipment       │
 * │ Props: { data: ExerciseTeachData }                          │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { useState, useMemo, memo } from 'react';
import styled from 'styled-components';
import {
  ClipboardList, MessageCircle, Activity, Shield,
  Wrench, ChevronDown, Home, Star,
} from 'lucide-react';
import type { ExerciseTeachData } from '../../types/TeachModeContracts';

const ensureArray = (val: unknown): string[] => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

import {
  AccordionHeader, AccordionBody, InstructionStep,
  CueChip, BiomechanicsGrid, BioMetric, EquipmentTag,
  SafetyWarning, EmptyDataMsg,
} from '../../styles/TeachModeStyles';

interface HowToPerformTabProps {
  data: ExerciseTeachData;
}

const HeaderLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const InstructionList = styled.ol`
  margin: 0;
  padding-left: 20px;
`;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const MuscleBlock = styled.div`
  margin-bottom: 8px;
`;

const MuscleLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MuscleText = styled.div<{ $tone: 'primary' | 'secondary' }>`
  margin-top: 4px;
  font-size: 0.78rem;
  font-family: 'Sora', sans-serif;
  color: ${({ $tone }) => (
    $tone === 'primary'
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--text-secondary, rgba(224, 236, 244, 0.7))'
  )};
`;

const SafetyWarningStacked = styled(SafetyWarning)`
  margin-top: 8px;
`;

const EquipmentTagWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const EmptyEquipment = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-family: 'Sora', sans-serif;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

const EquipmentMeta = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 10px;
  font-size: 0.72rem;
  font-family: 'Sora', sans-serif;
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
`;

const EquipmentMetaItem = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Accordion Section (reusable)
// ─────────────────────────────────────────────────────────────
const Section: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  id: string;
}> = memo(({ title, icon, defaultOpen = false, children, id }) => {
  const [expanded, setExpanded] = useState(defaultOpen);

  return (
    <div>
      <AccordionHeader
        type="button"
        $expanded={expanded}
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        aria-controls={`section-${id}`}
      >
        <HeaderLabel>
          {icon}
          {title}
        </HeaderLabel>
        <ChevronDown size={16} />
      </AccordionHeader>
      <AccordionBody $expanded={expanded} id={`section-${id}`} role="region">
        {children}
      </AccordionBody>
    </div>
  );
});
Section.displayName = 'Section';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const HowToPerformTab: React.FC<HowToPerformTabProps> = ({ data }) => {
  // Defensively ensure array fields are actually arrays (API may return strings/null)
  const coachingCues = useMemo(() => ensureArray(data.coachingCues), [data.coachingCues]);
  const equipmentNeeded = useMemo(() => ensureArray(data.equipmentNeeded), [data.equipmentNeeded]);

  // Parse instructions into steps (split on numbered patterns or newlines)
  const instructionSteps = useMemo(() => {
    if (!data.instructions) return [];
    // Split on "1." "2." patterns or double newlines
    const steps = data.instructions
      .split(/(?:\r?\n){2,}|\d+\.\s+/)
      .map(s => s.trim())
      .filter(Boolean);
    return steps.length > 0 ? steps : [data.instructions];
  }, [data.instructions]);

  const difficultyLabel = useMemo(() => {
    const d = data.difficulty;
    if (d <= 200) return 'Beginner';
    if (d <= 400) return 'Intermediate';
    if (d <= 600) return 'Advanced';
    if (d <= 800) return 'Expert';
    return 'Elite';
  }, [data.difficulty]);

  return (
    <div role="tabpanel" aria-label="How To Perform">
      {/* Step-by-Step Instructions — open by default (AI Village CRITICAL) */}
      <Section
        id="instructions"
        title="Step-by-Step Instructions"
        icon={<ClipboardList size={15} />}
        defaultOpen
      >
        {instructionSteps.length > 0 ? (
          <InstructionList>
            {instructionSteps.map((step, i) => (
              <InstructionStep key={i}>{step}</InstructionStep>
            ))}
          </InstructionList>
        ) : (
          <EmptyDataMsg>Instructions coming soon</EmptyDataMsg>
        )}
      </Section>

      {/* Coaching Cues */}
      {coachingCues.length > 0 && (
        <Section id="cues" title="Coaching Cues" icon={<MessageCircle size={15} />}>
          <Stack>
            {coachingCues.map((cue, i) => (
              <CueChip key={i}>{cue}</CueChip>
            ))}
          </Stack>
        </Section>
      )}

      {/* Muscles Worked */}
      <Section id="muscles" title="Muscles Worked" icon={<Activity size={15} />}>
        <MuscleBlock>
          <MuscleLabel>Primary</MuscleLabel>
          <MuscleText $tone="primary">
            {ensureArray(data.primaryMuscles).join(', ') || 'General'}
          </MuscleText>
        </MuscleBlock>
        {ensureArray(data.secondaryMuscles).length > 0 && (
          <div>
            <MuscleLabel>Secondary</MuscleLabel>
            <MuscleText $tone="secondary">
              {ensureArray(data.secondaryMuscles).join(', ')}
            </MuscleText>
          </div>
        )}
      </Section>

      {/* Biomechanics */}
      {(data.force || data.mechanic || data.nasmMovementPattern) && (
        <Section id="biomechanics" title="Biomechanics" icon={<Activity size={15} />}>
          <BiomechanicsGrid>
            {data.nasmMovementPattern && (
              <BioMetric>
                <div className="bio-label">Movement Pattern</div>
                <div className="bio-value">{data.nasmMovementPattern}</div>
              </BioMetric>
            )}
            {data.force && (
              <BioMetric>
                <div className="bio-label">Force Type</div>
                <div className="bio-value">{data.force}</div>
              </BioMetric>
            )}
            {data.mechanic && (
              <BioMetric>
                <div className="bio-label">Mechanic</div>
                <div className="bio-value">{data.mechanic}</div>
              </BioMetric>
            )}
            <BioMetric>
              <div className="bio-label">Difficulty</div>
              <div className="bio-value">{data.difficulty}/900 ({difficultyLabel})</div>
            </BioMetric>
          </BiomechanicsGrid>
        </Section>
      )}

      {/* Safety & Contraindications */}
      {(data.safetyTips || data.contraindicationNotes) && (
        <Section id="safety" title="Safety & Contraindications" icon={<Shield size={15} />}>
          {data.safetyTips && <SafetyWarning>{data.safetyTips}</SafetyWarning>}
          {data.contraindicationNotes && (
            <SafetyWarningStacked>
              <strong>Contraindications:</strong> {data.contraindicationNotes}
            </SafetyWarningStacked>
          )}
        </Section>
      )}

      {/* Equipment */}
      <Section id="equipment" title="Equipment Needed" icon={<Wrench size={15} />}>
        {equipmentNeeded.length > 0 ? (
          <EquipmentTagWrap>
            {equipmentNeeded.map((eq, i) => (
              <EquipmentTag key={i}>{eq}</EquipmentTag>
            ))}
          </EquipmentTagWrap>
        ) : (
          <EmptyEquipment>
            <span>Bodyweight — No equipment needed</span>
          </EmptyEquipment>
        )}
        <EquipmentMeta>
          <EquipmentMetaItem>
            <Home size={13} /> {data.canBePerformedAtHome ? 'Home-friendly' : 'Gym required'}
          </EquipmentMetaItem>
          <EquipmentMetaItem>
            <Star size={13} /> {data.experiencePointsEarned} XP
          </EquipmentMetaItem>
        </EquipmentMeta>
      </Section>
    </div>
  );
};

export default memo(HowToPerformTab);
