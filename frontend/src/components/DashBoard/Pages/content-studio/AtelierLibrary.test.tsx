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

describe('the Assets tab is operable without a mouse', () => {
  it('no interactive control is nested inside a <label>, and each label wraps exactly one', async () => {
    // A control inside a label that also contains another control makes the label
    // ambiguous, and screen readers announce the wrong thing for both.
    const { api } = fakeApi({ assets: [asset()], hasMore: true, nextCursor: 'C1', pageSize: 24 });
    const { container } = render(<AtelierLibrary api={api} />);
    await screen.findByAltText(/red fox/);
    expect(container.querySelectorAll('label button, label a, label [role="button"]').length).toBe(0);
    for (const label of Array.from(container.querySelectorAll('label'))) {
      expect(label.querySelectorAll('input, select, textarea').length).toBe(1);
    }
  });

  it('every control has an accessible name and none is reachable only by hover', async () => {
    const { api } = fakeApi({ assets: [asset()], hasMore: true, nextCursor: 'C1', pageSize: 24 });
    const { container } = render(<AtelierLibrary api={api} />);
    await screen.findByAltText(/red fox/);
    for (const el of Array.from(container.querySelectorAll('button, select'))) {
      const name = el.getAttribute('aria-label') || el.textContent?.trim();
      expect(name, `${el.tagName} has no accessible name`).toBeTruthy();
    }
    // Both actions are real buttons in the document, not hover-revealed affordances.
    expect(screen.getByRole('button', { name: /refresh/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /load more/i })).toBeTruthy();
  });

  it('an asset card is not itself interactive, so nothing is a click target without a role', async () => {
    // The card is an <article>. If it ever becomes clickable it needs a real button or
    // link inside it — a div with onClick is invisible to keyboard and assistive tech.
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    const { container } = render(<AtelierLibrary api={api} />);
    await screen.findByAltText(/red fox/);
    const card = container.querySelector('article');
    expect(card).toBeTruthy();
    expect(card?.getAttribute('onclick')).toBeNull();
    expect(card?.getAttribute('tabindex')).toBeNull();
  });
});

describe('recovery paths actually recover', () => {
  it('REFRESH un-breaks a card whose preview had expired', async () => {
    // Found in a self-review round. `broken` was set on image error and never cleared, so
    // Refresh — the exact action a person takes when a preview has gone stale — fetched a
    // working signed URL and handed it to a card that still refused to render it. The
    // placeholder was permanent until the tab was reloaded.
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    const img = await screen.findByAltText(/red fox/);
    fireEvent.error(img);                                   // TTL expires
    expect(await screen.findByText('1920x1080')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));
    expect(await screen.findByAltText(/red fox/)).toBeTruthy();   // renders again
  });

  it('an unreachable client is NOT reported as an empty library', () => {
    // "You have made nothing" is the most alarming thing a studio can say, so it is only
    // said when it is true. Three emptinesses, three sentences.
    expect(describeEmpty(false, false)).toMatch(/connection problem/i);
    expect(describeEmpty(false, false)).not.toMatch(/Nothing here yet/);
    expect(describeEmpty(false, true)).toMatch(/Nothing here yet/);
    expect(describeEmpty(true, true)).toMatch(/Nothing matches these filters/);
  });
});

describe('a clip is labelled, because its poster looks exactly like a still', () => {
  it('shows the kind for a video', async () => {
    const { api } = fakeApi({
      assets: [asset({ id: 'v1', kind: 'video', mime: 'video/mp4', previewUrl: 'https://cdn/poster.webp' })],
      hasMore: false, nextCursor: null, pageSize: 24,
    });
    render(<AtelierLibrary api={api} />);
    expect(await screen.findByText(/video/)).toBeInTheDocument();
  });

  it('does NOT label a still, because "image" on every card is noise', async () => {
    // The marker earns its place by being rare. Printing the kind unconditionally would put
    // the same word on every card in the common case and stop being read at all.
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    await screen.findByAltText(/lone red fox/);
    expect(screen.queryByText(/image/)).not.toBeInTheDocument();
  });
});

describe('the banner is where previewsUnavailable actually means something', () => {
  // The flag exists ONLY to raise this notice, and it was the subject of a reversal:
  // it must not fire when a single object failed, because "this is a preview-signing
  // problem" is then a false statement to the operator. Every other test for it asserts
  // the boolean at the value level; this is the seam where a person reads it, and until
  // now nothing rendered it.
  it('shows the signer notice when the server reports previews unavailable', async () => {
    const { api } = fakeApi({
      assets: [asset({ previewUrl: null })], hasMore: false, nextCursor: null,
      pageSize: 24, previewsUnavailable: true,
    });
    render(<AtelierLibrary api={api} />);
    expect(await screen.findByText(/preview-signing problem/i)).toBeInTheDocument();
  });

  it('stays silent when the server does not report it', async () => {
    const { api } = fakeApi({
      assets: [asset({ previewUrl: null })], hasMore: false, nextCursor: null,
      pageSize: 24, previewsUnavailable: false,
    });
    render(<AtelierLibrary api={api} />);
    await screen.findByText(/lone red fox/);
    expect(screen.queryByText(/preview-signing problem/i)).not.toBeInTheDocument();
  });

  it('a page that omits the field is not a signer failure', async () => {
    // Absent must read as false, not as truthy-undefined.
    const { api } = fakeApi({ assets: [asset()], hasMore: false, nextCursor: null, pageSize: 24 });
    render(<AtelierLibrary api={api} />);
    await screen.findByAltText(/lone red fox/);
    expect(screen.queryByText(/preview-signing problem/i)).not.toBeInTheDocument();
  });
});

describe('the marker never renders a separator with nothing after it', () => {
  it('a row with no kind shows no dangling separator', async () => {
    // `null !== 'image'` is true, so the guard was one truthiness check short of rendering
    // " · " followed by nothing. MediaAsset.kind is allowNull: false with an isIn
    // validator, so this cannot arrive from the database — but a card that renders
    // punctuation for absent data is the same small dishonesty as a poster with no label.
    const { api } = fakeApi({
      assets: [asset({ kind: null as unknown as string })],
      hasMore: false, nextCursor: null, pageSize: 24,
    });
    const { container } = render(<AtelierLibrary api={api} />);
    await screen.findByAltText(/lone red fox/);
    // Without the guard the meta row reads "draft ·  · universal" — two separators with
    // nothing between them. With it, "draft · universal".
    expect(container.textContent).not.toMatch(/·\s*·/);
  });
});
