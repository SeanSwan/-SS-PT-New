/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BootcampBuilderPage                              ║
 * ║  PURPOSE: AI-powered group fitness class builder             ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ���  LAST VALIDATED: 2026-04-01                                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────────────────────────────┐
 * │ [Title: Boot Camp Class Builder] [PDF] [Floor Mode]          │
 * ├─────────────┬──────────────────────┬────────────────────────┤
 * │ Config      │ Class Preview        │ Exercise Detail        │
 * │ - Format    │ - Timing badges      │ - Difficulty tiers     │
 * │ - Style     │ - Station cards      │ - Pain mods            │
 * │ - Day type  │ - Exercise rows      │ - Muscle targets       │
 * │ - Intensity │ - Overflow plan      │ - AI Reasoning         │
 * │ - OPT phase │ - Save button        │ - AI Assistant         │
 * │ - Duration  │                      │                        │
 * │ - Generate  │                      │                        │
 * └─────────────┴──────────────────────┴────────────────────────┘
 *
 * ARCHITECTURE:
 * graph TD
 *   A[BootcampBuilderPage] --> B[ConfigPanel]
 *   A --> C[ClassPreviewPanel]
 *   A --> D[ExerciseDetailPanel]
 *   B --> E[EquipmentProfilePicker]
 *   D --> F[AITerminalPanel]
 */
import React, { useCallback, useState } from 'react';
import { Download, Wand2, Hand, Shuffle } from 'lucide-react';
import { toast } from 'react-toastify';
import { useBootcampAPI } from '../../hooks/useBootcampAPI';
import type { GeneratedBootcamp, BootcampExercise, ClassFormat, DayType } from '../../hooks/useBootcampAPI';
import type { ClassStyle, IntensityCategory } from './BootcampBuilderConstants';
import { CLASS_FORMATS, FORMAT_CONFIG, getStationCount, getExercisesPerStation, getRounds, calcWorkInterval, OVERHEAD_MIN } from './BootcampBuilderConstants';
import { exportBootcampPDF } from '../../services/pdfExportService';
import { PageWrapper, TopBar, Title, Subtitle, FloorModeToggle } from './BootcampBuilderStyles';
import { ModeBar, ModeBtn, TimingAlert, FourPane } from './BootcampModeStyles';
import ConfigPanel from './ConfigPanel';
import ClassPreviewPanel from './ClassPreviewPanel';
import ExerciseDetailPanel from './ExerciseDetailPanel';
import ExerciseRolodexPanel from './ExerciseRolodexPanel';
import type { RolodexExercise } from './ExerciseRolodexPanel';
import TeachMeToggle from '../Shared/TeachMeToggle';

type BuildMode = 'ai' | 'manual' | 'hybrid';

// ── Main Component ───────────────────────────────────────────

