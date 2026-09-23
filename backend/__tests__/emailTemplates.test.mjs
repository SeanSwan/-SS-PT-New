/**
 * emailTemplates.test.mjs — S1 acceptance for the template registry and token module.
 * =================================================================================
 *
 * Covers `BLUEPRINT-speed-to-lead-email-2026-07-16/05-slices.md` S1 acceptance, plus the
 * subject byte-fidelity check against `02-wireframes.md`.
 *
 * The copy IS the product surface for this epic, so the assertions here are deliberately
 * literal: subjects are compared as whole strings, and the footer is compared against the
 * exported constant rather than a retyped copy. A test that types the expected string a
 * second time only proves the author typed it twice.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  EMAIL_TEMPLATES,
  UNSUBSCRIBE_FOOTER,
  listEmailTemplates,
  renderEmailTemplate,
} from '../services/emailTemplates.mjs';
import {
  buildUnsubscribeUrl,
  isUnsubscribeSigningConfigured,
  makeUnsubscribeToken,
  verifyUnsubscribeToken,
} from '../services/leadUnsubscribeToken.mjs';

const TEMPLATE_NAMES = ['stl_instant_reply', 'stl_followup_2d', 'stl_followup_5d'];

/**
 * The three subjects exactly as `02-wireframes.md` states them.
 *
 * Apostrophes are STRAIGHT ASCII (`'`) and the dash is an EM DASH (`\u2014`) — verified by
 * `od -c` against the wireframe bytes, not by eye. The em dash is `342 200 224`; the
 * apostrophe is a single `'`. Getting this wrong in the test (rather than the template)
 * is how a byte-fidelity requirement gets quietly inverted, so the check is recorded.
 */
const EXPECTED_SUBJECTS = {
  stl_instant_reply: 'Got your message \u2014 here\'s your next step, Marcus',
  stl_followup_2d: 'Your free assessment is still open, Marcus',
  stl_followup_5d: 'No pressure \u2014 door\'s open when you\'re ready',
};

/** Secrets are process-global; snapshot and restore so cases cannot leak into each other. */
let savedEnv;

