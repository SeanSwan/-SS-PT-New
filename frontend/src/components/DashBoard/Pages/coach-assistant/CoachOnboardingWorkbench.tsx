import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, ListChecks, Search, Send, ShieldCheck } from 'lucide-react';
import { useAuth as useDashboardAuth } from '../../../../context/AuthContext';
import { fetchClientHubAdminClients } from '../../workspaces/ClientsWorkspace.data';
import type { ClientOption } from '../../workspaces/clients-team/ClientSelectorDropdown';
import {
  appendWorkbenchDirective,
  buildNextWorkbenchQuestion,
  buildRouteContextClient,
  buildWorkbenchCoverageCategories,
  filterWorkbenchClients,
  getWorkbenchDisplayName,
  workbenchCompletionPercent,
  type WorkbenchCoverageCategory,
  type WorkbenchCoverageStatus,
} from './CoachOnboardingWorkbench.logic';
import {
  CategoryItem,
  CategoryList,
  EmptyNote,
  HeaderMetric,
  IntakeForm,
  ProgressTrack,
  QuickChipRow,
  RosterButton,
  RosterList,
  RosterTools,
  StatusPill,
  StatusRow,
  WorkbenchButton,
  WorkbenchGrid,
  WorkbenchHeader,
  WorkbenchPanel,
  WorkbenchShell,
} from './CoachOnboardingWorkbench.styles';
import { StyledBox } from '@/components/ui/StyledBox';

type ClientHubAxios = Parameters<typeof fetchClientHubAdminClients>[0];

type QueueSummary = Partial<Record<
  'preparedDrafts' | 'pendingDrafts' | 'applyingDrafts' | 'approvedDrafts' | 'appliedDrafts' | 'rejectedDrafts' | 'failedDrafts',
  number
>>;

interface CoachOnboardingWorkbenchProps {
  authAxios?: ClientHubAxios;
  clients?: ClientOption[];
  selectedClientId: number | null;
  selectedClientLabel: string;
  commandText: string;
  commandTextRef?: React.RefObject<HTMLTextAreaElement>;
  queueSummary?: QueueSummary;
  onCommandTextChange: (value: string) => void;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onSelectClientId?: (clientId: number) => void;
}

const QUICK_DIRECTIVES = [
  'Mark this onboarding field unknown and keep training unblocked.',
  'Ask the client later for this onboarding field.',
  'Mark this onboarding field not applicable with a short reason.',
  'Skip this field for now and ask the next highest-priority missing item.',
];

const statusLabel = (status: WorkbenchCoverageStatus): string => status.replace(/_/g, ' ');
const sourceLabel = (source?: string): string => (source || 'unknown').replace(/_/g, ' ');
const safeCount = (value: unknown): number => {
  const count = Number(value || 0);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
};

function mergeRouteClient(
  clients: ClientOption[],
  selectedClientId: number | null,
  selectedClientLabel: string,
): ClientOption[] {
  const routeClient = buildRouteContextClient(selectedClientId, selectedClientLabel);
  if (!routeClient || clients.some((client) => client.id === routeClient.id)) return clients;
  return [routeClient, ...clients];
}

const RosterRail: React.FC<{
  clients: ClientOption[];
  selectedClientId: number | null;
  loading: boolean;
  query: string;
  source: string;
  onQueryChange: (value: string) => void;
  onSourceChange: (value: string) => void;
  onSelectClient: (client: ClientOption) => void;
}> = ({ clients, selectedClientId, loading, query, source, onQueryChange, onSourceChange, onSelectClient }) => {
  const sources = useMemo(() => Array.from(new Set(clients.map((client) => client.clientSource).filter(Boolean))).sort(), [clients]);
  const visibleClients = useMemo(() => filterWorkbenchClients(clients, query, source), [clients, query, source]);

  return (
    <WorkbenchPanel aria-label="Client onboarding roster">
      <h3><Search size={16} aria-hidden="true" /> Roster</h3>
      <RosterTools>
        <input
          aria-label="Search onboarding roster"
          placeholder="Search clients"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <select aria-label="Filter by client source" value={source} onChange={(event) => onSourceChange(event.target.value)}>
          <option value="">All sources</option>
          {sources.map((item) => <option key={item} value={item}>{sourceLabel(item)}</option>)}
        </select>
      </RosterTools>
      <RosterList>
        {visibleClients.map((client) => {
          const pct = workbenchCompletionPercent(client);
          return (
            <RosterButton
              key={client.id}
              type="button"
              $active={client.id === selectedClientId}
              onClick={() => onSelectClient(client)}
            >
              <strong>{getWorkbenchDisplayName(client)}</strong>
              <small>{sourceLabel(client.clientSource)} - {pct}% coverage</small>
              <ProgressTrack aria-hidden="true"><StyledBox as="span" $style={{ width: `${pct}%` }} /></ProgressTrack>
            </RosterButton>
          );
        })}
        {!visibleClients.length ? <EmptyNote>{loading ? 'Loading real client roster...' : 'No matching clients from the current roster.'}</EmptyNote> : null}
      </RosterList>
    </WorkbenchPanel>
  );
};

