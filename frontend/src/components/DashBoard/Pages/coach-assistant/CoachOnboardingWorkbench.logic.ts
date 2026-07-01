import {
  CLIENT_ONBOARDING_QUESTION_BANK_CATEGORIES,
  getClientOnboardingCoverageFields,
  type ClientOnboardingCoverageFieldDefinition,
} from '../../../../../../shared/clientOnboardingQuestionBank.mjs';
import type { ClientOption } from '../../workspaces/clients-team/ClientSelectorDropdown';

export type WorkbenchCoverageStatus =
  | 'known'
  | 'not_applicable'
  | 'client_requested'
  | 'trainer_pending'
  | 'blocked'
  | 'unknown';

export interface WorkbenchCoverageField {
  key: string;
  label: string;
  status: WorkbenchCoverageStatus;
  requiredFor: string[];
  chartDataPriority: number;
  trainerPrompt: string;
  clientPrompt: string;
  isSensitive: boolean;
}

export interface WorkbenchCoverageCategory {
  key: string;
  label: string;
  status: WorkbenchCoverageStatus;
  percent: number;
  knownCount: number;
  totalCount: number;
  missingCount: number;
  chartPriority: number;
  requiredFor: string[];
  fields: WorkbenchCoverageField[];
}

export interface WorkbenchNextQuestion {
  categoryLabel: string;
  fieldLabel: string;
  prompt: string;
  command: string;
  status: WorkbenchCoverageStatus;
}

const CLEAR_STATUSES = new Set<WorkbenchCoverageStatus>(['known', 'not_applicable']);
const FOLLOW_UP_ORDER: WorkbenchCoverageStatus[] = ['blocked', 'client_requested', 'trainer_pending', 'unknown', 'known', 'not_applicable'];
export const MAX_WORKBENCH_ROSTER_ITEMS = 80;

const asRecord = (value: unknown): Record<string, unknown> | null => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
);

