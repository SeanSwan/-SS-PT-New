/**
 * HistoricalWorkoutImportPanel.
 *
 * Additive Client Hub lane for planning Move Fitness/SwanStudios historical
 * workout imports. It prepares review-gated Swan Coach drafts; it does not
 * bulk-write estimated workouts.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Sparkles, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { getLocalIsoDate } from '../../../../../utils/localDate';
import {
  appendHistoricalPreviewToCoachPrompt,
  buildHistoricalPreviewFormFields,
  buildHistoricalImportPlan,
  clampSessionsPerWeek,
  createHistoricalImportDraftKey,
  knownWorkoutDateSet,
  type HistoricalWorkoutDateSource,
} from './HistoricalWorkoutImportPanel.logic';
import {
  ActionButton,
  ActionRow,
  DatePill,
  Field,
  ImportFormGrid,
  ImportHeader,
  ImportPanelShell,
  MetricGrid,
  MetricTile,
  MissingDateGrid,
  StatusText,
} from './HistoricalWorkoutImportPanel.styles';

type SourceValue = 'Move Fitness historical import' | 'SwanStudios historical import' | 'External historical import';

interface HistoricalWorkoutImportPanelProps {
  clientId: number;
  clientName?: string;
}

interface HistoricalPreviewDraft { date: string; confidence?: number | null; draftOnly?: boolean; parsedWorkout?: { exercises?: Array<{ exerciseName?: string | null }> }; status?: string }
interface HistoricalPreviewResponse { draftOnly?: boolean; drafts?: HistoricalPreviewDraft[]; missingDraftRequests?: Array<{ date: string; status?: string }> }

interface HistoricalWorkoutAuthAxios {
  get: (url: string, config?: unknown) => Promise<{ data?: { workouts?: HistoricalWorkoutDateSource[] } }>;
  post: (
    url: string,
    data?: unknown,
    config?: unknown,
  ) => Promise<{ data?: HistoricalPreviewResponse }>;
}

const sourceOptions: SourceValue[] = [
  'Move Fitness historical import',
  'SwanStudios historical import',
  'External historical import',
];

function storeHistoricalImportDraft(key: string, prompt: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.sessionStorage.setItem(key, prompt);
    return true;
  } catch {
    return false;
  }
}

function sixMonthsAgoIso(): string {
  const date = new Date();
  date.setMonth(date.getMonth() - 6);
  return date.toISOString().slice(0, 10);
}

async function loadKnownHistoricalWorkouts(
  authAxios: HistoricalWorkoutAuthAxios,
  clientId: number,
): Promise<HistoricalWorkoutDateSource[]> {
  const response = await authAxios.get(`/api/admin/clients/${clientId}/workouts`, {
    params: { limit: 100 },
  });
  return Array.isArray(response.data?.workouts) ? response.data.workouts : [];
}

async function uploadHistoricalPreview(
  authAxios: HistoricalWorkoutAuthAxios,
  file: File,
  fields: Record<string, string>,
): Promise<HistoricalPreviewResponse | null> {
  const formData = new FormData();
  formData.append('file', file);
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  const response = await authAxios.post('/api/workout-logs/history-preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120_000,
  });
  return response.data || null;
}

function useKnownHistoricalWorkouts(authAxios: HistoricalWorkoutAuthAxios, clientId: number) {
  const [knownWorkouts, setKnownWorkouts] = useState<HistoricalWorkoutDateSource[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Known workout dates will sync from this client history.');

  const fetchKnownWorkouts = useCallback(async () => {
    setLoading(true);
    try {
      const workouts = await loadKnownHistoricalWorkouts(authAxios, clientId);
      setKnownWorkouts(workouts);
      setStatus(`${workouts.length} known workout records synced.`);
    } catch {
      setStatus('Workout history could not be synced. You can still prepare a Coach planning brief.');
    } finally {
      setLoading(false);
    }
  }, [authAxios, clientId]);

  useEffect(() => {
    void fetchKnownWorkouts();
  }, [fetchKnownWorkouts]);

  return { fetchKnownWorkouts, knownWorkouts, loading, status };
}

function MissingDatePills({ dates, label = 'Missing workout dates' }: { dates: string[]; label?: string }) {
  const shownDates = dates.slice(0, 24);
  return (
    <MissingDateGrid aria-label={label}>
      {shownDates.map((date) => <DatePill key={date}>{date}</DatePill>)}
      {dates.length > 24 && <DatePill>+{dates.length - 24} more</DatePill>}
      {dates.length === 0 && <DatePill>No missing dates</DatePill>}
    </MissingDateGrid>
  );
}

const HistoricalWorkoutImportPanel: React.FC<HistoricalWorkoutImportPanelProps> = ({ clientId, clientName }) => {
  const { authAxios } = useAuth() as { authAxios: HistoricalWorkoutAuthAxios };
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(sixMonthsAgoIso);
  const [endDate, setEndDate] = useState(getLocalIsoDate);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [sourceLabel, setSourceLabel] = useState<SourceValue>('Move Fitness historical import');
  const [lastWorkoutNotes, setLastWorkoutNotes] = useState('');
  const [historyFile, setHistoryFile] = useState<File | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState<HistoricalPreviewResponse | null>(null);
  const [previewStatus, setPreviewStatus] = useState('Upload historical records to generate draft-only previews.');
  const { fetchKnownWorkouts, knownWorkouts, loading, status } = useKnownHistoricalWorkouts(authAxios, clientId);

  const knownDates = useMemo(() => [...knownWorkoutDateSet(knownWorkouts)].sort(), [knownWorkouts]);
  const plan = useMemo(() => buildHistoricalImportPlan({
    clientId,
    endDate,
    knownDates,
    lastWorkoutNotes,
    sessionsPerWeek,
    sourceLabel,
    startDate,
  }), [clientId, endDate, knownDates, lastWorkoutNotes, sessionsPerWeek, sourceLabel, startDate]);
  const coachPrompt = useMemo(() => appendHistoricalPreviewToCoachPrompt({
    basePrompt: plan.coachPrompt,
    drafts: previewResult?.drafts,
    missingDraftRequests: previewResult?.missingDraftRequests,
  }), [plan.coachPrompt, previewResult]);

  const handleOpenCoach = useCallback(() => {
    const draftKey = createHistoricalImportDraftKey(clientId);
    const params = new URLSearchParams({
      clientId: String(clientId),
      intent: 'historical_import',
      returnTo: `/dashboard/admin/client-management?clientId=${clientId}&tab=training&trainingSection=import`,
      source: 'clients-team',
    });
    if (storeHistoricalImportDraft(draftKey, coachPrompt)) {
      params.set('draftKey', draftKey);
    }
    navigate(`/dashboard/admin/coach-assistant?${params.toString()}`);
  }, [clientId, coachPrompt, navigate]);

  const handlePreviewHistory = useCallback(async () => {
    if (!historyFile) {
      setPreviewStatus('Choose a history file before previewing drafts.');
      return;
    }

    setPreviewing(true);
    setPreviewStatus('Previewing historical draft candidates.');
    try {
      const result = await uploadHistoricalPreview(authAxios, historyFile, buildHistoricalPreviewFormFields({
        clientId,
        knownDates,
        lastWorkoutNotes,
        missingDates: plan.missingDates,
        sourceLabel,
      }));
      const draftCount = result?.drafts?.length || 0;
      const missingCount = result?.missingDraftRequests?.length || 0;
      setPreviewResult(result);
      setPreviewStatus(`${draftCount} parsed drafts and ${missingCount} missing-date draft prompts ready for review.`);
    } catch {
      setPreviewResult(null);
      setPreviewStatus('History preview failed. Recheck the file and try again.');
    } finally {
      setPreviewing(false);
    }
  }, [authAxios, clientId, historyFile, knownDates, lastWorkoutNotes, plan.missingDates, sourceLabel]);

  return (
    <ImportPanelShell aria-label="Historical workout import planner">
      <ImportHeader>
        <div>
          <h3>Historical workout import</h3>
          <p>{clientName || 'Client'} historical records, missing dates, and Coach-prepared filler drafts.</p>
        </div>
        <ActionButton type="button" onClick={fetchKnownWorkouts} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" />
          {loading ? 'Syncing' : 'Sync history'}
        </ActionButton>
      </ImportHeader>

      <MetricGrid>
        <MetricTile><span>Known workouts</span><strong>{knownDates.length}</strong></MetricTile>
        <MetricTile><span>Expected dates</span><strong>{plan.expectedDates.length}</strong></MetricTile>
        <MetricTile><span>Missing drafts</span><strong>{plan.missingDates.length}</strong></MetricTile>
      </MetricGrid>

      <ImportFormGrid>
        <Field>
          Client start date
          <input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} />
        </Field>
        <Field>
          End date
          <input type="date" value={endDate} max={getLocalIsoDate()} onChange={(event) => setEndDate(event.target.value)} />
        </Field>
        <Field>
          Target workouts/week
          <input
            type="number"
            min="1"
            max="7"
            value={sessionsPerWeek}
            onChange={(event) => setSessionsPerWeek(clampSessionsPerWeek(Number(event.target.value)))}
          />
        </Field>
        <Field $wide>
          Source
          <select value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value as SourceValue)}>
            {sourceOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>
        <Field $wide>
          Last known workout anchor
          <textarea
            value={lastWorkoutNotes}
            onChange={(event) => setLastWorkoutNotes(event.target.value)}
            placeholder="Example: last known session was lower-body strength, goblet squats 3x10, RDL 3x8, sled pushes, knee tolerated well."
          />
        </Field>
        <Field $wide>
          History file
          <input
            type="file"
            accept=".txt,.csv,.pdf,audio/*"
            onChange={(event) => setHistoryFile(event.target.files?.[0] || null)}
          />
        </Field>
      </ImportFormGrid>

      <MissingDatePills dates={plan.missingDates} />
      {previewResult && (
        <MissingDatePills
          dates={(previewResult.drafts || []).map((draft) => draft.date)}
          label="Preview draft dates"
        />
      )}

      <ActionRow>
        <ActionButton type="button" onClick={handlePreviewHistory} disabled={previewing}>
          <UploadCloud size={16} aria-hidden="true" />
          {previewing ? 'Previewing' : 'Preview History Drafts'}
        </ActionButton>
        <ActionButton type="button" $primary onClick={handleOpenCoach}>
          <Sparkles size={16} aria-hidden="true" />
          Open Swan Coach Planning
        </ActionButton>
      </ActionRow>
      <StatusText role="status" aria-live="polite">{status}</StatusText>
      <StatusText role="status" aria-live="polite">{previewStatus}</StatusText>
    </ImportPanelShell>
  );
};

export default HistoricalWorkoutImportPanel;
