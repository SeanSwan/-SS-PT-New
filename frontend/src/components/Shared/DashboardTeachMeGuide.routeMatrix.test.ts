import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide route matrix', () => {
  it('switches admin money-path screens away from generic workout logging', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/pending-orders',
    });

    expect(guide.title).toBe('Admin money path');
    expect(guide.primaryAction).toEqual({
      label: 'Review Orders',
      to: '/dashboard/admin/pending-orders',
    });
    expect(guide.fastPath).toEqual([
      expect.stringMatching(/Open paid and pending orders/i),
      expect.stringMatching(/Confirm sessions, tax, and fulfillment/i),
      expect.stringMatching(/Resolve the exception/i),
    ]);
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Orders', to: '/dashboard/admin/pending-orders' }),
      expect.objectContaining({ label: 'Packages', to: '/dashboard/admin/admin-packages' }),
      expect.objectContaining({ label: 'Revenue', to: '/dashboard/admin/revenue' }),
    ]));
    expect(guide.primaryAction.label).not.toMatch(/workout/i);
  });

  it('teaches admin growth, care, and trust routes as their own operating jobs', () => {
    const growth = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/marketing',
    });

    expect(growth.title).toBe('Admin growth loop');
    expect(growth.primaryAction).toEqual({
      label: 'Open Marketing',
      to: '/dashboard/admin/marketing',
    });
    expect(growth.fastPath.join(' ')).toMatch(/lead/i);
    expect(growth.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Content Studio', to: '/dashboard/admin/content' }),
      expect.objectContaining({ label: 'Orders', to: '/dashboard/admin/pending-orders' }),
      expect.objectContaining({ label: 'Client Onboarding', to: '/dashboard/admin/client-onboarding' }),
    ]));

    const care = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/body-map',
    });

    expect(care.title).toBe('Admin client care loop');
    expect(care.primaryAction).toEqual({
      label: 'Open Pain Chart',
      to: '/dashboard/admin/body-map',
    });
    expect(care.fastPath.join(' ')).toMatch(/pain|nutrition|message/i);

    const trust = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/security',
    });

    expect(trust.title).toBe('Admin trust and access');
    expect(trust.primaryAction).toEqual({
      label: 'Review Security',
      to: '/dashboard/admin/security',
    });
    expect(trust.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Feature Access', to: '/dashboard/admin/feature-access' }),
      expect.objectContaining({ label: 'Waivers', to: '/dashboard/admin/waivers' }),
      expect.objectContaining({ label: 'SMS Logs', to: '/dashboard/admin/sms-logs' }),
    ]));
  });

  it('teaches admin self-workout, client logging, and client progress routes as distinct jobs', () => {
    const selfLog = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/log-my-workout',
    });

    expect(selfLog.primaryAction).toEqual({
      label: 'Log My Workout',
      to: '/dashboard/admin/log-my-workout?loadPlan=today',
    });
    expect(selfLog.primaryPrompt).toContain('self workout logging');
    expect(selfLog.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'My Workout', to: '/dashboard/admin/log-my-workout?loadPlan=today' }),
      expect.objectContaining({ label: 'Ask Coach', to: '/dashboard/admin/coach-assistant' }),
    ]));

    const clientLog = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/log-workout',
    });

    expect(clientLog.primaryAction).toEqual({
      label: 'Pick Client to Log',
      to: '/dashboard/admin/client-management?intent=log_workout',
    });
    expect(clientLog.primaryPrompt).toContain('client workout logging');
    expect(clientLog.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'Pick Client to Log',
        to: '/dashboard/admin/client-management?intent=log_workout',
      }),
    ]));

    const progress = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/client-progress-tracking',
    });

    expect(progress.primaryAction).toEqual({
      label: 'Review Client Progress',
      to: '/dashboard/admin/client-progress-tracking',
    });
    expect(progress.primaryPrompt).toContain('client progress');
  });

  it('teaches trainer progress and logging screens with their own first click', () => {
    expect(getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/client-progress',
    }).primaryAction).toEqual({
      label: 'Review Client Progress',
      to: '/dashboard/trainer/client-progress',
    });

    expect(getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/log-workout',
    }).primaryAction).toEqual({
      label: 'Log Client Workout',
      to: '/dashboard/trainer/clients?intent=log_workout',
    });

    expect(getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/client-progress',
    }).actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' }),
    ]));
  });

  it('teaches trainer client, builder, assessment, and broadcast routes with route-specific first clicks', () => {
    expect(getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/clients',
    }).primaryAction).toEqual({
      label: 'Open My Clients',
      to: '/dashboard/trainer/clients',
    });

    // Workout-OS C7 (2026-07-29): /build-plan redirects into the planner,
    // so its teach-me first click is the Workout Planner.
    expect(getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/build-plan',
    }).primaryAction).toEqual({
      label: 'Open Workout Planner',
      to: '/dashboard/trainer/workout-planner',
    });

    expect(getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/assessments',
    }).primaryAction).toEqual({
      label: 'Open Assessments',
      to: '/dashboard/trainer/assessments',
    });

    expect(getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/live',
    }).primaryAction).toEqual({
      label: 'Open Live Streams',
      to: '/dashboard/trainer/live',
    });
  });

  it('teaches trainer nutrition and client workout logging with direct first clicks', () => {
    const trainerNutrition = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/meal-planner',
    });

    expect(trainerNutrition.primaryAction).toEqual({
      label: 'Open Nutrition',
      to: '/dashboard/trainer/meal-planner',
    });
    expect(trainerNutrition.primaryPrompt).toContain('nutrition');

    const clientLog = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/log-workout',
    });

    expect(clientLog.primaryAction).toEqual({
      label: "Log Today's Workout",
      to: '/dashboard/client/log-workout?loadPlan=today',
    });
    expect(clientLog.primaryPrompt).toContain('workout logging');
  });

  it('teaches client booking, progress, and social routes as distinct jobs', () => {
    expect(getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/schedule',
    }).primaryAction).toEqual({
      label: 'Book My Session',
      to: '/dashboard/client/schedule',
    });

    const onboarding = getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/onboarding',
    });
    expect(onboarding.primaryAction).toEqual({
      label: 'Finish Onboarding',
      to: '/dashboard/client/onboarding',
    });
    expect(onboarding.primaryPrompt).toContain('client onboarding');

    expect(getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/progress/detailed',
    }).primaryAction).toEqual({
      label: 'Review Progress',
      to: '/dashboard/client/progress',
    });

    expect(getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/rewards',
    }).primaryAction).toEqual({
      label: 'Open Rewards',
      to: '/dashboard/client/rewards',
    });

    expect(getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/live',
    }).primaryAction).toEqual({
      label: 'Open Live Streams',
      to: '/dashboard/client/live',
    });
  });

  it('teaches client community, message, nutrition, and safety routes without losing the training loop', () => {
    expect(getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/community',
    }).primaryAction).toEqual({
      label: 'Open Community',
      to: '/dashboard/client/community',
    });

    expect(getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/messages',
    }).primaryAction).toEqual({
      label: 'Message Coach',
      to: '/dashboard/client/messages',
    });

    expect(getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/meal-planner',
    }).primaryAction).toEqual({
      label: 'Open Nutrition',
      to: '/dashboard/client/meal-planner',
    });

    expect(getDashboardTeachMeGuide({
      role: 'client',
      pathname: '/dashboard/client/body-map',
    }).focus).toMatch(/pain|injury/i);
  });

});
