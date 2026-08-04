/**
 * COMPONENT: WorkoutPlannerBackupPanel
 * PARENT: WorkoutPlannerSavedPlansSection
 * PURPOSE: Surfaces the client's data-grounded AI backup plan (charter v3 P2)
 *          in the plan library: staleness verdict, generate/refresh, and the
 *          transactional promote-to-primary swap with an inline two-tap
 *          confirm (no hover, 44px controls).
 * DATA: GET /api/workout-plans/backup/:userId
 *       POST /api/workout-plans/backup/:userId/generate
 *       POST /api/workout-plans/:id/promote-backup
 */

import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { PLANNER_GOLD } from './plannerGold';
import { useAuth } from '../../../../context/AuthContext';

const Panel = styled.section`
  margin: 0.75rem 0;
  padding: 0.85rem;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent);
  border-radius: 12px;
  background: var(--bg-surface, #1A1A24);
`;

const PanelTitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.82rem;
  font-weight: 700;
`;

const RoleBadge = styled.span`
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const StaleChip = styled.span<{ $stale: boolean }>`
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ $stale }) => ($stale ? PLANNER_GOLD : 'var(--success, #3DD68C)')};
  border: 1px solid currentColor;
`;

const Meta = styled.p`
  margin: 0.4rem 0 0.6rem;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.74rem;
`;

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const ActionButton = styled.button<{ $tone?: 'primary' | 'quiet' }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 0.9rem;
  border-radius: 10px;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  background: ${({ $tone }) => ($tone === 'primary' ? 'var(--accent-deep, #002060)' : 'transparent')};
  color: var(--text-primary, #E0ECF4);

  &:disabled { opacity: 0.6; cursor: progress; }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

interface BackupVerdict {
  hasBackup: boolean;
  stale: boolean;
  sessionsSince: number;
  generatedAt?: string | null;
  backup: { id: number; name?: string | null } | null;
}

export interface WorkoutPlannerBackupPanelProps {
  selectedClientId: number | null;
  onLoad: (planId: string, planName: string) => void;
  onPlansChanged: () => void;
}

const WorkoutPlannerBackupPanel: React.FC<WorkoutPlannerBackupPanelProps> = ({
  selectedClientId,
  onLoad,
  onPlansChanged,
}) => {
  const { authAxios } = useAuth();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [verdict, setVerdict] = useState<BackupVerdict | null>(null);
  const [busy, setBusy] = useState<'generate' | 'promote' | null>(null);
  const [confirmingPromote, setConfirmingPromote] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadVerdict = useCallback(async () => {
    if (!authAxios || !selectedClientId) return;
    setStatus('loading');
    setConfirmingPromote(false);
    try {
      const res = await authAxios.get(`/api/workout-plans/backup/${selectedClientId}`);
      const data = res?.data as (BackupVerdict & { success?: boolean }) | undefined;
      if (data?.success) {
        setVerdict(data);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, [authAxios, selectedClientId]);

  useEffect(() => {
    setMessage(null);
    setVerdict(null);
    if (selectedClientId) void loadVerdict();
  }, [selectedClientId, loadVerdict]);

  if (!selectedClientId) return null;

  const handleGenerate = async () => {
    if (!authAxios) return;
    setBusy('generate');
    setMessage(null);
    try {
      await authAxios.post(`/api/workout-plans/backup/${selectedClientId}/generate`, {});
      setMessage(verdict?.hasBackup ? 'Backup plan refreshed from current logged data.' : 'Backup plan generated from logged data.');
      await loadVerdict();
      onPlansChanged();
    } catch {
      setMessage('Could not generate the backup plan right now.');
    } finally {
      setBusy(null);
    }
  };

  const handlePromote = async () => {
    if (!authAxios || !verdict?.backup) return;
    if (!confirmingPromote) {
      setConfirmingPromote(true);
      return;
    }
    setBusy('promote');
    setMessage(null);
    try {
      await authAxios.post(`/api/workout-plans/${verdict.backup.id}/promote-backup`, {});
      setMessage('Backup promoted to primary. The previous primary was preserved.');
      setConfirmingPromote(false);
      await loadVerdict();
      onPlansChanged();
    } catch {
      setMessage('Could not promote the backup right now.');
    } finally {
      setBusy(null);
    }
  };

  const generatedLabel = verdict?.generatedAt
    ? new Date(verdict.generatedAt).toLocaleDateString()
    : null;

  return (
    <Panel aria-label="AI backup plan" data-testid="backup-plan-panel">
      <PanelTitleRow>
        <Sparkles size={14} aria-hidden="true" />
        Backup Plan
        <RoleBadge>AI backup</RoleBadge>
        {status === 'ready' && verdict?.hasBackup && (
          <StaleChip $stale={verdict.stale}>
            {verdict.stale ? `Stale - ${verdict.sessionsSince} sessions since` : 'Fresh'}
          </StaleChip>
        )}
      </PanelTitleRow>

      {status === 'loading' && <Meta role="status">Checking backup plan...</Meta>}
      {status === 'error' && <Meta role="status">Could not load the backup verdict right now.</Meta>}

      {status === 'ready' && !verdict?.hasBackup && (
        <Meta>No backup plan yet. Generate one from this client&apos;s real logged history.</Meta>
      )}
      {status === 'ready' && verdict?.hasBackup && (
        <Meta>
          Grounded in logged data{generatedLabel ? ` - generated ${generatedLabel}` : ''}.
          One backup per client; regenerating replaces it in place.
        </Meta>
      )}
      {message && <Meta role="status">{message}</Meta>}

      {status === 'ready' && (
        <ActionRow>
          <ActionButton
            type="button"
            $tone={verdict?.hasBackup ? 'quiet' : 'primary'}
            onClick={handleGenerate}
            disabled={busy !== null}
          >
            <RefreshCcw size={14} aria-hidden="true" />
            {verdict?.hasBackup ? 'Refresh backup' : 'Generate backup'}
          </ActionButton>
          {verdict?.hasBackup && verdict.backup && (
            <>
              <ActionButton
                type="button"
                onClick={() => onLoad(String(verdict.backup!.id), verdict.backup!.name || 'Backup plan')}
                disabled={busy !== null}
              >
                Load into builder
              </ActionButton>
              <ActionButton
                type="button"
                $tone="primary"
                onClick={handlePromote}
                disabled={busy !== null}
                aria-live="polite"
              >
                <ShieldCheck size={14} aria-hidden="true" />
                {confirmingPromote ? 'Confirm swap to primary' : 'Promote to primary'}
              </ActionButton>
            </>
          )}
        </ActionRow>
      )}
    </Panel>
  );
};

export default WorkoutPlannerBackupPanel;
