/**
 * ============================================================================
 * FILE: TrainerAssessmentsPage.tsx
 * PURPOSE: Form assessments page for trainers to record movement screens and tests
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Allows trainers to select an assessment type and client,
 * fill in score/notes/date, and view recent assessment history.
 * HOW IT FITS IN THE APP: Trainer Dashboard → Assessments tab
 * KEY DECISIONS: NASM-aligned assessment types, dark-first theme
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: TrainerAssessmentsPage                            ║
 * ║  PURPOSE: Record movement screens & performance tests         ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ Assessments                                                │
 * ├────────────────────────────┬───────────────────────────────┤
 * │ New Assessment Form        │ Recent Assessments            │
 * │ [Client ▼] [Type ▼]       │ ┌───────────────────────────┐ │
 * │ Score: [____]              │ │ Client A — Movement Screen│ │
 * │ Notes: [____________]     │ │ Score: 85  •  Mar 22      │ │
 * │ Date:  [____]              │ │ Client B — Postural       │ │
 * │ [Submit Assessment]        │ │ Score: 72  •  Mar 20      │ │
 * └────────────────────────────┴───────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  None (page-level component)
 * State:     { clients, assessments, formState, loading }
 * API Calls: GET /api/admin/clients, GET /api/movement-analysis, POST /api/movement-analysis
 * Events:    handleSubmit → POST assessment → refresh list
 * Children:  AssessmentForm, AssessmentHistoryList
 *
 * CLICK-OUTCOMES:
 * [Submit Assessment] → POST /api/movement-analysis → Success toast → Refresh history
 * [Assessment row]    → Expand details (future)
 *
 * NASM PROTOCOL CONTEXT: Assessment types map to NASM OPT evaluation criteria
 * GAMIFICATION: Assessment completion → 50 XP (education module)
 */
import React, { useEffect, useState, useCallback } from 'react';
import styled from 'styled-components';
import { ClipboardCheck, ChevronDown, Send, FileText, BookOpen } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import NASMTeachMode from './components/NASMTeachMode';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─────────────────────────────────────────────────────────────
interface Assessment { id: number; clientName?: string; type?: string; score?: number; notes?: string; date?: string; fullName?: string; nasmAssessmentScore?: number; }
const ASSESSMENT_TYPES = [
  { value: 'movement_screen', label: 'Movement Screen' },
  { value: 'postural_analysis', label: 'Postural Analysis' },
  { value: 'performance_test', label: 'Performance Test' },
] as const;

type AssessmentType = typeof ASSESSMENT_TYPES[number]['value'];
// OHSA checkpoint keys — maps to NASM kinetic chain checkpoints
// Backend model key → frontend label mapping
const OHSA_CHECKPOINTS = [
  { key: 'feetTurnout', label: 'Feet Turn Out', view: 'anterior' },
  { key: 'feetFlattening', label: 'Feet Flatten (Pronate)', view: 'anterior' },
  { key: 'kneeValgus', label: 'Knees Move Inward (Valgus)', view: 'anterior' },
  { key: 'kneeVarus', label: 'Knees Move Outward (Varus)', view: 'anterior' },
  { key: 'excessiveForwardLean', label: 'Excessive Forward Lean', view: 'lateral' },
  { key: 'lowBackArch', label: 'Low Back Arches (Extension)', view: 'lateral' },
  { key: 'armsFallForward', label: 'Arms Fall Forward', view: 'lateral' },
  { key: 'forwardHead', label: 'Forward Head Posture', view: 'lateral' },
  { key: 'asymmetricWeightShift', label: 'Asymmetric Weight Shift', view: 'posterior' },
] as const;

// Postural checkpoints
const POSTURAL_CHECKPOINTS = [
  { key: 'forwardHead', label: 'Forward Head Posture', view: 'lateral' },
  { key: 'roundedShoulders', label: 'Rounded Shoulders', view: 'lateral' },
  { key: 'kyphosis', label: 'Thoracic Kyphosis', view: 'lateral' },
  { key: 'anteriorPelvicTilt', label: 'Anterior Pelvic Tilt', view: 'lateral' },
  { key: 'kneeValgusVarus', label: 'Knee Valgus / Varus', view: 'anterior' },
  { key: 'footPronation', label: 'Foot Pronation', view: 'anterior' },
] as const;

