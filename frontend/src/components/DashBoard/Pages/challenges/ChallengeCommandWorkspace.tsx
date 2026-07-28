/**
 * Challenge Command Workspace.
 *
 * First-class Admin/Trainer surface for challenge operations. This slice shows
 * the governed template catalog from the backend and reserves the same command
 * deck for live campaigns, results, submissions, and policy controls.
 */

import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import ChallengeAudienceSelector from './ChallengeAudienceSelector';
import ChallengeDraftCreator from './ChallengeDraftCreator';
import ChallengeLiveList from './ChallengeLiveList';
import ChallengeResultsPanel from './ChallengeResultsPanel';
import ChallengeSettingsPanel from './ChallengeSettingsPanel';
import ChallengeSubmissionsPanel from './ChallengeSubmissionsPanel';
import ChallengeTemplateCard from './ChallengeTemplateCard';
import ChallengeWorkspaceNextAction from './ChallengeWorkspaceNextAction';
import { useChallengeResults } from './useChallengeResults';
import { useManagedChallenges } from './useManagedChallenges';
import { useChallengeSubmissions } from './useChallengeSubmissions';
import { type ChallengeTemplate, useChallengeTemplates } from './useChallengeTemplates';
import * as S from './ChallengeCommandWorkspace.styles';
import {
  CHALLENGE_WORKSPACE_PANEL_ID,
  CHALLENGE_WORKSPACE_TABS,
  getChallengeWorkspaceTabId,
  type ChallengeWorkspaceTab,
} from './ChallengeCommandWorkspace.tabs';

const labelize = (value: string) => value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const governanceLabel = (value?: string) => {
  if (!value) return 'Policy pending';
  if (value === 'disabled_by_default') return 'Off until entitlement';
  return labelize(value);
};

const StatusPanel: React.FC<{ title: string; copy: string; action?: React.ReactNode }> = ({ title, copy, action }) => (
  <S.StatusPanel>
    <S.StatusStack>
      <S.StatusTitle>{title}</S.StatusTitle>
      <S.StatusCopy>{copy}</S.StatusCopy>
      {action}
    </S.StatusStack>
  </S.StatusPanel>
);

const focusChallengeWorkspacePanel = () => {
  const focusPanel = () => document.getElementById(CHALLENGE_WORKSPACE_PANEL_ID)?.focus();
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(focusPanel);
    return;
  }
  window.setTimeout(focusPanel, 0);
};

