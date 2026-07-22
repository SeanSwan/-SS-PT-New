import React, { useCallback, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useBootcampAPI } from '../../hooks/useBootcampAPI';
import type { GeneratedBootcamp, BootcampExercise, ClassFormat, DayType } from '../../hooks/useBootcampAPI';
import { CUSTOM_BOOTCAMP_FORMAT, DEFAULT_BOOTCAMP_EXERCISES_PER_STATION, DEFAULT_BOOTCAMP_ROUNDS, DEFAULT_BOOTCAMP_STATION_COUNT, DEFAULT_BOOTCAMP_WORKOUT_MIN, calcWorkIntervalForStructure, OVERHEAD_MIN, type ClassStyle, type IntensityCategory } from './BootcampBuilderConstants';
import { PageWrapper } from './BootcampBuilderStyles';
import { FourPane } from './BootcampModeStyles';
import BootcampBuilderChrome from './BootcampBuilderChrome';
import BootcampCoachDockMount from '../CoachDock/BootcampCoachDockMount';
import BootcampBuilderErrorBoundary from './BootcampBuilderErrorBoundary'; import BootcampBuilderLensFrame from './BootcampBuilderLensFrame';
import BootcampFloorPresentation from './BootcampFloorPresentation';
import type { BuildMode } from './BootcampBuilderPage.constants';
import { BootcampLeftPanel, BootcampRightPanel } from './BootcampBuilderSidePanels';
import { exportBootcampTemplatePDF } from './BootcampBuilderPdfExport';
import ClassPreviewPanel from './ClassPreviewPanel';
import type { RolodexExercise } from './ExerciseRolodexPanel';
import { buildBootcampExerciseFromRolodex } from './BootcampExerciseAlternatives';
import {
  countMainBoardExercisesByStation,
  getMainBoardExercises,
  getMainBoardWorkoutSeconds,
  getNextMainBoardSortOrder,
} from './BootcampBuilderPlacement';
const BootcampBuilderPage: React.FC = () => {
  const api = useBootcampAPI(), classFormat = CUSTOM_BOOTCAMP_FORMAT as ClassFormat;
  const [stationCount, setStationCount] = useState(DEFAULT_BOOTCAMP_STATION_COUNT); const [exercisesPerStation, setExercisesPerStation] = useState(DEFAULT_BOOTCAMP_EXERCISES_PER_STATION);
  const [classStyle, setClassStyle] = useState<ClassStyle>('standard');
  const [dayType, setDayType] = useState<DayType>('full_body');
  const [intensityCategory, setIntensityCategory] = useState<IntensityCategory>('high_impact');
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [targetDuration, setTargetDuration] = useState(DEFAULT_BOOTCAMP_WORKOUT_MIN); const [expectedParticipants, setExpectedParticipants] = useState('12');
  const [className, setClassName] = useState('');
  const [optPhase, setOptPhase] = useState(1);
  const [includeStretch, setIncludeStretch] = useState(true);
  const [bootcamp, setBootcamp] = useState<GeneratedBootcamp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floorMode, setFloorMode] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<BootcampExercise | null>(null);
  const [saving, setSaving] = useState(false);
  const [buildMode, setBuildMode] = useState<BuildMode>('ai');
  const [activeStation, setActiveStation] = useState<number | null>(null);
  const [selectedRolodexId, setSelectedRolodexId] = useState<string | number | null>(null);
  const totalClassMin = bootcamp
    ? (bootcamp.totalClassMin || (bootcamp.totalWorkoutMin || 0) + 13)
    : parseInt(targetDuration, 10) + 13;
  const isOverTime = totalClassMin > 55;
  useEffect(() => {
    if (buildMode === 'ai') return;
    if (bootcamp) return;
    const targetDur = parseInt(targetDuration, 10) || 45;
    const { workSec } = calcWorkIntervalForStructure(stationCount, exercisesPerStation, DEFAULT_BOOTCAMP_ROUNDS, targetDur);
    setBootcamp({
      name: className || 'Manual Class',
      classFormat,
      dayType,
      stationCount,
      exercisesPerStation,
      rounds: DEFAULT_BOOTCAMP_ROUNDS,
      exerciseDurationSec: workSec,
      targetDuration: targetDur,
      totalWorkoutMin: 0,
      totalClassMin: OVERHEAD_MIN,
      expectedParticipants: parseInt(expectedParticipants, 10) || 12,
      stations: Array.from({ length: stationCount }, (_, i) => ({
        stationNumber: i + 1,
        stationName: `Station ${i + 1}`,
        equipmentNeeded: null,
      })),
      exercises: [],
      explanations: [{
        type: 'info',
        message: `Manual - ${stationCount} stations x ${exercisesPerStation} exercises x ${DEFAULT_BOOTCAMP_ROUNDS} rounds, ${workSec}s each`,
      }],
      overflowPlan: null,
    } as any);
  }, [buildMode, classFormat, bootcamp, targetDuration, className, dayType, expectedParticipants, stationCount, exercisesPerStation]);
  const handleSelectFromRolodex = useCallback((exercise: RolodexExercise) => {
    setSelectedRolodexId(exercise.id);
    setSelectedExercise(buildBootcampExerciseFromRolodex(exercise, {
      durationSec: 35,
      restSec: 15,
      sortOrder: 0,
      stationIndex: 0,
      setupTimeSec: 5,
    }));
  }, []);
  const handleDeleteExercise = useCallback((globalIndex: number) => {
    setBootcamp(prev => {
      if (!prev) return prev;
      const updated = prev.exercises.filter((_, i) => i !== globalIndex);
      const totalExSec = getMainBoardWorkoutSeconds(updated, 35, 15);
      return {
        ...prev,
        exercises: updated,
        totalWorkoutMin: Math.ceil(totalExSec / 60),
        totalClassMin: Math.ceil(totalExSec / 60) + OVERHEAD_MIN,
      };
    });
  }, []);
  const handleAddFromRolodex = useCallback((exercise: RolodexExercise) => {
    const targetDur = parseInt(targetDuration, 10) || 45;
    const { workSec } = calcWorkIntervalForStructure(stationCount, exercisesPerStation, DEFAULT_BOOTCAMP_ROUNDS, targetDur);
    const maxPerStation = exercisesPerStation;
    const numStations = stationCount;
    const existingForPlacement = getMainBoardExercises(bootcamp?.exercises || []);
    const stationCounts = countMainBoardExercisesByStation(existingForPlacement);
    let placedStationIdx = activeStation != null && activeStation < numStations ? activeStation : 0;
    if (numStations > 0 && activeStation === null) {
      placedStationIdx = -1;
      for (let i = 0; i < numStations; i++) {
        if ((stationCounts.get(i) || 0) < maxPerStation) {
          placedStationIdx = i;
          break;
        }
      }
    }
    if (placedStationIdx === -1) {
      toast.error(`All ${numStations} stations are full (${maxPerStation} exercises each). Delete an exercise first.`);
      return;
    }
    if ((stationCounts.get(placedStationIdx) || 0) >= maxPerStation) {
      toast.error(`Station ${placedStationIdx + 1} is full (${maxPerStation} exercises). Click another station or delete an exercise.`);
      return;
    }
    setBootcamp(prev => {
      const existingExercises = prev?.exercises || [];
      const newEx = buildBootcampExerciseFromRolodex(exercise, {
        durationSec: workSec,
        restSec: 15,
        sortOrder: getNextMainBoardSortOrder(existingExercises, placedStationIdx),
        stationIndex: placedStationIdx,
        setupTimeSec: 5,
      });
      const updatedExercises = [...existingExercises, newEx];
      const totalExSec = getMainBoardWorkoutSeconds(updatedExercises, workSec, 15);
      if (prev) {
        return {
          ...prev,
          stationCount: numStations,
          exercisesPerStation: maxPerStation,
          rounds: DEFAULT_BOOTCAMP_ROUNDS,
          exerciseDurationSec: workSec,
          exercises: updatedExercises,
          totalWorkoutMin: Math.ceil(totalExSec / 60),
          totalClassMin: Math.ceil(totalExSec / 60) + OVERHEAD_MIN,
        };
      }
      const stations = Array.from({ length: numStations }, (_, i) => ({
          stationNumber: i + 1,
          stationName: `Station ${i + 1}`,
          equipmentNeeded: null,
        }));
      return {
        name: className || 'Manual Class',
        classFormat,
        dayType,
        stationCount: numStations,
        exercisesPerStation: maxPerStation,
        rounds: DEFAULT_BOOTCAMP_ROUNDS,
        exerciseDurationSec: workSec,
        targetDuration: targetDur,
        totalWorkoutMin: Math.ceil(totalExSec / 60),
        totalClassMin: Math.ceil(totalExSec / 60) + OVERHEAD_MIN,
        expectedParticipants: parseInt(expectedParticipants, 10) || 12,
        stations,
        exercises: updatedExercises,
        explanations: [{ type: 'info', message: `Manual - ${numStations} stations x ${maxPerStation} ex x ${DEFAULT_BOOTCAMP_ROUNDS} rounds, ${workSec}s each` }],
        overflowPlan: null,
      } as any;
    });
    toast.success(`Added: ${exercise.name} -> Station ${placedStationIdx + 1}`);
  }, [className, classFormat, dayType, targetDuration, expectedParticipants, bootcamp, activeStation, stationCount, exercisesPerStation]);
  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBootcamp(null);
    setSelectedExercise(null);
    try {
      const result = await api.generateClass({
        classFormat,
        stationCount,
        exercisesPerStation,
        classStyle,
        dayType,
        intensityCategory,
        targetDuration: parseInt(targetDuration, 10) || 45,
        expectedParticipants: parseInt(expectedParticipants, 10) || 12,
        name: className || undefined,
        equipmentProfileId: equipmentProfileId || undefined,
        optPhase,
        includeStretch,
      });
      setBootcamp(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [api, classFormat, stationCount, exercisesPerStation, classStyle, dayType, intensityCategory, targetDuration, expectedParticipants, className, equipmentProfileId, optPhase, includeStretch]);
  const handleSave = useCallback(async () => {
    if (!bootcamp || saving) return;
    setSaving(true);
    try {
      await api.saveTemplate(bootcamp);
      toast.success('Template saved successfully');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [api, bootcamp, saving]);
  const handleExportPDF = useCallback(() => {
    if (!bootcamp) return;
    exportBootcampTemplatePDF(bootcamp);
    toast.success('Bootcamp PDF exported');
  }, [bootcamp]);
  const handleStationCountChange = useCallback((value: number) => { setStationCount(value); setBootcamp(null); setActiveStation(null); }, []);
  const handleExercisesPerStationChange = useCallback((value: number) => { setExercisesPerStation(value); setBootcamp(null); setActiveStation(null); }, []);
  return (
    <PageWrapper $floorMode={floorMode}>
      <BootcampFloorPresentation active={floorMode} />
      <BootcampBuilderChrome
        bootcamp={bootcamp}
        buildMode={buildMode}
        floorMode={floorMode}
        isOverTime={isOverTime}
        totalClassMin={totalClassMin}
        onBuildModeChange={setBuildMode}
        onExportPDF={handleExportPDF}
        onToggleFloorMode={() => setFloorMode(prev => !prev)}
      />
      <FourPane $floorMode={floorMode}>
        {!floorMode && (
          <BootcampLeftPanel
            buildMode={buildMode}
            bootcamp={bootcamp}
            stationCount={stationCount}
            setStationCount={handleStationCountChange}
            exercisesPerStation={exercisesPerStation}
            setExercisesPerStation={handleExercisesPerStationChange}
            classStyle={classStyle}
            setClassStyle={setClassStyle}
            dayType={dayType}
            setDayType={setDayType}
            intensityCategory={intensityCategory}
            setIntensityCategory={setIntensityCategory}
            optPhase={optPhase}
            setOptPhase={setOptPhase}
            targetDuration={targetDuration}
            setTargetDuration={setTargetDuration}
            expectedParticipants={expectedParticipants}
            setExpectedParticipants={setExpectedParticipants}
            className={className}
            setClassName={setClassName}
            equipmentProfileId={equipmentProfileId}
            setEquipmentProfileId={setEquipmentProfileId}
            includeStretch={includeStretch}
            setIncludeStretch={setIncludeStretch}
            floorMode={floorMode}
            loading={loading}
            error={error}
            selectedRolodexId={selectedRolodexId}
            onAddExercise={handleAddFromRolodex}
            onGenerate={handleGenerate}
            onSelectFromRolodex={handleSelectFromRolodex}
          />
        )}
        <ClassPreviewPanel
          bootcamp={bootcamp}
          buildMode={buildMode}
          loading={loading}
          floorMode={floorMode}
          saving={saving}
          onSave={handleSave}
          onSelectExercise={setSelectedExercise}
          onDeleteExercise={buildMode !== 'ai' ? handleDeleteExercise : undefined}
          onSelectStation={buildMode !== 'ai' ? setActiveStation : undefined}
          activeStation={activeStation}
        />
        {!floorMode && (
          <BootcampRightPanel
            buildMode={buildMode}
            bootcamp={bootcamp}
            equipmentProfileId={equipmentProfileId}
            selectedExercise={selectedExercise}
            selectedRolodexId={selectedRolodexId}
            onAddExercise={handleAddFromRolodex}
            onSelectFromRolodex={handleSelectFromRolodex}
          />
        )}
      </FourPane>
      {!floorMode && <BootcampCoachDockMount structureSummary={`${stationCount} stations × ${exercisesPerStation} · ${targetDuration} min`} aiHandlers={{ setStationCount, setExercisesPerStation, setTargetDuration, setOptPhase }} />}{/* CC-3 Coach dock */}
    </PageWrapper>
  );
};
const BootcampBuilderPageWithBoundary: React.FC = () => <BootcampBuilderErrorBoundary><BootcampBuilderLensFrame><BootcampBuilderPage /></BootcampBuilderLensFrame></BootcampBuilderErrorBoundary>;
export default BootcampBuilderPageWithBoundary;
