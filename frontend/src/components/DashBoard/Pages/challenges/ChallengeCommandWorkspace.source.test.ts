import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (relativePath: string) => readFileSync(resolve(__dirname, relativePath), 'utf8');

describe('ChallengeCommandWorkspace route and UI contract', () => {
  const workspaceSource = () => read('./ChallengeCommandWorkspace.tsx');
  const stylesSource = () => read('./ChallengeCommandWorkspace.styles.ts');
  const tabsSource = () => read('./ChallengeCommandWorkspace.tabs.tsx');
  const audienceStylesSource = () => read('./ChallengeAudienceSelector.styles.ts');
  const hookSource = () => read('./useChallengeTemplates.ts');
  const managedHookSource = () => read('./useManagedChallenges.ts');
  const resultsHookSource = () => read('./useChallengeResults.ts');
  const audienceHookSource = () => read('./useChallengeAudienceOptions.ts');
  const audienceSelectorSource = () => read('./ChallengeAudienceSelector.tsx');
  const liveListSource = () => read('./ChallengeLiveList.tsx');
  const resultsPanelSource = () => read('./ChallengeResultsPanel.tsx');
  const resultsFunnelSource = () => read('./ChallengeResultsFunnel.tsx');
  const submissionsPanelSource = () => read('./ChallengeSubmissionsPanel.tsx');
  const settingsPanelSource = () => read('./ChallengeSettingsPanel.tsx');
  const draftHookSource = () => read('./useChallengeDraftCreator.ts');
  const draftFormSource = () => read('./challengeDraftForm.ts');
  const draftCreatorSource = () => read('./ChallengeDraftCreator.tsx');
  const draftCreatorModelSource = () => read('./ChallengeDraftCreator.model.ts');
  const templateCardSource = () => read('./ChallengeTemplateCard.tsx');
  const templateRulesSource = () => read('./challengeTemplateRules.ts');

  it('mounts as the first-class admin and trainer challenge workspace', () => {
    const routeComponentsSource = read('../../UniversalDashboardLayout.routeComponents.tsx');
    const routesSource = read('../../UniversalDashboardLayout.routes.tsx');

    expect(routeComponentsSource).toContain(
      "export const ChallengeCommandWorkspace = React.lazy(() => import('./Pages/challenges/ChallengeCommandWorkspace'))"
    );
    expect(routesSource).toContain('ChallengeCommandWorkspace,');
    expect(routesSource.match(/path: '\/challenges', component: ChallengeCommandWorkspace/g)).toHaveLength(2);
    expect(routesSource).toContain("title: 'Challenges'");
  });

  it('uses authenticated backend challenge endpoints as the first live data sources', () => {
    const templateHook = hookSource();
    const managedHook = managedHookSource();
    const resultsHook = resultsHookSource();

    expect(templateHook).toContain('useAuth()');
    expect(templateHook).toContain("authAxios.get('/api/v1/gamification/challenge-templates')");
    expect(templateHook).toContain('ChallengeTemplateCatalogResponse');
    expect(managedHook).toContain("authAxios.get('/api/v1/gamification/challenges/manage'");
    expect(managedHook).toContain("params: { status: 'all', limit: 20, sortBy: 'startDate', sortOrder: 'asc' }");
    expect(managedHook).toContain('ManagedChallengesResponse');
    expect(resultsHook).toContain('useAuth()');
    expect(resultsHook).toContain('authAxios.get(`/api/v1/gamification/challenges/${id}/results`)');
    expect(resultsHook).toContain('ChallengeResultsResponse');
    expect(managedHook).toContain("visibility: ChallengePublishVisibility = 'public'");
    expect(managedHook).toContain("{ action: 'publish', visibility }");
    expect(managedHook).toContain('ManagedChallengeStatusAction');
    expect(managedHook).toContain('updateChallengeStatus');
    expect(managedHook).toContain("authAxios.patch(`/api/v1/gamification/challenges/${id}/status`, { action })");
    expect(liveListSource()).toContain('hasSavedAudience');
    expect(liveListSource()).toContain('Add Audience First');
    expect(liveListSource()).toContain('Save an audience before publishing privately.');
    expect(liveListSource()).toContain('Publish Private');
    expect(liveListSource()).toContain('Schedule Public Campaign');
    expect(liveListSource()).toContain('Schedules public discovery for the selected start date.');
    expect(liveListSource()).toContain('Publish Public Campaign');
    expect(liveListSource()).toContain('Publishes public discovery because the selected start date has already opened.');
    expect(liveListSource()).not.toContain('Publish Public Now');
    expect(liveListSource()).not.toContain('Publishes to public discovery immediately.');
    expect(liveListSource()).toContain('Complete Challenge');
    expect(liveListSource()).toContain('Cancel Challenge');
    expect(liveListSource()).toContain('Archive Challenge');
    expect(liveListSource()).toContain('isStatusUpdateInFlight');
    expect(liveListSource()).toContain('disabled={isStatusUpdateInFlight}');
    expect(liveListSource()).toContain('aria-label={lifecycleLabel(action, false)}');
    expect(managedHook).toContain("authAxios.put(`/api/v1/gamification/challenges/${id}/audience`, { userIds })");
  });

  it('loads audience candidates from existing admin and trainer client sources and persists draft rosters', () => {
    const audienceHook = audienceHookSource();

    expect(audienceHook).toContain("path: '/api/admin/clients'");
    expect(audienceHook).toContain('path: `/api/client-trainer-assignments/trainer/${user.id}`');
    expect(audienceHook).toContain('normalizeClientListResponse');
    expect(audienceHook).toContain('authAxios.get(source.path, source.config)');
    expect(audienceHook).not.toMatch(/authAxios\.(post|put|patch|delete)/);
    expect(audienceSelectorSource()).toContain('Persistent Draft Audience');
    expect(audienceSelectorSource()).toContain('Draft challenge target');
    expect(audienceSelectorSource()).toContain('Save Audience');
  });

  it('posts template-backed drafts through the canonical challenge create route', () => {
    expect(draftHookSource()).toContain("authAxios.post('/api/v1/gamification/challenges', payload)");
    expect(draftFormSource()).toContain("publishState: normalizedPublishMode === 'draft' ? 'draft' : 'active'");
    expect(draftFormSource()).toContain("isPublic: normalizedPublishMode === 'public'");
    expect(draftCreatorSource()).toContain('Publish mode');
    expect(draftCreatorSource()).toContain('Public campaign');
    expect(draftCreatorModelSource()).toContain('Scheduled public campaign');
    expect(draftCreatorModelSource()).not.toContain('Creates an active public campaign immediately.');
    expect(draftFormSource()).not.toContain('challengeType:');
    expect(workspaceSource()).toContain('ChallengeDraftCreator');
    expect(workspaceSource()).toContain('onCreateDraft={setSelectedTemplate}');
    expect(workspaceSource()).toContain('void managedChallenges.reload();');
  });

  it('renders the command-deck tabs and live list without retiring the gamification route', () => {
    const workspace = workspaceSource();
    const tabs = tabsSource();
    const routeSource = read('../../UniversalDashboardLayout.routes.tsx');

    ['Templates', 'Live Challenges', 'Audience', 'Results', 'Submissions', 'Settings'].forEach((label) => {
      expect(tabs).toContain(label);
    });
    expect(workspace).toContain('useChallengeTemplates');
    expect(workspace).toContain('useManagedChallenges');
    expect(workspace).toContain('useChallengeResults');
    expect(workspace).toContain('CHALLENGE_WORKSPACE_TABS');
    expect(workspace).toContain('ChallengeTemplateCard');
    expect(workspace).toContain('ChallengeLiveList');
    expect(workspace).toContain('ChallengeResultsPanel');
    expect(workspace).toContain('ChallengeSubmissionsPanel');
    expect(workspace).toContain('ChallengeSettingsPanel');
    expect(workspace).toContain('ChallengeAudienceSelector');
    expect(workspace).toContain('onSaveAudience={managedChallenges.saveChallengeAudience}');
    expect(resultsPanelSource()).toContain('ChallengeResultsFunnel');
    expect(resultsFunnelSource()).toContain("type !== 'challenge_viewed'");
    expect(resultsFunnelSource()).toContain('Participant Events');
    expect(resultsFunnelSource()).toContain('View-to-Join');
    expect(routeSource).toContain("{ path: '/gamification', component: AdminGamificationView");
  });

  it('keeps workspace support files under the repo line budget', () => {
    ['./ChallengeCommandWorkspace.styles.ts', './ChallengeCommandWorkspace.renderTestHarness.ts', './ChallengeTemplateCard.tsx', './ChallengeDraftCreator.model.ts', './challengeTemplateRules.ts'].forEach((file) => {
      const lineCount = read(file).trimEnd().split(/\r?\n/).length;
      expect(lineCount).toBeLessThanOrEqual(300);
    });
    expect(draftCreatorSource().trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(270);
    expect(workspaceSource().trimEnd().split(/\r?\n/).length).toBeLessThanOrEqual(260);
  });
  it('keeps touch targets, phone layout, and forbidden training copy guarded', () => {
    const styles = stylesSource();
    const audienceStyles = audienceStylesSource();
    const productionSources = [
      workspaceSource(),
      styles,
      tabsSource(),
      audienceStyles,
      hookSource(),
      managedHookSource(),
      resultsHookSource(),
      audienceHookSource(),
      audienceSelectorSource(),
      liveListSource(),
      resultsPanelSource(),
      resultsFunnelSource(),
      submissionsPanelSource(),
      settingsPanelSource(),
      draftHookSource(),
      draftFormSource(),
      templateCardSource(),
      draftCreatorSource(),
      draftCreatorModelSource(),
      templateRulesSource(),
    ];

    expect(styles).toMatch(/min-height:\s*44px/);
    expect(audienceStyles).toMatch(/min-height:\s*44px/);
    expect(submissionsPanelSource()).toContain('Review queue empty by policy');
    expect(settingsPanelSource()).toContain('Client challenge policy');
    expect(settingsPanelSource()).toContain('Private self-challenges');
    expect(settingsPanelSource()).toContain('Auto-publish');
    expect(styles).toContain('@media (max-width: 430px)');
    expect(styles).toContain('repeat(auto-fit, minmax(min(100%, 280px), 1fr))');
    for (const source of productionSources) {
      expect(source).not.toMatch(/\b(yoga|meditation|mindfulness|calories)\b/i);
    }
  });
});

