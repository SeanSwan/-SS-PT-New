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
import { Download } from 'lucide-react';
import { toast } from 'react-toastify';
import { useBootcampAPI } from '../../hooks/useBootcampAPI';
import type { GeneratedBootcamp, BootcampExercise, ClassFormat, DayType } from '../../hooks/useBootcampAPI';
import type { ClassStyle, IntensityCategory } from './BootcampBuilderConstants';
import { exportBootcampPDF } from '../../services/pdfExportService';
import { PageWrapper, TopBar, Title, Subtitle, FloorModeToggle, ThreePane } from './BootcampBuilderStyles';
import ConfigPanel from './ConfigPanel';
import ClassPreviewPanel from './ClassPreviewPanel';
import ExerciseDetailPanel from './ExerciseDetailPanel';

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
          <Subtitle>AI-powered group fitness class generation with station planning and overflow management</Subtitle>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {bootcamp && (
            <FloorModeToggle onClick={handleExportPDF} title="Export class plan as PDF">
              <Download size={16} /> Export PDF
            </FloorModeToggle>
          )}
          <FloorModeToggle
            $active={floorMode}
            onClick={() => setFloorMode(!floorMode)}
            aria-pressed={floorMode}
            aria-label={floorMode ? 'Exit high-contrast floor mode' : 'Enable high-contrast floor mode for gym use'}
            title="High-contrast mode optimized for outdoor/gym floor coaching on tablets"
          >
            {floorMode ? 'Exit Floor Mode' : 'Floor Mode'}
          </FloorModeToggle>
        </div>
      </TopBar>

      <ThreePane>
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
        <ClassPreviewPanel
          bootcamp={bootcamp}
          loading={loading}
          floorMode={floorMode}
          saving={saving}
          onSave={handleSave}
          onSelectExercise={setSelectedExercise}
        />
        <ExerciseDetailPanel
          selectedExercise={selectedExercise}
          bootcamp={bootcamp}
          equipmentProfileId={equipmentProfileId}
        />
      </ThreePane>
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
