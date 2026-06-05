import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx'), 'utf8');
const stripSource = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStatusAssistantStrip.tsx'), 'utf8');

describe('WorkoutPlannerPage returnTo contract', () => {
  it('renders a safe Client Hub return action when opened from Clients & Team', () => {
    expect(source).toContain("useNavigate");
    expect(source).toContain("searchParams.get('returnTo')");
    expect(source).toContain("rawReturnTo.startsWith('/dashboard/')");
    expect(source).toContain("navigate(plannerReturnTo)");
    expect(source).toContain('Back to Client Hub');
  });

  it('offers a contextual return action after successful client-hub saves', () => {
    expect(stripSource).toContain("statusMsg.type === 'success'");
    expect(stripSource).toContain('planner-status-actions');
    expect(stripSource).toContain('Return to Client Hub');
  });

  it('rejects mixed or unsafe clientId query values before selecting a client', () => {
    expect(source).toContain("parseWorkoutPlannerClientId(searchParams.get('clientId'))");
    expect(source).not.toContain('Number.parseInt(rawClientId, 10)');
  });

  it('uses strict client identity helpers after the deep-link parser', () => {
    expect(source).toContain("from './WorkoutPlannerClientIdentity'");
    expect(source).toContain('parseWorkoutPlannerClientId(user?.id)');
    expect(source).toContain('pickWorkoutPlannerClientId(clients, requestedClientId)');
    expect(source).toContain('resolveWorkoutPlannerPlanClientId(plan.userId, selectedClientId)');
    expect(source).toContain('Unable to load generated plan because it is missing a valid client id.');
    expect(source).not.toContain('Number(user?.id) === Number(selectedClientId)');
    expect(source).not.toContain('clients.some(c => Number(c.id) === requestedClientId)');
    expect(source).not.toContain('res.data.clients.some((c: PlannerClient) => Number(c.id) === requestedClientId)');
    expect(source).not.toContain('setSelectedClientId(Number(e.target.value))');
    expect(source).not.toContain('clientId: Number(plan.userId) || (selectedClientId ?? 0)');
    expect(source).not.toContain('selectedClientId ?? 0');
  });
});
