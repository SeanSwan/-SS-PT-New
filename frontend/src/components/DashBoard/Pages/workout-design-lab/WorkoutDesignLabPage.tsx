/**
 * Workout Design Lab v2
 * Ten independently composed, read-only workout interface directions.
 */
import React, { useMemo, useState } from 'react';
import { CONCEPT_REGISTRY } from './conceptRegistry';
import { ConceptProps } from './concepts/conceptShared';
import { AlpinePrecision } from './concepts/AlpinePrecision';
import { VelocityPoster } from './concepts/VelocityPoster';
import { AfterDarkStories } from './concepts/AfterDarkStories';
import { CommandTerminal } from './concepts/CommandTerminal';
import { AtelierEditorial } from './concepts/AtelierEditorial';
import { ConsoleMission } from './concepts/ConsoleMission';
import { SpatialStudio } from './concepts/SpatialStudio';
import { PitWall } from './concepts/PitWall';
import { BentoMotion } from './concepts/BentoMotion';
import { FieldManual } from './concepts/FieldManual';
import { Lab, LabHeader, LiveReceipt, Pick, Picker, Stage } from './WorkoutDesignLabShell.styles';

const conceptComponents: Record<string, React.ComponentType<ConceptProps>> = {
  alpine: AlpinePrecision,
  velocity: VelocityPoster,
  stories: AfterDarkStories,
  terminal: CommandTerminal,
  atelier: AtelierEditorial,
  mission: ConsoleMission,
  spatial: SpatialStudio,
  'pit-wall': PitWall,
  bento: BentoMotion,
  field: FieldManual,
};

const WorkoutDesignLabPage: React.FC = () => {
  const [activeId, setActiveId] = useState(CONCEPT_REGISTRY[0].id);
  const [receipt, setReceipt] = useState('Choose a direction, then try its primary action.');
  const ActiveConcept = useMemo(() => conceptComponents[activeId] ?? AlpinePrecision, [activeId]);

  return (
    <Lab>
      <LabHeader>
        <div>
          <h1>Ten independent workout interface directions</h1>
          <p>Same workout logic. Ten different product worlds. Shared exercise truth: /api/exercises/library.</p>
        </div>
        <Picker aria-label="Choose a workout interface direction">
          {CONCEPT_REGISTRY.map((concept) => (
            <Pick
              key={concept.id}
              type="button"
              $active={concept.id === activeId}
              aria-pressed={concept.id === activeId}
              onClick={() => {
                setActiveId(concept.id);
                setReceipt(`Viewing ${concept.name}: ${concept.lens}.`);
              }}
            >
              <span>{concept.number}</span>
              {concept.name}
            </Pick>
          ))}
        </Picker>
      </LabHeader>
      <Stage>
        <ActiveConcept onAction={setReceipt} />
      </Stage>
      <LiveReceipt role="status" aria-live="polite">{receipt}</LiveReceipt>
    </Lab>
  );
};

export default WorkoutDesignLabPage;
