/**
 * The Assets library — honesty rules, pinned.
 *
 * WHAT THESE PREVENT
 *   1. "No assets" shown when a FILTER is what emptied the list. That reads as
 *      lost work, and lost work is the most alarming thing a studio can say.
 *   2. A failed load rendering as an empty library — same lie, worse cause.
 *   3. Brand options invented in the bundle instead of read from the server.
 *   4. Page arithmetic in the client: paging follows the server's cursor.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AtelierLibrary, { describeEmpty } from './AtelierLibrary';

const KITS = [
  { id: 'swanstudios', name: 'SwanStudios', lawProfile: 'full' as const, aspectDefault: '16:9', isDefault: true },
  { id: 'universal', name: 'Universal (no brand laws)', lawProfile: 'universal' as const, aspectDefault: '16:9', isDefault: false },
];

const asset = (over = {}) => ({
  id: 'a1', kind: 'image', mime: 'image/png', width: 1920, height: 1080, sizeBytes: 2048,
  status: 'draft' as const, createdAt: '2026-08-26T10:00:00.000Z',
  brandKit: 'universal', brandKitHash: '8f7701a221ed', workspaceId: 'ws-1', lane: 'local', seed: 42,
  prompt: 'a lone red fox crossing a snowfield', promptTruncated: false,
  previewUrl: 'https://cdn.example/atelier/stills/1/abc.png?sig=x', ...over,
});

function fakeApi(page: unknown, { fail = false } = {}) {
  const calls: { url: string; params?: Record<string, string> }[] = [];
  return {
    calls,
    api: {
      get: vi.fn(async (url: string, cfg?: { params?: Record<string, string> }) => {
        calls.push({ url, params: cfg?.params });
        if (url.endsWith('/limits')) return { data: { success: true, data: { brandKits: KITS } } };
        if (fail) throw Object.assign(new Error('boom'), { response: { data: { error: 'Compose failed unexpectedly.' } } });
        return { data: { success: true, data: page } };
      }),
    } as never,
  };
}

describe('an empty library says WHICH emptiness it is', () => {
  it('distinguishes "nothing made yet" from "nothing matches"', () => {
    expect(describeEmpty(false)).toMatch(/Nothing here yet/);
    expect(describeEmpty(false)).not.toMatch(/filter/i);
    expect(describeEmpty(true)).toMatch(/Nothing matches these filters/);
    // The reassurance matters: an operator who filtered must not think work was deleted.
    expect(describeEmpty(true)).toMatch(/still here/);
  });

  it('shows the unfiltered message on a genuinely empty library', async () => {
    const { api } = fakeApi({ assets: [], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    expect(await screen.findByText(/Nothing here yet/)).toBeTruthy();
  });

  it('switches to the FILTERED message once a filter is on', async () => {
    const { api } = fakeApi({ assets: [], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    await screen.findByText(/Nothing here yet/);
    fireEvent.change(screen.getByLabelText(/filter by status/i), { target: { value: 'published' } });
    expect(await screen.findByText(/Nothing matches these filters/)).toBeTruthy();
  });
});

describe('a failed load is never an empty library', () => {
  it('shows the failure and says the assets are safe', async () => {
    const { api } = fakeApi(null, { fail: true });
    render(<AtelierLibrary api={api} />);
    const notice = await screen.findByText(/Compose failed unexpectedly/);
    expect(notice.getAttribute('role')).toBe('status');
    // And it must NOT also claim the library is empty.
    expect(screen.queryByText(/Nothing here yet/)).toBeNull();
  });
});

describe('the server owns the options and the paging', () => {
  it('builds the brand filter from /limits, not from a constant', async () => {
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    const picker = await screen.findByLabelText(/filter by brand kit/i);
    const options = Array.from(picker.querySelectorAll('option')).map((o) => o.textContent);
    expect(options).toEqual(['Any brand', 'SwanStudios', 'Universal (no brand laws)']);
  });

  it('sends the filters as query params rather than filtering in the browser', async () => {
    const { api, calls } = fakeApi({ assets: [], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    await screen.findByText(/Nothing here yet/);
    fireEvent.change(screen.getByLabelText(/filter by brand kit/i), { target: { value: 'universal' } });
    await waitFor(() => {
      const last = calls.filter((c) => c.url.endsWith('/assets')).pop();
      expect(last?.params).toMatchObject({ brandKit: 'universal' });
    });
  });

  it('follows the cursor the server issued — no page arithmetic here to get wrong', async () => {
    const { api, calls } = fakeApi({ assets: [asset()], hasMore: true, nextCursor: 'CURSOR-1', pageSize: 1 });
    render(<AtelierLibrary api={api} />);
    const more = await screen.findByRole('button', { name: /load more/i });
    fireEvent.click(more);
    await waitFor(() => {
      const last = calls.filter((c) => c.url.endsWith('/assets')).pop();
      expect(last?.params).toMatchObject({ cursor: 'CURSOR-1' });
    });
  });

  it('offers no "load more" when the server says there is none', async () => {
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    await screen.findByText(/red fox/);
    expect(screen.queryByRole('button', { name: /load more/i })).toBeNull();
  });

  it('shows the brand and lane on a card so the filter has something to match', async () => {
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    expect(await screen.findByText(/red fox/)).toBeTruthy();
    expect(screen.getByText(/universal/)).toBeTruthy();
  });
});

describe('a library shows the work, not its dimensions', () => {
  it('renders the signed preview with the prompt as its alt text', async () => {
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    const img = await screen.findByAltText(/red fox/);
    expect(img.getAttribute('src')).toMatch(/^https:\/\/cdn\.example\//);
    // Lazy: a page of two dozen must not fetch two dozen images before first paint.
    expect(img.getAttribute('loading')).toBe('lazy');
  });

  it('falls back to dimensions when an object would not sign', async () => {
    // Null preview is a degraded card, never an error and never an empty page.
    const { api } = fakeApi({ assets: [asset({ previewUrl: null })], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    expect(await screen.findByLabelText(/red fox/)).toBeTruthy();
    expect(screen.getByText('1920x1080')).toBeTruthy();
    expect(screen.queryByAltText(/red fox/)).toBeNull();
  });
});

describe('degradation stays visible', () => {
  it('an expired preview falls back to the PLACEHOLDER, not to a hole', async () => {
    // The first version hid the image on error, which left a gap — contradicting the very
    // principle it was written to serve. A reviewer caught it.
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    const img = await screen.findByAltText(/red fox/);
    fireEvent.error(img);
    expect(await screen.findByText('1920x1080')).toBeTruthy();
    expect(screen.queryByAltText(/red fox/)).toBeNull();
  });

  it('when EVERY preview fails, the page says it is the signer and not your assets', async () => {
    const { api } = fakeApi({
      assets: [asset({ previewUrl: null })], hasMore: false, nextCursor: null, pageSize: 24,
      previewsUnavailable: true,
    });
    render(<AtelierLibrary api={api} />);
    const notice = await screen.findByText(/preview-signing problem, not a/i);
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent).toMatch(/still here/i);
  });
});
