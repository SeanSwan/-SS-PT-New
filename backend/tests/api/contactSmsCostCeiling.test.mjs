import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Per-IP rate limiting is NOT sufficient to bound Twilio spend:
 *  - express-rate-limit's in-memory store is PER INSTANCE, and this backend runs
 *    multiple Render instances (verified in prod: ratelimit-remaining bounces
 *    instead of decrementing), so the real cap is ~max x instances.
 *  - No per-IP limit survives IP rotation (Redis would not fix that either).
 *
 * The only thing that truly bounds spend is a ceiling on the paid action itself.
 * This locks the contract of that ceiling.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(__dirname, '../../routes/contactRoutes.mjs'), 'utf8');

describe('contact SMS global cost ceiling', () => {
  it('bounds SMS with a shared (Postgres) counter, not per-instance memory', () => {
    expect(src).toContain('const SMS_HOURLY_CAP');
    expect(src).toContain('process.env.CONTACT_SMS_HOURLY_CAP');
    // shared across instances + IP-agnostic: counts Contact rows, not req.ip buckets
    expect(src).toMatch(/Contact\.count\(\{\s*where:\s*\{\s*createdAt:\s*\{\s*\[Op\.gte\]/);
    expect(src).toContain("import { Op } from 'sequelize'");
  });

  it('suppresses ONLY the paid SMS — the lead is never dropped', () => {
    // the ceiling lives inside the SMS path...
    expect(src).toMatch(/async function trySMSNotification[\s\S]*?smsBudgetExhausted\(\)/);
    // ...and returns out of the SMS function, so the Contact row, admin
    // notification, email, and CRM lead capture all still run.
    expect(src).toMatch(/budget\.exhausted[\s\S]*?results\.sms\.error[\s\S]*?return;/);
    // the write + lead capture are NOT gated on the budget check
    expect(src).toContain('const newContact = await Contact.create(contactData);');
    expect(src).toContain('const leadCaptureResult = await captureLeadFromContact({');
  });

  it('FAILS OPEN — a broken count query must never silence a genuine lead alert', () => {
    expect(src).toMatch(/catch \(err\)[\s\S]*?allowing send[\s\S]*?exhausted: false/);
  });
});
