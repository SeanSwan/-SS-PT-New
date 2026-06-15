/**
 * leadCaptureShared — acquisition-channel attribution helpers.
 * deriveChannel / channelToLeadSource / channelTags are pure (no DB), so we can
 * assert the normalization + Lead.source ENUM mapping directly. utm/referrer are
 * non-PII marketing signals (rule 8).
 */
import { describe, expect, it } from 'vitest';
import { deriveChannel, channelToLeadSource, channelTags } from '../services/leadCaptureShared.mjs';

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
