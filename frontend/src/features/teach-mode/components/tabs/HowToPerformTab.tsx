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
        $expanded={expanded}
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
        aria-controls={`section-${id}`}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon}
          {title}
        </span>
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
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {instructionSteps.map((step, i) => (
              <InstructionStep key={i}>{step}</InstructionStep>
            ))}
          </ol>
        ) : (
          <EmptyDataMsg>Instructions coming soon</EmptyDataMsg>
        )}
      </Section>

      {/* Coaching Cues */}
      {data.coachingCues.length > 0 && (
        <Section id="cues" title="Coaching Cues" icon={<MessageCircle size={15} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.coachingCues.map((cue, i) => (
              <CueChip key={i}>{cue}</CueChip>
            ))}
          </div>
        </Section>
      )}

      {/* Muscles Worked */}
      <Section id="muscles" title="Muscles Worked" icon={<Activity size={15} />}>
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '0.68rem',
            fontWeight: 600,
            color: 'var(--text-muted, rgba(224,236,244,0.45))',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>Primary</span>
          <div style={{ marginTop: 4, fontSize: '0.78rem', fontFamily: "'Sora', sans-serif", color: 'var(--accent-primary, #60C0F0)' }}>
            {ensureArray(data.primaryMuscles).join(', ') || 'General'}
          </div>
        </div>
        {ensureArray(data.secondaryMuscles).length > 0 && (
          <div>
            <span style={{
              fontFamily: "'Sora', sans-serif",
              fontSize: '0.68rem',
              fontWeight: 600,
              color: 'var(--text-muted, rgba(224,236,244,0.45))',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>Secondary</span>
            <div style={{ marginTop: 4, fontSize: '0.78rem', fontFamily: "'Sora', sans-serif", color: 'var(--text-secondary, rgba(224,236,244,0.7))' }}>
              {ensureArray(data.secondaryMuscles).join(', ')}
            </div>
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
            <SafetyWarning style={{ marginTop: 8 }}>
              <strong>Contraindications:</strong> {data.contraindicationNotes}
            </SafetyWarning>
          )}
        </Section>
      )}

      {/* Equipment */}
      <Section id="equipment" title="Equipment Needed" icon={<Wrench size={15} />}>
        {data.equipmentNeeded.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {data.equipmentNeeded.map((eq, i) => (
              <EquipmentTag key={i}>{eq}</EquipmentTag>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontFamily: "'Sora', sans-serif", color: 'var(--text-secondary, rgba(224,236,244,0.7))' }}>
            <span>Bodyweight — No equipment needed</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: '0.72rem', fontFamily: "'Sora', sans-serif", color: 'var(--text-muted, rgba(224,236,244,0.45))' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Home size={13} /> {data.canBePerformedAtHome ? 'Home-friendly' : 'Gym required'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Star size={13} /> {data.experiencePointsEarned} XP
          </span>
        </div>
      </Section>
    </div>
  );
};

export default memo(HowToPerformTab);
