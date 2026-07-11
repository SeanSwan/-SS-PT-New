import React, { useCallback, useEffect, useState } from 'react';
import { ChevronUp, Minus } from 'lucide-react';
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
  DockHeaderActions,
  DockIconButton,
  DockIdentity,
  DockMeter,
  DockMeterFill,
  DockMiniButton,
  DockShell,
  DockState,
  DockTitle,
} from './ClientCompanionDock.styles';
import { readCompanionDockCollapsed, writeCompanionDockCollapsed } from './companionDockPreferences';

interface ClientCompanionDockProps {
  userIdSegment: string;
  onNavigate: (path: string) => void;
}

type DockStateValue = 'loading' | 'ready' | 'empty' | 'error';

const HOME_PATH = '/dashboard/client/my-home';
const LOG_WORKOUT_PATH = '/dashboard/client/log-workout';
const PROGRESS_PATH = '/dashboard/client/progress';

const getPrimaryPath = (snapshot: CompanionV2Snapshot) => {
  if (snapshot.health < 40) return PROGRESS_PATH;
  if (snapshot.happiness < 50) return HOME_PATH;
  return LOG_WORKOUT_PATH;
};

const ClientCompanionDock: React.FC<ClientCompanionDockProps> = ({ userIdSegment, onNavigate }) => {
  const [state, setState] = useState<DockStateValue>('loading');
  const [collapsed, setCollapsed] = useState(() => readCompanionDockCollapsed(userIdSegment));
  const [snapshot, setSnapshot] = useState<CompanionV2Snapshot>(() => normalizeCompanionV2Snapshot(null));

  useEffect(() => { setCollapsed(readCompanionDockCollapsed(userIdSegment)); }, [userIdSegment]);

  const setDockCollapsed = useCallback((nextCollapsed: boolean) => {
    setCollapsed(nextCollapsed);
    writeCompanionDockCollapsed(userIdSegment, nextCollapsed);
  }, [userIdSegment]);

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

  if (collapsed) {
    return (
      <DockMiniButton type="button" aria-label="Open companion dock" onClick={() => setDockCollapsed(false)}>
        <ChevronUp size={14} aria-hidden /> Companion
      </DockMiniButton>
    );
  }

  const collapseButton = (
    <DockIconButton type="button" aria-label="Minimize companion dock" onClick={() => setDockCollapsed(true)}>
      <Minus size={14} aria-hidden />
    </DockIconButton>
  );

  if (state === 'loading') {
    return (
      <DockShell aria-label="Companion dock">
        <DockHeader>
          <DockState>Checking companion rhythm...</DockState>
          {collapseButton}
        </DockHeader>
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
          {collapseButton}
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
          <DockHeaderActions>
            <DockBadge>New</DockBadge>
            {collapseButton}
          </DockHeaderActions>
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
        <DockHeaderActions>
          <DockBadge>{snapshot.stageLabel}</DockBadge>
          {collapseButton}
        </DockHeaderActions>
      </DockHeader>
      <DockBody>{insight.body}</DockBody>
      <DockMeter aria-label={`Companion progress ${insight.bondPercent}%`}>
        <DockMeterFill $pct={insight.bondPercent} />
      </DockMeter>
      <DockActions>
        <DockButton type="button" $primary onClick={() => onNavigate(getPrimaryPath(snapshot))}>{insight.nextActionLabel}</DockButton>
        <DockButton type="button" onClick={() => onNavigate(HOME_PATH)}>My Home</DockButton>
      </DockActions>
    </DockShell>
  );
};

export default ClientCompanionDock;
