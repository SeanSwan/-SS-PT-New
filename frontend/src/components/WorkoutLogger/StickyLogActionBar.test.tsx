import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import StickyLogActionBar from './StickyLogActionBar';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(resolve(__dirname, './StickyLogActionBar.tsx'), 'utf8');

describe('StickyLogActionBar', () => {
  it('shows set progress and fires onSubmit when Save is clicked', () => {
    const onSubmit = vi.fn();
    render(
      <StickyLogActionBar completedSets={12} totalSets={18} onSubmit={onSubmit} isSubmitting={false} />,
    );
    expect(screen.getByText('12/18 sets')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /complete and save workout/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables Save while submitting', () => {
    const onSubmit = vi.fn();
    render(
      <StickyLogActionBar completedSets={5} totalSets={5} onSubmit={onSubmit} isSubmitting />,
    );
    const btn = screen.getByRole('button', { name: /complete and save workout/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('uses viewport-fixed positioning so Save is reachable before the footer scrolls into view', () => {
    expect(SOURCE).toContain('position: fixed;');
    expect(SOURCE).not.toContain('position: sticky;');
    expect(SOURCE).toContain('LayoutSpacer');
  });
});
