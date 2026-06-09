import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PLAN_HORIZONS } from '../services/clientTrainingPlanHorizonService.mjs';
import { buildClientTrainingOverview } from '../services/clientTrainingReadModelService.mjs';

const lineCount = (source) => source.split(/\r?\n/).length;
const readModelSource = () => readFileSync(
  resolve(import.meta.dirname, '../services/clientTrainingReadModelService.mjs'),
  'utf8',
);

const sixMonthPlan = {
  id: 'plan-6m',
  title: 'Six Month Foundation',
  status: 'active',
  durationWeeks: 26,
  currentWeek: 4,
  currentDay: 2,
  createdBy: 'trainer',
  metadata: { planHorizon: 'six_month' },
};

describe('clientTrainingReadModelService', () => {
  it('keeps the shared training read model under the 300-line extraction cap', () => {
    expect(lineCount(readModelSource())).toBeLessThanOrEqual(300);
  });

  it('defines the seven SwanStudios plan horizons with six months as the default arc', () => {
    expect(PLAN_HORIZONS.map((slot) => slot.key)).toEqual([
      'one_day',
      'one_week',
      'one_month',
      'three_month',
      'six_month',
      'nine_month',
      'twelve_month',
    ]);
    expect(PLAN_HORIZONS.find((slot) => slot.key === 'six_month')).toMatchObject({
      label: '6 Month',
      durationWeeks: 26,
      isDefault: true,
    });
  });

  it('builds a seven-slot catalog and marks the active plan as primary', () => {
    const catalog = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [
        { id: 'plan-1m', title: 'One Month Reset', status: 'paused', durationWeeks: 4 },
        sixMonthPlan,
      ],
    }).trainingPlanCatalog;

    expect(catalog.slots).toHaveLength(7);
    expect(catalog.defaultHorizonKey).toBe('six_month');
    expect(catalog.primaryPlanId).toBe('plan-6m');

    const sixMonthSlot = catalog.slots.find((slot) => slot.horizonKey === 'six_month');
    expect(sixMonthSlot).toMatchObject({
      isFilled: true,
      isPrimary: true,
      plan: {
        id: 'plan-6m',
        title: 'Six Month Foundation',
        status: 'active',
        currentWeek: 4,
        currentDay: 2,
      },
    });

    const twelveMonthSlot = catalog.slots.find((slot) => slot.horizonKey === 'twelve_month');
    expect(twelveMonthSlot).toMatchObject({
      isFilled: false,
      isPrimary: false,
      plan: null,
    });
  });

  it('maps legacy custom durations to the closest SwanStudios horizon instead of defaulting everything to six months', () => {
    const legacyPlan = { id: 'plan-8w', title: 'Eight Week Legacy Block', status: 'active', durationWeeks: 8 };
    const catalog = buildClientTrainingOverview({
      activePlan: legacyPlan,
      plans: [legacyPlan],
    }).trainingPlanCatalog;

    expect(catalog.primaryPlanId).toBe('plan-8w');
    expect(catalog.slots.find((slot) => slot.horizonKey === 'three_month')).toMatchObject({
      isFilled: true,
      isPrimary: true,
      plan: { id: 'plan-8w', title: 'Eight Week Legacy Block' },
    });
    expect(catalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isFilled: false,
      plan: null,
    });
  });

  it('uses the six-month plan as the default primary arc when no plan is explicitly active', () => {
    const catalog = buildClientTrainingOverview({
      activePlan: null,
      plans: [
        { id: 'plan-1w', title: 'Travel Week', status: 'draft', durationWeeks: 1, updatedAt: '2026-06-06' },
        { id: 'plan-6m-draft', title: 'Default Six Month Arc', status: 'draft', durationWeeks: 26, updatedAt: '2026-05-01' },
        { id: 'plan-12m', title: 'Annual Vision', status: 'draft', durationWeeks: 52, updatedAt: '2026-04-01' },
      ],
    }).trainingPlanCatalog;

    expect(catalog.primaryPlanId).toBe('plan-6m-draft');
    expect(catalog.primaryHorizonKey).toBe('six_month');
    expect(catalog.filledHorizonKeys).toEqual(['one_week', 'six_month', 'twelve_month']);
    expect(catalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isFilled: true,
      isPrimary: true,
      plan: { id: 'plan-6m-draft', title: 'Default Six Month Arc' },
    });
  });

  it('prefers the active plan over stale primary metadata left on a paused sibling', () => {
    const catalog = buildClientTrainingOverview({
      activePlan: {
        id: 'plan-9m-active',
        title: 'Nine Month Active Arc',
        status: 'active',
        durationWeeks: 39,
        metadata: { planHorizon: 'nine_month' },
      },
      plans: [
        {
          id: 'plan-6m-stale',
          title: 'Stale Six Month Primary',
          status: 'paused',
          durationWeeks: 26,
          metadata: { planHorizon: 'six_month', isPrimaryPlan: true },
        },
        {
          id: 'plan-9m-active',
          title: 'Nine Month Active Arc',
          status: 'active',
          durationWeeks: 39,
          metadata: { planHorizon: 'nine_month' },
        },
      ],
    }).trainingPlanCatalog;

    expect(catalog.primaryPlanId).toBe('plan-9m-active');
    expect(catalog.primaryHorizonKey).toBe('nine_month');
    expect(catalog.slots.find((slot) => slot.horizonKey === 'nine_month')).toMatchObject({
      isPrimary: true,
      plan: { id: 'plan-9m-active' },
    });
    expect(catalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isPrimary: false,
      plan: { id: 'plan-6m-stale' },
    });
  });

  it('exposes plan PDF attachment metadata in the seven-slot catalog when a plan has a PDF file', () => {
    const catalog = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [{
        ...sixMonthPlan,
        metadata: {
          planHorizon: 'six_month',
          planPdf: {
            url: '/api/workout-plans/plan-6m/pdf/content.pdf',
            fileName: 'Six Month Foundation.pdf',
            contentType: 'application/pdf',
            updatedAt: '2026-06-06T00:00:00.000Z',
          },
        },
      }],
    }).trainingPlanCatalog;

    expect(catalog.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      plan: {
        pdfFile: {
          url: '/api/workout-plans/plan-6m/pdf/content.pdf',
          fileName: 'Six Month Foundation.pdf',
          contentType: 'application/pdf',
          updatedAt: '2026-06-06T00:00:00.000Z',
        },
      },
    });
  });

  it('builds one overview object for dashboard, logger, trainer, admin, and Swan Coach readers', () => {
    const overview = buildClientTrainingOverview({
      activePlan: sixMonthPlan,
      plans: [sixMonthPlan],
      currentSession: {
        weekNumber: 4,
        dayNumber: 2,
        dayLabel: 'Coach Homework Lower Body',
        session: { assignmentType: 'homework' },
        exercises: [{ exerciseName: 'Goblet Squat' }],
      },
      today: '2026-06-06',
    });

    expect(overview.todayAssignment.assignmentType).toBe('homework');
    expect(overview.trainingPlanCatalog.slots).toHaveLength(7);
    expect(overview.trainingPlanCatalog.primaryPlanId).toBe('plan-6m');
  });
});
