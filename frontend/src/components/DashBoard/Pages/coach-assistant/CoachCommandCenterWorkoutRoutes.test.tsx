import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderPage, resetCoachCommandCenterMocks } from './CoachCommandCenterPage.test.harness';

describe('CoachCommandCenterPage workout route actions', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('hides workout surface shortcuts until a route client is loaded', () => {
    renderPage('/dashboard/admin/coach-assistant');

    expect(screen.queryByRole('link', { name: /open workout logger/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open workout planner/i })).not.toBeInTheDocument();
  });

  it('links route clients to the canonical client training logger and planner surfaces', () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=42&intent=log_workout&source=clients-team');

    expect(screen.getByRole('link', { name: /open workout logger/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/client-management?clientId=42&tab=training&trainingSection=logger&loadPlan=today',
    );
    expect(screen.getByRole('link', { name: /open workout planner/i })).toHaveAttribute(
      'href',
      '/dashboard/admin/workout-planner?clientId=42&source=clients-team&returnTo=%2Fdashboard%2Fadmin%2Fclient-management%3FclientId%3D42%26tab%3Dtraining%26trainingSection%3Dplans',
    );
  });
});