// Performance test fields
const PERFORMANCE_TESTS = [
  { key: 'pushUpReps', label: 'Push-Up Test (reps in 60s)', unit: 'reps' },
  { key: 'daviesScore', label: 'Davies Test (touches in 15s)', unit: 'touches' },
  { key: 'sharkSkillTime', label: 'Shark Skill Test (seconds)', unit: 'seconds' },
  { key: 'singleLegSquatScore', label: 'Single-Leg Squat (1-5 scale)', unit: 'score' },
  { key: 'cardioHR', label: 'YMCA Step Test (recovery HR)', unit: 'bpm' },
] as const;

type CompensationLevel = 'none' | 'minor' | 'significant';

// NASM OPT Assessment Protocols — criteria per assessment type
const TYPE_CRITERIA: Record<string, { description: string; criteria: string[]; checkpoints: string[] }> = {
  movement_screen: {
    description: 'NASM Overhead Squat Assessment (OHSA) — Evaluate kinetic chain checkpoints from anterior, lateral, and posterior views to identify movement compensations and muscle imbalances.',
    criteria: [
      'Foot/Ankle Complex',
      'Knee Complex',
      'LPHC (Lumbo-Pelvic-Hip)',
      'Shoulder Complex',
      'Cervical Spine / Head',
    ],
    checkpoints: [
      'Feet flatten or turn out',
      'Knees move inward (valgus)',
      'Excessive forward lean',
      'Low back arches (extension)',
      'Arms fall forward',
    ],
  },
  postural_analysis: {
    description: 'NASM Static Posture Assessment — Observe alignment deviations from anterior, lateral, and posterior views. Identify Upper Crossed Syndrome (forward head, rounded shoulders, kyphosis) and Lower Crossed Syndrome (anterior pelvic tilt, lordosis).',
    criteria: [
      'Forward Head Posture',
      'Rounded Shoulders',
      'Kyphosis / Lordosis',
      'Anterior Pelvic Tilt',
      'Knee Valgus / Varus',
    ],
    checkpoints: [
      'Cervical spine extension',
      'Scapular protraction / winging',
      'Thoracic kyphosis increase',
      'Lumbar lordosis increase',
      'Foot pronation / supination',
    ],
  },
  performance_test: {
    description: 'NASM Cardiorespiratory & Muscular Fitness Assessments — Establish baseline metrics for OPT phase selection and track client progress over time.',
    criteria: [
      'Push-Up Test (endurance)',
      'Davies Test (UB agility)',
      'Shark Skill Test (LB agility)',
      'Single-Leg Squat',
      'Rockport Walk / YMCA Step',
    ],
    checkpoints: [
      'Max reps in 60 seconds',
      'Alternating hand touches in 15s',
      'Timed box pattern completion',
      'Knee valgus / torso lean compensations',
      'Estimated VO2max from HR recovery',
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const PageWrapper = styled.div`
  padding: 24px;
  min-height: 100vh;
  background: var(--bg-base, #030712);
  color: var(--text-primary, #E0ECF4);
`;

const Header = styled.div`margin-bottom: 28px;`;
const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 6px;
`;
const Subtitle = styled.p`
  color: var(--text-secondary, rgba(224,236,244,0.6));
  font-size: 0.9rem;
  margin: 0;
`;

const FormCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
`;

const FieldGroup = styled.div`margin-bottom: 20px;`;
const Label = styled.label`
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  margin-bottom: 8px;
`;

const TypeSelector = styled.div`display: flex; gap: 10px; flex-wrap: wrap;`;
const TypeChip = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active }) => $active ? 'rgba(96,192,240,0.12)' : 'var(--bg-surface, #1A1A24)'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-primary, #E0ECF4)'};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const Select = styled.div`
  position: relative;
  select {
    width: 100%;
    min-height: 44px;
    padding: 10px 40px 10px 14px;
    border-radius: 8px;
    border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
    background: var(--bg-surface, #1A1A24);
    color: var(--text-primary, #E0ECF4);
    font-size: 0.9rem;
    appearance: none;
    cursor: pointer;
  }
  svg { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: 0.5; }
`;

const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const SubmitButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 12px 28px;
  border: none;
  border-radius: 10px;
  background: var(--accent-secondary, #8B5CF6);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: box-shadow 0.2s;
  &:hover { box-shadow: 0 0 16px rgba(96,192,240,0.3); }
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 16px;
`;

const HistoryCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;
const HistoryInfo = styled.div``;
const HistoryType = styled.div`font-weight: 600; font-size: 0.9rem;`;
const HistoryMeta = styled.div`font-size: 0.8rem; color: var(--text-muted, rgba(224,236,244,0.5));`;
const HistoryScore = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: var(--text-muted, rgba(224,236,244,0.5));
`;

const TypeDescription = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(224,236,244,0.6));
  margin-bottom: 16px;
  padding: 12px 16px;
  background: rgba(96, 192, 240, 0.05);
  border-left: 3px solid var(--accent-primary, #60C0F0);
  border-radius: 0 8px 8px 0;
`;

const CriteriaList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
`;

const CriteriaTag = styled.span`
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  color: var(--text-primary, #E0ECF4);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const TeachModeToggle = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active }) => $active ? 'rgba(139,92,246,0.15)' : 'var(--bg-surface, #1A1A24)'};
  color: ${({ $active }) => $active ? 'var(--accent-secondary, #8B5CF6)' : 'var(--text-primary, #E0ECF4)'};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: var(--accent-secondary, #8B5CF6); }
`;

// Checkpoint scoring pill selector
const CheckpointRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-soft, rgba(96,192,240,0.06));
  gap: 12px;
  flex-wrap: wrap;
  &:last-child { border-bottom: none; }
`;
const CheckpointLabel = styled.span`
  font-size: 0.82rem;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  min-width: 150px;
`;
const PillGroup = styled.div`display: flex; gap: 6px;`;
const Pill = styled.button<{ $level: CompensationLevel; $active?: boolean }>`
  min-height: 36px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid ${({ $active, $level }) =>
    $active
      ? $level === 'none' ? 'rgba(96,192,240,0.5)' : $level === 'minor' ? 'rgba(198,168,75,0.5)' : 'rgba(201,42,84,0.5)'
      : 'var(--border-soft, rgba(96,192,240,0.12))'};
  background: ${({ $active, $level }) =>
    $active
      ? $level === 'none' ? 'rgba(96,192,240,0.15)' : $level === 'minor' ? 'rgba(198,168,75,0.15)' : 'rgba(201,42,84,0.15)'
      : 'transparent'};
  color: ${({ $active, $level }) =>
    $active
      ? $level === 'none' ? '#60C0F0' : $level === 'minor' ? '#C6A84B' : '#C92A54'
      : 'var(--text-muted, rgba(224,236,244,0.4))'};
`;
const CheckpointCard = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96,192,240,0.08));
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 20px;
`;
const CheckpointCardTitle = styled.div`
  padding: 10px 14px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-primary, #60C0F0);
  background: var(--bg-elevated, #141419);
`;
const PerfInput = styled.input`
  width: 100px;
  min-height: 36px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96,192,240,0.12));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  text-align: center;
  &:focus { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;
const SubmitStatus = styled.span<{ $success?: boolean }>`
  font-size: 0.8rem;
  color: ${({ $success }) => $success ? '#60C0F0' : '#C92A54'};
  margin-left: 12px;
`;

const TrainerAssessmentsPage: React.FC = () => {
  const { authAxios, user } = useAuth();
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('movement_screen');
  const [teachMode, setTeachMode] = useState(false);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState<Assessment[]>([]);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [submitStatus, setSubmitStatus] = useState<{ msg: string; success: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Per-checkpoint compensation scoring for OHSA
  const [ohsaScores, setOhsaScores] = useState<Record<string, CompensationLevel>>(
    Object.fromEntries(OHSA_CHECKPOINTS.map(c => [c.key, 'none']))
  );

  // Per-checkpoint scoring for Postural Analysis
  const [posturalScores, setPosturalScores] = useState<Record<string, CompensationLevel>>(
    Object.fromEntries(POSTURAL_CHECKPOINTS.map(c => [c.key, 'none']))
  );

  // Performance test values
  const [perfScores, setPerfScores] = useState<Record<string, string>>(
    Object.fromEntries(PERFORMANCE_TESTS.map(t => [t.key, '']))
  );

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authAxios.get('/api/movement-analysis');
        const list = res.data?.data?.analyses || res.data?.data || res.data?.assessments || [];
        setHistory(Array.isArray(list) ? list : []);
      } catch { setHistory([]); }
      try {
        const res = await authAxios.get('/api/admin/clients');
        const list = Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.clients || [];
        setClients(list.map((u: any) => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username })));
      } catch { setClients([]); }
    };
    load();
  }, [authAxios]);

  // Build the payload in the format MovementAnalysis controller expects
  const buildPayload = useCallback(() => {
    const selectedClient = clients.find(c => c.id === Number(clientId));
    const base = {
      userId: Number(clientId),
      fullName: selectedClient?.name || 'Client',
      status: 'completed',
      source: 'in_session',
      assessmentDate: date,
      trainerNotes: notes || null,
    };

    if (assessmentType === 'movement_screen') {
      // Build OHSA JSONB in nested structure the backend model expects:
      // { anteriorView: {...}, lateralView: {...}, asymmetricWeightShift }
      const anteriorKeys = ['feetTurnout', 'feetFlattening', 'kneeValgus', 'kneeVarus'];
      const lateralKeys = ['excessiveForwardLean', 'lowBackArch', 'armsFallForward', 'forwardHead'];
      const anteriorView: Record<string, string> = {};
      const lateralView: Record<string, string> = {};
      for (const [k, v] of Object.entries(ohsaScores)) {
        if (anteriorKeys.includes(k)) anteriorView[k] = v;
        else if (lateralKeys.includes(k)) lateralView[k] = v;
      }
      return {
        ...base,
        overheadSquatAssessment: {
          anteriorView,
          lateralView,
          asymmetricWeightShift: ohsaScores.asymmetricWeightShift ?? 'none',
        },
      };
    }

    if (assessmentType === 'postural_analysis') {
      return {
        ...base,
        posturalAssessment: {
          ...posturalScores,
          assessmentDate: date,
          conductedBy: user?.id,
        },
      };
    }

    // performance_test — build movementQualityAssessments
    const parsedScores: Record<string, number | null> = {};
    for (const t of PERFORMANCE_TESTS) {
      const val = perfScores[t.key];
      parsedScores[t.key] = val ? Number(val) : null;
    }
    return {
      ...base,
      movementQualityAssessments: {
        ...parsedScores,
        assessmentDate: date,
        conductedBy: user?.id,
      },
    };
  }, [assessmentType, clientId, clients, date, notes, ohsaScores, posturalScores, perfScores, user]);

  const handleSubmit = useCallback(async () => {
    if (!authAxios || !clientId || !assessmentType) return;
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      const payload = buildPayload();
      await authAxios.post('/api/movement-analysis', payload);
      setSubmitStatus({ msg: 'Assessment saved — Swan Coach hive mind updated', success: true });
      // Reset form
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setOhsaScores(Object.fromEntries(OHSA_CHECKPOINTS.map(c => [c.key, 'none'])));
      setPosturalScores(Object.fromEntries(POSTURAL_CHECKPOINTS.map(c => [c.key, 'none'])));
      setPerfScores(Object.fromEntries(PERFORMANCE_TESTS.map(t => [t.key, ''])));
      // Reload history
      try {
        const res = await authAxios.get('/api/movement-analysis');
        const list = res.data?.data?.analyses || res.data?.data || res.data?.assessments || [];
        setHistory(Array.isArray(list) ? list : []);
      } catch { /* non-critical */ }
    } catch (err: any) {
      console.error('Failed to submit assessment:', err);
      setSubmitStatus({ msg: err?.response?.data?.message || 'Submission failed', success: false });
    } finally {
      setSubmitting(false);
    }
  }, [authAxios, assessmentType, clientId, buildPayload]);

  return (
    <PageWrapper>
      <Header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title><ClipboardCheck size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Form Assessments</Title>
            <Subtitle>Record movement screens, postural analyses, and performance tests for your clients.</Subtitle>
          </div>
          <TeachModeToggle $active={teachMode} onClick={() => setTeachMode(!teachMode)}>
            <BookOpen size={18} />
            {teachMode ? 'Hide Teach Mode' : 'Teach Mode'}
          </TeachModeToggle>
        </div>
      </Header>

      {/* NASM Teach Mode — step-by-step execution guides */}
      {teachMode && <NASMTeachMode assessmentType={assessmentType} />}

      <FormCard>
        <FieldGroup>
          <Label>Assessment Type</Label>
          <TypeSelector>
            {ASSESSMENT_TYPES.map(t => (
              <TypeChip key={t.value} $active={assessmentType === t.value} onClick={() => setAssessmentType(t.value)}>{t.label}</TypeChip>
            ))}
          </TypeSelector>
        </FieldGroup>

        {/* Type-specific NASM protocol info — changes when tab is clicked */}
        <TypeDescription>{TYPE_CRITERIA[assessmentType]?.description}</TypeDescription>
        <FieldGroup>
          <Label>NASM Checkpoints</Label>
          <CriteriaList>
            {TYPE_CRITERIA[assessmentType]?.criteria.map(c => (
              <CriteriaTag key={c}>{c}</CriteriaTag>
            ))}
          </CriteriaList>
        </FieldGroup>
        <FieldGroup>
          <Label>What to Observe</Label>
          <CriteriaList>
            {TYPE_CRITERIA[assessmentType]?.checkpoints.map(c => (
              <CriteriaTag key={c} style={{ borderColor: 'rgba(139,92,246,0.2)', color: 'var(--accent-secondary, #8B5CF6)' }}>{c}</CriteriaTag>
            ))}
          </CriteriaList>
        </FieldGroup>

        <FieldGroup>
          <Label>Client</Label>
          <Select>
            <select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDown size={18} />
          </Select>
        </FieldGroup>

        {/* Type-specific checkpoint scoring — OHSA */}
        {assessmentType === 'movement_screen' && (
          <CheckpointCard>
            <CheckpointCardTitle>OHSA Compensation Scoring</CheckpointCardTitle>
            {OHSA_CHECKPOINTS.map(cp => (
              <CheckpointRow key={cp.key}>
                <CheckpointLabel>{cp.label} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({cp.view})</span></CheckpointLabel>
                <PillGroup>
                  {(['none', 'minor', 'significant'] as CompensationLevel[]).map(level => (
                    <Pill key={level} $level={level} $active={ohsaScores[cp.key] === level}
                      onClick={() => setOhsaScores(prev => ({ ...prev, [cp.key]: level }))}>
                      {level}
                    </Pill>
                  ))}
                </PillGroup>
              </CheckpointRow>
            ))}
          </CheckpointCard>
        )}

        {/* Postural Analysis checkpoint scoring */}
        {assessmentType === 'postural_analysis' && (
          <CheckpointCard>
            <CheckpointCardTitle>Postural Deviation Scoring</CheckpointCardTitle>
            {POSTURAL_CHECKPOINTS.map(cp => (
              <CheckpointRow key={cp.key}>
                <CheckpointLabel>{cp.label} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({cp.view})</span></CheckpointLabel>
                <PillGroup>
                  {(['none', 'minor', 'significant'] as CompensationLevel[]).map(level => (
                    <Pill key={level} $level={level} $active={posturalScores[cp.key] === level}
                      onClick={() => setPosturalScores(prev => ({ ...prev, [cp.key]: level }))}>
                      {level}
                    </Pill>
                  ))}
                </PillGroup>
              </CheckpointRow>
            ))}
          </CheckpointCard>
        )}

        {/* Performance test value inputs */}
        {assessmentType === 'performance_test' && (
          <CheckpointCard>
            <CheckpointCardTitle>Performance Test Results</CheckpointCardTitle>
            {PERFORMANCE_TESTS.map(t => (
              <CheckpointRow key={t.key}>
                <CheckpointLabel>{t.label}</CheckpointLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <PerfInput type="number" min={0} placeholder="—"
                    value={perfScores[t.key]} onChange={e => setPerfScores(prev => ({ ...prev, [t.key]: e.target.value }))} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.unit}</span>
                </div>
              </CheckpointRow>
            ))}
          </CheckpointCard>
        )}

        <FieldGroup>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </FieldGroup>

        <FieldGroup>
          <Label>Trainer Notes</Label>
          <Textarea placeholder="Observations, compensations, corrective exercise recommendations..." value={notes} onChange={e => setNotes(e.target.value)} />
        </FieldGroup>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <SubmitButton onClick={handleSubmit} disabled={submitting || !clientId}>
            <Send size={18} /> {submitting ? 'Saving...' : 'Submit Assessment'}
          </SubmitButton>
          {submitStatus && <SubmitStatus $success={submitStatus.success}>{submitStatus.msg}</SubmitStatus>}
        </div>
      </FormCard>

      <SectionTitle><FileText size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Recent Assessments</SectionTitle>
      {history.length === 0 ? (
        <EmptyState>No assessments recorded yet. Complete the form above to get started.</EmptyState>
      ) : (
        history.slice(0, 10).map((a: any) => (
          <HistoryCard key={a.id}>
            <HistoryInfo>
              <HistoryType>{a.fullName || a.clientName || 'Assessment'}</HistoryType>
              <HistoryMeta>
                {a.source === 'trainer_assessment' ? 'Trainer Assessment' : a.source || 'Assessment'}
                {' '}&middot;{' '}
                {a.assessmentDate ? new Date(a.assessmentDate).toLocaleDateString() : a.date ? new Date(a.date).toLocaleDateString() : '—'}
                {a.status && <> &middot; <span style={{ color: a.status === 'completed' ? '#60C0F0' : '#C6A84B' }}>{a.status}</span></>}
              </HistoryMeta>
            </HistoryInfo>
            <HistoryScore>{a.nasmAssessmentScore ?? a.score ?? '—'}</HistoryScore>
          </HistoryCard>
        ))
      )}
    </PageWrapper>
  );
};

export default TrainerAssessmentsPage;
