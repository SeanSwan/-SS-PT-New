/**
 * BootcampBuilderPage - active /bootcamp-builder page shell.
 * Owns class generation, save/export, and manual station placement state.
 */
import React, { useCallback, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useBootcampAPI } from '../../hooks/useBootcampAPI';
import type { GeneratedBootcamp, BootcampExercise, ClassFormat, DayType } from '../../hooks/useBootcampAPI';
import type { ClassStyle, IntensityCategory } from './BootcampBuilderConstants';
import { FORMAT_CONFIG, getStationCount, getExercisesPerStation, getRounds, calcWorkInterval, OVERHEAD_MIN } from './BootcampBuilderConstants';
import { PageWrapper } from './BootcampBuilderStyles';
import { FourPane } from './BootcampModeStyles';
import BootcampBuilderChrome from './BootcampBuilderChrome';
import BootcampBuilderErrorBoundary from './BootcampBuilderErrorBoundary';
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
  const api = useBootcampAPI();
  const [classFormat, setClassFormat] = useState<ClassFormat>('2x8_r3');
  const [classStyle, setClassStyle] = useState<ClassStyle>('standard');
  const [dayType, setDayType] = useState<DayType>('full_body');
  const [intensityCategory, setIntensityCategory] = useState<IntensityCategory>('high_impact');
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [targetDuration, setTargetDuration] = useState('50');
  const [expectedParticipants, setExpectedParticipants] = useState('12');
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
    const cfg = FORMAT_CONFIG[classFormat];
    if (!cfg?.isStationBased || bootcamp) return;
    const targetDur = parseInt(targetDuration, 10) || 45;
    const { workSec } = calcWorkInterval(classFormat, targetDur);
    setBootcamp({
      name: className || 'Manual Class',
      classFormat,
      dayType,
      stationCount: cfg.stations,
      targetDuration: targetDur,
      totalWorkoutMin: 0,
      totalClassMin: OVERHEAD_MIN,
      expectedParticipants: parseInt(expectedParticipants, 10) || 12,
      stations: Array.from({ length: cfg.stations }, (_, i) => ({
        stationNumber: i + 1,
        stationName: `Station ${i + 1}`,
        equipmentNeeded: null,
      })),
      exercises: [],
      explanations: [{
        type: 'info',
        message: `Manual - ${cfg.stations} stations x ${cfg.exercisesPerStation} exercises x ${cfg.rounds} rounds, ${workSec}s each`,
      }],
      overflowPlan: null,
    } as any);
  }, [buildMode, classFormat, bootcamp, targetDuration, className, dayType, expectedParticipants]);
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
    const formatCfg = FORMAT_CONFIG[classFormat];
    const isStationBased = formatCfg?.isStationBased ?? false;
    const targetDur = parseInt(targetDuration, 10) || 45;
    const { workSec } = calcWorkInterval(classFormat, targetDur);
    const maxPerStation = getExercisesPerStation(classFormat);
    const numStations = isStationBased ? getStationCount(classFormat) : 0;
    const existingForPlacement = getMainBoardExercises(bootcamp?.exercises || []);
    const stationCounts = countMainBoardExercisesByStation(existingForPlacement);
    let placedStationIdx = activeStation ?? 0;
    if (isStationBased && numStations > 0 && activeStation === null) {
      placedStationIdx = -1;
      for (let i = 0; i < numStations; i++) {
        if ((stationCounts.get(i) || 0) < maxPerStation) {
          placedStationIdx = i;
          break;
        }
      }
    }
    if (isStationBased && placedStationIdx === -1) {
      toast.error(`All ${numStations} stations are full (${maxPerStation} exercises each). Delete an exercise first.`);
      return;
    }
    if (isStationBased && (stationCounts.get(placedStationIdx) || 0) >= maxPerStation) {
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
          exercises: updatedExercises,
          totalWorkoutMin: Math.ceil(totalExSec / 60),
          totalClassMin: Math.ceil(totalExSec / 60) + OVERHEAD_MIN,
        };
      }
      const stations = isStationBased
        ? Array.from({ length: numStations }, (_, i) => ({
          stationNumber: i + 1,
          stationName: `Station ${i + 1}`,
          equipmentNeeded: null,
        }))
        : [];
      return {
        name: className || 'Manual Class',
        classFormat,
        dayType,
        stationCount: numStations,
        targetDuration: targetDur,
        totalWorkoutMin: Math.ceil(totalExSec / 60),
        totalClassMin: Math.ceil(totalExSec / 60) + OVERHEAD_MIN,
        expectedParticipants: parseInt(expectedParticipants, 10) || 12,
        stations,
        exercises: updatedExercises,
        explanations: [{ type: 'info', message: isStationBased
          ? `Manual - ${numStations} stations x ${maxPerStation} ex x ${getRounds(classFormat)} rounds, ${workSec}s each`
          : 'Manual circuit - add exercises' }],
        overflowPlan: null,
      } as any;
    });
    toast.success(`Added: ${exercise.name}${isStationBased ? ` -> Station ${placedStationIdx + 1}` : ''}`);
  }, [className, classFormat, dayType, targetDuration, expectedParticipants, bootcamp, activeStation]);
  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBootcamp(null);
    setSelectedExercise(null);
    try {
      const result = await api.generateClass({
        classFormat,
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
  }, [api, classFormat, classStyle, dayType, intensityCategory, targetDuration, expectedParticipants, className, equipmentProfileId, optPhase, includeStretch]);
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
  const handleManualFormatChange = useCallback((format: string) => {
    setClassFormat(format as ClassFormat);
    setBootcamp(null);
    setActiveStation(null);
  }, []);
  return (
    <PageWrapper $floorMode={floorMode}>
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
      <FourPane>
        <BootcampLeftPanel
          buildMode={buildMode}
          bootcamp={bootcamp}
          classFormat={classFormat}
          setClassFormat={setClassFormat}
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
          onManualFormatChange={handleManualFormatChange}
        />
        <ClassPreviewPanel
          bootcamp={bootcamp}
          loading={loading}
          floorMode={floorMode}
          saving={saving}
          onSave={handleSave}
          onSelectExercise={setSelectedExercise}
          onDeleteExercise={buildMode !== 'ai' ? handleDeleteExercise : undefined}
          onSelectStation={buildMode !== 'ai' ? setActiveStation : undefined}
          activeStation={activeStation}
        />
        <BootcampRightPanel
          buildMode={buildMode}
          bootcamp={bootcamp}
          equipmentProfileId={equipmentProfileId}
          selectedExercise={selectedExercise}
          selectedRolodexId={selectedRolodexId}
          onAddExercise={handleAddFromRolodex}
          onSelectFromRolodex={handleSelectFromRolodex}
        />
      </FourPane>
    </PageWrapper>
  );
};
const BootcampBuilderPageWithBoundary: React.FC = () => (
  <BootcampBuilderErrorBoundary>
    <BootcampBuilderPage />
  </BootcampBuilderErrorBoundary>
);
export default BootcampBuilderPageWithBoundary;
