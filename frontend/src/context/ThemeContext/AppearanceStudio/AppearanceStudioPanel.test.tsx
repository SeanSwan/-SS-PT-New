
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_APPEARANCE_PROFILE } from '../../../core/style-lens-os';
import { SWAN_STYLE_LENS_REGISTRY } from '../../../adapters/style-lens-swan';
import AppearanceStudioPanel from './AppearanceStudioPanel';

const props = () => ({
  currentTheme: 'crystalline-dark' as const,
  draftTheme: 'crystalline-dark' as const,
  draftProfile: { ...DEFAULT_APPEARANCE_PROFILE },
  registry: SWAN_STYLE_LENS_REGISTRY,
  panelBg: '#0A0A0F',
  panelLine: '#60C0F0',
  panelText: '#E0ECF4',
  panelMuted: '#B8C8D8',
  variants: {
    hidden: { opacity: 1 },
    visible: { opacity: 1 },
  },
  onThemeChange: vi.fn(),
  onProfileChange: vi.fn(),
  onApply: vi.fn(),
  onCancel: vi.fn(),
});

describe('AppearanceStudioPanel', () => {
  it('offers Style, Color, Motion, and Density as 44px tabs', () => {
    render(<AppearanceStudioPanel {...props()} />);

    expect(screen.getByRole('tab', { name: 'Style' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Color' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Motion' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Density' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Apply appearance' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel appearance preview' })).toBeVisible();
  });

  it('previews a sentinel without committing it', () => {
    const panelProps = props();
    render(<AppearanceStudioPanel {...panelProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Quiet Meridian style' }));

    expect(panelProps.onProfileChange).toHaveBeenCalledWith(
      expect.objectContaining({ styleLensId: 'quiet-meridian' }),
    );
    expect(panelProps.onApply).not.toHaveBeenCalled();
  });

  it('switches role and viewport only inside the synthetic preview', () => {
    render(<AppearanceStudioPanel {...props()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Preview Trainer' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview mobile' }));

    expect(screen.getByTestId('appearance-preview')).toHaveAttribute(
      'data-preview-role',
      'trainer',
    );
    expect(screen.getByTestId('appearance-preview')).toHaveAttribute(
      'data-preview-viewport',
      'mobile',
    );
  });

  it('previews reduced motion and compact density independently', () => {
    const panelProps = props();
    render(<AppearanceStudioPanel {...panelProps} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Motion' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reduced motion' }));
    expect(panelProps.onProfileChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ motionMode: 'reduced' }),
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Density' }));
    fireEvent.click(screen.getByRole('button', { name: 'Compact density' }));
    expect(panelProps.onProfileChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ density: 'compact' }),
    );
  });

  it('keeps Apply and Cancel as distinct wired actions', () => {
    const panelProps = props();
    render(<AppearanceStudioPanel {...panelProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Apply appearance' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel appearance preview' }),
    );

    expect(panelProps.onApply).toHaveBeenCalledTimes(1);
    expect(panelProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('traps keyboard focus, exposes modal semantics, and dismisses with Escape', async () => {
    const panelProps = props();
    render(<AppearanceStudioPanel {...panelProps} />);

    const dialog = screen.getByRole('dialog', { name: 'Appearance Studio' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Style' })).toHaveFocus());

    const styleTab = screen.getByRole('tab', { name: 'Style' });
    const colorTab = screen.getByRole('tab', { name: 'Color' });
    fireEvent.keyDown(styleTab, { key: 'ArrowRight' });
    expect(colorTab).toHaveFocus();
    expect(colorTab).toHaveAttribute('aria-selected', 'true');
    expect(styleTab).toHaveAttribute('tabindex', '-1');

    const apply = screen.getByRole('button', { name: 'Apply appearance' });
    apply.focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(styleTab).toHaveFocus();

    styleTab.focus();
    fireEvent.keyDown(
      dialog,
      { key: 'Tab', shiftKey: true },
    );
    expect(apply).toHaveFocus();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(panelProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('supports favorite and recent quick paths without hiding active styles', () => {
    render(<AppearanceStudioPanel {...props()} />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Favorite Quiet Meridian' }),
    );

    expect(
      screen.getByRole('button', { name: 'Unfavorite Quiet Meridian' }),
    ).toBeVisible();
    expect(screen.getByText('Quick path')).toBeVisible();
  });
});
