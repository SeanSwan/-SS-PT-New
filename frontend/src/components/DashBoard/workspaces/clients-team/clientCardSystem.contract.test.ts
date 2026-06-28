import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const repoRoot = resolve(process.cwd(), '..');
const readRepoFile = (path: string) => readFileSync(resolve(repoRoot, path), 'utf8');

const adminCardStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/ClientHubGridCard.styles.ts'
);
const adminCardActions = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/ClientHubGridCardActions.tsx'
);
const trainerCardStyles = readRepoFile(
  'frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.cardStyles.ts'
);
const trainerLayoutStyles = readRepoFile(
  'frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.layoutStyles.ts'
);
const trainerCard = readRepoFile(
  'frontend/src/components/TrainerDashboard/ClientManagement/MyClientsView.clientCard.tsx'
);
const savedPlanCardStyles = readRepoFile(
  'frontend/src/components/DashBoard/Pages/admin-workout-planner/SavedPlanCard.styles.ts'
);
const biometricsStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/tabs/BiometricsTabContent.styles.ts'
);
const romStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/tabs/ROMAssessment.styles.ts'
);
const workoutPlanStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/tabs/ClientWorkoutPlansPanel.styles.ts'
);
const overviewStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/tabs/OverviewTabContent.styles.ts'
);
const commandBarStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/ClientTrainingCommandBar.styles.ts'
);
const trainingTabStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/tabs/TrainingTabContent.styles.ts'
);
const workoutHistoryStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/tabs/WorkoutHistoryTimeline.styles.ts'
);
const settingsStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/tabs/SettingsTabContent.styles.ts'
);
const adminProgressStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/tabs/AdminProgressChartsGrid.styles.ts'
);
const exerciseMegaStatsStyles = readRepoFile(
  'frontend/src/components/DashBoard/progress/ClientExerciseMegaStats.styles.ts'
);
const dailyActionStrip = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/ClientDailyActionStrip.tsx'
);
const clientHeaderCard = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/ClientHeaderCard.tsx'
);
const selectorStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/ClientSelectorDropdown.styles.ts'
);
const detailIdentityStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/MasterDetailIdentityStyles.ts'
);
const activationQueueStyles = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/ClientActivationQueuePanel.styles.ts'
);
const creationHandoffPanel = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/ClientCreationHandoffPanel.tsx'
);
const cardSystem = readRepoFile(
  'frontend/src/components/DashBoard/workspaces/clients-team/clientCardSystem.ts'
);
const agentsDoc = readRepoFile('AGENTS.md');
const claudeDoc = readRepoFile('CLAUDE.md');

