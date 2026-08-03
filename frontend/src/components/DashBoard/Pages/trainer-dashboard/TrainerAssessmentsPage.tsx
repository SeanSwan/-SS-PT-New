/**
 * TrainerAssessmentsPage
 * Mounted in the trainer dashboard assessments route. Records NASM-aligned
 * movement screens, postural analyses, and performance tests against the
 * role-aware trainer/admin client source.
 */
import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChevronDown, Send } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import NASMTeachMode from './components/NASMTeachMode';
import { OHSA_ANTERIOR_KEYS, OHSA_CHECKPOINTS, OHSA_LATERAL_KEYS, PERFORMANCE_TESTS, POSTURAL_CHECKPOINTS, type Assessment, type AssessmentType, type ClientOption } from './TrainerAssessmentsPage.data';
import { AssessmentCriteria, AssessmentHistoryList, AssessmentTypeSelector, OhsaScoringCard, PerformanceScoringCard, PosturalScoringCard, type CompensationScores, type PerformanceScores } from './TrainerAssessmentsPage.sections';
import { ActionRow, FieldGroup, FieldHint, FormCard, Header, HeaderRow, InlineAlert, InlineAlertText, Input, Label, PageWrapper, RetryButton, SectionTitle, SectionTitleIcon, Select, SubmitButton, SubmitStatus, Subtitle, TeachModeToggle, Textarea, Title, TitleIcon } from './TrainerAssessmentsPage.styles';
import { normalizeTrainerClientOptions, parseTrainerClientId, resolveTrainerClientSource } from './trainerClientSource';

const defaultCompensationScores = (checkpoints: readonly { key: string }[]): CompensationScores =>
  Object.fromEntries(checkpoints.map(checkpoint => [checkpoint.key, 'none']));

const defaultPerformanceScores = (): PerformanceScores =>
  Object.fromEntries(PERFORMANCE_TESTS.map(test => [test.key, '']));

const readAssessmentList = (payload: unknown): Assessment[] => {
  const data = payload as { data?: { analyses?: unknown; assessments?: unknown } | unknown; assessments?: unknown };
  const list = data.data && typeof data.data === 'object' && 'analyses' in data.data
    ? data.data.analyses
    : data.data && typeof data.data === 'object' && 'assessments' in data.data
      ? data.data.assessments
      : data.data || data.assessments || [];
  return Array.isArray(list) ? list as Assessment[] : [];
};

