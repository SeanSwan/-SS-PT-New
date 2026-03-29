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
import { ClipboardCheck, ChevronDown, Send, FileText } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// SECTION: Types & Constants
// ─────────────────────────────────────────────────────────────
interface Assessment { id: number; clientName?: string; type?: string; score?: number; notes?: string; date?: string; }
const ASSESSMENT_TYPES = [
  { value: 'movement_screen', label: 'Movement Screen' },
  { value: 'postural_analysis', label: 'Postural Analysis' },
  { value: 'performance_test', label: 'Performance Test' },
] as const;

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

const ScoreRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  input[type="range"] { flex: 1; accent-color: var(--accent-primary, #60C0F0); }
`;
const ScoreValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent-primary, #60C0F0);
  min-width: 32px;
  text-align: center;
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
const TrainerAssessmentsPage: React.FC = () => {
  const { authAxios } = useAuth();
  const [assessmentType, setAssessmentType] = useState(ASSESSMENT_TYPES[0].value);
  const [clientId, setClientId] = useState('');
  const [score, setScore] = useState(5);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState<Assessment[]>([]);
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authAxios.get('/api/movement-analysis');
        setHistory(Array.isArray(res.data) ? res.data : res.data?.assessments || []);
      } catch { setHistory([]); }
      try {
        const res = await authAxios.get('/api/admin/clients');
        const list = Array.isArray(res.data?.data) ? res.data.data : res.data?.data?.clients || [];
        setClients(list.map((u: any) => ({ id: u.id, name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username })));
      } catch { setClients([]); }
    };
    load();
  }, [authAxios]);

  const handleSubmit = useCallback(async () => {
    if (!authAxios || !clientId || !assessmentType) return;
    try {
      await authAxios.post('/api/movement-analysis', {
        assessmentType,
        clientId: Number(clientId),
        score: Number(score) || 0,
        notes,
        date: date || new Date().toISOString().split('T')[0],
      });
      // Reset form on success
      setScore(5);
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      // Reload assessments list
      try {
        const res = await authAxios.get('/api/movement-analysis');
        const list = Array.isArray(res.data) ? res.data : res.data?.assessments || [];
        setHistory(list);
      } catch { /* list refresh failed, non-critical */ }
    } catch (err: any) {
      console.error('Failed to submit assessment:', err);
    }
  }, [authAxios, assessmentType, clientId, score, notes, date]);

  return (
    <PageWrapper>
      <Header>
        <Title><ClipboardCheck size={24} style={{ verticalAlign: 'middle', marginRight: 8 }} />Form Assessments</Title>
        <Subtitle>Record movement screens, postural analyses, and performance tests for your clients.</Subtitle>
      </Header>

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

        <FieldGroup>
          <Label>Score (1–10)</Label>
          <ScoreRow>
            <input type="range" min={1} max={10} value={score} onChange={e => setScore(Number(e.target.value))} />
            <ScoreValue>{score}</ScoreValue>
          </ScoreRow>
        </FieldGroup>

        <FieldGroup>
          <Label>Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </FieldGroup>

        <FieldGroup>
          <Label>Notes</Label>
          <Textarea placeholder="Observations, compensations, recommendations..." value={notes} onChange={e => setNotes(e.target.value)} />
        </FieldGroup>

        <SubmitButton onClick={handleSubmit}><Send size={18} /> Submit Assessment</SubmitButton>
      </FormCard>

      <SectionTitle><FileText size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />Recent Assessments</SectionTitle>
      {history.length === 0 ? (
        <EmptyState>No assessments recorded yet. Complete the form above to get started.</EmptyState>
      ) : (
        history.slice(0, 10).map(a => (
          <HistoryCard key={a.id}>
            <HistoryInfo>
              <HistoryType>{a.type || 'Assessment'}</HistoryType>
              <HistoryMeta>{a.clientName} &middot; {a.date ? new Date(a.date).toLocaleDateString() : '—'}</HistoryMeta>
            </HistoryInfo>
            <HistoryScore>{a.score ?? '—'}/10</HistoryScore>
          </HistoryCard>
        ))
      )}
    </PageWrapper>
  );
};

export default TrainerAssessmentsPage;
