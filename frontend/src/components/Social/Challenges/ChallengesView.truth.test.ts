import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viewSource = readFileSync(resolve(__dirname, './ChallengesView.tsx'), 'utf8');
const cardsSource = readFileSync(resolve(__dirname, './ChallengesView.cards.tsx'), 'utf8');
const momentumSource = readFileSync(resolve(__dirname, './ChallengesView.momentum.tsx'), 'utf8');
const statusPanelSource = readFileSync(resolve(__dirname, './ChallengesView.statusPanels.tsx'), 'utf8');
const logicSource = readFileSync(resolve(__dirname, './ChallengesView.logic.ts'), 'utf8');
const constantsSource = readFileSync(resolve(__dirname, './ChallengesView.constants.ts'), 'utf8');
const hookSource = readFileSync(resolve(__dirname, '../../../hooks/useChallenges.ts'), 'utf8');
const normalizationSource = readFileSync(resolve(__dirname, '../../../hooks/useChallenges.normalization.ts'), 'utf8');

describe('ChallengesView truth contract', () => {
  it('does not enable fake challenge cards when the live challenges API is unavailable', () => {
    expect(hookSource).toContain('setChallenges([])');
    expect(hookSource).not.toContain('setIsDemoData(true)');
    expect(hookSource).toContain('CHALLENGE_LIST_UNAVAILABLE_MESSAGE');
    expect(hookSource).toContain('setError(CHALLENGE_LIST_UNAVAILABLE_MESSAGE)');
    expect(viewSource).toContain('ChallengeUnavailableState');
    expect(viewSource).toContain('error ? (');
    expect(viewSource).toContain('void refetch();');
    expect(statusPanelSource).toContain('role="alert"');
    expect(statusPanelSource).toContain('Challenges unavailable');
    expect(statusPanelSource).toContain('Retry');
    expect(viewSource).toContain('API outage retry state from the honest no-challenges empty state');
    expect(viewSource).not.toContain('RETIRED_CHALLENGE_FIXTURE');
    expect(viewSource).not.toContain('const displayData =');
    expect(viewSource).not.toContain('DemoBanner');
    expect(viewSource).toContain('const filtered = filterChallenges(challenges, activeTab, selectedCategory);');
    expect(viewSource).toContain('const sortedChallenges = sortChallengesForUser(filtered);');
    expect(viewSource).toContain('challenges={sortedChallenges}');
    expect(viewSource).not.toContain('Use API data when available, mock data as fallback');
    expect(hookSource).toContain('normalizeChallengeRecords(apiChallenges, participations)');
  });

  it('keeps the live challenges component compact and free of legacy inline color styling', () => {
    expect(viewSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(viewSource).not.toMatch(/rgba\(|#[0-9a-f]{3,8}/i);
  });

  it('renders real user progress details and workout impact instead of a dead progress button', () => {
    expect(cardsSource).toContain('role="progressbar"');
    expect(cardsSource).toContain('challenge.progressLabel');
    expect(cardsSource).toContain('ChallengeMomentum');
    expect(momentumSource).toContain('formatChallengeWorkoutImpact');
    expect(momentumSource).toContain('formatChallengeJoinImpact');
    expect(logicSource).toContain('Last workout:');
    expect(momentumSource).toContain('Next:');
    expect(cardsSource).toContain('Progress synced');
    expect(cardsSource).toContain('formatChallengeCompletionDate');
    expect(cardsSource).toContain('`Earned ${challenge.reward}`');
    expect(logicSource).toContain('formatChallengeCompletionDate');
    expect(logicSource).toContain("timeZone: 'UTC'");
    expect(cardsSource).toContain('onShareCompleted');
    expect(cardsSource).toContain('Share to Feed');
    expect(viewSource).toContain('shareCompletedChallengeToFeed');
    expect(cardsSource).not.toContain('View Progress');
  });

  it('keeps challenge joining feedback explicit and non-silent', () => {
    expect(viewSource).toContain('joiningChallengeId');
    expect(viewSource).toContain('handleJoinChallenge');
    expect(viewSource).toContain('Challenge joined');
    expect(viewSource).toContain('Unable to join challenge');
    expect(cardsSource).toContain('joiningChallengeId');
    expect(cardsSource).toContain('Joining...');
    expect(hookSource).toContain('Promise<boolean>');
    expect(hookSource).toContain('return true');
    expect(hookSource).toContain('return false');
  });

  it('keeps challenge leaving feedback guarded and non-silent', () => {
    expect(viewSource).toContain('leavingChallengeId');
    expect(viewSource).toContain('handleRequestLeaveChallenge');
    expect(viewSource).toContain('ConfirmActionDialog');
    expect(viewSource).toContain('Leave challenge?');
    expect(viewSource).toContain('Keep challenge');
    expect(viewSource).not.toContain('window.confirm');
    expect(viewSource).toContain('Challenge left');
    expect(viewSource).toContain('Unable to leave challenge');
    expect(cardsSource).toContain('leavingChallengeId');
    expect(cardsSource).toContain('Leave Challenge');
    expect(cardsSource).toContain('Leaving...');
    expect(hookSource).toContain('leaveChallenge: (id: string) => Promise<boolean>');
    expect(hookSource).toContain('return true');
    expect(hookSource).toContain('return false');
  });

  it('keeps nutrition challenges distinct from cardio in filters and hook mapping', () => {
    expect(normalizationSource).toContain("nutrition: 'nutrition'");
    expect(normalizationSource).not.toContain("nutrition: 'cardio'");
    expect(normalizationSource).toContain("mindfulness: 'consistency'");
    expect(constantsSource).toContain("nutrition: 'var(--challenge-nutrition");
    expect(constantsSource).toContain('nutrition: Utensils');
    expect(constantsSource).toContain("{ key: 'nutrition', label: 'Nutrition' }");
  });
});
