/**
 * HermesCoachReviewQueue
 * Admin-facing queue for coach-agent Hermes review requests.
 *
 * This v1 surface deliberately uses the list endpoint only. Full task details
 * may contain sensitive client context, so the console shows queue health
 * without auto-loading transcript or task-description text.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../../../../context/AuthContext';
import {
  CompleteButton,
  EmptyPanel,
  ErrorBanner,
  Eyebrow,
  HeaderCopy,
  MetricGrid,
  MetricLabel,
  MetricPanel,
  MetricValue,
  PrivacyRail,
  QueueHeader,
  QueueShell,
  QueueText,
  QueueTitle,
  RefreshButton,
  TaskActions,
  TaskAge,
  TaskList,
  TaskMain,
  TaskMeta,
  TaskRow,
  TaskTitle,
} from './HermesCoachReviewQueue.styles';
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
  const [closingTaskId, setClosingTaskId] = useState<string | null>(null);

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

  const markFulfilled = useCallback(async (taskId: string) => {
    setClosingTaskId(taskId);
    setError(null);

    try {
      await authAxios.post(`/api/hermes/tasks/${encodeURIComponent(taskId)}/complete`, {
        terminalReason: 'Fulfilled from admin coach review queue',
      });
      await loadQueue();
    } catch {
      setError('Hermes coach request could not be marked fulfilled.');
    } finally {
      setClosingTaskId(null);
    }
  }, [authAxios, loadQueue]);

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
                <TaskActions>
                  <TaskAge>
                    <Clock3 size={16} />
                    {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                  </TaskAge>
                  {(task.status === 'pending' || task.status === 'in_progress') && (
                    <CompleteButton
                      type="button"
                      onClick={() => void markFulfilled(task.id)}
                      disabled={closingTaskId === task.id}
                    >
                      <CheckCircle2 size={16} />
                      {closingTaskId === task.id ? 'Closing' : 'Mark fulfilled'}
                    </CompleteButton>
                  )}
                </TaskActions>
              </TaskRow>
            );
          })
        )}
      </TaskList>
    </QueueShell>
  );
};

export default HermesCoachReviewQueue;
