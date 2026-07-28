/**
 * Challenge audience selector.
 * Saves draft Admin/Trainer rosters from real client sources into challenge participants.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw, Save, UserCheck, Users, X } from 'lucide-react';
import { type ManagedChallenge } from './useManagedChallenges';
import { useChallengeAudienceOptions } from './useChallengeAudienceOptions';
import * as A from './ChallengeAudienceSelector.styles';
import * as S from './ChallengeCommandWorkspace.styles';

type ScopeMode = 'invite_list' | 'cohort' | 'team_pool';

interface ChallengeAudienceSelectorProps {
  challenges: ManagedChallenge[];
  onSaveAudience: (challengeId: string, userIds: string[]) => Promise<boolean>;
  savingChallengeId?: string | null;
  saveError?: string | null;
}

const SCOPE_OPTIONS: Array<{ id: ScopeMode; title: string; copy: string }> = [
  { id: 'invite_list', title: 'Invite List', copy: 'Precise campaign roster for a focused challenge.' },
  { id: 'cohort', title: 'Cohort', copy: 'Small-group energy with shared progress rhythm.' },
  { id: 'team_pool', title: 'Team Pool', copy: 'Draft balanced squads before team scoring lands.' },
];

const labelize = (value?: string) => (value ? value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'SwanStudios');

const compactDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const ChallengeAudienceSelector: React.FC<ChallengeAudienceSelectorProps> = ({
  challenges,
  onSaveAudience,
  savingChallengeId = null,
  saveError = null,
}) => {
  const { options, sourceLabel, loading, error, reload } = useChallengeAudienceOptions();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scopeMode, setScopeMode] = useState<ScopeMode>('cohort');
  const [selectedChallengeId, setSelectedChallengeId] = useState('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const draftChallenges = useMemo(() => challenges.filter((challenge) => challenge.status === 'draft'), [challenges]);
  const activeChallengeId = selectedChallengeId || draftChallenges[0]?.id || '';
  const selectedChallenge = draftChallenges.find((challenge) => challenge.id === activeChallengeId) ?? null;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.name.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedVisibleCount = filteredOptions.filter((option) => selectedSet.has(option.id)).length;
  const teamPods = Math.max(0, Math.ceil(selectedIds.length / 4));
  const isSavingTarget = Boolean(selectedChallenge && savingChallengeId === selectedChallenge.id);

  const toggleClient = (clientId: string) => {
    setSaveNotice(null);
    setSelectedIds((current) => (
      current.includes(clientId) ? current.filter((id) => id !== clientId) : [...current, clientId]
    ));
  };

  const selectVisible = () => {
    setSaveNotice(null);
    setSelectedIds((current) => Array.from(new Set([...current, ...filteredOptions.map((option) => option.id)])));
  };

  const clearSelected = () => {
    setSaveNotice(null);
    setSelectedIds([]);
  };

  const saveAudience = async () => {
    if (!selectedChallenge || selectedIds.length === 0 || isSavingTarget) return;
    const saved = await onSaveAudience(selectedChallenge.id, selectedIds);
    if (saved) {
      setSaveNotice(`${selectedIds.length} clients saved to ${selectedChallenge.title}.`);
    }
  };

  const renderClients = () => {
    if (loading && options.length === 0) {
      return <A.EmptyPanel>Loading eligible clients.</A.EmptyPanel>;
    }

    if (error && options.length === 0) {
      return (
        <A.EmptyPanel>
          <span>{error}</span>
        </A.EmptyPanel>
      );
    }

    if (filteredOptions.length === 0) {
      return <A.EmptyPanel>No eligible clients match this audience search.</A.EmptyPanel>;
    }

    return (
      <A.ClientGrid aria-label="Eligible challenge audience clients">
        {filteredOptions.map((option) => {
          const lastWorkout = compactDate(option.lastWorkoutDate);
          const nextSession = compactDate(option.nextSessionDate);
          const detail = [
            labelize(option.source),
            option.membership ? labelize(option.membership) : null,
            typeof option.workouts === 'number' ? `${option.workouts} workouts` : null,
            lastWorkout ? `Last ${lastWorkout}` : null,
            nextSession ? `Next ${nextSession}` : null,
          ].filter(Boolean).join(' | ');

          return (
            <A.ClientOption key={option.id}>
              <A.Checkbox
                type="checkbox"
                checked={selectedSet.has(option.id)}
                onChange={() => toggleClient(option.id)}
                aria-label={`Select ${option.name}`}
              />
              <A.ClientText>
                <A.ClientName>{option.name}</A.ClientName>
                <A.ClientMeta>{detail || 'Client roster record'}</A.ClientMeta>
              </A.ClientText>
            </A.ClientOption>
          );
        })}
      </A.ClientGrid>
    );
  };

  return (
    <A.AudienceShell aria-label="Challenge audience assignment">
      <A.AudienceHeader>
        <A.HeaderText>
          <A.Kicker>Audience Scope</A.Kicker>
          <A.Title>Build the starting cohort</A.Title>
          <A.Copy>
            Pick clients from the real roster source, choose a draft campaign, then save the roster before publish.
          </A.Copy>
        </A.HeaderText>
        <A.StatusPill><UserCheck size={16} />Persistent Draft Audience</A.StatusPill>
      </A.AudienceHeader>

      <A.SummaryGrid aria-label="Audience assignment metrics">
        <A.SummaryTile><span>Source</span><strong>{sourceLabel}</strong></A.SummaryTile>
        <A.SummaryTile><span>Drafts</span><strong>{draftChallenges.length}</strong></A.SummaryTile>
        <A.SummaryTile><span>Selected</span><strong>{selectedIds.length}</strong></A.SummaryTile>
        <A.SummaryTile><span>Team Pods</span><strong>{teamPods}</strong></A.SummaryTile>
      </A.SummaryGrid>

      <A.ScopeGrid aria-label="Audience draft mode">
        {SCOPE_OPTIONS.map((scope) => (
          <A.ScopeButton
            key={scope.id}
            type="button"
            $active={scopeMode === scope.id}
            aria-pressed={scopeMode === scope.id}
            onClick={() => setScopeMode(scope.id)}
          >
            <strong>{scope.title}</strong>
            <span>{scope.copy}</span>
          </A.ScopeButton>
        ))}
      </A.ScopeGrid>

      <A.ControlRow>
        <A.CampaignSelect
          value={activeChallengeId}
          onChange={(event) => {
            setSaveNotice(null);
            setSelectedChallengeId(event.target.value);
          }}
          aria-label="Draft challenge target"
          disabled={draftChallenges.length === 0}
        >
          {draftChallenges.length === 0 ? (
            <option value="">No draft challenges</option>
          ) : draftChallenges.map((challenge) => (
            <option key={challenge.id} value={challenge.id}>{challenge.title}</option>
          ))}
        </A.CampaignSelect>
        <A.SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search eligible clients"
          aria-label="Search eligible clients"
        />
      </A.ControlRow>

      <A.ButtonRow>
        <S.IconButton type="button" onClick={selectVisible} disabled={filteredOptions.length === 0}>
          <Users size={16} />Select Visible
        </S.IconButton>
        <S.IconButton type="button" onClick={clearSelected} disabled={selectedIds.length === 0}>
          <X size={16} />Clear
        </S.IconButton>
        <S.IconButton type="button" onClick={() => void reload()} disabled={loading}>
          <RefreshCw size={16} />Refresh
        </S.IconButton>
        <S.IconButton
          type="button"
          onClick={() => void saveAudience()}
          disabled={!selectedChallenge || selectedIds.length === 0 || isSavingTarget}
        >
          <Save size={16} />{isSavingTarget ? 'Saving' : 'Save Audience'}
        </S.IconButton>
      </A.ButtonRow>

      <A.Copy aria-live="polite">
        {selectedVisibleCount} visible selected in {labelize(scopeMode)} mode.
        {selectedChallenge ? ` Target: ${selectedChallenge.title}.` : ' Create a draft challenge before saving an audience.'}
      </A.Copy>
      {saveNotice ? <A.Copy aria-live="polite">{saveNotice}</A.Copy> : null}
      {saveError ? <A.Copy role="alert">{saveError}</A.Copy> : null}

      {renderClients()}
    </A.AudienceShell>
  );
};

export default ChallengeAudienceSelector;
