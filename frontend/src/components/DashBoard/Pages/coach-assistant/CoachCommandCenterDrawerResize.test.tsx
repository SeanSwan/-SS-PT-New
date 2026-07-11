import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderPage, resetCoachCommandCenterMocks } from './CoachCommandCenterPage.test.harness';

const DRAWER_QUERY = '(max-width: 1279px)';
const originalMatchMedia = window.matchMedia;
let setDrawerViewport: (matches: boolean) => void = () => undefined;

function installResponsiveMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const queryList = {
    get matches() { return matches; },
    media: DRAWER_QUERY,
    onchange: null,
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener)),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  } as unknown as MediaQueryList;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn((query: string) => query === DRAWER_QUERY ? queryList : { ...queryList, matches: false, media: query }),
  });
  setDrawerViewport = (next) => {
    matches = next;
    const event = { matches: next, media: DRAWER_QUERY } as MediaQueryListEvent;
    listeners.forEach((listener) => listener(event));
  };
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
});

describe('Coach Command Center responsive rail semantics', () => {
  beforeEach(resetCoachCommandCenterMocks);

  it('updates the closed operations rail when the viewport crosses the desktop breakpoint', async () => {
    installResponsiveMatchMedia(true);
    renderPage('/dashboard/admin/coach-assistant');
    const rail = screen.getByLabelText('Coach operations command surface') as HTMLElement & { inert?: boolean };

    await waitFor(() => expect(rail.inert).toBe(true));
    expect(rail).toHaveAttribute('role', 'dialog');
    expect(rail).toHaveAttribute('aria-hidden', 'true');

    act(() => setDrawerViewport(false));
    await waitFor(() => expect(rail).toHaveAttribute('role', 'complementary'));
    expect(rail.inert).toBe(false);
    expect(rail).toHaveAttribute('aria-hidden', 'false');

    act(() => setDrawerViewport(true));
    await waitFor(() => expect(rail).toHaveAttribute('role', 'dialog'));
    expect(rail.inert).toBe(true);
    expect(rail).toHaveAttribute('aria-hidden', 'true');
  });

  it('re-inlines an open mobile drawer and releases its focus trap on desktop', async () => {
    installResponsiveMatchMedia(true);
    const user = userEvent.setup();
    const view = renderPage('/dashboard/admin/coach-assistant');

    await user.click(screen.getByRole('button', { name: 'More coach actions' }));
    const mobileRail = await screen.findByLabelText('Coach operations command surface');
    expect(view.container.contains(mobileRail)).toBe(false);
    expect(mobileRail).toHaveAttribute('role', 'dialog');

    act(() => setDrawerViewport(false));
    await waitFor(() => {
      const desktopRail = screen.getByLabelText('Coach operations command surface');
      expect(view.container.contains(desktopRail)).toBe(true);
      expect(desktopRail).toHaveAttribute('role', 'complementary');
    });

    const desktopRail = screen.getByLabelText('Coach operations command surface');
    const focusable = within(desktopRail).getAllByRole('button');
    focusable[focusable.length - 1]?.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(focusable[focusable.length - 1]?.dispatchEvent(tab)).toBe(true);
  });
});
