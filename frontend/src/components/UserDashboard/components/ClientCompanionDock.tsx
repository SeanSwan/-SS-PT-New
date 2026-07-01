import React, { useCallback, useEffect, useState } from 'react';
import apiService from '../../../services/api.service';
import { getCompanionV2Insight } from '../../AvatarHome/companionV2Insights';
import { normalizeCompanionV2Snapshot, type CompanionV2Snapshot } from '../../AvatarHome/companionV2Snapshot';
import {
  DockActions,
  DockBadge,
  DockBody,
  DockButton,
  DockEyebrow,
  DockHeader,
  DockIdentity,
  DockMeter,
  DockMeterFill,
  DockShell,
  DockState,
  DockTitle,
} from './ClientCompanionDock.styles';

interface ClientCompanionDockProps {
  userIdSegment: string;
  onNavigate: (path: string) => void;
}

type DockStateValue = 'loading' | 'ready' | 'empty' | 'error';

const HOME_PATH = '/dashboard/client/my-home';
const LOG_WORKOUT_PATH = '/dashboard/client/log-workout';

const ClientCompanionDock: React.FC<ClientCompanionDockProps> = ({ userIdSegment, onNavigate }) => {
  const [state, setState] = useState<DockStateValue>('loading');
  const [snapshot, setSnapshot] = useState<CompanionV2Snapshot>(() => normalizeCompanionV2Snapshot(null));

  const loadSnapshot = useCallback(async () => {
    try {
      setState('loading');
      const res = await apiService.get<{ success: boolean; data: unknown }>(
        `/api/gamification/users/${userIdSegment}/pet`
      );
      const nextSnapshot = normalizeCompanionV2Snapshot(res.data.success ? res.data.data : null);
      setSnapshot(nextSnapshot);
      setState(nextSnapshot.hasPet ? 'ready' : 'empty');
    } catch {
      setSnapshot(normalizeCompanionV2Snapshot(null));
      setState('error');
    }
  }, [userIdSegment]);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  if (state === 'loading') {
    return (
      <DockShell aria-label="Companion dock">
        <DockState>Checking companion rhythm...</DockState>
      </DockShell>
    );
  }

  if (state === 'error') {
    return (
      <DockShell aria-label="Companion dock">
        <DockHeader>
          <DockIdentity>
            <DockEyebrow>Companion</DockEyebrow>
            <DockTitle>Rhythm unavailable</DockTitle>
          </DockIdentity>
        </DockHeader>
        <DockBody>Your companion data could not load. Your dashboard is still ready.</DockBody>
        <DockActions>
          <DockButton type="button" onClick={loadSnapshot}>Retry</DockButton>
        </DockActions>
      </DockShell>
    );
  }

  if (state === 'empty') {
    return (
      <DockShell aria-label="Companion dock">
        <DockHeader>
          <DockIdentity>
            <DockEyebrow>Companion</DockEyebrow>
            <DockTitle>Adopt your training familiar</DockTitle>
          </DockIdentity>
          <DockBadge>New</DockBadge>
        </DockHeader>
        <DockBody>Pick a companion that grows with your workouts, recovery, nutrition, and consistency.</DockBody>
        <DockActions>
          <DockButton type="button" $primary onClick={() => onNavigate(HOME_PATH)}>Open My Home</DockButton>
        </DockActions>
      </DockShell>
    );
  }

  const insight = getCompanionV2Insight({
    stage: snapshot.stage,
    health: snapshot.health,
    happiness: snapshot.happiness,
    moodLabel: snapshot.moodLabel,
    totalInteractions: snapshot.totalInteractions,
  });

  return (
    <DockShell aria-label="Companion dock">
      <DockHeader>
        <DockIdentity>
          <DockEyebrow>Companion rhythm</DockEyebrow>
          <DockTitle>{snapshot.name}</DockTitle>
        </DockIdentity>
        <DockBadge>{snapshot.stageLabel}</DockBadge>
      </DockHeader>
      <DockBody>{insight.body}</DockBody>
      <DockMeter aria-label={`Companion progress ${insight.bondPercent}%`}>
        <DockMeterFill $pct={insight.bondPercent} />
      </DockMeter>
      <DockActions>
        <DockButton type="button" $primary onClick={() => onNavigate(LOG_WORKOUT_PATH)}>{insight.nextActionLabel}</DockButton>
        <DockButton type="button" onClick={() => onNavigate(HOME_PATH)}>My Home</DockButton>
      </DockActions>
    </DockShell>
  );
};

export default ClientCompanionDock;
