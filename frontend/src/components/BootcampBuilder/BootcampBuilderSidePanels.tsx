import type { Dispatch, SetStateAction } from 'react';
import type { GeneratedBootcamp, BootcampExercise, DayType } from '../../hooks/useBootcampAPI';
import type { ClassStyle, IntensityCategory } from './BootcampBuilderConstants';
import { getMainBoardExercises } from './BootcampBuilderPlacement';
import ConfigPanel from './ConfigPanel';
import ExerciseDetailPanel from './ExerciseDetailPanel';
import ExerciseIntelligencePicker from './ExerciseIntelligencePicker';
import type { RolodexExercise } from './ExerciseIntelligencePicker';
import type { BuildMode } from './BootcampBuilderPage.constants';

type Setter<T> = Dispatch<SetStateAction<T>>;

interface BootcampLeftPanelProps {
  buildMode: BuildMode;
  bootcamp: GeneratedBootcamp | null;
  stationCount: number;
  setStationCount: (value: number) => void;
  exercisesPerStation: number;
  setExercisesPerStation: (value: number) => void;
  classStyle: ClassStyle;
  setClassStyle: Setter<ClassStyle>;
  dayType: DayType;
  setDayType: Setter<DayType>;
  intensityCategory: IntensityCategory;
  setIntensityCategory: Setter<IntensityCategory>;
  optPhase: number;
  setOptPhase: Setter<number>;
  targetDuration: string;
  setTargetDuration: Setter<string>;
  expectedParticipants: string;
  setExpectedParticipants: Setter<string>;
  className: string;
  setClassName: Setter<string>;
  equipmentProfileId: number | null;
  setEquipmentProfileId: Setter<number | null>;
  includeStretch: boolean;
  setIncludeStretch: Setter<boolean>;
  floorMode: boolean;
  loading: boolean;
  error: string | null;
  selectedRolodexId: string | number | null;
  onAddExercise: (exercise: RolodexExercise) => void;
  onGenerate: () => void;
  onSelectFromRolodex: (exercise: RolodexExercise) => void;
}

interface BootcampRightPanelProps {
  buildMode: BuildMode;
  bootcamp: GeneratedBootcamp | null;
  equipmentProfileId: number | null;
  selectedExercise: BootcampExercise | null;
  selectedRolodexId: string | number | null;
  onAddExercise: (exercise: RolodexExercise) => void;
  onSelectFromRolodex: (exercise: RolodexExercise) => void;
}

const getManualStationInfo = (stationCount: number, exercisesPerStation: number, bootcamp: GeneratedBootcamp | null) => {
  const filled = getMainBoardExercises(bootcamp?.exercises || []).length;
  return `${filled}/${stationCount * exercisesPerStation} slots`;
};

export const BootcampLeftPanel: React.FC<BootcampLeftPanelProps> = ({
  buildMode,
  bootcamp,
  stationCount,
  setStationCount,
  exercisesPerStation,
  setExercisesPerStation,
  classStyle,
  setClassStyle,
  dayType,
  setDayType,
  intensityCategory,
  setIntensityCategory,
  optPhase,
  setOptPhase,
  targetDuration,
  setTargetDuration,
  expectedParticipants,
  setExpectedParticipants,
  className,
  setClassName,
  equipmentProfileId,
  setEquipmentProfileId,
  includeStretch,
  setIncludeStretch,
  floorMode,
  loading,
  error,
  selectedRolodexId,
  onAddExercise,
  onGenerate,
  onSelectFromRolodex,
}) => buildMode === 'manual' ? (
  <ExerciseIntelligencePicker
    onAddExercise={onAddExercise}
    onSelectExercise={onSelectFromRolodex}
    selectedId={selectedRolodexId}
    showFormatSelector
    stationCount={stationCount}
    exercisesPerStation={exercisesPerStation}
    onStationCountChange={setStationCount}
    onExercisesPerStationChange={setExercisesPerStation}
    equipmentProfileId={equipmentProfileId}
    onEquipmentProfileChange={setEquipmentProfileId}
    stationInfo={getManualStationInfo(stationCount, exercisesPerStation, bootcamp)}
    selectionContext="manual_builder"
  />
) : (
  <ConfigPanel
    stationCount={stationCount} setStationCount={setStationCount}
    exercisesPerStation={exercisesPerStation} setExercisesPerStation={setExercisesPerStation}
    classStyle={classStyle} setClassStyle={setClassStyle}
    dayType={dayType} setDayType={setDayType}
    intensityCategory={intensityCategory} setIntensityCategory={setIntensityCategory}
    optPhase={optPhase} setOptPhase={setOptPhase}
    targetDuration={targetDuration} setTargetDuration={setTargetDuration}
    expectedParticipants={expectedParticipants} setExpectedParticipants={setExpectedParticipants}
    className={className} setClassName={setClassName}
    equipmentProfileId={equipmentProfileId} setEquipmentProfileId={setEquipmentProfileId}
    includeStretch={includeStretch} setIncludeStretch={setIncludeStretch}
    floorMode={floorMode}
    loading={loading}
    error={error}
    onGenerate={onGenerate}
  />
);

export const BootcampRightPanel: React.FC<BootcampRightPanelProps> = ({
  buildMode,
  bootcamp,
  equipmentProfileId,
  selectedExercise,
  selectedRolodexId,
  onAddExercise,
  onSelectFromRolodex,
}) => buildMode === 'hybrid' ? (
  <ExerciseIntelligencePicker
    onAddExercise={onAddExercise}
    onSelectExercise={onSelectFromRolodex}
    selectedId={selectedRolodexId}
    equipmentProfileId={equipmentProfileId}
    selectionContext="hybrid_builder"
  />
) : (
  <ExerciseDetailPanel
    selectedExercise={selectedExercise}
    bootcamp={bootcamp}
    equipmentProfileId={equipmentProfileId}
  />
);
