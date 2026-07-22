/**
 * acquisition.test.ts — P0-4 (SWA-29) client beacon contract.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackFunnel, trackVisit } from './acquisition';

async function parseBeaconBody(blob: Blob): Promise<Record<string, unknown>> {
  // jsdom's Blob doesn't implement .text(); read via FileReader (which jsdom does provide).
  const maybeText = (blob as unknown as { text?: () => Promise<string> }).text;
  const text =
    typeof maybeText === 'function'
      ? await maybeText.call(blob)
      : await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(fr.error);
          fr.readAsText(blob);
        });
  return JSON.parse(text);
}

describe('trackFunnel', () => {
  let sendBeacon: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs a client event to the beacon endpoint with a JSON blob', async () => {
    trackFunnel('visit', { source: '/home' });
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = sendBeacon.mock.calls[0];
    expect(url).toBe('/api/telemetry/funnel');
    expect((blob as Blob).type).toBe('application/json');
    const body = await parseBeaconBody(blob as Blob);
    expect(body.event).toBe('visit');
    expect(body.meta).toEqual({ source: '/home' });
  });

  it('lifts ref to the top level (referral attribution)', async () => {
    trackFunnel('ref_landed', { ref: 'CODE9' });
    const body = await parseBeaconBody(sendBeacon.mock.calls[0][1] as Blob);
    expect(body.ref).toBe('CODE9');
    expect(body.meta).toEqual({});
  });

  it('refuses a non-client event (courtesy mirror of the server allowlist)', () => {
    // @ts-expect-error — deliberately invalid event
    trackFunnel('converted', { source: 'x' });
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('falls back to fetch(keepalive) when sendBeacon is unavailable', () => {
    vi.stubGlobal('navigator', {});
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('fetch', fetchMock);
    trackFunnel('visit', { source: '/x' });
    expect(fetchMock).toHaveBeenCalledWith('/api/telemetry/funnel', expect.objectContaining({ method: 'POST', keepalive: true }));
  });

  it('never throws even if the transport blows up', () => {
    vi.stubGlobal('navigator', { sendBeacon: () => { throw new Error('boom'); } });
    expect(() => trackFunnel('visit')).not.toThrow();
  });
});

describe('trackVisit', () => {
  let sendBeacon: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('fires a single visit when there is no ref', () => {
    window.history.replaceState({}, '', '/pricing');
    trackVisit();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('also fires ref_landed when ?ref= is present', async () => {
    window.history.replaceState({}, '', '/?ref=FRIEND42');
    trackVisit();
    expect(sendBeacon).toHaveBeenCalledTimes(2);
    const events = await Promise.all(sendBeacon.mock.calls.map((c) => parseBeaconBody(c[1] as Blob)));
    expect(events.map((e) => e.event).sort()).toEqual(['ref_landed', 'visit']);
    expect(events.find((e) => e.event === 'ref_landed')?.ref).toBe('FRIEND42');
  });
});
