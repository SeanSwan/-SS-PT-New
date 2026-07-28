import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UserDashboardBackgroundControlsDisclosure from './UserDashboardBackgroundControlsDisclosure';
import {
  USER_DASHBOARD_BACKGROUNDS,
  type UserDashboardBackgroundPreference,
} from './UserDashboardBackgrounds';

const preference: UserDashboardBackgroundPreference = {
  mode: 'fixed',
  selectedId: 'ghost-swan',
  intervalMinutes: 30,
  customImageUrl: null,
};

const renderDisclosure = () => render(
  <UserDashboardBackgroundControlsDisclosure
    preference={preference}
    activeBackground={USER_DASHBOARD_BACKGROUNDS[0]}
    customUploadError={null}
    onModeChange={vi.fn()}
    onBackgroundSelect={vi.fn()}
    onIntervalChange={vi.fn()}
    onCustomImageFile={vi.fn()}
  />,
);

describe('UserDashboardBackgroundControlsDisclosure', () => {
  it('keeps the recipe grid closed until the background picker button is opened', () => {
    renderDisclosure();

    expect(screen.getByRole('button', { name: /Open dashboard background picker/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Fixed/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Open dashboard background picker/i }));

    expect(screen.getByRole('button', { name: /Close dashboard background picker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fixed/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Deep Ocean Vault/ })).toBeInTheDocument();
  });
});
