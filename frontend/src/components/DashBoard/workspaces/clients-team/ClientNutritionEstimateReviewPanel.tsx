import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import apiService from '../../../../services/api.service';
import type { ClientOption } from './ClientSelectorDropdown';
import { getClientDisplayName } from './clientIdentity';
import { formatLocalCalendarDate } from './nutritionDate';
import { selectRosterClientIds } from './ClientNutritionRosterTriagePanel.logic';
import {
  buildNutritionEstimateReviewRows,
  type NutritionEstimateReviewClient,
  type NutritionEstimateReviewEntry,
  type NutritionEstimateReviewRow,
} from './ClientNutritionEstimateReviewPanel.logic';
import {
  EstimateReviewBody,
  EstimateReviewButton,
  EstimateReviewCard,
  EstimateReviewClient,
  EstimateReviewDescription,
  EstimateReviewFact,
  EstimateReviewFacts,
  EstimateReviewHeader,
  EstimateReviewList,
  EstimateReviewMeal,
  EstimateReviewMeta,
  EstimateReviewShell,
  EstimateReviewState,
  EstimateReviewTitle,
} from './ClientNutritionEstimateReviewPanel.styles';

interface ClientNutritionEstimateReviewPanelProps {
  clients: ClientOption[];
  hidden?: boolean;
}

type LoadState = 'loading' | 'ready' | 'error';

interface ReviewQueueResponse {
  data?: {
    success?: boolean;
    entries?: NutritionEstimateReviewEntry[];
  };
}

interface VerifyResponse {
  data?: {
    success?: boolean;
  };
}

const toReviewClients = (clients: ClientOption[]): NutritionEstimateReviewClient[] =>
  clients.map((client) => ({
    id: client.id,
    displayName: getClientDisplayName(client),
  }));

const getEntriesFromResponse = (response: ReviewQueueResponse): NutritionEstimateReviewEntry[] => {
  if (!response.data?.success || !Array.isArray(response.data.entries)) {
    throw new Error('Nutrition review queue response was not successful');
  }
  return response.data.entries;
};

const assertVerifySuccess = (response: VerifyResponse) => {
  if (!response.data?.success) {
    throw new Error('Nutrition verify response was not successful');
  }
};

const ClientNutritionEstimateReviewPanel: React.FC<ClientNutritionEstimateReviewPanelProps> = ({ clients, hidden }) => {
  const reviewClients = useMemo(() => toReviewClients(clients), [clients]);
  const rosterClientIds = useMemo(() => selectRosterClientIds(reviewClients), [reviewClients]);
  const [state, setState] = useState<LoadState>('loading');
  const [entries, setEntries] = useState<NutritionEstimateReviewEntry[]>([]);
  const [verifyingId, setVerifyingId] = useState<number | string | null>(null);
  const [verifyError, setVerifyError] = useState(false);

  useEffect(() => {
    if (hidden || rosterClientIds.length === 0) return undefined;

    let cancelled = false;
    const date = formatLocalCalendarDate();
    const params = new URLSearchParams({ date, userIds: rosterClientIds.join(','), days: '7' });
    setState('loading');
    setVerifyError(false);

    apiService.get(`/api/macros/review-queue?${params.toString()}`)
      .then((response) => {
        if (cancelled) return;
        setEntries(getEntriesFromResponse(response as ReviewQueueResponse));
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [hidden, rosterClientIds]);

  if (hidden || rosterClientIds.length === 0) return null;

  const rows = buildNutritionEstimateReviewRows(
    reviewClients.filter((client) => rosterClientIds.includes(client.id)),
    entries
  ).slice(0, 5);

  const verifyRow = async (row: NutritionEstimateReviewRow) => {
    if (verifyingId !== null) return;
    setVerifyError(false);
    setVerifyingId(row.id);

    try {
      const response = await apiService.patch(`/api/macros/client-timeline/${encodeURIComponent(String(row.id))}/verify`);
      assertVerifySuccess(response as VerifyResponse);
      setEntries((currentEntries) => currentEntries.filter((entry) => String(entry.id) !== String(row.id)));
    } catch {
      setVerifyError(true);
    } finally {
      setVerifyingId(null);
    }
  };

  const stateMessage = state === 'loading'
    ? 'Loading nutrition estimates...'
    : state === 'error'
      ? 'Nutrition estimate review unavailable'
      : rows.length === 0
        ? 'No estimates awaiting review'
        : null;

  return (
    <EstimateReviewShell aria-labelledby="nutrition-estimate-review-title" aria-busy={state === 'loading'}>
      <EstimateReviewHeader>
        <EstimateReviewTitle id="nutrition-estimate-review-title">Nutrition Estimate Review</EstimateReviewTitle>
        <EstimateReviewMeta>{state === 'ready' ? `${rows.length} pending` : 'Needs coach review'}</EstimateReviewMeta>
      </EstimateReviewHeader>

      {verifyError ? (
        <EstimateReviewState role="alert">
          Nutrition estimate review unavailable
        </EstimateReviewState>
      ) : null}

      {stateMessage ? (
        <EstimateReviewState role={state === 'error' ? 'alert' : 'status'}>
          {stateMessage}
        </EstimateReviewState>
      ) : (
        <EstimateReviewList>
          {rows.map((row) => (
            <EstimateReviewCard key={row.id}>
              <EstimateReviewBody>
                <EstimateReviewClient>{row.clientName}</EstimateReviewClient>
                <EstimateReviewMeal>{row.mealTitle}</EstimateReviewMeal>
                <EstimateReviewDescription>{row.description}</EstimateReviewDescription>
                <EstimateReviewFacts>
                  <EstimateReviewFact>{row.macroLine}</EstimateReviewFact>
                  <EstimateReviewFact>{row.sourceLabel}</EstimateReviewFact>
                </EstimateReviewFacts>
              </EstimateReviewBody>
              <EstimateReviewButton
                type="button"
                aria-label={`Mark ${row.clientName} ${row.mealTitle} verified`}
                aria-busy={verifyingId === row.id}
                disabled={verifyingId !== null}
                onClick={() => verifyRow(row)}
              >
                <CheckCircle2 size={16} aria-hidden="true" />
                Mark verified
              </EstimateReviewButton>
            </EstimateReviewCard>
          ))}
        </EstimateReviewList>
      )}
    </EstimateReviewShell>
  );
};

export default ClientNutritionEstimateReviewPanel;
