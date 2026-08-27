/**
 * Reusing a saved frame — the Assets library stops being a dead end.
 *
 * WHAT THESE PREVENT
 *   1. A library you can look at and do nothing with. Motion lives in Compose, so reusing a
 *      past render means arriving there with it already bound.
 *   2. A "Use" button on an asset that cannot be bound. Motion refuses to animate a frame
 *      whose recorded hash is not the one approved, so an asset with no hash can never
 *      complete the action — it must be disabled WITH ITS REASON, not hidden and not
 *      offered-then-failing.
 *   3. An affordance that goes nowhere: no callback, no button.
 *   4. A carried-in frame surviving a new batch. Composing four fresh candidates must
 *      retire it, or "Approve → Motion" sits over frames it is not bound to.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AtelierLibrary, { reusable } from './AtelierLibrary';
import AtelierCompose from './AtelierCompose';

const KITS = [{ id: 'universal', name: 'Universal (no brand laws)', lawProfile: 'universal' as const, aspectDefault: '16:9', isDefault: true }];

const asset = (over = {}) => ({
  id: 'a1', kind: 'image', mime: 'image/png', width: 1920, height: 1080, sizeBytes: 2048,
  status: 'draft' as const, createdAt: '2026-08-27T10:00:00.000Z',
  brandKit: 'universal', brandKitHash: '8f7701a221ed', workspaceId: null, lane: 'local', seed: 42,
  sha256: 'ab'.repeat(32), prompt: 'a lone red fox crossing a snowfield', promptTruncated: false,
  previewUrl: 'https://cdn.example/atelier/stills/1/thumbs/abc.webp?sig=x', ...over,
});

function libraryApi(page: unknown) {
  return {
    get: vi.fn(async (url: string) => {
      if (url.endsWith('/limits')) return { data: { success: true, data: { brandKits: KITS } } };
      return { data: { success: true, data: page } };
    }),
  } as never;
}

describe('the rule for whether a frame can be reused', () => {
  it('needs an image AND the hash of its bytes', () => {
    expect(reusable({ kind: 'image', sha256: 'ab'.repeat(32) }).ok).toBe(true);
    // Motion binds bytes, not words. Without a recorded hash the server has nothing to
    // compare and the bind cannot be honest, so the card must not offer it.
    expect(reusable({ kind: 'image', sha256: null }).ok).toBe(false);
    expect(reusable({ kind: 'image', sha256: null }).why).toMatch(/no recorded hash/i);
    expect(reusable({ kind: 'video', sha256: 'ab'.repeat(32) }).ok).toBe(false);
    expect(reusable({ kind: 'video', sha256: 'ab'.repeat(32) }).why).toMatch(/video/i);
  });
});

describe('the library offers the handoff, or explains why it cannot', () => {
  const page = (assets: unknown[]) => ({ assets, hasMore: false, nextCursor: null, pageSize: 24 });

  it('offers nothing when there is nowhere to hand the asset to', async () => {
    // An affordance that goes nowhere is worse than none: the library is also shown on its
    // own, and a button that silently does nothing teaches an operator to distrust buttons.
    render(<AtelierLibrary api={libraryApi(page([asset()]))} />);
    await screen.findByAltText(/red fox/);
    expect(screen.queryByRole('button', { name: /use .* in compose/i })).toBeNull();
  });

  it('hands the asset over when the card is clicked', async () => {
    const onUse = vi.fn();
    render(<AtelierLibrary api={libraryApi(page([asset()]))} onUse={onUse} />);
    const btn = await screen.findByRole('button', { name: /use .* in compose/i });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse.mock.calls[0][0]).toMatchObject({ id: 'a1', sha256: 'ab'.repeat(32) });
  });

  it('shows the button DISABLED with its reason when the frame cannot be bound', async () => {
    // Disabled and explained beats hidden: the operator learns the asset is unusable and
    // why, instead of wondering where the control went.
    const onUse = vi.fn();
    render(<AtelierLibrary api={libraryApi(page([asset({ sha256: null })]))} onUse={onUse} />);
    const btn = await screen.findByRole('button', { name: /use .* in compose/i });
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('title')).toMatch(/no recorded hash/i);
    fireEvent.click(btn);
    expect(onUse).not.toHaveBeenCalled();
  });
});

describe('Compose adopts the frame it was handed', () => {
  const LIMITS = {
    maxStills: 4,
    lanes: {
      local: { provider: 'comfyui/wan-2.2', status: 'probed', ready: true, advertisable: true, problems: [], probeEnvKey: 'SWAN_ATELIER_LOCAL_STILLS', unitUsd: 0 },
      hosted: { enabled: false, spendEnvKey: 'SWAN_ATELIER_MAX_SPEND_USD_DAILY', limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0 } },
    },
    brandKits: KITS, usage: { runs: 0, spendUsd: 0 }, ledger: 'file', enabled: true, note: '',
  };
  const composeApi = () => ({
    get: vi.fn(async (url: string) => {
      if (url.endsWith('/limits')) return { data: { success: true, data: LIMITS } };
      // A REALISTIC reference. The first version returned only `{ status: 'draft' }` and
      // crashed the Publish panel on a missing `blockers` array — which found a real
      // fragility, but a fake this thin tests the fake.
      return { data: { success: true, data: {
        id: 'a1', status: 'draft', r2Key: 'k', mime: 'image/png', width: 1920, height: 1080,
        sha256: 'ab'.repeat(32), attribution: null, attributionRequired: false, licence: null,
        blockers: [], readUrl: null, snippet: null, withheld: null,
      } } };
    }),
    post: vi.fn(async () => ({ data: { success: true, data: { jobId: 'j1', status: 'queued', startable: true, workerState: 'idle' } } })),
  }) as never;

  const frame = { assetId: 'a1', sha256: 'ab'.repeat(32), prompt: 'a lone red fox', previewUrl: 'https://cdn.example/t.webp' };

  it('shows what it is about to animate, rather than binding to something invisible', async () => {
    render(<AtelierCompose api={composeApi()} incoming={frame} />);
    expect(await screen.findByText(/Reusing a saved frame/)).toBeTruthy();
    expect(screen.getByAltText(/red fox/)).toBeTruthy();
  });

  it('binds Motion to the carried-in frame, with no batch present', async () => {
    render(<AtelierCompose api={composeApi()} incoming={frame} />);
    await screen.findByText(/Reusing a saved frame/);
    // The readout names the exact asset and hash the server will be asked to verify.
    await waitFor(() => {
      expect(screen.getByText(/Motion binds to asset a1/)).toBeTruthy();
    });
  });

  it('offers no Motion binding when nothing was carried in and nothing is selected', async () => {
    render(<AtelierCompose api={composeApi()} incoming={null} />);
    await screen.findByLabelText(/brand kit/i);   // the studio has finished loading limits
    expect(screen.queryByText(/Motion binds to asset/)).toBeNull();
  });
});

describe('a new batch retires the frame you walked in with', () => {
  // The trap this closes: render four fresh candidates and Motion would still point at the
  // picture carried in from the library. "Approve → Motion" would sit over frames it was
  // not bound to — the quiet kind of lie this studio spends most of its code refusing.
  const LIMITS_READY = {
    maxStills: 4,
    lanes: {
      local: { provider: 'comfyui/wan-2.2', status: 'probed', ready: true, advertisable: true, problems: [], probeEnvKey: 'SWAN_ATELIER_LOCAL_STILLS', unitUsd: 0 },
      hosted: { enabled: false, spendEnvKey: 'SWAN_ATELIER_MAX_SPEND_USD_DAILY', limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0 } },
    },
    brandKits: KITS, usage: { runs: 0, spendUsd: 0 }, ledger: 'file', enabled: true, note: '',
  };
  const RESULT = {
    estimateOnly: false, lane: 'local', promptSource: 'brief', partial: false, replayed: false,
    stills: [{ index: 0, lane: 'local', image: { kind: 'b64', data: 'AAAA' }, seed: 1, promptHash: 'h', promptText: 'new frame', provider: 'comfyui/wan-2.2', sha256: 'cd'.repeat(32), assetId: 'a2' }],
    failures: [], cost: { count: 1, model: 'comfyui/wan-2.2', unitUsd: 0, totalUsd: 0, chargedUsd: 0, lane: 'local' },
    model: 'comfyui/wan-2.2', key: 'k', admission: null, brandKit: null,
  };

  it('stops binding to the carried-in frame once a batch exists', async () => {
    const api = {
      get: vi.fn(async (url: string) => {
        if (url.endsWith('/limits')) return { data: { success: true, data: LIMITS_READY } };
        return { data: { success: true, data: {
          id: 'a1', status: 'draft', r2Key: 'k', mime: 'image/png', width: 1920, height: 1080,
          sha256: 'ab'.repeat(32), attribution: null, attributionRequired: false, licence: null,
          blockers: [], readUrl: null, snippet: null, withheld: null,
        } } };
      }),
      post: vi.fn(async () => ({ data: { success: true, data: RESULT } })),
    } as never;

    render(<AtelierCompose api={api} incoming={{ assetId: 'a1', sha256: 'ab'.repeat(32), prompt: 'the old fox', previewUrl: 'https://cdn.example/t.webp' }} />);
    expect(await screen.findByText(/Reusing a saved frame/)).toBeTruthy();

    // Compose a new batch.
    const brief = await screen.findByLabelText(/brief|describe/i).catch(() => null) as HTMLElement | null;
    if (brief) fireEvent.change(brief, { target: { value: 'a glacier calving into black water at dawn' } });
    const run = await screen.findByRole('button', { name: /render|compose|generate/i });
    fireEvent.click(run);

    // The carried-in frame is gone; Motion no longer claims to bind to it.
    await waitFor(() => {
      expect(screen.queryByText(/Reusing a saved frame/)).toBeNull();
    });
    expect(screen.queryByText(/Motion binds to asset a1/)).toBeNull();
  });
});

describe('the handoff is a delivery, not a standing value', () => {
  it('is taken exactly once, so revisiting the tab does not re-adopt an old frame', async () => {
    // Compose remounts on every tab switch. If the hub kept handing the same asset over,
    // merely VISITING Compose would silently adopt a frame the operator had moved on from.
    const onAdopted = vi.fn();
    const api = {
      get: vi.fn(async (url: string) => {
        if (url.endsWith('/limits')) return { data: { success: true, data: { maxStills: 4, lanes: { local: { provider: 'comfyui/wan-2.2', status: 'probed', ready: true, advertisable: true, problems: [], probeEnvKey: 'X', unitUsd: 0 }, hosted: { enabled: false, spendEnvKey: 'Y', limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0 } } }, brandKits: KITS, usage: { runs: 0, spendUsd: 0 }, ledger: 'file', enabled: true, note: '' } } };
        return { data: { success: true, data: {
          id: 'a1', status: 'draft', r2Key: 'k', mime: 'image/png', width: 1920, height: 1080,
          sha256: 'ab'.repeat(32), attribution: null, attributionRequired: false, licence: null,
          blockers: [], readUrl: null, snippet: null, withheld: null,
        } } };
      }),
      post: vi.fn(),
    } as never;

    render(<AtelierCompose api={api} incoming={{ assetId: 'a1', sha256: 'ab'.repeat(32), prompt: 'the fox', previewUrl: null }} onAdopted={onAdopted} />);
    await screen.findByText(/Reusing a saved frame/);
    await waitFor(() => expect(onAdopted).toHaveBeenCalledTimes(1));
  });
});

describe('the reason reaches people who cannot hover', () => {
  it('renders WHY as text, not only in a tooltip', async () => {
    // A disabled button is not focusable, so `title` alone never reaches a keyboard or
    // screen-reader user, and nothing hovers on a phone. Explaining instead of hiding only
    // works if the explanation is actually readable.
    const page = { assets: [asset({ sha256: null })], hasMore: false, nextCursor: null, pageSize: 24 };
    render(<AtelierLibrary api={libraryApi(page)} onUse={vi.fn()} />);
    const why = await screen.findByText(/no recorded hash/i);
    expect(why).toBeTruthy();
    const btn = screen.getByRole('button', { name: /use .* in compose/i });
    expect(btn.getAttribute('aria-describedby')).toBe(why.id);
  });
});
