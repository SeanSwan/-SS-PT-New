/**
 * HermesCoachReviewQueue
 * Admin-facing queue for coach-agent Hermes review requests.
 *
 * This v1 surface deliberately uses the list endpoint only. Full task details
 * may contain sensitive client context, so the console shows queue health
 * without auto-loading transcript or task-description text.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle, Clock3, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../../../../context/AuthContext';

type HermesTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
type HermesTaskPriority = 'low' | 'normal' | 'high';

interface HermesTaskSummary {
  id: string;
  agentType: string;
  taskTitle: string;
  priority: HermesTaskPriority;
  status: HermesTaskStatus;
  createdAt: string;
  updatedAt: string;
  requestedBy?: number | string;
}

interface HermesTaskListResponse {
  count?: number;
  pending?: number;
  completed?: number;
  failed?: number;
  tasks?: unknown[];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function normalizeTask(value: unknown): HermesTaskSummary | null {
  const record = asRecord(value);
  const id = String(record.id || '');
  const taskTitle = String(record.taskTitle || '');
  const createdAt = String(record.createdAt || '');
  const updatedAt = String(record.updatedAt || createdAt);

  if (!id || !taskTitle || !createdAt) return null;

  return {
    id,
    taskTitle,
    createdAt,
    updatedAt,
    agentType: String(record.agentType || 'coach'),
    status: String(record.status || 'pending') as HermesTaskStatus,
    priority: String(record.priority || 'normal') as HermesTaskPriority,
    requestedBy: typeof record.requestedBy === 'number' || typeof record.requestedBy === 'string'
      ? record.requestedBy
      : undefined,
  };
}

function statusLabel(status: HermesTaskStatus) {
  if (status === 'in_progress') return 'In progress';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function hoursOpen(task: HermesTaskSummary) {
  const created = new Date(task.createdAt).getTime();
  if (!Number.isFinite(created)) return null;
  return Math.max(0, Math.floor((Date.now() - created) / (60 * 60 * 1000)));
}

const HermesCoachReviewQueue: React.FC = () => {
  const { authAxios } = useAuth();
  const [tasks, setTasks] = useState<HermesTaskSummary[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, completed: 0, failed: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authAxios.get('/api/hermes/tasks', {
        params: { agentType: 'coach' },
      });
      const payload = asRecord(response.data) as HermesTaskListResponse;
      const nextTasks = Array.isArray(payload.tasks)
        ? payload.tasks.map(normalizeTask).filter((task): task is HermesTaskSummary => Boolean(task))
        : [];

      setTasks(nextTasks);
      setCounts({
        total: typeof payload.count === 'number' ? payload.count : nextTasks.length,
        pending: typeof payload.pending === 'number'
          ? payload.pending
          : nextTasks.filter(task => task.status === 'pending' || task.status === 'in_progress').length,
        completed: typeof payload.completed === 'number'
          ? payload.completed
          : nextTasks.filter(task => task.status === 'completed').length,
        failed: typeof payload.failed === 'number'
          ? payload.failed
          : nextTasks.filter(task => task.status === 'failed' || task.status === 'cancelled').length,
      });
      setLastLoadedAt(new Date().toISOString());
    } catch {
      setTasks([]);
      setCounts({ total: 0, pending: 0, completed: 0, failed: 0 });
      setError('Hermes coach queue could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const staleTaskCount = useMemo(
    () => tasks.filter(task => {
      const age = hoursOpen(task);
      return age !== null && age >= 24 && (task.status === 'pending' || task.status === 'in_progress');
    }).length,
    [tasks],
  );

  return (
    <QueueShell aria-label="Hermes coach review queue">
      <QueueHeader>
        <HeaderCopy>
          <Eyebrow>Hermes Operator</Eyebrow>
          <QueueTitle>
            <Sparkles size={22} />
            Coach Review Queue
          </QueueTitle>
          <QueueText>
            Redacted coach-agent requests, SLA status, and queue health for the admin follow-up loop.
          </QueueText>
        </HeaderCopy>
        <RefreshButton type="button" onClick={() => void loadQueue()} disabled={isLoading}>
          <RefreshCw size={18} />
          {isLoading ? 'Refreshing' : 'Refresh'}
        </RefreshButton>
      </QueueHeader>

      {error && (
        <ErrorBanner role="alert">
          <AlertTriangle size={18} />
          {error}
        </ErrorBanner>
      )}

      <MetricGrid>
        <MetricPanel>
          <MetricLabel>Total</MetricLabel>
          <MetricValue>{counts.total}</MetricValue>
        </MetricPanel>
        <MetricPanel>
          <MetricLabel>Open</MetricLabel>
          <MetricValue>{counts.pending}</MetricValue>
        </MetricPanel>
        <MetricPanel>
          <MetricLabel>Closed</MetricLabel>
          <MetricValue>{counts.completed}</MetricValue>
        </MetricPanel>
        <MetricPanel $warn={staleTaskCount > 0 || counts.failed > 0}>
          <MetricLabel>Needs Attention</MetricLabel>
          <MetricValue>{staleTaskCount + counts.failed}</MetricValue>
        </MetricPanel>
      </MetricGrid>

      <PrivacyRail>
        <ShieldCheck size={18} />
        List view omits task descriptions and client transcript text.
        {lastLoadedAt && <span>Updated {formatDistanceToNow(new Date(lastLoadedAt), { addSuffix: true })}</span>}
      </PrivacyRail>

      <TaskList>
        {isLoading && tasks.length === 0 ? (
          <EmptyPanel>Loading Hermes coach requests...</EmptyPanel>
        ) : tasks.length === 0 ? (
          <EmptyPanel>No coach-agent requests are waiting.</EmptyPanel>
        ) : (
          tasks.map(task => {
            const age = hoursOpen(task);
            const isStale = age !== null && age >= 24 && (task.status === 'pending' || task.status === 'in_progress');
            return (
              <TaskRow key={task.id} $stale={isStale}>
                <TaskMain>
                  <TaskTitle>{task.taskTitle}</TaskTitle>
                  <TaskMeta>
                    <span>{statusLabel(task.status)}</span>
                    <span>Priority {task.priority}</span>
                    <span>Requester {task.requestedBy ?? 'unknown'}</span>
                  </TaskMeta>
                </TaskMain>
                <TaskAge>
                  <Clock3 size={16} />
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </TaskAge>
              </TaskRow>
            );
          })
        )}
      </TaskList>
    </QueueShell>
  );
};

const QueueShell = styled.section`display:grid;gap:18px;`;

const QueueHeader = styled.div`
  display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:20px;
  border:1px solid var(--swan-border-subtle, rgba(96, 192, 240, 0.22));border-radius:14px;
  background:linear-gradient(135deg, rgba(0, 32, 96, 0.72), rgba(10, 10, 15, 0.86));
`;

const HeaderCopy = styled.div`display:grid;gap:8px;`;

const Eyebrow = styled.span`
  color:var(--accent-primary, #60c0f0);font-size:0.78rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
`;

const QueueTitle = styled.h4`
  display:inline-flex;align-items:center;gap:10px;color:var(--text-primary, #e0ecf4);font-size:1.28rem;margin:0;
`;

const QueueText = styled.p`color:var(--text-secondary, #a7b5c4);margin:0;max-width:760px;`;

const RefreshButton = styled.button`
  min-height:44px;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--accent-primary, #60c0f0);
  border-radius:999px;background:rgba(96, 192, 240, 0.12);color:var(--text-primary, #e0ecf4);font-weight:700;padding:0 16px;cursor:pointer;
`;

const MetricGrid = styled.div`display:grid;grid-template-columns:repeat(4, minmax(140px, 1fr));gap:12px;`;

const MetricPanel = styled.div<{ $warn?: boolean }>`
  display:grid;gap:8px;min-height:96px;padding:16px;border-radius:12px;
  border:1px solid ${({ $warn }) => ($warn ? 'rgba(198, 168, 75, 0.45)' : 'var(--swan-border-subtle, rgba(96, 192, 240, 0.18))')};
  background:${({ $warn }) => ($warn ? 'rgba(198, 168, 75, 0.12)' : 'rgba(255, 255, 255, 0.045)')};
`;

const MetricLabel = styled.span`color:var(--text-secondary, #a7b5c4);font-size:0.82rem;font-weight:700;`;
const MetricValue = styled.span`color:var(--text-primary, #e0ecf4);font-size:1.9rem;font-weight:800;`;

const PrivacyRail = styled.div`
  display:flex;align-items:center;flex-wrap:wrap;gap:10px 14px;min-height:44px;color:var(--text-secondary, #a7b5c4);
  border:1px solid rgba(96, 192, 240, 0.16);border-radius:12px;background:rgba(96, 192, 240, 0.07);padding:10px 14px;
  svg{color:var(--accent-primary, #60c0f0);flex-shrink:0;} span{color:var(--accent-primary, #60c0f0);margin-left:auto;}
`;

const ErrorBanner = styled.div`
  display:flex;align-items:center;gap:10px;min-height:44px;color:var(--danger-contrast, #ffe8e8);
  border:1px solid rgba(248, 113, 113, 0.45);border-radius:12px;background:rgba(127, 29, 29, 0.32);padding:10px 14px;
`;

const TaskList = styled.div`display:grid;gap:10px;`;

const TaskRow = styled.article<{ $stale?: boolean }>`
  display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px;border-radius:12px;background:rgba(10, 10, 15, 0.72);
  border:1px solid ${({ $stale }) => ($stale ? 'rgba(198, 168, 75, 0.48)' : 'rgba(255, 255, 255, 0.1)')};
`;

const TaskMain = styled.div`display:grid;gap:8px;min-width:0;`;
const TaskTitle = styled.h5`color:var(--text-primary, #e0ecf4);font-size:1rem;line-height:1.3;margin:0;`;

const TaskMeta = styled.div`
  display:flex;flex-wrap:wrap;gap:8px;
  span{color:var(--text-secondary, #a7b5c4);border:1px solid rgba(255, 255, 255, 0.1);border-radius:999px;padding:4px 9px;font-size:0.78rem;}
`;

const TaskAge = styled.span`
  display:inline-flex;align-items:center;gap:6px;color:var(--accent-primary, #60c0f0);font-size:0.86rem;white-space:nowrap;
`;

const EmptyPanel = styled.div`
  display:flex;align-items:center;min-height:88px;color:var(--text-secondary, #a7b5c4);
  border:1px dashed rgba(96, 192, 240, 0.24);border-radius:12px;background:rgba(255, 255, 255, 0.035);padding:18px;
`;

export default HermesCoachReviewQueue;