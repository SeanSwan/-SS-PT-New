/**
 * ┌─── SUB-COMPONENT: NASMPhaseGuide ──────────────────────┐
 * │ PARENT: WorkoutLogger                                    │
 * │ PURPOSE: Collapsible NASM OPT phase education card       │
 * │          with protocol details + "Load Template" button  │
 * │ WIREFRAME:                                               │
 * │ ┌──────────────────────────────────────────────────┐     │
 * │ │ [?] Phase 1: Stabilization Endurance — Guide     │     │
 * │ │                                                   │     │
 * │ │ GOAL: Improve muscular endurance & stability      │     │
 * │ │ Reps: 12-20  Sets: 1-3  Rest: 0-90s             │     │
 * │ │ Tempo: 4/2/1 (4s down, 2s hold, 1s up)          │     │
 * │ │ Intensity: 50-70% 1RM                            │     │
 * │ │                                                   │     │
 * │ │ KEY PRINCIPLES:                                   │     │
 * │ │ • Use unstable surfaces (BOSU, stability ball)    │     │
 * │ │ • Controlled tempo builds proprioception          │     │
 * │ │                                                   │     │
 * │ │ [Load Phase 1 Template]                           │     │
 * │ └──────────────────────────────────────────────────┘     │
 * │ Props: { phase, onLoadTemplate, collapsed? }             │
 * └──────────────────────────────────────────────────────────┘
 */

import React, { memo, useState } from 'react';
import styled from 'styled-components';
import { BookOpen, ChevronDown, Download } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';
import { getPhaseProtocol } from './NASMPhaseTemplates';

interface NASMPhaseGuideProps {
  phase: number;
  onLoadTemplate: (phase: number) => void;
  defaultCollapsed?: boolean;
}

const NASMPhaseGuide: React.FC<NASMPhaseGuideProps> = memo(({
  phase,
  onLoadTemplate,
  defaultCollapsed = true,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const protocol = getPhaseProtocol(phase);

  return (
    <GuideCard>
      <GuideHeader type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}>
        <BookOpen size={16} />
        <span>Phase {protocol.phase}: {protocol.name} — Training Guide</span>
        <ChevronIcon size={16} $open={!collapsed} />
      </GuideHeader>

      {!collapsed && (
        <GuideBody>
          <GoalRow>
            <GoalLabel>GOAL</GoalLabel>
            <GoalText>{protocol.goal}</GoalText>
          </GoalRow>

          <ProtocolGrid>
            <ProtocolItem>
              <ProtocolLabel>Reps</ProtocolLabel>
              <ProtocolValue>{protocol.repsRange}</ProtocolValue>
            </ProtocolItem>
            <ProtocolItem>
              <ProtocolLabel>Sets</ProtocolLabel>
              <ProtocolValue>{protocol.setsRange}</ProtocolValue>
            </ProtocolItem>
            <ProtocolItem>
              <ProtocolLabel>Rest</ProtocolLabel>
              <ProtocolValue>{protocol.restRange}</ProtocolValue>
            </ProtocolItem>
            <ProtocolItem>
              <ProtocolLabel>Tempo</ProtocolLabel>
              <ProtocolValue>{protocol.tempo}</ProtocolValue>
            </ProtocolItem>
            <ProtocolItem>
              <ProtocolLabel>Intensity</ProtocolLabel>
              <ProtocolValue>{protocol.intensityPct} 1RM</ProtocolValue>
            </ProtocolItem>
          </ProtocolGrid>

          <TempoExplain>{protocol.tempoExplain}</TempoExplain>

          <PrinciplesSection>
            <PrinciplesTitle>KEY PRINCIPLES</PrinciplesTitle>
            {protocol.keyPrinciples.map((p, i) => (
              <PrincipleItem key={i}>{p}</PrincipleItem>
            ))}
          </PrinciplesSection>

          <LoadTemplateBtn type="button" onClick={() => onLoadTemplate(phase)}>
            <Download size={16} />
            Load Phase {phase} Template
          </LoadTemplateBtn>
        </GuideBody>
      )}
    </GuideCard>
  );
});

NASMPhaseGuide.displayName = 'NASMPhaseGuide';
export default NASMPhaseGuide;

// ── Styled Components ──

const GuideCard = styled.div`
  background: ${withAlpha(CS.surfaceDark, 0.8)};
  backdrop-filter: blur(16px);
  border: 1px solid ${withAlpha(CS.secondary, 0.15)};
  border-radius: 16px;
  margin-bottom: 1rem;
  overflow: hidden;
`;

const GuideHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 20px;
  border: none;
  background: transparent;
  color: ${CS.secondaryLight};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 48px;
  transition: background 0.2s;

  &:hover { background: ${withAlpha(CS.secondary, 0.06)}; }
  &:focus-visible {
    outline: 2px solid ${CS.secondary};
    outline-offset: -2px;
  }

  svg:first-child { color: ${CS.secondary}; flex-shrink: 0; }
  span { flex: 1; text-align: left; }
`;

const ChevronIcon = styled(ChevronDown)<{ $open: boolean }>`
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: rotate(${p => p.$open ? '180deg' : '0deg'});
  color: ${CS.textSecondary};
`;

const GuideBody = styled.div`
  padding: 0 20px 20px;
`;

const GoalRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 16px;
`;

const GoalLabel = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${CS.gaming};
  font-family: 'Sora', sans-serif;
  flex-shrink: 0;
`;

const GoalText = styled.span`
  font-size: 0.9rem;
  color: ${CS.text};
  font-family: 'Plus Jakarta Sans', sans-serif;
`;

const ProtocolGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
`;

const ProtocolItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 14px;
  background: ${withAlpha(CS.bgDeep, 0.6)};
  border-radius: 10px;
  border: 1px solid ${withAlpha(CS.glow, 0.08)};
  min-width: 80px;
`;

const ProtocolLabel = styled.span`
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${CS.textSecondary};
  font-family: 'Sora', sans-serif;
`;

const ProtocolValue = styled.span`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${CS.text};
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
`;

const TempoExplain = styled.div`
  font-size: 0.78rem;
  color: ${CS.textSecondary};
  font-style: italic;
  font-family: 'Sora', sans-serif;
  margin-bottom: 16px;
  padding-left: 4px;
`;

const PrinciplesSection = styled.div`
  margin-bottom: 16px;
`;

const PrinciplesTitle = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${CS.gaming};
  font-family: 'Sora', sans-serif;
  margin-bottom: 8px;
`;

const PrincipleItem = styled.div`
  font-size: 0.85rem;
  color: ${CS.text};
  font-family: 'Sora', sans-serif;
  padding: 4px 0 4px 16px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 12px;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: ${CS.glow};
  }
`;

const LoadTemplateBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px 20px;
  min-height: 48px;
  background: ${withAlpha(CS.secondary, 0.15)};
  border: 1.5px solid ${withAlpha(CS.secondary, 0.3)};
  border-radius: 12px;
  color: ${CS.secondaryLight};
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;

  &:hover {
    background: ${withAlpha(CS.secondary, 0.25)};
    border-color: ${withAlpha(CS.secondary, 0.5)};
    box-shadow: 0 0 16px ${withAlpha(CS.secondary, 0.15)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.secondary};
    outline-offset: 2px;
  }
`;
