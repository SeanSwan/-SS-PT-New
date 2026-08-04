import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/plannerContexts/useWorkoutPlannerOrchestration.ts'), 'utf8');
const stripSource = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerStatusAssistantStrip.tsx'), 'utf8');
readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerCommandPanel.tsx'), 'utf8');
const commandPanelSectionsSource = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerCommandPanel.sections.tsx'), 'utf8');
const clientStateHookSource = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerClientState.ts'), 'utf8');
const pageActionsHookSource = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerPageActions.ts'), 'utf8');
const loadPlanHookSource = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerLoadPlanActions.ts'), 'utf8');
const loadPlanHydrationSource = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerLoadPlanHydration.ts'), 'utf8');
const layoutSource = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPageLayout.tsx'), 'utf8');
const returnToSource = readFileSync(resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-workout-planner/workoutPlannerReturnTo.ts'), 'utf8');

describe('WorkoutPlannerPage returnTo contract', () => {
  it('renders a role-scoped safe Client Hub return action when opened from Clients & Team', () => {
    expect(source).toContain("useNavigate");
    expect(source).toContain("from '../workoutPlannerReturnTo'");
    expect(source).toContain("resolveWorkoutPlannerReturnTo(searchParams.get('returnTo'), user?.role)");
    expect(returnToSource).toContain("if (normalizedRole === 'admin') return '/dashboard/admin/';");
    expect(returnToSource).toContain("if (normalizedRole === 'trainer') return '/dashboard/trainer/';");
    expect(returnToSource).toContain('UNSAFE_RETURN_TO_PATTERN');
    expect(pageActionsHookSource).toContain('navigate(plannerReturnTo)');
    expect(commandPanelSectionsSource).toContain("workoutPlannerReturnLabel(plannerReturnTo, 'back')");
    expect(returnToSource).toContain('Client Hub');
  });
  it('offers a contextual return action after successful client-hub saves', () => {
    expect(stripSource).toContain("statusMsg.type === 'success'");
    expect(stripSource).toContain('planner-status-actions');
    expect(stripSource).toContain('workoutPlannerReturnLabel(plannerReturnTo)');
    expect(returnToSource).toContain('Client Hub');
    expect(stripSource).toContain('activePlanLoggerRoute');
    expect(stripSource).toContain('Log Current Plan');
  });

  it('passes generated plans into the logger handoff route builder', () => {
    expect(layoutSource).toMatch(/buildWorkoutPlannerLoggerRoute\(\{[\s\S]*selectedClientId,[\s\S]*generatedPlan,[\s\S]*\}\)/);
    expect(layoutSource).toMatch(/<WorkoutPlannerStatusAssistantStrip[\s\S]*activePlanLoggerRoute=\{activePlanLoggerRoute\}/);
    expect(layoutSource).toContain('[generatedPlan, location.pathname, location.search, selectedClientId]');
  });

  it('rejects mixed or unsafe clientId query values before selecting a client', () => {
    expect(source).toContain("parseWorkoutPlannerClientId(searchParams.get('clientId'))");
    expect(source).not.toContain('Number.parseInt(rawClientId, 10)');
  });

  it('uses strict client identity helpers after the deep-link parser', () => {
    expect(source).toContain("from '../WorkoutPlannerClientIdentity'");
    expect(clientStateHookSource).toContain('parseWorkoutPlannerClientId(user?.id)');
    expect(clientStateHookSource).toContain('pickWorkoutPlannerClientId(clients, requestedOrSelfClientId)');
    expect(loadPlanHydrationSource).toContain('resolveWorkoutPlannerPlanClientId(plan.userId, selectedClientId)');
    expect(loadPlanHookSource).toContain('Unable to load generated plan because it is missing a valid client id.');
    expect(source).not.toContain('Number(user?.id) === Number(selectedClientId)');
    expect(clientStateHookSource).not.toContain('Number(user?.id) === Number(selectedClientId)');
    expect(source).not.toContain('clients.some(c => Number(c.id) === requestedClientId)');
    expect(source).not.toContain('res.data.clients.some((c: PlannerClient) => Number(c.id) === requestedClientId)');
    expect(source).not.toContain('setSelectedClientId(Number(e.target.value))');
    expect(loadPlanHookSource).not.toContain('clientId: Number(plan.userId) || (selectedClientId ?? 0)');
    expect(loadPlanHookSource).not.toContain('selectedClientId ?? 0');
  });
});
