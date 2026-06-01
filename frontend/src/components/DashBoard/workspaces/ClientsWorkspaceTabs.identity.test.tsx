import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useClientsWorkspaceTabRenderers } from './ClientsWorkspaceTabs';
import type { ClientOption } from './clients-team/ClientSelectorDropdown';

vi.mock('./clients-team/tabs/TrainingTabContent', () => ({
  default: ({ clientName }: { clientName?: string }) => <div data-testid="training-name">{clientName}</div>,
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

describe('ClientsWorkspaceTabs identity fallback', () => {
  it('passes fallback identity into every selected-client tab', async () => {
    render(<Harness client={blankNameClient} />);

    expect(await screen.findByTestId('training-name')).toHaveTextContent('fallback.client@example.test');
    expect(await screen.findByTestId('progress-name')).toHaveTextContent('fallback.client@example.test');
    expect(await screen.findByTestId('biometrics-name')).toHaveTextContent('fallback.client@example.test');
    expect(await screen.findByTestId('overview-name')).toHaveTextContent('fallback.client@example.test');
    expect(await screen.findByTestId('settings-name')).toHaveTextContent('fallback.client@example.test');
  });
});
