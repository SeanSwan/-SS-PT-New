import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide admin growth route specificity', () => {
  it('keeps Marketing as the campaign command loop', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/marketing',
    });

    expect(guide.title).toBe('Admin growth loop');
    expect(guide.primaryAction).toEqual({
      label: 'Open Marketing',
      to: '/dashboard/admin/marketing',
    });
    expect(guide.primaryPrompt).toContain('growth');
  });

  it('teaches Content Studio as the proof-and-publishing workspace', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/content',
    });

    expect(guide.title).toBe('Admin content studio');
    expect(guide.primaryAction).toEqual({
      label: 'Open Content Studio',
      to: '/dashboard/admin/content',
    });
    expect(guide.fastPath.join(' ')).toMatch(/publish|content|proof/i);
    expect(guide.primaryPrompt).toContain('content');
    expect(guide.primaryAction.label).not.toBe('Open Marketing');
  });

  it('teaches Badge Creator as a reward asset workflow', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/badge-creator',
    });

    expect(guide.title).toBe('Admin badge studio');
    expect(guide.primaryAction).toEqual({
      label: 'Open Badge Creator',
      to: '/dashboard/admin/badge-creator',
    });
    expect(guide.fastPath.join(' ')).toMatch(/badge|reward/i);
    expect(guide.primaryPrompt).toContain('badge');
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Badge Creator', to: '/dashboard/admin/badge-creator' }),
      expect.objectContaining({ label: 'Content Studio', to: '/dashboard/admin/content' }),
      expect.objectContaining({ label: 'Gamification', to: '/dashboard/admin/gamification' }),
    ]));
  });

  it('teaches Automation as a guarded follow-up workflow', () => {
    const guide = getDashboardTeachMeGuide({
      role: 'admin',
      pathname: '/dashboard/admin/automation',
    });

    expect(guide.title).toBe('Admin automation follow-up');
    expect(guide.primaryAction).toEqual({
      label: 'Open Automation',
      to: '/dashboard/admin/automation',
    });
    expect(guide.focus).toMatch(/confirm|guard|send/i);
    expect(guide.primaryPrompt).toContain('automation');
    expect(guide.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Automation', to: '/dashboard/admin/automation' }),
      expect.objectContaining({ label: 'Marketing', to: '/dashboard/admin/marketing' }),
      expect.objectContaining({ label: 'SMS Logs', to: '/dashboard/admin/sms-logs' }),
    ]));
  });
});
