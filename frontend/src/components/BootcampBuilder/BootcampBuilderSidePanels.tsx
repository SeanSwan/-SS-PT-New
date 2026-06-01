import type { Dispatch, SetStateAction } from 'react';
import type { GeneratedBootcamp, BootcampExercise, ClassFormat, DayType } from '../../hooks/useBootcampAPI';
import type { ClassStyle, IntensityCategory } from './BootcampBuilderConstants';
import { FORMAT_CONFIG, getExercisesPerStation, getStationCount } from './BootcampBuilderConstants';
import { getMainBoardExercises } from './BootcampBuilderPlacement';
import ConfigPanel from './ConfigPanel';
import ExerciseDetailPanel from './ExerciseDetailPanel';
import ExerciseRolodexPanel from './ExerciseRolodexPanel';
import type { RolodexExercise } from './ExerciseRolodexPanel';
import type { BuildMode } from './BootcampBuilderPage.constants';

type Setter<T> = Dispatch<SetStateAction<T>>;

interface BootcampLeftPanelProps {
  buildMode: BuildMode;
  bootcamp: GeneratedBootcamp | null;
  classFormat: ClassFormat;
  setClassFormat: (value: ClassFormat) => void;
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
  onManualFormatChange: (format: string) => void;
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

const getManualStationInfo = (classFormat: ClassFormat, bootcamp: GeneratedBootcamp | null) => {
  const cfg = FORMAT_CONFIG[classFormat];
  if (!cfg?.isStationBased) return 'Circuit mode';
  const sc = getStationCount(classFormat);
  const epc = getExercisesPerStation(classFormat);
  const filled = getMainBoardExercises(bootcamp?.exercises || []).length;
  return `${filled}/${sc * epc} slots`;
};

export const BootcampLeftPanel: React.FC<BootcampLeftPanelProps> = ({
  buildMode,
  bootcamp,
  classFormat,
  setClassFormat,
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
  onManualFormatChange,
}) => buildMode === 'manual' ? (
  <ExerciseRolodexPanel
    onAddExercise={onAddExercise}
    onSelectExercise={onSelectFromRolodex}
    selectedId={selectedRolodexId}
    showFormatSelector
    classFormat={classFormat}
    onFormatChange={onManualFormatChange}
    equipmentProfileId={equipmentProfileId}
    onEquipmentProfileChange={setEquipmentProfileId}
    stationInfo={getManualStationInfo(classFormat, bootcamp)}
  />
) : (
  <ConfigPanel
    classFormat={classFormat} setClassFormat={setClassFormat}
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
  <ExerciseRolodexPanel
    onAddExercise={onAddExercise}
    onSelectExercise={onSelectFromRolodex}
    selectedId={selectedRolodexId}
    equipmentProfileId={equipmentProfileId}
  />
) : (
  <ExerciseDetailPanel
    selectedExercise={selectedExercise}
    bootcamp={bootcamp}
    equipmentProfileId={equipmentProfileId}
  />
);