const CoverageLedger: React.FC<{ categories: WorkbenchCoverageCategory[] }> = ({ categories }) => (
  <WorkbenchPanel aria-label="Onboarding coverage ledger">
    <h3><ListChecks size={16} aria-hidden="true" /> Coverage Ledger</h3>
    <CategoryList>
      {categories.map((category) => (
        <CategoryItem key={category.key}>
          <StatusRow>
            <strong>{category.label}</strong>
            <StatusPill $status={category.status}>{statusLabel(category.status)}</StatusPill>
            {category.chartPriority >= 4 ? <StatusPill $status="known">chart priority</StatusPill> : null}
          </StatusRow>
          <ProgressTrack aria-label={`${category.label} ${category.percent}% complete`}>
            <StyledBox as="span" $style={{ width: `${category.percent}%` }} />
          </ProgressTrack>
          <p>{category.knownCount}/{category.totalCount} known - {category.requiredFor.join(', ') || 'follow-up'}</p>
        </CategoryItem>
      ))}
    </CategoryList>
  </WorkbenchPanel>
);

const IntakePanel: React.FC<Pick<
  CoachOnboardingWorkbenchProps,
  'commandText' | 'commandTextRef' | 'onCommandTextChange' | 'onSubmit'
> & { selectedClient: ClientOption | null }> = ({ commandText, commandTextRef, selectedClient, onCommandTextChange, onSubmit }) => {
  const nextQuestion = useMemo(() => buildNextWorkbenchQuestion(selectedClient), [selectedClient]);
  const appendDirective = (directive: string) => onCommandTextChange(appendWorkbenchDirective(commandText, directive));

  return (
    <WorkbenchPanel aria-label="Voice and typed onboarding intake">
      <h3><ClipboardCheck size={16} aria-hidden="true" /> Intake</h3>
      {nextQuestion ? (
        <EmptyNote>
          <strong>Next question: {nextQuestion.fieldLabel}</strong>
          <p>{nextQuestion.prompt}</p>
          <WorkbenchButton type="button" onClick={() => appendDirective(nextQuestion.command)}>Use Next Question</WorkbenchButton>
        </EmptyNote>
      ) : <EmptyNote>Select a client to stage the next missing onboarding question.</EmptyNote>}
      <QuickChipRow aria-label="Onboarding quick statuses">
        {QUICK_DIRECTIVES.map((directive) => (
          <WorkbenchButton key={directive} type="button" onClick={() => appendDirective(directive)}>
            {directive.split(' ').slice(0, 3).join(' ')}
          </WorkbenchButton>
        ))}
      </QuickChipRow>
      <IntakeForm onSubmit={onSubmit}>
        <textarea
          ref={commandTextRef}
          aria-label="Swan Coach onboarding command"
          placeholder="Dictate or type onboarding notes. Coach prepares review-gated drafts only."
          value={commandText}
          onChange={(event) => onCommandTextChange(event.target.value)}
        />
        <WorkbenchButton type="submit" $primary disabled={!commandText.trim()}>
          <Send size={16} aria-hidden="true" /> Prepare Review Draft
        </WorkbenchButton>
      </IntakeForm>
    </WorkbenchPanel>
  );
};

