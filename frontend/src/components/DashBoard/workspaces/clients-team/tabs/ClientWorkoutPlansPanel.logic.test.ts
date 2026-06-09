import { describe, expect, it, vi } from 'vitest';
import {
  buildClientPlanVault,
  normalizeClientWorkoutPlansResponse,
  type ClientPlanPdfFile,
} from './ClientWorkoutPlansPanel.logic';
import { createProtectedPlanPdfObjectUrl } from '../../../shared/plan-pdf/useProtectedPlanPdfViewer';

const pdfFile = (url: string): ClientPlanPdfFile => ({
  url,
  fileName: 'Plan.pdf',
  contentType: 'application/pdf',
  updatedAt: null,
});

describe('ClientWorkoutPlansPanel.logic PDF safety', () => {
  it('keeps only authenticated workout-plan PDF proxy URLs when normalizing plans', () => {
    const { plans } = normalizeClientWorkoutPlansResponse({
      plans: [
        {
          id: 'protected-plan',
          title: 'Protected Plan',
          status: 'active',
          durationWeeks: 26,
          metadata: { planPdf: pdfFile('/api/workout-plans/protected-plan/pdf/content.pdf') },
        },
        {
          id: 'public-plan',
          title: 'Public CDN Plan',
          status: 'draft',
          durationWeeks: 26,
          metadata: { planPdf: pdfFile('https://cdn.swanstudios.com/plans/public-plan.pdf') },
        },
        {
          id: 'uploads-plan',
          title: 'Uploads Plan',
          status: 'draft',
          durationWeeks: 26,
          metadata: { planPdf: pdfFile('/uploads/workout-plans/42/uploads-plan.pdf') },
        },
      ],
    });

    expect(plans.find((plan) => plan.id === 'protected-plan')?.pdfFile?.url)
      .toBe('/api/workout-plans/protected-plan/pdf/content.pdf');
    expect(plans.find((plan) => plan.id === 'public-plan')?.pdfFile).toBeNull();
    expect(plans.find((plan) => plan.id === 'uploads-plan')?.pdfFile).toBeNull();
  });

  it('does not fetch non-proxy PDF URLs', async () => {
    const authAxios = { get: vi.fn() };

    await expect(createProtectedPlanPdfObjectUrl(
      authAxios,
      pdfFile('https://cdn.swanstudios.com/plans/public-plan.pdf'),
    )).rejects.toThrow(/protected workout plan pdf url/i);

    expect(authAxios.get).not.toHaveBeenCalled();
  });
});

describe('ClientWorkoutPlansPanel.logic plan vault primary reconciliation', () => {
  it('prefers the active plan over stale primary metadata in fallback plan lists', () => {
    const vault = buildClientPlanVault([
      {
        id: 'plan-6m-stale',
        name: 'Stale Six Month Primary',
        status: 'paused',
        goal: 'strength',
        horizonKey: 'six_month',
        isPrimary: true,
      },
      {
        id: 'plan-9m-active',
        name: 'Nine Month Active Arc',
        status: 'active',
        goal: 'performance',
        horizonKey: 'nine_month',
      },
    ]);

    expect(vault.primaryPlanId).toBe('plan-9m-active');
    expect(vault.primaryHorizonKey).toBe('nine_month');
    expect(vault.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isPrimary: false,
      plan: { id: 'plan-6m-stale' },
    });
  });

  it('reconciles a stale server primaryPlanId to the primary filled slot', () => {
    const { serverPlanVault } = normalizeClientWorkoutPlansResponse({
      trainingPlanCatalog: {
        primaryPlanId: 'deleted-primary-plan',
        primaryHorizonKey: 'six_month',
        slots: [
          {
            horizonKey: 'six_month',
            label: '6 Month',
            durationWeeks: 26,
            durationDays: 182,
            isDefaultHorizon: true,
            isFilled: true,
            isPrimary: true,
            plan: {
              id: 'plan-6m',
              title: 'Current Six Month Arc',
              status: 'active',
              durationWeeks: 26,
            },
          },
          {
            horizonKey: 'nine_month',
            label: '9 Month',
            durationWeeks: 39,
            durationDays: 273,
            isDefaultHorizon: false,
            isFilled: true,
            isPrimary: false,
            plan: {
              id: 'plan-9m',
              title: 'Nine Month Future Arc',
              status: 'draft',
              durationWeeks: 39,
            },
          },
        ],
      },
    });

    expect(serverPlanVault?.primaryPlanId).toBe('plan-6m');
    expect(serverPlanVault?.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isPrimary: true,
      plan: { id: 'plan-6m', isPrimary: true },
    });
  });

  it('prefers an active server catalog slot over a stale paused primary id', () => {
    const { serverPlanVault } = normalizeClientWorkoutPlansResponse({
      trainingPlanCatalog: {
        primaryPlanId: 'plan-6m-stale',
        primaryHorizonKey: 'six_month',
        slots: [
          {
            horizonKey: 'six_month',
            label: '6 Month',
            durationWeeks: 26,
            durationDays: 182,
            isDefaultHorizon: true,
            isFilled: true,
            isPrimary: true,
            plan: {
              id: 'plan-6m-stale',
              title: 'Paused Stale Primary',
              status: 'paused',
              durationWeeks: 26,
            },
          },
          {
            horizonKey: 'nine_month',
            label: '9 Month',
            durationWeeks: 39,
            durationDays: 273,
            isDefaultHorizon: false,
            isFilled: true,
            isPrimary: false,
            plan: {
              id: 'plan-9m-active',
              title: 'Current Nine Month Arc',
              status: 'active',
              durationWeeks: 39,
            },
          },
        ],
      },
    });

    expect(serverPlanVault?.primaryPlanId).toBe('plan-9m-active');
    expect(serverPlanVault?.primaryHorizonKey).toBe('nine_month');
    expect(serverPlanVault?.slots.find((slot) => slot.horizonKey === 'six_month')).toMatchObject({
      isPrimary: false,
      plan: { id: 'plan-6m-stale', isPrimary: false },
    });
  });

  it('reconciles a stale server primaryHorizonKey to the resolved primary slot', () => {
    const { serverPlanVault } = normalizeClientWorkoutPlansResponse({
      trainingPlanCatalog: {
        primaryPlanId: 'deleted-primary-plan',
        primaryHorizonKey: 'twelve_month',
        slots: [
          {
            horizonKey: 'six_month',
            label: '6 Month',
            durationWeeks: 26,
            durationDays: 182,
            isDefaultHorizon: true,
            isFilled: true,
            isPrimary: true,
            plan: {
              id: 'plan-6m',
              title: 'Current Six Month Arc',
              status: 'active',
              durationWeeks: 26,
            },
          },
        ],
      },
    });

    expect(serverPlanVault?.primaryPlanId).toBe('plan-6m');
    expect(serverPlanVault?.primaryHorizonKey).toBe('six_month');
  });
});
