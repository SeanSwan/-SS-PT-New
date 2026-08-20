/**
 * leadCaptureShared — acquisition-channel attribution helpers.
 * deriveChannel / channelToLeadSource / channelTags are pure (no DB), so we can
 * assert the normalization + Lead.source ENUM mapping directly. utm/referrer are
 * non-PII marketing signals (rule 8).
 */
import { describe, expect, it } from 'vitest';
import { deriveChannel, channelToLeadSource, channelTags, aggregateLeadChannels, intentTag, CAPTURE_INTENTS } from '../services/leadCaptureShared.mjs';

describe('deriveChannel', () => {
  it('reads utm_source and normalizes case + aliases', () => {
    expect(deriveChannel({ utmSource: 'YouTube' })).toEqual({ channel: 'youtube', leadSource: 'social_media' });
    expect(deriveChannel({ utmSource: 'ig' }).channel).toBe('instagram');
    expect(deriveChannel({ utmSource: 'fb' }).channel).toBe('facebook');
    expect(deriveChannel({ utmSource: 'x' }).channel).toBe('twitter');
  });

  it('falls back to the referrer host when there is no utm_source', () => {
    expect(deriveChannel({ referrer: 'https://www.tiktok.com/@coach' }).channel).toBe('tiktok');
    expect(deriveChannel({ referrer: 'https://nextdoor.com/p/123' }).channel).toBe('nextdoor');
    expect(deriveChannel({ referrer: 'https://news.example.com/post' }).channel).toBe('referral'); // unknown external -> referral
  });

  it('returns direct/website when there is no signal at all', () => {
    expect(deriveChannel({})).toEqual({ channel: 'direct', leadSource: 'website' });
    expect(deriveChannel({ referrer: '' }).channel).toBe('direct');
  });

  it('honors utm_medium=social for an unknown source', () => {
    expect(deriveChannel({ utmSource: 'partner_newsletter', utmMedium: 'social' }).leadSource).toBe('social_media');
    expect(deriveChannel({ utmSource: 'partner', utmMedium: 'referral' }).leadSource).toBe('referral');
  });

  it('sanitizes hostile utm values (no injection into channel/tag)', () => {
    expect(deriveChannel({ utmSource: '<script>alert(1)</script>' }).channel).toBe('scriptalert1script');
    expect(deriveChannel({ utmSource: 'a'.repeat(200) }).channel.length).toBeLessThanOrEqual(40);
  });
});

describe('channelToLeadSource', () => {
  it('maps social platforms to social_media', () => {
    expect(channelToLeadSource('instagram')).toBe('social_media');
    expect(channelToLeadSource('twitch')).toBe('social_media');
  });
  it('maps referral to referral, everything else to website', () => {
    expect(channelToLeadSource('referral')).toBe('referral');
    expect(channelToLeadSource('google')).toBe('website');
    expect(channelToLeadSource('direct')).toBe('website');
  });
});

describe('channelTags', () => {
  it('tags real channels but skips direct/website/empty', () => {
    expect(channelTags('youtube')).toEqual(['channel:youtube']);
    expect(channelTags('direct')).toEqual([]);
    expect(channelTags('website')).toEqual([]);
    expect(channelTags('')).toEqual([]);
    expect(channelTags(null)).toEqual([]);
  });
});

describe('aggregateLeadChannels', () => {
  it('counts by channel tag and sorts desc', () => {
    const rows = [
      { tags: ['newsletter', 'channel:youtube'], source: 'social_media' },
      { tags: ['channel:youtube'], source: 'social_media' },
      { tags: ['channel:tiktok'], source: 'social_media' },
    ];
    expect(aggregateLeadChannels(rows)).toEqual([
      { channel: 'youtube', count: 2, converted: 0 },
      { channel: 'tiktok', count: 1, converted: 0 },
    ]);
  });

  it('counts converted leads per channel (which channel produces paying clients)', () => {
    const rows = [
      { tags: ['channel:youtube'], status: 'converted' },
      { tags: ['channel:youtube'], status: 'new' },
      { tags: ['channel:tiktok'], status: 'converted' },
    ];
    const out = aggregateLeadChannels(rows);
    expect(out.find((c) => c.channel === 'youtube')).toEqual({ channel: 'youtube', count: 2, converted: 1 });
    expect(out.find((c) => c.channel === 'tiktok').converted).toBe(1);
  });

  it('buckets untagged leads by their source enum (friendly labels)', () => {
    const rows = [
      { tags: [], source: 'website' },     // -> direct
      { tags: null, source: 'referral' },  // -> referral
      { tags: ['signup'], source: 'social_media' }, // -> social
    ];
    const out = aggregateLeadChannels(rows);
    expect(out.map((c) => c.channel).sort()).toEqual(['direct', 'referral', 'social']);
  });

  it('respects the topN cap and tolerates empty/garbage input', () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ tags: [`channel:c${i}`], source: 'website' }));
    expect(aggregateLeadChannels(rows, 3)).toHaveLength(3);
    expect(aggregateLeadChannels()).toEqual([]);
    expect(aggregateLeadChannels(null)).toEqual([]);
  });
});

// --- Capture intent ----------------------------------------------------------
// The trainer funnel's structured marker. Before this existed the signal survived only as the
// literal text "Subject: Trainer inquiry" folded into Lead.notes, so trainer leads were countable
// only by full-text-scanning a free-text column. intentTag is pure, so assert it directly.
describe('intentTag', () => {
  it('tags every recognized intent', () => {
    expect(intentTag('trainer')).toBe('prism:intent:trainer');
    expect(intentTag('book')).toBe('prism:intent:book');
    expect(intentTag('spectrum')).toBe('prism:intent:spectrum');
  });

  it('returns null for anything not on the allowlist', () => {
    // The intent arrives from a visitor-craftable URL param, so an arbitrary query string must
    // never become an arbitrary CRM tag.
    expect(intentTag('admin')).toBeNull();
    expect(intentTag('trainer; DROP TABLE leads')).toBeNull();
    expect(intentTag('Trainer')).toBeNull();   // case-sensitive: only the exact vocabulary
    expect(intentTag('')).toBeNull();
  });

  it('returns null for absent or non-string input rather than throwing', () => {
    // captureLeadFromContact defaults intent to null; every other caller omits it entirely.
    expect(intentTag(null)).toBeNull();
    expect(intentTag(undefined)).toBeNull();
    expect(intentTag(123)).toBeNull();
    expect(intentTag({ toString: () => 'trainer' })).toBeNull();
    expect(intentTag(['trainer'])).toBeNull();
  });

  it('covers the whole published vocabulary — a new intent cannot be added untested', () => {
    for (const intent of CAPTURE_INTENTS) {
      expect(intentTag(intent)).toBe(`prism:intent:${intent}`);
    }
  });
});

describe('CAPTURE_INTENTS', () => {
  it('is the single source of truth for both public funnels', () => {
    // leadCaptureRoutes (POST /api/leads/capture) and captureLeadFromContact both validate against
    // this. Two copies of an enum is the drift class rule 58 exists for — if this list changes,
    // it must change in exactly one place.
    expect([...CAPTURE_INTENTS].sort()).toEqual(['book', 'spectrum', 'trainer']);
  });

  it('is frozen, so no caller can mutate the shared vocabulary at runtime', () => {
    expect(Object.isFrozen(CAPTURE_INTENTS)).toBe(true);
  });
});