const ApprovalAndHandoffPanel: React.FC<{ categories: WorkbenchCoverageCategory[]; queueSummary?: QueueSummary; selectedClient: ClientOption | null }> = ({ categories, queueSummary, selectedClient }) => {
  const accessField = categories.flatMap((category) => category.fields).find((field) => field.key === 'access_handoff_status');
  const draftRows = [
    ['Prepared', safeCount(queueSummary?.preparedDrafts)],
    ['Pending', safeCount(queueSummary?.pendingDrafts)],
    ['Applying', safeCount(queueSummary?.applyingDrafts)],
    ['Applied', safeCount(queueSummary?.appliedDrafts)],
    ['Failed', safeCount(queueSummary?.failedDrafts)],
  ];

  return (
    <WorkbenchPanel aria-label="Approval and access handoff">
      <h3><ShieldCheck size={16} aria-hidden="true" /> Approval + Access</h3>
      <StatusRow>
        {draftRows.map(([label, count]) => <StatusPill key={label} $status={count ? 'trainer_pending' : 'unknown'}>{label}: {count}</StatusPill>)}
      </StatusRow>
      <EmptyNote>
        <strong>{selectedClient ? getWorkbenchDisplayName(selectedClient) : 'No client selected'}</strong>
        <p>Approval controls stay on the existing Coach proposal cards. This panel keeps the Workbench focused on missing fields and access readiness.</p>
      </EmptyNote>
      <EmptyNote>
        <strong>Access handoff</strong>
        <p>{accessField ? `Ledger status: ${statusLabel(accessField.status)}.` : 'No claim/reset handoff has been recorded in the current ledger.'}</p>
      </EmptyNote>
    </WorkbenchPanel>
  );
};

const CoachOnboardingWorkbench: React.FC<CoachOnboardingWorkbenchProps> = ({
  authAxios,
  clients: clientsOverride,
  selectedClientId,
  selectedClientLabel,
  commandText,
  commandTextRef,
  queueSummary,
  onCommandTextChange,
  onSubmit,
  onSelectClientId,
}) => {
  const dashboardAuth = useDashboardAuth() as { authAxios?: ClientHubAxios };
  const rosterAxios = authAxios ?? dashboardAuth.authAxios ?? null;
  const [fetchedClients, setFetchedClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('');
  const [localSelectedId, setLocalSelectedId] = useState<number | null>(selectedClientId);

  useEffect(() => setLocalSelectedId(selectedClientId), [selectedClientId]);
  useEffect(() => {
    if (clientsOverride || !rosterAxios) return undefined;
    let alive = true;
    setLoading(true);
    fetchClientHubAdminClients(rosterAxios).then((clients) => {
      if (alive) setFetchedClients(clients);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => { alive = false; };
  }, [clientsOverride, rosterAxios]);

  const clients = useMemo(
    () => mergeRouteClient(clientsOverride ?? fetchedClients, selectedClientId, selectedClientLabel),
    [clientsOverride, fetchedClients, selectedClientId, selectedClientLabel],
  );
  const activeClientId = localSelectedId ?? selectedClientId ?? clients[0]?.id ?? null;
  const selectedClient = useMemo(() => clients.find((client) => client.id === activeClientId) ?? null, [activeClientId, clients]);
  const categories = useMemo(() => buildWorkbenchCoverageCategories(selectedClient), [selectedClient]);
  const completionPct = workbenchCompletionPercent(selectedClient);

  const handleSelectClient = (client: ClientOption) => {
    setLocalSelectedId(client.id);
    onSelectClientId?.(client.id);
  };

  return (
    <WorkbenchShell>
      <WorkbenchHeader>
        <div>
          <h2>Client Onboarding Workbench</h2>
          <p>Real client roster, coverage ledger, and Coach draft preparation in one operator view.</p>
        </div>
        <HeaderMetric><strong>{completionPct}%</strong><span>selected coverage</span></HeaderMetric>
      </WorkbenchHeader>
      <WorkbenchGrid>
        <RosterRail clients={clients} selectedClientId={activeClientId} loading={loading} query={query} source={source} onQueryChange={setQuery} onSourceChange={setSource} onSelectClient={handleSelectClient} />
        <StyledBox as="div" $style={{ display: 'grid', gap: 14, minWidth: 0 }}>
          <IntakePanel selectedClient={selectedClient} commandText={commandText} commandTextRef={commandTextRef} onCommandTextChange={onCommandTextChange} onSubmit={onSubmit} />
          <CoverageLedger categories={categories} />
        </StyledBox>
        <ApprovalAndHandoffPanel categories={categories} queueSummary={queueSummary} selectedClient={selectedClient} />
      </WorkbenchGrid>
    </WorkbenchShell>
  );
};

export default CoachOnboardingWorkbench;
