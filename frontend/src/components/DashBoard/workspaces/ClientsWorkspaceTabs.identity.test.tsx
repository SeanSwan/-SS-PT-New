import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useClientsWorkspaceTabRenderers } from './ClientsWorkspaceTabs';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';

vi.mock('./clients-team/tabs/TrainingTabContent', () => ({
  default: ({
    clientName,
    onSectionChange,
    scheduledSessionDate,
    scheduledSessionId,
  }: {
    clientName?: string;
    onSectionChange?: (section: string) => void;
    scheduledSessionDate?: string | null;
    scheduledSessionId?: string | null;
  }) => (
    <div>
      <div data-testid="training-name">{clientName}</div>
      <div data-testid="training-scheduled-session-id">{scheduledSessionId ?? ''}</div>
      <div data-testid="training-scheduled-session-date">{scheduledSessionDate ?? ''}</div>
      <button type="button" onClick={() => onSectionChange?.('logger')}>
        Mock logger section
      </button>
      <button type="button" onClick={() => onSectionChange?.('history')}>
        Mock history section
      </button>
    </div>
  ),
}));

vi.mock('./clients-team/tabs/ProgressTabContent', () => ({
  default: ({ clientName }: { clientName?: string }) => <div data-testid="progress-name">{clientName}</div>,
}));

vi.mock('./clients-team/tabs/BiometricsTabContent', () => ({
  default: ({ clientName }: { clientName?: string }) => <div data-testid="biometrics-name">{clientName}</div>,
}));

vi.mock('./clients-team/tabs/OverviewTabContent', () => ({
  default: ({ clientName }: { clientName?: string }) => <div data-testid="overview-name">{clientName}</div>,
}));

vi.mock('./clients-team/tabs/SettingsTabContent', () => ({
  default: ({ clientName }: { clientName?: string }) => <div data-testid="settings-name">{clientName}</div>,
}));

const blankNameClient: ClientOption = {
  id: 7,
  firstName: '',
  lastName: '',
  email: 'fallback.client@example.test',
  clientSource: 'swanstudios',
  availableSessions: 2,
};

const Harness = ({ client }: { client: ClientOption }) => {
  const renderers = useClientsWorkspaceTabRenderers(client);

  return (
    <>
      {renderers.renderTraining(client.id)}
      {renderers.renderProgress(client.id)}
      {renderers.renderBiometrics(client.id)}
      {renderers.renderOverview(client.id)}
      {renderers.renderSettings(client.id)}
    </>
  );
};

const ScheduledHarness = ({ client }: { client: ClientOption }) => {
  const renderers = useClientsWorkspaceTabRenderers(client, 'logger', undefined, {
    scheduledSessionId: '72',
    scheduledSessionDate: '2026-06-07',
  });

  return <>{renderers.renderTraining(client.id)}</>;
};

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
};

describe('ClientsWorkspaceTabs identity fallback', () => {
  it('passes fallback identity into every selected-client tab', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=7']}>
        <Harness client={blankNameClient} />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('training-name')).toHaveTextContent('fallback.client@example.test');
    expect(await screen.findByTestId('progress-name')).toHaveTextContent('fallback.client@example.test');
    expect(await screen.findByTestId('biometrics-name')).toHaveTextContent('fallback.client@example.test');
    expect(await screen.findByTestId('overview-name')).toHaveTextContent('fallback.client@example.test');
    expect(await screen.findByTestId('settings-name')).toHaveTextContent('fallback.client@example.test');
  });

  it('writes selected training sub-section changes into the Client Hub URL', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=7']}>
        <Harness client={blankNameClient} />
        <LocationProbe />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: /mock history section/i }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/dashboard/admin/client-management?clientId=7&tab=training&trainingSection=history'
    );
  });

  it('keeps the today-plan load intent only when returning to the logger section', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=7&tab=training&trainingSection=history']}>
        <Harness client={blankNameClient} />
        <LocationProbe />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: /mock logger section/i }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/dashboard/admin/client-management?clientId=7&tab=training&trainingSection=logger&loadPlan=today'
    );

    await user.click(screen.getByRole('button', { name: /mock history section/i }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/dashboard/admin/client-management?clientId=7&tab=training&trainingSection=history'
    );
  });

  it('passes scheduled session context into the embedded Client Hub logger route', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=7&tab=training&trainingSection=logger&sessionId=72&sessionDate=2026-06-07']}>
        <ScheduledHarness client={blankNameClient} />
      </MemoryRouter>
    );

    expect(await screen.findByTestId('training-scheduled-session-id')).toHaveTextContent('72');
    expect(await screen.findByTestId('training-scheduled-session-date')).toHaveTextContent('2026-06-07');
  });

  it('preserves scheduled session context when the logger tab rewrites route state', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard/admin/client-management?clientId=7&tab=training&trainingSection=logger&sessionId=72&sessionDate=2026-06-07']}>
        <ScheduledHarness client={blankNameClient} />
        <LocationProbe />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: /mock logger section/i }));

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/dashboard/admin/client-management?clientId=7&tab=training&trainingSection=logger&loadPlan=today&sessionId=72&sessionDate=2026-06-07'
    );
  });
});
