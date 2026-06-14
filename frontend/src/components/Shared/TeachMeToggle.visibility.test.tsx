import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import TeachMeToggle from './TeachMeToggle';

describe('TeachMeToggle visibility behavior', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not mount closed guidance content until the user opens it', async () => {
    const user = userEvent.setup();

    render(
      <TeachMeToggle
        sectionId="visibility-fixture"
        title="Plan Vault"
        defaultOpen={false}
        content={<p>Closed guidance should stay out of DOM queries.</p>}
      />,
    );

    expect(screen.queryByText(/closed guidance should stay out/i)).toBeNull();

    await user.click(screen.getByRole('button', { name: /teach me: plan vault/i }));

    expect(screen.getByText(/closed guidance should stay out/i)).toBeVisible();
  });

  it('can show a specific visible label without changing the accessibility name', () => {
    render(
      <TeachMeToggle
        sectionId="specific-label-fixture"
        title="Admin command center"
        buttonLabel="Teach Me: Admin command center"
        defaultOpen={false}
        content={<p>Specific dashboard guidance.</p>}
      />,
    );

    expect(screen.getByText('Teach Me: Admin command center')).toBeVisible();
    expect(screen.getByRole('button', { name: /teach me: admin command center/i }))
      .toHaveAttribute('aria-expanded', 'false');
  });
});
