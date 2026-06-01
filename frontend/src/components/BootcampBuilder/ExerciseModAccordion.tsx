import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { BootcampExercise } from '../../hooks/useBootcampAPI';
import {
  EmptyModState,
  ModAccordionHeader,
  ModCount,
  ModLabel,
  ModRow,
  ModTable,
  ModValue,
} from './ClassPreviewPanel.exerciseStyles';

type ModificationKey =
  | 'easyVariation'
  | 'kneeMod'
  | 'shoulderMod'
  | 'backMod'
  | 'ankleMod'
  | 'wristMod'
  | 'elbowMod'
  | 'footMod'
  | 'hipMod';

const MOD_FIELDS: Array<{ key: ModificationKey; label: string; icon: string; type: 'easy' | 'joint' }> = [
  { key: 'easyVariation', label: 'Easier Version', icon: 'Easy', type: 'easy' },
  { key: 'kneeMod', label: 'Knee-Friendly', icon: 'Knee', type: 'joint' },
  { key: 'shoulderMod', label: 'Shoulder-Friendly', icon: 'Shoulder', type: 'joint' },
  { key: 'backMod', label: 'Lower Back-Friendly', icon: 'Back', type: 'joint' },
  { key: 'ankleMod', label: 'Ankle-Friendly', icon: 'Ankle', type: 'joint' },
  { key: 'wristMod', label: 'Wrist-Friendly', icon: 'Wrist', type: 'joint' },
  { key: 'elbowMod', label: 'Elbow-Friendly', icon: 'Elbow', type: 'joint' },
  { key: 'footMod', label: 'Foot-Friendly', icon: 'Foot', type: 'joint' },
  { key: 'hipMod', label: 'Hip-Friendly', icon: 'Hip', type: 'joint' },
];

const hasModification = (value: BootcampExercise[ModificationKey]) =>
  typeof value === 'string' && value.length > 0 && value !== 'N/A' && value !== 'n/a' && value.trim().length > 0;

const ExerciseModAccordion: React.FC<{ ex: BootcampExercise; exIdx: number }> = ({ ex, exIdx }) => {
  const [open, setOpen] = useState(false);
  const mods = MOD_FIELDS.filter((mod) => hasModification(ex[mod.key]));

  return (
    <div>
      <ModAccordionHeader onClick={() => setOpen(!open)} type="button">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{exIdx + 1}. {ex.exerciseName}</span>
        <ModCount>{mods.length} alternatives</ModCount>
      </ModAccordionHeader>
      {open && mods.length > 0 && (
        <ModTable>
          {mods.map((mod, index) => (
            <ModRow key={mod.key} $even={index % 2 === 0} $type={mod.type}>
              <ModLabel>{mod.icon}: {mod.label}</ModLabel>
              <ModValue>{ex[mod.key]}</ModValue>
            </ModRow>
          ))}
        </ModTable>
      )}
      {open && mods.length === 0 && (
        <EmptyModState>No modifications available yet - data is being populated</EmptyModState>
      )}
    </div>
  );
};

export default ExerciseModAccordion;