describe('Swan client card system contract', () => {
  it('uses the same lightweight card and button primitives for admin and trainer client cards', () => {
    expect(adminCardStyles).toContain('swanDataCardShell');
    expect(adminCardStyles).toContain('overflow-wrap: anywhere');
    expect(adminCardStyles).not.toContain('white-space: nowrap');
    expect(adminCardStyles).not.toContain('text-overflow: ellipsis');
    expect(adminCardActions).toContain('swanClientActionButton');
    expect(trainerCardStyles).toContain('swanDataCardShell');
    expect(trainerCardStyles).toContain('swanClientActionButton');
    expect(trainerCardStyles).toContain('overflow-wrap: anywhere');
    expect(trainerCardStyles).toContain('mask-image');
    expect(trainerCardStyles).not.toContain('text-overflow: ellipsis');
    expect(trainerLayoutStyles).not.toContain('white-space: nowrap');
  });

  it('uses the same Swan primitives for active client data cards', () => {
    expect(savedPlanCardStyles).toContain('swanDataCardShell');
    expect(savedPlanCardStyles).toContain('swanClientActionButton');
    expect(biometricsStyles).toContain('swanDataCardShell');
    expect(biometricsStyles).toContain('swanClientActionButton');
    expect(romStyles).toContain('swanDataCardShell');
    expect(romStyles).toContain('swanClientActionButton');
    expect(romStyles).toContain('min-height: 44px');
    expect(workoutPlanStyles).toContain('swanDataCardShell');
    expect(workoutPlanStyles).toContain('swanClientActionButton');
    expect(workoutPlanStyles).toContain('swanPill');
    expect(workoutPlanStyles).toContain('minmax(min(100%, 220px), 1fr)');
    expect(overviewStyles).toContain('swanDataCardShell');
    expect(overviewStyles).toContain('swanMetricTile');
    expect(overviewStyles).toContain('minmax(0, 1fr)');
    expect(overviewStyles).toContain('overflow-wrap: anywhere');
    expect(commandBarStyles).toContain('swanDataCardShell');
    expect(commandBarStyles).toContain('swanClientActionButton');
    expect(commandBarStyles).toContain('swanPill');
    expect(commandBarStyles).toContain('box-sizing: border-box');
    expect(commandBarStyles).not.toContain('white-space: nowrap');
    expect(trainingTabStyles).toContain('swanDataCardShell');
    expect(trainingTabStyles).toContain('swanClientActionButton');
    expect(trainingTabStyles).not.toContain('white-space: nowrap');
    expect(workoutHistoryStyles).toContain('swanDataCardShell');
    expect(workoutHistoryStyles).toContain('swanClientActionButton');
    expect(workoutHistoryStyles).toContain('swanPill');
    expect(workoutHistoryStyles).not.toContain('white-space: nowrap');
    expect(settingsStyles).toContain('swanDataCardShell');
    expect(settingsStyles).toContain('swanMetricTile');
    expect(settingsStyles).toContain('minmax(0, 1fr)');
    expect(adminProgressStyles).toContain('swanDataCardShell');
    expect(adminProgressStyles).toContain('swanPill');
    expect(adminProgressStyles).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(adminProgressStyles).toContain('letter-spacing: 0');
    expect(adminProgressStyles).toContain('overflow-wrap: anywhere');
    expect(adminProgressStyles).not.toContain('white-space: nowrap');
    expect(exerciseMegaStatsStyles).toContain('swanDataCardShell');
    expect(exerciseMegaStatsStyles).toContain('swanMetricTile');
    expect(exerciseMegaStatsStyles).toContain('swanPill');
    expect(exerciseMegaStatsStyles).not.toContain('white-space: nowrap');
    expect(exerciseMegaStatsStyles).not.toContain('text-overflow: ellipsis');
    expect(dailyActionStrip).toContain('swanDataCardShell');
    expect(dailyActionStrip).toContain('swanClientActionButton');
    expect(dailyActionStrip).toContain('swanPill');
    expect(clientHeaderCard).toContain('swanDataCardShell');
    expect(clientHeaderCard).toContain('swanClientAvatar');
    expect(clientHeaderCard).toContain('swanPill');
    expect(selectorStyles).toContain('swanClientActionButton');
    expect(selectorStyles).toContain('swanDataCardShell');
    expect(selectorStyles).toContain('swanPill');
    expect(selectorStyles).not.toContain('white-space: nowrap');
    expect(selectorStyles).not.toContain('text-overflow: ellipsis');
    expect(detailIdentityStyles).toContain('mask-image');
    expect(detailIdentityStyles).not.toContain('text-overflow: ellipsis');
    expect(activationQueueStyles).toContain('swanDataCardShell');
    expect(activationQueueStyles).toContain('swanClientActionButton');
    expect(activationQueueStyles).toContain('swanPill');
    expect(activationQueueStyles).toContain('minmax(min(100%, 260px), 1fr)');
    expect(creationHandoffPanel).toContain('swanDataCardShell');
    expect(creationHandoffPanel).toContain('swanClientActionButton');
    expect(creationHandoffPanel).toContain('swanPill');
  });

  it('keeps trainer client cards low-motion instead of using hover/tap animation props', () => {
    expect(trainerCard).not.toContain('whileHover');
    expect(trainerCard).not.toContain('whileTap');
  });


  it('maps shared card chrome to emitted theme aliases instead of missing blue fallbacks', () => {
    expect(cardSystem).toContain('var(--bg-card, var(--surface-secondary, #141419))');
    expect(cardSystem).toContain('var(--surface-primary, #002060)');
    expect(cardSystem).toContain('var(--button-primary-text, #FFFFFF)');
    expect(cardSystem).not.toContain('var(--surface-accent, #003080)');
    expect(cardSystem).not.toContain('var(--button-text, #FFFFFF)');
  });
  it('keeps mobile client-card scroll targets below dashboard fixed controls', () => {
    expect(cardSystem).toContain('scroll-margin-block: var(--swan-card-scroll-margin-top, 148px) 24px');
    expect(cardSystem).toContain('--swan-card-scroll-margin-top: 152px');
  });

  it('codifies the attached store-card visual standard in both project instruction files', () => {
    expect(agentsDoc).toContain('Swan Card/Button Standard');
    expect(claudeDoc).toContain('Swan Card/Button Standard');
    expect(agentsDoc).toContain('store/showcase cards may use the full animated SheenCard/GlowButton treatment');
    expect(claudeDoc).toContain('store/showcase cards may use the full animated SheenCard/GlowButton treatment');
  });
});