const BootcampBuilderPage: React.FC = () => {
  const api = useBootcampAPI();

  // Config state
  const [classFormat, setClassFormat] = useState<ClassFormat>('stations_4x');
  const [classStyle, setClassStyle] = useState<ClassStyle>('standard');
  const [dayType, setDayType] = useState<DayType>('full_body');
  const [intensityCategory, setIntensityCategory] = useState<IntensityCategory>('high_impact');
  const [equipmentProfileId, setEquipmentProfileId] = useState<number | null>(null);
  const [targetDuration, setTargetDuration] = useState('50');
  const [expectedParticipants, setExpectedParticipants] = useState('12');
  const [className, setClassName] = useState('');
  const [optPhase, setOptPhase] = useState(1);
  const [includeStretch, setIncludeStretch] = useState(true);

  // UI state
  const [bootcamp, setBootcamp] = useState<GeneratedBootcamp | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floorMode, setFloorMode] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<BootcampExercise | null>(null);
  const [saving, setSaving] = useState(false);
  const [buildMode, setBuildMode] = useState<BuildMode>('ai');
  const [activeStation, setActiveStation] = useState<number | null>(null);

  // 55-min timing
  const totalClassMin = bootcamp
    ? (bootcamp.totalClassMin || (bootcamp.totalWorkoutMin || 0) + 13)
    : parseInt(targetDuration, 10) + 13;
  const isOverTime = totalClassMin > 55;

  // Selected rolodex exercise (for detail panel)
  const [selectedRolodexId, setSelectedRolodexId] = useState<number | null>(null);

  // View exercise detail from Rolodex (click on card body)
  const handleSelectFromRolodex = useCallback((exercise: RolodexExercise) => {
    setSelectedRolodexId(exercise.id);
    // Map to BootcampExercise shape for the detail panel
    setSelectedExercise({
      exerciseName: exercise.name,
      durationSec: 35,
      restSec: 15,
      sortOrder: 0,
      muscleTargets: (exercise.primaryMuscles || []).join(','),
      easyVariation: exercise.easyVariation || null,
      hardVariation: exercise.hardVariation || null,
      kneeMod: (exercise as any).kneeMod || null,
      shoulderMod: (exercise as any).shoulderMod || null,
      ankleMod: (exercise as any).ankleMod || null,
      wristMod: (exercise as any).wristMod || null,
      backMod: (exercise as any).backMod || null,
      board: 'main',
      stationIndex: 0,
      isCardioFinisher: false,
      equipmentRequired: (exercise.equipmentNeeded || []).join(', '),
      setupTimeSec: 5,
      description: (exercise as any).description || null,
    } as any);
  }, []);

  // Delete exercise from bootcamp
  const handleDeleteExercise = useCallback((globalIndex: number) => {
    setBootcamp(prev => {
      if (!prev) return prev;
      const updated = prev.exercises.filter((_, i) => i !== globalIndex);
      const totalExSec = updated.reduce((s, e) => s + (e.durationSec || 35) + (e.restSec || 15), 0);
      return { ...prev, exercises: updated, totalWorkoutMin: Math.ceil(totalExSec / 60), totalClassMin: Math.ceil(totalExSec / 60) + OVERHEAD_MIN };
    });
  }, []);

  // Add exercise from Rolodex — respects activeStation, enforces limits
  const handleAddFromRolodex = useCallback((exercise: RolodexExercise) => {
    const formatCfg = FORMAT_CONFIG[classFormat];
    const isStationBased = formatCfg?.isStationBased ?? false;
    const targetDur = parseInt(targetDuration, 10) || 45;
    const { workSec } = calcWorkInterval(classFormat, targetDur);
    const maxPerStation = getExercisesPerStation(classFormat);
    const numStations = isStationBased ? getStationCount(classFormat) : 0;

    // Enforce limits: check if target station is full
    if (isStationBased && bootcamp) {
      const existingExercises = bootcamp.exercises || [];
      const stationCounts = new Map<number, number>();
      for (const ex of existingExercises) stationCounts.set(ex.stationIndex ?? 0, (stationCounts.get(ex.stationIndex ?? 0) || 0) + 1);

      const targetIdx = activeStation ?? (() => {
        for (let i = 0; i < numStations; i++) if ((stationCounts.get(i) || 0) < maxPerStation) return i;
        return -1;
      })();

      if (targetIdx === -1) {
        toast.error(`All ${numStations} stations are full (${maxPerStation} exercises each). Delete an exercise first.`);
        return;
      }
      if ((stationCounts.get(targetIdx) || 0) >= maxPerStation) {
        toast.error(`Station ${targetIdx + 1} is full (${maxPerStation} exercises). Click another station or delete an exercise.`);
        return;
      }
    }

    setBootcamp(prev => {
      const existingExercises = prev?.exercises || [];
      let targetStationIdx = activeStation ?? 0;

      if (isStationBased && numStations > 0 && activeStation === null) {
        // Auto-find first station with room
        const stationCounts = new Map<number, number>();
        for (const ex of existingExercises) stationCounts.set(ex.stationIndex ?? 0, (stationCounts.get(ex.stationIndex ?? 0) || 0) + 1);
        for (let i = 0; i < numStations; i++) {
          if ((stationCounts.get(i) || 0) < maxPerStation) { targetStationIdx = i; break; }
        }
      }

      const stationExCount = existingExercises.filter(e => e.stationIndex === targetStationIdx).length;
      const newEx = {
        exerciseName: exercise.name,
        durationSec: workSec,
        restSec: 15,
        sortOrder: stationExCount + 1,
        muscleTargets: (exercise.primaryMuscles || []).join(','),
        easyVariation: exercise.easyVariation || null,
        hardVariation: exercise.hardVariation || null,
        kneeMod: (exercise as any).kneeMod || null,
        shoulderMod: (exercise as any).shoulderMod || null,
        ankleMod: (exercise as any).ankleMod || null,
        wristMod: (exercise as any).wristMod || null,
        backMod: (exercise as any).backMod || null,
        board: 'main',
        stationIndex: targetStationIdx,
        isCardioFinisher: false,
        equipmentRequired: (exercise.equipmentNeeded || []).join(', '),
        setupTimeSec: 5,
      } as any;

      if (prev) {
        const updatedExercises = [...existingExercises, newEx];
        const totalExSec = updatedExercises.reduce((s, e) => s + (e.durationSec || workSec) + (e.restSec || 15), 0);
        return { ...prev, exercises: updatedExercises, totalWorkoutMin: Math.ceil(totalExSec / 60), totalClassMin: Math.ceil(totalExSec / 60) + OVERHEAD_MIN };
      }

      const stations = isStationBased
        ? Array.from({ length: numStations }, (_, i) => ({ stationNumber: i + 1, stationName: `Station ${i + 1}`, equipmentNeeded: null }))
        : [];
      return {
        name: className || 'Manual Class', classFormat, dayType, stationCount: numStations,
        targetDuration: targetDur, totalWorkoutMin: 1, totalClassMin: 1 + OVERHEAD_MIN,
        expectedParticipants: parseInt(expectedParticipants, 10) || 12, stations, exercises: [newEx],
        explanations: [{ type: 'info', message: isStationBased
          ? `Manual — ${numStations} stations × ${maxPerStation} ex × ${getRounds(classFormat)} rounds, ${workSec}s each`
          : `Manual circuit — add exercises` }],
        overflowPlan: null,
      } as any;
    });

    toast.success(`Added: ${exercise.name}${isStationBased ? ` → Station ${(activeStation ?? 0) + 1}` : ''}`);
  }, [className, classFormat, dayType, targetDuration, expectedParticipants, bootcamp, activeStation]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setBootcamp(null);
    setSelectedExercise(null);
    try {
      const result = await api.generateClass({
        classFormat,
        dayType,
        targetDuration: parseInt(targetDuration, 10) || 45,
        expectedParticipants: parseInt(expectedParticipants, 10) || 12,
        name: className || undefined,
        equipmentProfileId: equipmentProfileId || undefined,
        optPhase,
      });
      setBootcamp(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [api, classFormat, dayType, targetDuration, expectedParticipants, className, equipmentProfileId, optPhase]);

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
    exportBootcampPDF({
      name: bootcamp.name,
      classFormat: bootcamp.classFormat,
      dayType: bootcamp.dayType,
      stationCount: bootcamp.stationCount,
      targetDuration: bootcamp.targetDuration,
      totalWorkoutMin: bootcamp.totalWorkoutMin,
      totalClassMin: bootcamp.totalClassMin,
      expectedParticipants: bootcamp.expectedParticipants,
      stations: bootcamp.stations,
      exercises: bootcamp.exercises,
      overflowPlan: bootcamp.overflowPlan,
    });
    toast.success('Bootcamp PDF exported');
  }, [bootcamp]);

  return (
    <PageWrapper $floorMode={floorMode}>
      <TopBar>
        <div>
          <Title>Boot Camp Class Builder</Title>
          <Subtitle>AI + manual class creation with 840+ exercises and inline regressions</Subtitle>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {bootcamp && (
            <FloorModeToggle onClick={handleExportPDF} title="Export class plan as PDF">
              <Download size={16} /> PDF
            </FloorModeToggle>
          )}
          <FloorModeToggle
            $active={floorMode}
            onClick={() => setFloorMode(!floorMode)}
            aria-pressed={floorMode}
            title="High-contrast mode for gym floor coaching"
          >
            {floorMode ? 'Exit Floor' : 'Floor Mode'}
          </FloorModeToggle>
          <TeachMeToggle
            sectionId="bootcamp-builder"
            title="How to Use the Bootcamp Builder"
            content="<strong>3 Build Modes:</strong><ul><li><strong>AI Generate:</strong> Set format, day type, style, hit Generate.</li><li><strong>Manual:</strong> Browse 840+ exercises, add to stations yourself.</li><li><strong>Hybrid:</strong> AI generates, you swap/add/remove.</li></ul><strong>55-Minute Rule:</strong> Timer turns red if class exceeds 55 min.<br/><strong>Regressions:</strong> Every exercise shows an easier alternative."
          />
        </div>
      </TopBar>

      <ModeBar>
        <ModeBtn $active={buildMode === 'ai'} onClick={() => setBuildMode('ai')}>
          <Wand2 size={14} /> AI Generate
        </ModeBtn>
        <ModeBtn $active={buildMode === 'manual'} onClick={() => setBuildMode('manual')}>
          <Hand size={14} /> Manual
        </ModeBtn>
        <ModeBtn $active={buildMode === 'hybrid'} onClick={() => setBuildMode('hybrid')}>
          <Shuffle size={14} /> Hybrid
        </ModeBtn>
        <TimingAlert $over={isOverTime}>
          {isOverTime ? '⚠️' : '⏱'} {totalClassMin}/55 min
        </TimingAlert>
      </ModeBar>

      <FourPane>
        {/* Left panel: Config (AI/Hybrid) or Rolodex (Manual) */}
        {buildMode === 'manual' ? (
          <ExerciseRolodexPanel
            onAddExercise={handleAddFromRolodex}
            onSelectExercise={handleSelectFromRolodex}
            selectedId={selectedRolodexId}
            showFormatSelector
            classFormat={classFormat}
            onFormatChange={(fmt) => { setClassFormat(fmt as ClassFormat); setBootcamp(null); setActiveStation(null); }}
            stationInfo={(() => {
              const cfg = FORMAT_CONFIG[classFormat];
              if (!cfg?.isStationBased) return 'Circuit mode';
              const sc = getStationCount(classFormat);
              const epc = getExercisesPerStation(classFormat);
              const filled = bootcamp?.exercises?.length || 0;
              const total = sc * epc;
              return `${filled}/${total} slots`;
            })()}
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
            onGenerate={handleGenerate}
          />
        )}

        {/* Center: Class Preview */}
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

        {/* Right panel: Rolodex (Hybrid) or Exercise Detail (AI/Manual) */}
        {buildMode === 'hybrid' ? (
          <ExerciseRolodexPanel
            onAddExercise={handleAddFromRolodex}
            onSelectExercise={handleSelectFromRolodex}
            selectedId={selectedRolodexId}
          />
        ) : (
          <ExerciseDetailPanel
            selectedExercise={selectedExercise}
            bootcamp={bootcamp}
            equipmentProfileId={equipmentProfileId}
          />
        )}
      </FourPane>
    </PageWrapper>
  );
};

// ── Error Boundary ───────────────────────────────────────────

class BootcampBuilderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return (
        <PageWrapper>
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, opacity: 0.7 }}>
              Something went wrong
            </div>
            <p style={{ opacity: 0.5, marginBottom: 16 }}>
              The Boot Camp Builder encountered an error.
            </p>
            <button
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #60c0f0, #8B5CF6)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 600, cursor: 'pointer' }}
              onClick={() => this.setState({ hasError: false })}
            >
              Try Again
            </button>
          </div>
        </PageWrapper>
      );
    }
    return this.props.children;
  }
}

const BootcampBuilderPageWithBoundary: React.FC = () => (
  <BootcampBuilderErrorBoundary>
    <BootcampBuilderPage />
  </BootcampBuilderErrorBoundary>
);

export default BootcampBuilderPageWithBoundary;
