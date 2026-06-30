import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ChallengeSettingsPanel from './ChallengeSettingsPanel';

const governance = {
  creatorRoles: ['admin', 'trainer'],
  clientCreation: 'disabled_by_default',
  requiresModerationForClientPublish: true,
  publishModel: 'admin_full_control_trainer_scoped_client_entitled_later',
};

describe('ChallengeSettingsPanel', () => {
  it('shows a governed policy matrix for client-created challenge rollout', () => {
    render(<ChallengeSettingsPanel governance={governance} />);

    expect(screen.getByText('Client challenge policy')).toBeTruthy();
    const matrix = within(screen.getByRole('region', { name: 'Client challenge creation policy' }));

    expect(matrix.getByText('Private self-challenges')).toBeTruthy();
    expect(matrix.getAllByText('Closed until entitlement').length).toBeGreaterThanOrEqual(1);
    expect(matrix.getByText('Trainer-visible submissions')).toBeTruthy();
    expect(matrix.getAllByText('Moderation required')).toHaveLength(2);
    expect(matrix.getByText('Public or team publish')).toBeTruthy();
    expect(matrix.getByText('Media uploads')).toBeTruthy();
    expect(matrix.getByText('Comments')).toBeTruthy();
    expect(matrix.getByText('Content filtering')).toBeTruthy();
    expect(matrix.getByText('Reporting flow')).toBeTruthy();
    expect(matrix.getByText('Blocking flow')).toBeTruthy();
    expect(matrix.getByText('Safety contact')).toBeTruthy();
    expect(matrix.getByText('Terms acceptance')).toBeTruthy();
    expect(matrix.getAllByText('Required before public release').length).toBeGreaterThanOrEqual(3);
    expect(matrix.getByText('Published contact required')).toBeTruthy();
    expect(matrix.getByText('Required at rollout')).toBeTruthy();
    expect(matrix.getByText('Auto-publish')).toBeTruthy();
    expect(matrix.getByText('Disabled')).toBeTruthy();
    expect(matrix.getByText('Admin + Trainer')).toBeTruthy();
  });
  it('renders backend-authored client policy controls when the catalog provides them', () => {
    render(<ChallengeSettingsPanel governance={{
      ...governance,
      clientCreationControls: [{
        key: 'private_self_challenges',
        label: 'Self-mode pilot',
        value: 'Staff approval only',
        enabled: false,
        detail: 'Backend-authored entitlement row.',
      }],
    }} />);

    const matrix = within(screen.getByRole('region', { name: 'Client challenge creation policy' }));
    expect(matrix.getByText('Self-mode pilot')).toBeTruthy();
    expect(matrix.queryByText('Private self-challenges')).toBeNull();
    expect(matrix.getByText('Staff approval only')).toBeTruthy();
    expect(matrix.getByText('Backend-authored entitlement row.')).toBeTruthy();
    expect(matrix.getByText('Gated')).toBeTruthy();
    expect(matrix.getByText('Public or team publish')).toBeTruthy();
    expect(matrix.getByText('Media uploads')).toBeTruthy();
    expect(matrix.getByText('Comments')).toBeTruthy();
    expect(matrix.getByText('Reporting flow')).toBeTruthy();
    expect(matrix.getByText('Blocking flow')).toBeTruthy();
    expect(matrix.getByText('Safety contact')).toBeTruthy();
    expect(matrix.getByText('Auto-publish')).toBeTruthy();
    expect(matrix.getByText('Moderation default')).toBeTruthy();
    expect(matrix.getByText('Creator roles')).toBeTruthy();
  });
});