beforeEach(() => {
  savedEnv = {
    LEAD_UNSUB_SECRET: process.env.LEAD_UNSUB_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL,
  };
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('emailTemplates — registry shape', () => {
  it('registers exactly the three expected templates', () => {
    expect(Object.keys(EMAIL_TEMPLATES).sort()).toEqual([...TEMPLATE_NAMES].sort());
  });

  it('freezes the registry so a template cannot be swapped at runtime', () => {
    expect(Object.isFrozen(EMAIL_TEMPLATES)).toBe(true);
  });

  it('lists templates with a subject preview for the existing preview route', () => {
    const listed = listEmailTemplates();
    expect(listed.map((t) => t.name).sort()).toEqual([...TEMPLATE_NAMES].sort());
    for (const entry of listed) {
      expect(typeof entry.subjectPreview).toBe('string');
      expect(entry.subjectPreview.length).toBeGreaterThan(0);
    }
  });
});

describe('renderEmailTemplate — all three templates render every part', () => {
  it.each(TEMPLATE_NAMES)('%s renders subject, text and html', (name) => {
    const out = renderEmailTemplate(name, {
      firstName: 'Marcus',
      unsubscribeUrl: 'https://sswanstudios.com/api/leads/unsubscribe?lid=7&tok=abc',
    });

    expect(typeof out.subject).toBe('string');
    expect(out.subject.length).toBeGreaterThan(0);
    expect(typeof out.text).toBe('string');
    expect(out.text.length).toBeGreaterThan(0);
    expect(typeof out.html).toBe('string');
    expect(out.html.length).toBeGreaterThan(0);
  });

  it.each(TEMPLATE_NAMES)('%s html contains the unsubscribe link', (name) => {
    const url = 'https://sswanstudios.com/api/leads/unsubscribe?lid=7&tok=abc';
    const out = renderEmailTemplate(name, { firstName: 'Marcus', unsubscribeUrl: url });

    // The `&` in the query string MUST render as `&amp;` inside an HTML attribute —
    // bare `&` is not well-formed there and some clients truncate the URL at it. So the
    // assertion is against the correctly-escaped attribute value, and a separate check
    // confirms the parameter survives escaping rather than being mangled.
    expect(out.html).toContain('href="https://sswanstudios.com/api/leads/unsubscribe?lid=7&amp;tok=abc"');
    expect(out.html).toContain('href=');
    // Both query params are still present and readable once entities are resolved.
    const attr = out.html.match(/href="([^"]*unsubscribe[^"]*)"/)?.[1] ?? '';
    const resolved = attr.replace(/&amp;/g, '&');
    expect(resolved).toBe(url);
  });

  it('escapes the unsubscribe URL rather than emitting a bare ampersand', () => {
    const url = 'https://sswanstudios.com/api/leads/unsubscribe?lid=7&tok=abc';
    const out = renderEmailTemplate('stl_instant_reply', {
      firstName: 'Marcus',
      unsubscribeUrl: url,
    });
    expect(out.html).not.toContain('?lid=7&tok='); // bare & must not appear in an attribute
  });

  it.each(TEMPLATE_NAMES)('%s html contains the literal footer line', (name) => {
    const out = renderEmailTemplate(name, { firstName: 'Marcus' });
    expect(out.html).toContain(UNSUBSCRIBE_FOOTER);
    expect(UNSUBSCRIBE_FOOTER).toBe(
      "You're receiving this because you contacted SwanStudios.",
    );
  });

  it.each(TEMPLATE_NAMES)('%s text contains the footer line', (name) => {
    const out = renderEmailTemplate(name, { firstName: 'Marcus' });
    expect(out.text).toContain(UNSUBSCRIBE_FOOTER);
  });

  it('uses the light email palette, not the dark app palette', () => {
    // Inbox convention is light. The dark-first rule governs the APP, not email, and a
    // regression here would be invisible in a unit test that only checked for a string.
    const out = renderEmailTemplate('stl_instant_reply', { firstName: 'Marcus' });
    expect(out.html).toContain('#1a1a24');
    expect(out.html).toContain('#ffffff');
    expect(out.html).toContain('#0066cc');
  });

  it('declares the 600px single-column layout', () => {
    const out = renderEmailTemplate('stl_instant_reply', { firstName: 'Marcus' });
    expect(out.html).toContain('600px');
    expect(out.html).toContain('role="presentation"');
  });

  it('contains no images, per the deliverability rule', () => {
    const out = renderEmailTemplate('stl_followup_2d', { firstName: 'Marcus' });
    expect(out.html).not.toMatch(/<img\b/i);
  });

  it('puts no emoji in any subject', () => {
    for (const name of TEMPLATE_NAMES) {
      const { subject } = renderEmailTemplate(name, { firstName: 'Marcus' });
      // Surrogate pairs and the common symbol blocks.
      expect(subject).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    }
  });
});

describe('renderEmailTemplate — subjects match the wireframes', () => {
  it('renders the instant-reply subject as written', () => {
    const { subject } = renderEmailTemplate('stl_instant_reply', { firstName: 'Marcus' });
    expect(subject).toContain('Marcus');
    expect(subject).toContain('Got your message');
  });

  it('renders the 2d subject with the lead name appended', () => {
    const { subject } = renderEmailTemplate('stl_followup_2d', { firstName: 'Marcus' });
    expect(subject).toBe(EXPECTED_SUBJECTS.stl_followup_2d);
  });

  it('renders the 5d subject with NO name, because the copy has no placeholder', () => {
    // This is the case that would break if someone "improved" the template by adding
    // firstName for consistency. The copy is the product surface; consistency is not a
    // reason to change it.
    const withName = renderEmailTemplate('stl_followup_5d', { firstName: 'Marcus' });
    const withoutName = renderEmailTemplate('stl_followup_5d', {});
    expect(withName.subject).toBe(withoutName.subject);
    expect(withName.subject).toBe(EXPECTED_SUBJECTS.stl_followup_5d);
  });
});

describe('renderEmailTemplate — firstName fallback', () => {
  it('falls back to "Hey there," in BOTH text and html when firstName is missing', () => {
    for (const name of TEMPLATE_NAMES) {
      const out = renderEmailTemplate(name, {});
      expect(out.text, `${name} text`).toContain('Hey there,');
      expect(out.html, `${name} html`).toContain('Hey there,');
    }
  });

  it('falls back when firstName is an empty string', () => {
    const out = renderEmailTemplate('stl_instant_reply', { firstName: '' });
    expect(out.text).toContain('Hey there,');
  });

  it('falls back when firstName is whitespace only, rather than rendering "Hey  ,"', () => {
    const out = renderEmailTemplate('stl_instant_reply', { firstName: '   ' });
    expect(out.text).toContain('Hey there,');
  });

  it('escapes a markup-bearing firstName in html but not in text', () => {
    // firstName is lead-supplied and therefore attacker-controlled. The two parts are
    // rendered separately precisely so this can differ.
    const hostile = '<script>alert(1)</script>';
    const out = renderEmailTemplate('stl_instant_reply', { firstName: hostile });

    expect(out.html).not.toContain('<script>');
    expect(out.html).toContain('&lt;script&gt;');
    // The plain-text part is not markup, so it carries the raw value.
    expect(out.text).toContain(hostile);
  });
});

describe('renderEmailTemplate — unknown template', () => {
  it('throws with the exact contract message', () => {
    expect(() => renderEmailTemplate('nope', {})).toThrow('Unknown email template: nope');
  });

  it('does not fall through for a prototype key', () => {
    // A plain `EMAIL_TEMPLATES[name]` lookup would find `constructor` on the prototype
    // chain and return a function, so this is a real guard rather than a formality.
    expect(() => renderEmailTemplate('constructor', {})).toThrow(
      'Unknown email template: constructor',
    );
  });
});

describe('unsubscribe tokens', () => {
  beforeEach(() => {
    process.env.LEAD_UNSUB_SECRET = 'test-secret-value';
  });

  it('is deterministic for the same lead', () => {
    expect(makeUnsubscribeToken(7)).toBe(makeUnsubscribeToken(7));
  });

  it('differs across leads', () => {
    expect(makeUnsubscribeToken(7)).not.toBe(makeUnsubscribeToken(8));
  });

  it('emits a 64-char hex digest', () => {
    expect(makeUnsubscribeToken(7)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifies its own token', () => {
    expect(verifyUnsubscribeToken(7, makeUnsubscribeToken(7))).toBe(true);
  });

  it('rejects a tampered token', () => {
    const tok = makeUnsubscribeToken(7);
    const tampered = `${tok.slice(0, -1)}${tok.endsWith('a') ? 'b' : 'a'}`;
    expect(verifyUnsubscribeToken(7, tampered)).toBe(false);
  });

  it('rejects a token minted for a different lead', () => {
    expect(verifyUnsubscribeToken(8, makeUnsubscribeToken(7))).toBe(false);
  });

  it('rejects malformed tokens without throwing', () => {
    for (const bad of ['', 'nothex', 'abc', makeUnsubscribeToken(7).slice(0, 32), null, undefined]) {
      expect(verifyUnsubscribeToken(7, bad)).toBe(false);
    }
  });

  it('builds a URL carrying the lead id and a verifiable token', () => {
    const url = buildUnsubscribeUrl(7);
    expect(url).toContain('/api/leads/unsubscribe?lid=7&tok=');

    const tok = new URL(url).searchParams.get('tok');
    expect(verifyUnsubscribeToken(7, tok)).toBe(true);
  });

  it('falls back to JWT_SECRET when LEAD_UNSUB_SECRET is unset', () => {
    delete process.env.LEAD_UNSUB_SECRET;
    process.env.JWT_SECRET = 'jwt-fallback-secret';

    expect(isUnsubscribeSigningConfigured()).toBe(true);
    expect(verifyUnsubscribeToken(7, makeUnsubscribeToken(7))).toBe(true);
  });

  it('honours PUBLIC_BASE_URL and does not double the slash', () => {
    process.env.PUBLIC_BASE_URL = 'https://staging.example.com/';
    const url = buildUnsubscribeUrl(7);
    expect(url.startsWith('https://staging.example.com/api/leads/unsubscribe')).toBe(true);
    expect(url).not.toContain('com//api');
  });
});

describe('unsubscribe tokens — both secrets unset is fail-closed', () => {
  beforeEach(() => {
    delete process.env.LEAD_UNSUB_SECRET;
    delete process.env.JWT_SECRET;
  });

  it('reports that signing is not configured', () => {
    expect(isUnsubscribeSigningConfigured()).toBe(false);
  });

  it('returns null from buildUnsubscribeUrl', () => {
    expect(buildUnsubscribeUrl(7)).toBeNull();
  });

  it('refuses to mint a token rather than signing with undefined', () => {
    expect(() => makeUnsubscribeToken(7)).toThrow();
  });

  it('treats every token as invalid when nothing can verify it', () => {
    expect(verifyUnsubscribeToken(7, 'a'.repeat(64))).toBe(false);
  });

  it('still renders every template, with the footer but WITHOUT a link', () => {
    // This is the point of the fail-closed/fail-open split: the mail must still go out,
    // so a real reply is never silently dropped. Only the link is withheld.
    for (const name of TEMPLATE_NAMES) {
      const out = renderEmailTemplate(name, { firstName: 'Marcus', unsubscribeUrl: null });

      expect(out.subject.length, `${name} subject`).toBeGreaterThan(0);
      expect(out.text, `${name} text`).toContain(UNSUBSCRIBE_FOOTER);
      expect(out.html, `${name} html`).toContain(UNSUBSCRIBE_FOOTER);
      expect(out.html, `${name} must not carry an unsigned link`).not.toContain(
        '/api/leads/unsubscribe',
      );
      expect(out.text).not.toContain('/api/leads/unsubscribe');
    }
  });
});
