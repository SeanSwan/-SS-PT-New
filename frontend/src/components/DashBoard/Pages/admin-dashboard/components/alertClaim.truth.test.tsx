/**
 * SWA-138 S4b — claim-chip UI contract.
 * A claim is the one alert signal that must be visible ACROSS admins, so the
 * chip has to render a teammate's hold, not just my own.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ContactNotificationItem from './ContactNotificationItem';
import type { Notification } from './ContactNotifications.types';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const base = 'src/components/DashBoard/Pages/admin-dashboard/components/';
const hook = read(`${base}ContactNotifications.alertState.ts`);
const widget = read(`${base}ContactNotifications.tsx`);
const routes = read('../backend/routes/adminAlertStateRoutes.mjs');

const notification: Notification = {
  id: 'contact_7',
  type: 'contact',
  title: 'New Contact Form Submission',
  message: 'A prospective client reached out.',
  timestamp: new Date().toISOString(),
  priority: 'medium',
  isRead: false,
  actionRequired: true,
  contactId: 7,
};

const renderItem = (claim: any, onToggleClaim = vi.fn()) => {
  render(
    <ContactNotificationItem
      notification={notification}
      index={0}
      isExpanded={false}
      onClick={vi.fn()}
      onKeyDown={vi.fn()}
      onToggleMessage={vi.fn()}
      claim={claim}
      onToggleClaim={onToggleClaim}
    />,
  );
  return onToggleClaim;
};

describe('claim chip rendering', () => {
  it('offers a claim when nobody holds the alert', () => {
    renderItem(null);
    expect(screen.getByRole('button', { name: /Claim this alert/ })).toBeInTheDocument();
  });

  it('shows MY claim as releasable', () => {
    renderItem({ adminId: 42, claimedAt: '2026-08-06T00:00:00Z', mine: true });
    expect(screen.getByRole('button', { name: /Release your claim/ })).toHaveTextContent('Mine · release');
  });

  it("shows a TEAMMATE's claim by admin id — the double-handling guard", () => {
    renderItem({ adminId: 99, claimedAt: '2026-08-06T00:00:00Z', mine: false });
    const chip = screen.getByRole('button', { name: /Claimed by admin #99/ });
    expect(chip).toHaveTextContent('Admin #99');
  });

  it('clicking the chip does not also trigger the row navigation', async () => {
    const onClick = vi.fn();
    const onToggleClaim = vi.fn();
    render(
      <ContactNotificationItem
        notification={notification} index={0} isExpanded={false}
        onClick={onClick} onKeyDown={vi.fn()} onToggleMessage={vi.fn()}
        claim={null} onToggleClaim={onToggleClaim}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /Claim this alert/ }));
    expect(onToggleClaim).toHaveBeenCalledWith(notification);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders no chip at all when the surface does not support claiming', () => {
    render(
      <ContactNotificationItem
        notification={notification} index={0} isExpanded={false}
        onClick={vi.fn()} onKeyDown={vi.fn()} onToggleMessage={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button', { name: /Claim/ })).not.toBeInTheDocument();
  });
});

describe('claim wiring contract', () => {
  it('the hook toggles claim/release against the registered endpoints', () => {
    expect(hook).toContain("authAxios.get('/api/admin/alert-state/claims')");
    expect(hook).toContain("authAxios.post('/api/admin/alert-state/claim', { ...ref, release })");
    expect(routes).toContain("router.get('/alert-state/claims'");
    expect(routes).toContain("router.post('/alert-state/claim'");
  });

  it('release is derived from ownership, never from a caller-supplied flag', () => {
    expect(hook).toContain('const release = Boolean(existing?.mine);');
  });

  it('the widget loads claims on mount and passes them per row', () => {
    expect(widget).toContain('refreshClaims();');
    expect(widget).toContain('claim={claimOf(notification)}');
    expect(widget).toContain('onToggleClaim={toggleClaim}');
  });
});
