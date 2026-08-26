/**
 * The Publish panel, rendered — the declaration is a real gate, and "Copy link"
 * copies the PERMALINK, never the expiring signed URL.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AtelierCompose from './AtelierCompose';

const LIMITS = {
  maxStills: 4,
  lanes: {
    local: { provider: 'comfyui/wan-2.2', status: 'claimed', ready: false, advertisable: false, problems: ['unprobed'], probeEnvKey: 'SWAN_ATELIER_LOCAL_STILLS', unitUsd: 0 },
    hosted: { enabled: true, spendEnvKey: 'SWAN_ATELIER_MAX_SPEND_USD_DAILY', limits: { maxRunsDaily: 50, maxSpendUsdDaily: 5 } },
  },
  usage: { runs: 0, spendUsd: 0 }, ledger: 'file', enabled: true, note: '',
};
const STILL = { index: 0, lane: 'hosted', image: { kind: 'b64', data: 'AAAA' }, seed: 1, promptHash: 'abc', promptText: 'x', provider: 'openai/gpt-5.4-image-2', assetId: 'asset-1', sha256: 'ab'.repeat(32), persist: { ok: true, created: true } };
const RESULT = { lane: 'hosted', promptSource: 'brief', stills: [STILL], failures: [], partial: false, replayed: false, cost: { count: 1, model: 'm', unitUsd: 0.0039, totalUsd: 0.0039 }, model: 'm', idempotencyKey: 'k', admission: null, persistence: { ok: true, persisted: 1, total: 1 } };
const ref = (status: string) => ({ id: 'asset-1', status, r2Key: 'atelier/stills/1/x.png', mime: 'image/png', width: 1024, height: 576, sha256: 'ab'.repeat(32), attribution: 'Video generated with Wan 2.2', attributionRequired: false, licence: 'Apache License 2.0', blockers: [], readUrl: status === 'published' ? 'https://r2/x?sig' : null, permalink: status === 'published' ? 'https://site/api/atelier/public/asset-1' : null, snippet: null, withheld: null });

function api(state: { status: string; posts: unknown[] }) {
  return {
    get: vi.fn(async (url: string) => {
      if (url.endsWith('/limits')) return { data: { success: true, data: LIMITS } };
      if (url.endsWith('/reference')) return { data: { success: true, data: ref(state.status) } };
      throw new Error(`unexpected GET ${url}`);
    }),
    post: vi.fn(async (url: string, body: unknown) => {
      state.posts.push({ url, body });
      if (url.endsWith('/estimate')) return { data: { success: true, data: { lane: 'hosted', cost: RESULT.cost, model: 'm', count: 1 } } };
      if (url.endsWith('/stills')) return { data: { success: true, data: RESULT } };
      if (url.endsWith('/status')) { state.status = (body as { to: string }).to; return { data: { success: true, data: {} } }; }
      throw new Error(`unexpected POST ${url}`);
    }),
  } as unknown as import('axios').AxiosInstance;
}

async function reachApproved(state: { status: string; posts: unknown[] }) {
  render(<AtelierCompose api={api(state)} />);
  await waitFor(() => expect(screen.getByText(/Hosted lane · on/i)).toBeTruthy());
  fireEvent.change(screen.getByPlaceholderText(/glacier wall/i), { target: { value: 'a ridge at dawn' } });
  fireEvent.change(screen.getByDisplayValue('4'), { target: { value: '1' } });
  await waitFor(() => expect((screen.getByRole('button', { name: /Generate 1 candidate/i }) as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole('button', { name: /Generate 1 candidate/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Select this frame/i })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: /Select this frame/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /^Approve$/ })).toBeTruthy());
  fireEvent.click(screen.getByRole('button', { name: /^Approve$/ }));
  await waitFor(() => expect(screen.getByRole('button', { name: /^Publish$/ })).toBeTruthy());
}

describe('Publish panel', () => {
  it('Publish stays dead until the declaration box is ticked, then posts the declaration', async () => {
    const state = { status: 'draft', posts: [] as { url: string; body: unknown }[] };
    await reachApproved(state);
    const publish = screen.getByRole('button', { name: /^Publish$/ }) as HTMLButtonElement;
    expect(publish.disabled).toBe(true);
    fireEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect((screen.getByRole('button', { name: /^Publish$/ }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: /^Publish$/ }));
    await waitFor(() => expect(state.status).toBe('published'));
    const post = state.posts.find((p) => p.url.endsWith('/status') && (p.body as { to: string }).to === 'published');
    expect(post).toBeTruthy();
    expect((post!.body as { declaration: { consentConfirmed: boolean; intendedUse: string } }).declaration).toEqual({ consentConfirmed: true, intendedUse: 'commercial' });
  });

  it('once published, the shown link is the permalink and the signed URL is not on screen as the link', async () => {
    const state = { status: 'draft', posts: [] as unknown[] };
    await reachApproved(state);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /^Publish$/ }));
    await waitFor(() => expect(screen.getByText('https://site/api/atelier/public/asset-1')).toBeTruthy());
    expect(screen.queryByText('https://r2/x?sig')).toBeNull();
    expect(screen.getByRole('button', { name: /Copy permalink/i })).toBeTruthy();
  });
});