const ChallengeCommandWorkspace: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ChallengeWorkspaceTab>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<ChallengeTemplate | null>(null);
  const { templates, archetypes, governance, loading: templatesLoading, error: templateError, reload: reloadTemplates } = useChallengeTemplates();
  const managedChallenges = useManagedChallenges();
  const challengeResults = useChallengeResults(managedChallenges.challenges);
  const challengeSubmissions = useChallengeSubmissions();

  const refreshWorkspace = () => {
    void reloadTemplates();
    void managedChallenges.reload();
    void challengeResults.reload();
    void challengeSubmissions.reload();
  };
  const activateWorkspaceTab = (tabId: ChallengeWorkspaceTab) => {
    setActiveTab(tabId);
    document.getElementById(getChallengeWorkspaceTabId(tabId))?.focus();
  };
  const activateWorkspacePanel = (tabId: ChallengeWorkspaceTab) => {
    setActiveTab(tabId);
    focusChallengeWorkspacePanel();
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tabId: ChallengeWorkspaceTab) => {
    const currentIndex = CHALLENGE_WORKSPACE_TABS.findIndex((tab) => tab.id === tabId);
    if (currentIndex === -1) return;

    const lastIndex = CHALLENGE_WORKSPACE_TABS.length - 1;
    const nextIndexByKey: Record<string, number> = {
      ArrowRight: currentIndex === lastIndex ? 0 : currentIndex + 1,
      ArrowDown: currentIndex === lastIndex ? 0 : currentIndex + 1,
      ArrowLeft: currentIndex === 0 ? lastIndex : currentIndex - 1,
      ArrowUp: currentIndex === 0 ? lastIndex : currentIndex - 1,
      Home: 0,
      End: lastIndex,
    };
    const nextIndex = nextIndexByKey[event.key];

    if (typeof nextIndex !== 'number') return;
    event.preventDefault();
    activateWorkspaceTab(CHALLENGE_WORKSPACE_TABS[nextIndex].id);
  };

  const stats = useMemo(() => ([
    { label: 'Templates', value: String(templates.length) },
    { label: 'Archetypes', value: String(archetypes.length) },
    { label: 'Creators', value: governance?.creatorRoles.map(labelize).join(' + ') ?? 'Admin + Trainer' },
    { label: 'Client Creation', value: governanceLabel(governance?.clientCreation) },
  ]), [archetypes.length, governance, templates.length]);

  const renderTemplates = () => {
    if (templatesLoading && templates.length === 0) {
      return <StatusPanel title="Loading challenge templates" copy="The command deck is syncing the governed template catalog." />;
    }

    if (templateError && templates.length === 0) {
      return (
        <StatusPanel
          title="Challenge templates unavailable"
          copy={templateError}
          action={<S.IconButton type="button" onClick={() => void reloadTemplates()}><RefreshCw size={16} />Retry</S.IconButton>}
        />
      );
    }

    if (templates.length === 0) {
      return <StatusPanel title="No templates published" copy="The challenge catalog is empty." />;
    }

    return (
      <>
        {selectedTemplate ? (
          <ChallengeDraftCreator
            template={selectedTemplate}
            onCancel={() => setSelectedTemplate(null)}
            onCreated={() => {
              void managedChallenges.reload();
              void challengeSubmissions.reload();
            }}
          />
        ) : null}
        <S.TemplateGrid>
          {templates.map((template) => (
            <ChallengeTemplateCard key={template.id} template={template} onCreateDraft={setSelectedTemplate} />
          ))}
        </S.TemplateGrid>
      </>
    );
  };

  const renderActivePanel = () => {
    if (activeTab === 'templates') return renderTemplates();
    if (activeTab === 'settings') return <ChallengeSettingsPanel governance={governance} />;
    if (activeTab === 'audience') {
      return (
        <ChallengeAudienceSelector
          challenges={managedChallenges.challenges}
          onSaveAudience={managedChallenges.saveChallengeAudience}
          savingChallengeId={managedChallenges.audienceUpdatingId}
          saveError={managedChallenges.error}
        />
      );
    }
    if (activeTab === 'live') {
      return <ChallengeLiveList {...managedChallenges} />;
    }
    if (activeTab === 'results') {
      return <ChallengeResultsPanel {...managedChallenges} resultState={challengeResults} />;
    }
    if (activeTab === 'submissions') {
      return <ChallengeSubmissionsPanel governance={governance} queue={challengeSubmissions} onDraftApproved={managedChallenges.reload} />;
    }
    return null;
  };

  return (
    <S.PageShell aria-labelledby="challenge-command-title">
      <S.HeroBand>
        <S.HeroContent>
          <S.HeroKicker>Challenge Operations</S.HeroKicker>
          <S.HeroTitle id="challenge-command-title">Challenge Command Deck</S.HeroTitle>
          <S.HeroCopy>
            Build workout-first challenge campaigns from governed templates, keep trainer scope clear,
            and prepare results around real session progress.
          </S.HeroCopy>
        </S.HeroContent>
        <S.HeroActions>
          <S.IconButton type="button" onClick={refreshWorkspace} disabled={templatesLoading || managedChallenges.loading || challengeSubmissions.loading} aria-label="Refresh challenge workspace">
            <RefreshCw size={16} />
            Refresh
          </S.IconButton>
        </S.HeroActions>
      </S.HeroBand>

      <S.StatsGrid aria-label="Challenge command metrics">
        {stats.map((item) => (
          <S.StatTile key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </S.StatTile>
        ))}
      </S.StatsGrid>

      <ChallengeWorkspaceNextAction
        templateCount={templates.length}
        templatesLoading={templatesLoading}
        challenges={managedChallenges.challenges}
        submissionCount={challengeSubmissions.submissions.length}
        submissionsLoading={challengeSubmissions.loading}
        onNavigate={activateWorkspacePanel}
      />
      <S.TabBar role="tablist" aria-label="Challenge workspace sections">
        {CHALLENGE_WORKSPACE_TABS.map((tab) => (
          <S.TabButton
            key={tab.id}
            id={getChallengeWorkspaceTabId(tab.id)}
            type="button"
            role="tab"
            tabIndex={activeTab === tab.id ? 0 : -1}
            aria-selected={activeTab === tab.id}
            aria-controls={CHALLENGE_WORKSPACE_PANEL_ID}
            $active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
          >
            {tab.icon}
            {tab.label}
          </S.TabButton>
        ))}
      </S.TabBar>

      <S.ContentPanel
        id={CHALLENGE_WORKSPACE_PANEL_ID}
        role="tabpanel"
        tabIndex={-1}
        aria-labelledby={getChallengeWorkspaceTabId(activeTab)}
      >
        {renderActivePanel()}
      </S.ContentPanel>
    </S.PageShell>
  );
};

export default ChallengeCommandWorkspace;
