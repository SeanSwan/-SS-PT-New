import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UserDashboardBackgroundControls from './UserDashboardBackgroundControls';
import {
  CUSTOM_USER_DASHBOARD_BACKGROUND_ID,
  USER_DASHBOARD_BACKGROUNDS,
  type UserDashboardBackgroundPreference,
} from './UserDashboardBackgrounds';

const basePreference: UserDashboardBackgroundPreference = {
  mode: 'fixed',
  selectedId: 'ghost-swan',
  intervalMinutes: 30,
  customImageUrl: null,
};

function renderControls(preference: UserDashboardBackgroundPreference = basePreference) {
  return {
    onModeChange: vi.fn(),
    onBackgroundSelect: vi.fn(),
    onIntervalChange: vi.fn(),
    onCustomImageFile: vi.fn(),
    ...render(
      <UserDashboardBackgroundControls
        preference={preference}
        activeBackground={USER_DASHBOARD_BACKGROUNDS[0]}
        customUploadError={null}
        onModeChange={vi.fn()}
        onBackgroundSelect={vi.fn()}
        onIntervalChange={vi.fn()}
        onCustomImageFile={vi.fn()}
      />,
    ),
  };
}

describe('UserDashboardBackgroundControls', () => {
  it('renders fixed and rotation controls with all twenty recipes', () => {
    renderControls();

    expect(screen.getByRole('button', { name: /Fixed/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Rotate/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: /Custom Photo/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Upload photo/ })).toBeInTheDocument();

    USER_DASHBOARD_BACKGROUNDS.forEach((background) => {
      expect(screen.getByRole('button', { name: new RegExp(background.name) })).toBeInTheDocument();
    });
  });

  it('exposes the rotation interval menu only in rotate mode', () => {
    const preference = { ...basePreference, mode: 'rotate' as const, intervalMinutes: 60 };
    const onIntervalChange = vi.fn();
    render(
      <UserDashboardBackgroundControls
        preference={preference}
        activeBackground={USER_DASHBOARD_BACKGROUNDS[0]}
        customUploadError={null}
        onModeChange={vi.fn()}
        onBackgroundSelect={vi.fn()}
        onIntervalChange={onIntervalChange}
        onCustomImageFile={vi.fn()}
      />,
    );

    const interval = screen.getByLabelText('Background rotation interval');
    expect(interval).toHaveValue('60');
    fireEvent.change(interval, { target: { value: '240' } });
    expect(onIntervalChange).toHaveBeenCalledWith(240);
  });

  it('selects an uploaded custom photo without requiring the profile cover upload lane', () => {
    const onBackgroundSelect = vi.fn();
    render(
      <UserDashboardBackgroundControls
        preference={{ ...basePreference, customImageUrl: 'data:image/jpeg;base64,abc' }}
        activeBackground={USER_DASHBOARD_BACKGROUNDS[0]}
        customUploadError={null}
        onModeChange={vi.fn()}
        onBackgroundSelect={onBackgroundSelect}
        onIntervalChange={vi.fn()}
        onCustomImageFile={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Custom Photo/ }));
    expect(onBackgroundSelect).toHaveBeenCalledWith(CUSTOM_USER_DASHBOARD_BACKGROUND_ID);
  });
});
