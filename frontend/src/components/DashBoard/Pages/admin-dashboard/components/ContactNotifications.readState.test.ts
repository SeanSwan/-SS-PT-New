/**
 * SWA-138 S3 — read-state truth for the "Business Intelligence Alerts" widget.
 * The original P0: isRead was hardcoded false in both mappers, making the
 * unread badge, blink, and filter permanently fake. These lock the fix.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapContactNotifications } from './ContactNotifications.helpers';

const componentSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/ContactNotifications.tsx'),
  'utf8',
);
const helpersSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/components/ContactNotifications.helpers.tsx'),
  'utf8',
);
const contactRouteSource = readFileSync(
  resolve(process.cwd(), '../backend/routes/contactRoutes.mjs'),
  'utf8',
);

describe('contact read-state mapping (pure)', () => {
  it('a contact WITH viewedAt maps to isRead true; without maps to unread', () => {
    const [read, unread] = mapContactNotifications([
      { id: 1, name: 'A', email: 'a@x.test', message: 'hi', viewedAt: '2026-08-01T00:00:00Z' },
      { id: 2, name: 'B', email: 'b@x.test', message: 'yo', viewedAt: null },
    ]);
    expect(read.isRead).toBe(true);
    expect(unread.isRead).toBe(false);
    expect(read.contactId).toBe(1);
  });

  it('no mapper hardcodes isRead: false for contacts anymore', () => {
    expect(helpersSource).toContain('isRead: Boolean(contact.viewedAt)');
  });
});

describe('read-state wiring contract', () => {
  it('opening an unread contact persists the read server-side', () => {
    expect(componentSource).toContain('authAxios.patch(`/api/contact/${notification.contactId}/viewed`)');
    expect(contactRouteSource).toContain("router.patch('/:id/viewed', protect, adminOnly");
  });

  it('the header exposes a working "Mark all as read" backed by a registered route', () => {
    expect(componentSource).toContain("authAxios.patch('/api/contact/mark-all-viewed')");
    expect(componentSource).toContain('title="Mark all as read"');
    expect(contactRouteSource).toContain("router.patch('/mark-all-viewed', protect, adminOnly");
  });

  it('the list endpoint returns viewedAt so refreshes cannot resurrect dismissed reads', () => {
    expect(contactRouteSource).toContain("attributes.push('viewedAt')");
  });
});
