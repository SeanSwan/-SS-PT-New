/**
 * Locks the ?type= → consultationType contract used by YouTube/marketing CTAs
 * (e.g. /contact?type=assessment&utm_source=youtube). Allowlist prevents query
 * strings from injecting arbitrary text into the backend's
 * `[CONSULTATION TYPE]`-prefixed message.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { readConsultationType } from './ContactV3';

function setSearch(search: string) {
  window.history.replaceState({}, '', `${window.location.pathname}${search}`);
}

describe('readConsultationType', () => {
  afterEach(() => setSearch(''));

  it('returns an allowlisted type from ?type=', () => {
    setSearch('?type=assessment&utm_source=youtube');
    expect(readConsultationType()).toBe('assessment');
  });

  it.each(['training', 'app', 'general'])('accepts allowlisted %s', (t) => {
    setSearch(`?type=${t}`);
    expect(readConsultationType()).toBe(t);
  });

  it('falls back to general for non-allowlisted values (injection guard)', () => {
    setSearch('?type=URGENT%20WIRE%20MONEY');
    expect(readConsultationType()).toBe('general');
  });

  it('falls back to general when absent', () => {
    setSearch('');
    expect(readConsultationType()).toBe('general');
  });
});