const TrainerAssessmentsPage = () => {
  const { authAxios, user } = useAuth();
  const [assessmentType, setAssessmentType] = useState<AssessmentType>('movement_screen');
  const [teachMode, setTeachMode] = useState(false);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [history, setHistory] = useState<Assessment[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [submitStatus, setSubmitStatus] = useState<{ msg: string; success: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Launch audit 2026-08-03: both fetches used to swallow their error into an
  // empty array, so a 500 was indistinguishable from "nothing here yet" and the
  // trainer had no way to recover without a full page reload.
  const [historyError, setHistoryError] = useState(false);
  const [clientsError, setClientsError] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const parsedClientId = parseTrainerClientId(clientId);

  const [ohsaScores, setOhsaScores] = useState<CompensationScores>(() => defaultCompensationScores(OHSA_CHECKPOINTS));
  const [posturalScores, setPosturalScores] = useState<CompensationScores>(() => defaultCompensationScores(POSTURAL_CHECKPOINTS));
  const [perfScores, setPerfScores] = useState<PerformanceScores>(() => defaultPerformanceScores());

  const loadHistory = useCallback(async () => {
    try {
      const res = await authAxios.get('/api/movement-analysis');
      setHistory(readAssessmentList(res.data));
      setHistoryError(false);
    } catch {
      setHistory([]);
      setHistoryError(true);
    }
  }, [authAxios]);

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const source = resolveTrainerClientSource(user);
      const res = await authAxios.get(source.path);
      setClients(normalizeTrainerClientOptions(res.data, source.mode));
      setClientsError(false);
    } catch {
      setClients([]);
      setClientsError(true);
    } finally {
      setClientsLoading(false);
    }
  }, [authAxios, user]);

  useEffect(() => {
    const load = async () => {
      await loadHistory();
      await loadClients();
    };
    load();
  }, [loadClients, loadHistory]);

  const buildPayload = useCallback((targetClientId: number) => {
    const selectedClient = clients.find(c => c.id === targetClientId);
    const base = {
      userId: targetClientId,
      fullName: selectedClient?.name || 'Client',
      status: 'completed',
      source: 'in_session',
      assessmentDate: date,
      trainerNotes: notes || null,
    };

    if (assessmentType === 'movement_screen') {
      const anteriorView: Record<string, string> = {};
      const lateralView: Record<string, string> = {};
      for (const [key, value] of Object.entries(ohsaScores)) {
        if (OHSA_ANTERIOR_KEYS.includes(key)) anteriorView[key] = value;
        else if (OHSA_LATERAL_KEYS.includes(key)) lateralView[key] = value;
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
        posturalAssessment: { ...posturalScores, assessmentDate: date, conductedBy: user?.id },
      };
    }

    const parsedScores: Record<string, number | null> = {};
    for (const test of PERFORMANCE_TESTS) {
      const value = perfScores[test.key];
      parsedScores[test.key] = value ? Number(value) : null;
    }
    return {
      ...base,
      movementQualityAssessments: { ...parsedScores, assessmentDate: date, conductedBy: user?.id },
    };
  }, [assessmentType, clients, date, notes, ohsaScores, posturalScores, perfScores, user]);

  const handleSubmit = useCallback(async () => {
    if (!authAxios || parsedClientId === null || !assessmentType) return;
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      await authAxios.post('/api/movement-analysis', buildPayload(parsedClientId));
      setSubmitStatus({ msg: 'Assessment saved - Swan Coach hive mind updated', success: true });
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setOhsaScores(defaultCompensationScores(OHSA_CHECKPOINTS));
      setPosturalScores(defaultCompensationScores(POSTURAL_CHECKPOINTS));
      setPerfScores(defaultPerformanceScores());
      await loadHistory();
    } catch (err: unknown) {
      console.error('Failed to submit assessment:', err);
      const message = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSubmitStatus({ msg: message || 'Submission failed', success: false });
    } finally {
      setSubmitting(false);
    }
  }, [authAxios, assessmentType, parsedClientId, buildPayload, loadHistory]);

  return (
    <PageWrapper>
      <Header>
        <HeaderRow>
          <div>
            <Title><TitleIcon size={24} aria-hidden="true" />Form Assessments</Title>
            <Subtitle>Record movement screens, postural analyses, and performance tests for your clients.</Subtitle>
          </div>
          <TeachModeToggle type="button" $active={teachMode} onClick={() => setTeachMode(!teachMode)}>
            <BookOpen size={18} aria-hidden="true" />
            {teachMode ? 'Hide Teach Mode' : 'Teach Mode'}
          </TeachModeToggle>
        </HeaderRow>
      </Header>

      {teachMode && <NASMTeachMode assessmentType={assessmentType} />}

      <FormCard>
        <AssessmentTypeSelector assessmentType={assessmentType} onSelect={setAssessmentType} />
        <AssessmentCriteria assessmentType={assessmentType} />

        {clientsError && (
          <InlineAlert role="alert">
            <InlineAlertText>Your client list could not be loaded, so the picker below is empty.</InlineAlertText>
            <RetryButton type="button" onClick={loadClients} disabled={clientsLoading}>
              {clientsLoading ? 'Retrying...' : 'Retry loading clients'}
            </RetryButton>
          </InlineAlert>
        )}

        <FieldGroup>
          <Label htmlFor="trainer-assessment-client">Client</Label>
          <Select>
            <select
              id="trainer-assessment-client"
              value={clientId}
              onChange={event => setClientId(event.target.value)}
              disabled={clientsLoading}
            >
              <option value="">
                {clientsLoading ? 'Loading clients...' : 'Select a client...'}
              </option>
              {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <ChevronDown size={18} aria-hidden="true" />
          </Select>
          {!clientsLoading && !clientsError && clients.length === 0 && (
            <FieldHint>No clients are assigned to you yet. Assessments unlock once a client is assigned.</FieldHint>
          )}
        </FieldGroup>

        {assessmentType === 'movement_screen' && (
          <OhsaScoringCard scores={ohsaScores} setScores={setOhsaScores} />
        )}

        {assessmentType === 'postural_analysis' && (
          <PosturalScoringCard scores={posturalScores} setScores={setPosturalScores} />
        )}

        {assessmentType === 'performance_test' && (
          <PerformanceScoringCard scores={perfScores} setScores={setPerfScores} />
        )}

        <FieldGroup>
          <Label htmlFor="trainer-assessment-date">Date</Label>
          <Input id="trainer-assessment-date" type="date" value={date} onChange={event => setDate(event.target.value)} />
        </FieldGroup>

        <FieldGroup>
          <Label htmlFor="trainer-assessment-notes">Trainer Notes</Label>
          <Textarea id="trainer-assessment-notes" placeholder="Observations, compensations, corrective exercise recommendations..." value={notes} onChange={event => setNotes(event.target.value)} />
        </FieldGroup>

        <ActionRow>
          <SubmitButton type="button" onClick={handleSubmit} disabled={submitting || parsedClientId === null}>
            <Send size={18} aria-hidden="true" /> {submitting ? 'Saving...' : 'Submit Assessment'}
          </SubmitButton>
          {submitStatus && <SubmitStatus $success={submitStatus.success}>{submitStatus.msg}</SubmitStatus>}
        </ActionRow>
      </FormCard>

      <SectionTitle><SectionTitleIcon size={20} aria-hidden="true" />Recent Assessments</SectionTitle>
      {historyError ? (
        <InlineAlert role="alert">
          <InlineAlertText>
            Recent assessments could not be loaded. This is a loading failure, not an empty history.
          </InlineAlertText>
          <RetryButton type="button" onClick={loadHistory}>Retry loading history</RetryButton>
        </InlineAlert>
      ) : (
        <AssessmentHistoryList history={history} />
      )}
    </PageWrapper>
  );
};

export default TrainerAssessmentsPage;
