/**
 * Blueprint: ClientGlanceCard
 * Parent: InspectorPanel, only while a staff chat is pinned to a client. The
 * facts a coach checks before a set — last workout and active pain flags — from
 * existing first-party reads (GET /api/workouts/:id/history, GET
 * /api/pain-entries/:id/active; both RBAC'd server-side), plus the two actions
 * that start from a client: Floor mode and the on-device progress PDF.
 * A failed read says so; it is never shown as "nothing logged" / "no pain".
 */
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Dumbbell, FileText, History } from 'lucide-react';
import { InspectorCard } from './CoachWorkspace.panels.styles';
import { useWorkoutHistory } from '../../../../hooks/useWorkoutHistory';
import { useAuth } from '../../../../context/AuthContext';
import { createPainEntryService, type PainEntry } from '../../../../services/painEntryService';
import { WORKOUT_LOGGED_EVENT } from '../../../../utils/workoutLoggedEvent';

type Props = { clientId: number; clientName: string; onFloor: () => void; onPdf: () => void };

type Pain = { phase: 'loading' } | { phase: 'ready'; entries: PainEntry[] } | { phase: 'error' };

const day = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

export function painLabel(entry: Pick<PainEntry, 'bodyRegion' | 'side' | 'painLevel'>): string {
  const side = entry.side === 'left' || entry.side === 'right' ? `${entry.side[0].toUpperCase()}${entry.side.slice(1)} ` : '';
  return `${side}${entry.bodyRegion.replace(/_/g, ' ')} · ${entry.painLevel}/10`;
}

const ClientGlanceCard: React.FC<Props> = ({ clientId, clientName, onFloor, onPdf }) => {
  const history = useWorkoutHistory(clientId, 1);
  const { authAxios } = useAuth();
  const [pain, setPain] = useState<Pain>({ phase: 'loading' });
  const { refetch } = history;

  useEffect(() => {
    let live = true;
    setPain({ phase: 'loading' });
    if (!authAxios) { setPain({ phase: 'error' }); return () => { live = false; }; }
    createPainEntryService(authAxios).getActive(clientId)
      .then((result) => { if (live) setPain(result.success ? { phase: 'ready', entries: result.entries } : { phase: 'error' }); })
      .catch(() => { if (live) setPain({ phase: 'error' }); });
    return () => { live = false; };
  }, [authAxios, clientId]);

  // A workout saved anywhere (Floor mode, the logger) refreshes "last workout".
  useEffect(() => {
    const onLogged = (event: Event) => {
      const id = Number((event as CustomEvent<{ clientId?: unknown }>).detail?.clientId);
      if (!id || id === clientId) void refetch();
    };
    window.addEventListener(WORKOUT_LOGGED_EVENT, onLogged);
    return () => window.removeEventListener(WORKOUT_LOGGED_EVENT, onLogged);
  }, [clientId, refetch]);

  const last = history.data[0];
  return (
    <InspectorCard aria-labelledby="ws-glance-title">
      <div className="ws-card-head"><span className="ws-card-title" id="ws-glance-title">{clientName} at a glance</span></div>
      <p className="ws-card-note">
        <History size={13} aria-hidden="true" />{' '}
        {history.isLoading ? 'Loading last workout…'
          : history.error ? 'Last workout did not load.'
            : last ? `Last workout ${day(last.date)}${last.exerciseNames?.length ? ` · ${last.exerciseNames.slice(0, 3).join(', ')}` : ''}`
              : 'No workouts logged yet.'}
      </p>
      {pain.phase === 'error' ? <p className="ws-card-note" data-tone="warn">Pain flags did not load.</p> : null}
      {pain.phase === 'ready' && pain.entries.length ? (
        <ul className="ws-flags" aria-label="Active pain flags">
          {pain.entries.slice(0, 3).map((entry) => (
            <li key={entry.id}><AlertTriangle size={13} aria-hidden="true" /> {painLabel(entry)}</li>
          ))}
        </ul>
      ) : null}
      {pain.phase === 'ready' && !pain.entries.length ? <p className="ws-card-note">No active pain flags.</p> : null}
      <div className="ws-stat-row">
        <button type="button" className="ws-primary" onClick={onFloor}><Dumbbell size={14} aria-hidden="true" /> Floor mode</button>
        <button type="button" className="ws-primary" onClick={onPdf}><FileText size={14} aria-hidden="true" /> Progress PDF</button>
      </div>
    </InspectorCard>
  );
};

export default ClientGlanceCard;
