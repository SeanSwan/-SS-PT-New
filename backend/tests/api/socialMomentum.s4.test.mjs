import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { isComebackMoment } from '../../routes/social/comebackRoutes.mjs';
import { fallbackPromptFor, FALLBACK_PROMPTS } from '../../routes/social/promptOfTheDayRoutes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const comebackSource = readFileSync(resolve(__dirname, '../../routes/social/comebackRoutes.mjs'), 'utf8');
const promptSource = readFileSync(resolve(__dirname, '../../routes/social/promptOfTheDayRoutes.mjs'), 'utf8');
const mountSource = readFileSync(resolve(__dirname, '../../routes/social/index.mjs'), 'utf8');
const migrationSource = readFileSync(
  resolve(__dirname, '../../migrations/20260918-create-social-prompts-of-the-day.cjs'),
  'utf8',
);

const daysAgo = (n) => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - n);
  return date;
};

describe('isComebackMoment — pure rule', () => {
  it('fires when the newest session follows a gap of 7+ days', () => {
    expect(isComebackMoment([daysAgo(1), daysAgo(20)])).toBe(true);
  });

  it('fires exactly on the 7-day boundary', () => {
    expect(isComebackMoment([daysAgo(0), daysAgo(7)])).toBe(true);
  });

  it('does not fire on a 6-day gap', () => {
    expect(isComebackMoment([daysAgo(0), daysAgo(6)])).toBe(false);
  });

  it('does not fire for a member who never left', () => {
    expect(isComebackMoment([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3)])).toBe(false);
  });

  it('does not keep celebrating an old return', () => {
    // The return happened 30 days ago — that is no longer "welcome back".
    expect(isComebackMoment([daysAgo(30), daysAgo(60)])).toBe(false);
  });

  it('does not fire on a first-ever session', () => {
    expect(isComebackMoment([daysAgo(1)])).toBe(false);
  });

  it('does not fire with no history', () => {
    expect(isComebackMoment([])).toBe(false);
  });

  it('tolerates unsorted input and junk values', () => {
    expect(isComebackMoment([daysAgo(20), null, daysAgo(1), 'not-a-date'])).toBe(true);
  });
});

describe('comeback endpoint — shame-free contract', () => {
  it('is mounted and authenticated', () => {
    expect(mountSource).toContain("router.use('/comeback', comebackRoutes)");
    expect(comebackSource).toContain("router.get('/', protect");
  });

  // The strongest guarantee available: if the gap is not in the payload, no client can
  // render "you were gone N days". Enforced by the data contract, not by copy review.
  it('never returns the length of the absence or the previous session date', () => {
    expect(comebackSource).not.toMatch(/gapDays|absenceDays|daysAway|missedDays/);
    expect(comebackSource).not.toMatch(/previousDate|previousSession/);
    // The success payload carries exactly two facts.
    expect(comebackSource).toContain('celebrate:');
    expect(comebackSource).toContain('cheers');
  });

  it('contains no shame or streak-pressure copy', () => {
    // The file header QUOTES a banned phrase as the example of what not to do, so the
    // copy check must run against code, not comments.
    const code = comebackSource.replace(/\/\*[\s\S]*?\*\//g, '').toLowerCase();
    const banned = ['you were gone', 'days away', 'you missed', 'lapsed', 'failed to', 'streak lost'];
    for (const phrase of banned) {
      expect(code, `shame copy found: ${phrase}`).not.toContain(phrase);
    }
  });

  it('counts existing reactions only — the SocialLike ENUM is not extended (ban #3)', () => {
    expect(comebackSource).not.toMatch(/reactionType\s*:\s*['"]/);
    expect(comebackSource).toContain("targetType: 'post'");
  });

  it('still fires the moment when the cheer count fails', () => {
    // Cheers are garnish; a failed count must not suppress the welcome-back.
    expect(comebackSource).toContain('non-fatal');
  });

  it('never echoes raw database errors to the client', () => {
    expect(comebackSource).not.toContain('error: error.message');
  });
});

describe('prompt of the day', () => {
  it('is mounted and authenticated', () => {
    expect(mountSource).toContain("router.use('/prompt-of-the-day', promptOfTheDayRoutes)");
    expect(promptSource).toContain("router.get('/', protect");
  });

  it('always resolves a prompt — a composer is never left empty', () => {
    expect(FALLBACK_PROMPTS.length).toBeGreaterThan(0);
    const prompt = fallbackPromptFor(new Date());
    expect(prompt.promptText.length).toBeGreaterThan(0);
    expect(prompt.chipLabel.length).toBeLessThanOrEqual(32);
  });

  it('picks the same fallback for the same day and rotates across days', () => {
    const a = fallbackPromptFor(new Date('2026-09-18T12:00:00Z'));
    const b = fallbackPromptFor(new Date('2026-09-18T23:00:00Z'));
    const c = fallbackPromptFor(new Date('2026-09-19T12:00:00Z'));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('falls back to a real prompt when the lookup throws', () => {
    expect(promptSource).toContain('falling back');
    expect(promptSource).toContain("source: 'fallback'");
  });

  it('gates scheduling to admins', () => {
    expect(promptSource).toContain("req.user?.role !== 'admin'");
    expect(promptSource).toContain('res.status(403)');
  });

  it('rejects a blank prompt with 422', () => {
    expect(promptSource).toContain('res.status(422)');
  });

  it('lives in the top-level migrations directory so it runs on deploy', () => {
    expect(migrationSource).toContain("createTable('SocialPromptsOfTheDay'");
    expect(migrationSource).toContain("references: { model: 'Users', key: 'id' }");
  });
});
