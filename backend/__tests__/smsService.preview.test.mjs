/**
 * smsService — nurture template preview (no sends).
 * Lets the message copy be reviewed/approved before outbound automation is armed:
 * renders every template with sample variables, flags unresolved {placeholders},
 * and reports length. Twilio is mocked — nothing is sent.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/twilioService.mjs', () => ({
  sendSMS: vi.fn(),
  isTwilioServiceConfigured: () => false,
}));
vi.mock('../utils/logger.mjs', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { previewSmsTemplates, listSmsTemplates } = await import('../services/smsService.mjs');

describe('previewSmsTemplates', () => {
  it('renders every template with sample variables (no placeholders left, no sends)', () => {
    const out = previewSmsTemplates();
    expect(out.length).toBe(listSmsTemplates().length);
    const welcome = out.find((t) => t.name === 'welcome');
    expect(welcome.preview).toContain('Alex');
    expect(welcome.preview).not.toContain('{clientName}');
    expect(welcome.length).toBeGreaterThan(0);
  });

  it('applies caller variable overrides', () => {
    const out = previewSmsTemplates({ clientName: 'Jordan' });
    expect(out.find((t) => t.name === 'welcome').preview).toContain('Jordan');
  });

  it('flags NO unresolved placeholders in the shipped templates (catches broken copy)', () => {
    for (const t of previewSmsTemplates()) {
      expect(t.unresolved, `template ${t.name} has unresolved placeholders`).toEqual([]);
    }
  });

  it('extracts each template\'s placeholders', () => {
    const welcome = previewSmsTemplates().find((t) => t.name === 'welcome');
    expect(welcome.placeholders).toContain('clientName');
    const reminder = previewSmsTemplates().find((t) => t.name === 'session_reminder');
    expect(reminder.placeholders).toEqual(expect.arrayContaining(['trainerName', 'time']));
  });
});