const asArray = (value: unknown): Record<string, unknown>[] => (
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(asRecord(item))) : []
);

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampPercent = (value: unknown): number | null => {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return null;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

export function normalizeCoverageStatus(value: unknown): WorkbenchCoverageStatus {
  if (value === 'ask_client_later' || value === 'ask_later') return 'client_requested';
  if (value === 'known' || value === 'not_applicable' || value === 'client_requested' || value === 'trainer_pending' || value === 'blocked') {
    return value;
  }
  return 'unknown';
}

function getLedgerItems(client: ClientOption | null): Record<string, unknown>[] {
  const ledger = asRecord(client?.onboardingFieldLedger);
  return asArray(ledger?.items).length ? asArray(ledger?.items) : asArray(ledger?.fields);
}

function getMissingItems(client: ClientOption | null): Record<string, unknown>[] {
  return asArray(client?.onboardingMissingFields);
}

function indexRows(rows: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  const index = new Map<string, Record<string, unknown>>();
  rows.forEach((row) => {
    const key = String(row.coverageKey || row.fieldKey || row.key || '').trim();
    if (key) index.set(key, row);
  });
  return index;
}

function statusRank(status: WorkbenchCoverageStatus): number {
  const rank = FOLLOW_UP_ORDER.indexOf(status);
  return rank === -1 ? FOLLOW_UP_ORDER.indexOf('unknown') : rank;
}

function categoryStatus(fields: WorkbenchCoverageField[]): WorkbenchCoverageStatus {
  if (fields.length && fields.every((field) => CLEAR_STATUSES.has(field.status))) return 'known';
  return [...fields].sort((a, b) => statusRank(a.status) - statusRank(b.status))[0]?.status || 'unknown';
}

function fieldFromDefinition(
  definition: ClientOnboardingCoverageFieldDefinition,
  ledgerIndex: Map<string, Record<string, unknown>>,
  missingIndex: Map<string, Record<string, unknown>>,
): WorkbenchCoverageField {
  const row = ledgerIndex.get(definition.coverageKey) || ledgerIndex.get(definition.key);
  const missing = missingIndex.get(definition.coverageKey) || missingIndex.get(definition.key);
  const status = normalizeCoverageStatus(row?.status || missing?.status || definition.defaultStatus);
  return {
    key: definition.coverageKey || definition.key,
    label: String(row?.label || missing?.label || definition.label || definition.key),
    status,
    requiredFor: Array.isArray(definition.requiredFor) ? definition.requiredFor : [],
    chartDataPriority: Number(definition.chartDataPriority || 0),
    trainerPrompt: String(definition.trainerPrompt || `Confirm ${definition.label}.`),
    clientPrompt: String(definition.clientPrompt || `Confirm ${definition.label}.`),
    isSensitive: definition.isSensitive === true,
  };
}

export function buildWorkbenchCoverageCategories(client: ClientOption | null): WorkbenchCoverageCategory[] {
  const ledgerIndex = indexRows(getLedgerItems(client));
  const missingIndex = indexRows(getMissingItems(client));
  const fields = getClientOnboardingCoverageFields();
  return CLIENT_ONBOARDING_QUESTION_BANK_CATEGORIES.map((category) => {
    const categoryFields = fields
      .filter((definition) => definition.category === category.key)
      .map((definition) => fieldFromDefinition(definition, ledgerIndex, missingIndex));
    const knownCount = categoryFields.filter((field) => CLEAR_STATUSES.has(field.status)).length;
    const requiredFor = Array.from(new Set(categoryFields.flatMap((field) => field.requiredFor))).sort();
    return {
      key: category.key,
      label: category.label,
      status: categoryStatus(categoryFields),
      percent: categoryFields.length ? Math.round((knownCount / categoryFields.length) * 100) : 0,
      knownCount,
      totalCount: categoryFields.length,
      missingCount: categoryFields.length - knownCount,
      chartPriority: Math.max(0, ...categoryFields.map((field) => field.chartDataPriority)),
      requiredFor,
      fields: categoryFields,
    };
  });
}

export function workbenchCompletionPercent(client: ClientOption | null): number {
  if (!client) return 0;
  return clampPercent(client.onboardingFieldLedger?.summary?.completionPercentage)
    ?? clampPercent(client.onboardingPct)
    ?? clampPercent(client.onboardingCompletionPercentage)
    ?? clampPercent(client.completionPercentage)
    ?? (client.onboardingComplete || client.isOnboardingComplete ? 100 : 0);
}

export function getWorkbenchDisplayName(client: ClientOption | null): string {
  const name = `${client?.firstName || ''} ${client?.lastName || ''}`.trim();
  return name || client?.email || (client?.id ? `Client #${client.id}` : 'No client selected');
}

function getWorkbenchCoachSubject(client: ClientOption | null): string {
  if (client?.id) return `Client #${client.id}`;
  return 'the selected client';
}

export function buildRouteContextClient(clientId: number | null, label: string): ClientOption | null {
  if (!clientId) return null;
  const display = label && label !== 'Selected client' ? label : `Client #${clientId}`;
  return { id: clientId, firstName: display, lastName: '', email: '', clientSource: 'swanstudios' };
}

export function filterWorkbenchClients(clients: ClientOption[], query: string, source: string): ClientOption[] {
  const needle = query.trim().toLowerCase();
  return clients
    .filter((client) => !source || client.clientSource === source)
    .filter((client) => {
      if (!needle) return true;
      return [client.id, client.firstName, client.lastName, client.email]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    })
    .slice(0, MAX_WORKBENCH_ROSTER_ITEMS);
}

export function buildNextWorkbenchQuestion(client: ClientOption | null): WorkbenchNextQuestion | null {
  const category = buildWorkbenchCoverageCategories(client)
    .filter((item) => item.missingCount > 0)
    .sort((a, b) => b.chartPriority - a.chartPriority || b.missingCount - a.missingCount)[0];
  const field = category?.fields
    .filter((item) => !CLEAR_STATUSES.has(item.status))
    .sort((a, b) => b.chartDataPriority - a.chartDataPriority || statusRank(a.status) - statusRank(b.status))[0];
  if (!category || !field) return null;
  const clientName = getWorkbenchCoachSubject(client);
  const prompt = field.isSensitive ? field.trainerPrompt : field.clientPrompt;
  return {
    categoryLabel: category.label,
    fieldLabel: field.label,
    prompt,
    command: `For ${clientName}, ask one onboarding follow-up for ${field.label}. ${prompt} Keep workout logging unblocked and prepare only a review-gated profile coverage proposal.`,
    status: field.status,
  };
}

export function appendWorkbenchDirective(current: string, directive: string): string {
  const cleanDirective = directive.trim();
  if (!cleanDirective) return current;
  const cleanCurrent = current.trim();
  return cleanCurrent ? `${cleanCurrent}\n${cleanDirective}` : cleanDirective;
}
