/**
 * Compose, rendered — what the operator actually sees on a machine where the local
 * lane is CLAIMED and the hosted lane is OFF (today's real state).
 *
 * The honesty test pins the words; this pins that the words reach the DOM and that
 * every control the server would refuse is dead on arrival, not discovered on click.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AtelierCompose from './AtelierCompose';

const LIMITS_CLAIMED = {
  maxStills: 4,
  lanes: {
    local: {
      provider: 'comfyui/wan-2.2', status: 'claimed', ready: false, advertisable: false,
      problems: ['still lane is CLAIMED, not probed — run the probe, then set SWAN_ATELIER_LOCAL_STILLS=probed'],
      probeEnvKey: 'SWAN_ATELIER_LOCAL_STILLS', unitUsd: 0,
    },
    hosted: { enabled: false, spendEnvKey: 'SWAN_ATELIER_MAX_SPEND_USD_DAILY', limits: { maxRunsDaily: 50, maxSpendUsdDaily: 0 } },
  },
  usage: { runs: 0, spendUsd: 0 }, ledger: 'file', enabled: false,
  note: 'No lane is ready.',
};

function fakeApi(limits: unknown) {
  return {
    get: vi.fn(async (url: string) => {
      if (url.endsWith('/limits')) return { data: { success: true, data: limits } };
      throw new Error(`unexpected GET ${url}`);
    }),
    post: vi.fn(async () => { throw new Error('POST must not happen when no lane is offerable'); }),
  } as unknown as import('axios').AxiosInstance;
}

describe('Compose on a machine where nothing is ready yet', () => {
  it('shows the local lane as unproven with the exact switch, and hosted as switched off with its key', async () => {
    render(<AtelierCompose api={fakeApi(LIMITS_CLAIMED)} />);
    await waitFor(() => expect(screen.getByText(/Local lane · unproven/i)).toBeTruthy());
    expect(screen.getByText(/SWAN_ATELIER_LOCAL_STILLS=probed/)).toBeTruthy();
    expect(screen.getByText(/Hosted lane · switched off/i)).toBeTruthy();
    expect(screen.getByText(/SWAN_ATELIER_MAX_SPEND_USD_DAILY/)).toBeTruthy();
  });

  it('leaves Generate dead, Motion locked, Taste disabled with a VISIBLE reason — and never POSTs', async () => {
    const api = fakeApi(LIMITS_CLAIMED);
    render(<AtelierCompose api={api} />);
    await waitFor(() => expect(screen.getByText(/Local lane · unproven/i)).toBeTruthy());

    const generate = screen.getByRole('button', { name: /Generate 4 candidates/i }) as HTMLButtonElement;
    expect(generate.disabled).toBe(true);

    const motion = screen.getByRole('button', { name: /Approve → Motion/i }) as HTMLButtonElement;
    expect(motion.disabled).toBe(true);

    const taste = screen.getByRole('button', { name: /Taste brain/i }) as HTMLButtonElement;
    expect(taste.disabled).toBe(true);
    expect(screen.getByText(/render on the local GPU only/i)).toBeTruthy();

    // Every lane button is dead too: the server would refuse all three.
    for (const name of ['auto', 'local', 'hosted']) {
      expect((screen.getByRole('button', { name: new RegExp(`^${name}$`) }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect((api as unknown as { post: { mock: { calls: unknown[] } } }).post.mock.calls).toHaveLength(0);
  });

  it("a ledger that cannot be read is a NOTICE, not a caption — the billed lane is refusing", async () => {
    // status role distinguishes it from the quiet day-count caption; the copy has to say
    // which of the two failures it is, because "budget exceeded" and "disk broken" send an
    // operator to entirely different places.
    const degraded = {
      ...LIMITS_CLAIMED, ledger: "degraded",
      note: "The spend ledger cannot be read, so today's total is unknown and billed generation is refused. The free local lane is unaffected.",
    };
    render(<AtelierCompose api={fakeApi(degraded)} />);
    const notice = await screen.findByText(/spend ledger cannot be read/i);
    expect(notice.getAttribute("role")).toBe("status");
    expect(notice.textContent).toMatch(/free local lane is unaffected/i);
  });

  it('no interactive control is nested inside a <label>', async () => {
    const { container } = render(<AtelierCompose api={fakeApi(LIMITS_CLAIMED)} />);
    await waitFor(() => expect(screen.getByText(/Local lane · unproven/i)).toBeTruthy());
    const nested = container.querySelectorAll('label button, label a, label [role="button"]');
    expect(nested.length).toBe(0);
    // ...and each remaining <label> wraps exactly one form control.
    for (const label of Array.from(container.querySelectorAll('label'))) {
      expect(label.querySelectorAll('input, select, textarea').length).toBe(1);
    }
  });
});
