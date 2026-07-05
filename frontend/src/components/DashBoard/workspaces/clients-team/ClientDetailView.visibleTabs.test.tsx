import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClientDetailView from './ClientDetailView';
import { CLIENT_HUB_AUDIENCES } from './clientHubAudience';
import type { MiniCardClient } from './ClientMiniCard';

const fixtureClient: MiniCardClient = {
  id: 424242,
  firstName: 'Fixture',
  lastName: 'Client',
  email: 'fixture@example.com',
  status: 'active',
  tier: 'premium',
  engagementScore: 50,
  lastWeighIn: null,
  sessionsLeft: 5,
  workoutCount: 12,
};

describe('ClientDetailView visibleTabs', () => {
  it('renders the full six-tab set when no allowlist is passed (admin default)', () => {
    render(<ClientDetailView client={fixtureClient} onBack={() => undefined} />);
    ['Training', 'Progress', 'Nutrition', 'Biometrics', 'Overview', 'Settings'].forEach((label) => {
      expect(screen.getByRole('tab', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    });
  });

  it('hides Overview and Settings for the trainer audience allowlist', () => {
    render(
      <ClientDetailView
        client={fixtureClient}
        onBack={() => undefined}
        visibleTabs={CLIENT_HUB_AUDIENCES.trainer.visibleDetailTabs}
      />,
    );
    expect(screen.queryByRole('tab', { name: /overview/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /training/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /biometrics/i })).toBeInTheDocument();
  });

  it('falls back to the first visible tab when a hidden tab is requested', () => {
    render(
      <ClientDetailView
        client={fixtureClient}
        onBack={() => undefined}
        activeTab="settings"
        visibleTabs={CLIENT_HUB_AUDIENCES.trainer.visibleDetailTabs}
      />,
    );
    expect(screen.getByRole('tab', { name: /training/i })).toHaveAttribute('aria-selected', 'true');
  });
});
