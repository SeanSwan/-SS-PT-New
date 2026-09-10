import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ConfirmationSheet } from './ConfirmationSheet';
import { useConfirmationSheet } from './useConfirmationSheet';
import type { SheetInput } from './confirmationSheetState';

const { get, post, digestMock } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  digestMock: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: { get, post },
}));

vi.mock('../../utils/renderDigest', () => ({
  renderDigestOf: digestMock,
}));

const OP_A = 'op-g02-a';
const OP_B = 'op-g02-b';

const envelope: SheetInput = {
  tier: 'fire_and_forget',
  isDestructive: false,
  affectedCount: 1,
  physical: false,
  irreversible: false,
};

function projection(over: Record<string, unknown> = {}) {
  const merged = {
    policyVersion: 2,
    tier: 'deliberate',
    isDestructive: true,
    requiresPhysicalConfirm: true,
    affectedCount: 4,
    targetUserId: 42,
    entityRevision: 'assignment-77',
    reversibility: 'none',
    expiresAt: '2030-01-01T00:00:00.000Z',
    displayFields: undefined,
    ...over,
  };
  return {
    ...merged,
    displayFields: merged.displayFields ?? {
      description: 'Cancel session 184',
      commandType: 'cancel_session',
      affectedCount: merged.affectedCount,
      targetUser: merged.targetUserId,
    },
  };
}

function operation(id: string, over: Record<string, unknown> = {}) {
  const projected = over.projection ?? projection();
  const projectedRecord = projected && typeof projected === 'object' && !Array.isArray(projected)
    ? projected as Record<string, unknown>
    : {};
  return {
    id,
    commandType: 'cancel_session',
    type: 'DELETE',
    description: 'Cancel session 184',
    params: { sessionId: 184, clientId: projectedRecord.targetUserId ?? 42 },
    affectedRecords: [{ id: 184 }],
    affectedCount: projectedRecord.affectedCount ?? 4,
    clientId: projectedRecord.targetUserId ?? 42,
    requiresPhysicalConfirm: projectedRecord.requiresPhysicalConfirm ?? true,
    expiresAt: projectedRecord.expiresAt ?? '2030-01-01T00:00:00.000Z',
    projection: projected,
    ...over,
  };
}

function fastOperation(id: string, over: Record<string, unknown> = {}) {
  const fastProjection = projection({
    tier: 'fire_and_forget',
    isDestructive: false,
    requiresPhysicalConfirm: false,
    affectedCount: 1,
    targetUserId: 42,
    reversibility: 'inverse',
    ...((over.projection ?? {}) as Record<string, unknown>),
  });
  return operation(id, {
    ...over,
    projection: fastProjection,
    affectedCount: 1,
    requiresPhysicalConfirm: typeof over.requiresPhysicalConfirm === 'boolean'
      ? over.requiresPhysicalConfirm
      : false,
  });
}

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function HookHarness({
  operationId,
  input = envelope,
  onDone,
  onCancel,
}: {
  operationId: string;
  input?: SheetInput;
  onDone?: (value: unknown) => void;
  onCancel?: () => void;
}) {
  const sheet = useConfirmationSheet({ operationId, input, onDone, onCancel });
  return (
    <div>
      <output data-testid="hook-state">{sheet.state}</output>
      <output data-testid="hook-operation-id">{sheet.operation?.id ?? ''}</output>
      <output data-testid="hook-description">{sheet.operation?.description ?? ''}</output>
      <output data-testid="hook-error">{sheet.error ?? ''}</output>
      <output data-testid="hook-can-confirm">{String(sheet.canConfirm)}</output>
      <button
        type="button"
        data-testid="hook-confirm"
        disabled={!sheet.canConfirm}
        onClick={() => void sheet.confirm('tap')}
      >
        Confirm
      </button>
      <button
        type="button"
        data-testid="hook-double-confirm"
        onClick={() => {
          void sheet.confirm('tap');
          void sheet.confirm('tap');
        }}
      >
        Double confirm
      </button>
      <button
        type="button"
        data-testid="hook-confirm-cancel"
        onClick={() => {
          void sheet.confirm('tap');
          void sheet.cancel();
        }}
      >
        Confirm and cancel
      </button>
      <button
        type="button"
        data-testid="hook-voice"
        onClick={() => void sheet.confirm('voice')}
      >
        Voice
      </button>
      <button
        type="button"
        data-testid="hook-cancel"
        onClick={() => void sheet.cancel()}
      >
        Cancel
      </button>
      <button
        type="button"
        data-testid="hook-double-cancel"
        onClick={() => {
          void sheet.cancel();
          void sheet.cancel();
        }}
      >
        Double cancel
      </button>
    </div>
  );
}

async function flushReact() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  digestMock.mockReset();

  get.mockImplementation((url: string) => {
    const id = url.split('/').at(-1) ?? OP_A;
    return Promise.resolve({ data: { operation: fastOperation(id) } });
  });
  post.mockImplementation((url: string) => {
    if (url.includes('/confirm')) {
      return Promise.resolve({ data: { success: true, type: 'executed' } });
    }
    return Promise.resolve({ data: { success: true } });
  });
  digestMock.mockImplementation((stored: { id: string }) => Promise.resolve('digest:' + stored.id));
  vi.useRealTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('G02 robustness — hook lifetime and transport ownership', () => {
  it('R03: rejects a pending read whose returned operation ID is foreign', async () => {
    get.mockResolvedValue({
      data: { operation: fastOperation('foreign-operation', { description: 'Foreign private action' }) },
    });

    render(<HookHarness operationId={OP_A} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('unavailable'));

    expect(screen.getByTestId('hook-operation-id')).toHaveTextContent('');
    expect(screen.getByTestId('hook-description')).toHaveTextContent('');
    expect(post).not.toHaveBeenCalled();
  });

  it('R04: retires A during digest, keeps B current, and submits B with B digest', async () => {
    const readA1 = deferred<{ data: { operation: unknown } }>();
    const readB = deferred<{ data: { operation: unknown } }>();
    const readA2 = deferred<{ data: { operation: unknown } }>();
    const digestA1 = deferred<string>();
    const digestB = deferred<string>();
    const digestA2 = deferred<string>();
    const reads = new Map<string, Deferred<{ data: { operation: unknown } }>[]>(
      [
        [OP_A, [readA1, readA2]],
        [OP_B, [readB]],
      ],
    );
    const digests = new Map<string, Deferred<string>[]>(
      [
        [OP_A, [digestA1, digestA2]],
        [OP_B, [digestB]],
      ],
    );

    get.mockImplementation((url: string) => {
      const id = url.split('/').at(-1) ?? '';
      return reads.get(id)!.shift()!.promise;
    });
    digestMock.mockImplementation((stored: { id: string }) => digests.get(stored.id)!.shift()!.promise);

    const view = render(<HookHarness operationId={OP_A} />);
    readA1.resolve({ data: { operation: fastOperation(OP_A) } });
    await waitFor(() => expect(digestMock).toHaveBeenCalledTimes(1));

    await act(async () => {
      view.rerender(<HookHarness operationId={OP_B} />);
    });
    readB.resolve({ data: { operation: fastOperation(OP_B) } });
    await waitFor(() => expect(digestMock).toHaveBeenCalledTimes(2));
    digestB.resolve('digest:B');
    await waitFor(() => expect(screen.getByTestId('hook-operation-id')).toHaveTextContent(OP_B));

    digestA1.resolve('digest:A1');
    await flushReact();
    expect(screen.getByTestId('hook-operation-id')).toHaveTextContent(OP_B);
    expect(screen.getByTestId('hook-state')).toHaveTextContent('ready');

    fireEvent.click(screen.getByTestId('hook-confirm'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][1]).toMatchObject({
      operationId: OP_B,
      renderedDigest: 'digest:B',
    });

    await act(async () => {
      view.rerender(<HookHarness operationId={OP_A} />);
    });
    readA2.resolve({ data: { operation: fastOperation(OP_A) } });
    await waitFor(() => expect(digestMock).toHaveBeenCalledTimes(3));
    digestA2.resolve('digest:A2');
    await waitFor(() => expect(screen.getByTestId('hook-operation-id')).toHaveTextContent(OP_A));

    expect(get).toHaveBeenCalledWith('/api/ai-command/pending/' + OP_A);
    expect(get).toHaveBeenCalledWith('/api/ai-command/pending/' + OP_B);
    expect(get).toHaveBeenCalledTimes(3);
  });
  it('R08: pending cancel then switch to B suppresses old cancellation and keeps B active', async () => {
    const readA = deferred<{ data: { operation: unknown } }>();
    const cancelA = deferred<{ data: { success: boolean } }>();
    const onCancel = vi.fn();
    get.mockImplementation((url: string) => (
      url.endsWith(OP_A)
        ? readA.promise
        : Promise.resolve({ data: { operation: fastOperation(OP_B) } })
    ));
    post.mockImplementation((url: string) => (
      url === '/api/ai-command/cancel'
        ? cancelA.promise
        : Promise.resolve({ data: { success: true, type: 'executed' } })
    ));

    const view = render(<HookHarness operationId={OP_A} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('hook-cancel'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(onCancel).not.toHaveBeenCalled();

    await act(async () => {
      view.rerender(<HookHarness operationId={OP_B} onCancel={onCancel} />);
    });
    await waitFor(() => expect(screen.getByTestId('hook-operation-id')).toHaveTextContent(OP_B));

    cancelA.resolve({ data: { success: true } });
    readA.resolve({ data: { operation: fastOperation(OP_A) } });
    await flushReact();

    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByTestId('hook-operation-id')).toHaveTextContent(OP_B);
    expect(screen.getByTestId('hook-state')).toHaveTextContent('ready');
  });
  it('R05: switching during arming gives the replacement its full delay and stable rerenders do not restart it', async () => {
    vi.useFakeTimers();
    const largeA = operation(OP_A);
    const largeB = operation(OP_B);
    get.mockImplementation((url: string) => Promise.resolve({
      data: { operation: url.endsWith(OP_A) ? largeA : largeB },
    }));
    digestMock.mockResolvedValue('digest:large');

    const view = render(<HookHarness operationId={OP_A} input={envelope} />);
    await flushReact();
    expect(screen.getByTestId('hook-state')).toHaveTextContent('arming');
    act(() => { vi.advanceTimersByTime(2000); });

    await act(async () => {
      view.rerender(<HookHarness operationId={OP_B} input={{ ...envelope }} />);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByTestId('hook-state')).toHaveTextContent('arming');

    act(() => { vi.advanceTimersByTime(3499); });
    expect(screen.getByTestId('hook-state')).toHaveTextContent('arming');
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByTestId('hook-state')).toHaveTextContent('ready');

    await act(async () => {
      view.rerender(<HookHarness operationId={OP_B} input={{ ...envelope }} />);
    });
    act(() => { vi.advanceTimersByTime(3500); });
    expect(screen.getByTestId('hook-state')).toHaveTextContent('ready');
  });

  it('R06: the same-turn confirm latch permits one POST only', async () => {
    const submit = deferred<{ data: { success: boolean; type: string } }>();
    post.mockImplementation((url: string) => (
      url.includes('/confirm') ? submit.promise : Promise.resolve({ data: { success: true } })
    ));

    render(<HookHarness operationId={OP_A} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));

    fireEvent.click(screen.getByTestId('hook-double-confirm'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0][0]).toBe('/api/ai-command/confirm');
    expect(post.mock.calls[0][1]).toMatchObject({
      operationId: OP_A,
      renderedDigest: 'digest:' + OP_A,
    });
    submit.resolve({ data: { success: true, type: 'executed' } });
  });

  it('R06: same-turn confirm and cancel compete for one action latch', async () => {
    const submit = deferred<{ data: { success: boolean; type: string } }>();
    const onCancel = vi.fn();
    post.mockImplementation((url: string) => (
      url.includes('/confirm') ? submit.promise : Promise.resolve({ data: { success: true } })
    ));

    render(<HookHarness operationId={OP_A} onCancel={onCancel} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));

    fireEvent.click(screen.getByTestId('hook-confirm-cancel'));
    await waitFor(() => expect(post).toHaveBeenCalled());
    expect(post.mock.calls.filter(([url]) => url === '/api/ai-command/confirm')).toHaveLength(1);
    expect(post.mock.calls.filter(([url]) => url === '/api/ai-command/cancel')).toHaveLength(0);
    expect(onCancel).not.toHaveBeenCalled();
    submit.resolve({ data: { success: true, type: 'executed' } });
  });
  it('R07: submit success from a retired operation cannot complete the replacement', async () => {
    const submit = deferred<{ data: { success: boolean; type: string } }>();
    const onDone = vi.fn();
    post.mockImplementation((url: string) => (
      url.includes('/confirm') ? submit.promise : Promise.resolve({ data: { success: true } })
    ));

    const view = render(<HookHarness operationId={OP_A} onDone={onDone} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));
    fireEvent.click(screen.getByTestId('hook-confirm'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    await act(async () => {
      view.rerender(<HookHarness operationId={OP_B} onDone={onDone} />);
    });
    submit.resolve({ data: { success: true, type: 'executed' } });
    await flushReact();

    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByTestId('hook-operation-id')).not.toHaveTextContent(OP_A);
    expect(screen.getByTestId('hook-state')).not.toHaveTextContent('done');
  });

  it('R07: submit error after unmount has no state or callback effect', async () => {
    const submit = deferred<unknown>();
    const onDone = vi.fn();
    post.mockImplementation((url: string) => (
      url.includes('/confirm') ? submit.promise : Promise.resolve({ data: { success: true } })
    ));

    const view = render(<HookHarness operationId={OP_A} onDone={onDone} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));
    fireEvent.click(screen.getByTestId('hook-confirm'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));

    view.unmount();
    submit.reject(new Error('network unavailable'));
    await flushReact();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('R08: cancel latches once, and a late read cannot publish after cancellation', async () => {
    const read = deferred<{ data: { operation: unknown } }>();
    const onCancel = vi.fn();
    const onDone = vi.fn();
    get.mockReturnValue(read.promise);

    render(<HookHarness operationId={OP_A} onCancel={onCancel} onDone={onDone} />);
    fireEvent.click(screen.getByTestId('hook-double-cancel'));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    expect(post.mock.calls[0]).toEqual([
      '/api/ai-command/cancel',
      { operationId: OP_A },
    ]);
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));

    read.resolve({ data: { operation: fastOperation(OP_A) } });
    await flushReact();
    expect(screen.getByTestId('hook-operation-id').textContent).toBe('');
    expect(screen.getByTestId('hook-description').textContent).toBe('');
    expect(post.mock.calls.some(([url]) => url === '/api/ai-command/confirm')).toBe(false);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('R08: cancel while digest is pending suppresses the digest and read publication', async () => {
    const readA = deferred<{ data: { operation: unknown } }>();
    const digestA = deferred<string>();
    const onCancel = vi.fn();
    get.mockReturnValue(readA.promise);
    digestMock.mockReturnValue(digestA.promise);

    render(<HookHarness operationId={OP_A} onCancel={onCancel} />);
    readA.resolve({ data: { operation: fastOperation(OP_A) } });
    await waitFor(() => expect(digestMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTestId('hook-cancel'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));

    digestA.resolve('digest:A');
    await flushReact();
    expect(screen.getByTestId('hook-operation-id').textContent).toBe('');
    expect(screen.getByTestId('hook-description').textContent).toBe('');
    expect(post.mock.calls.some(([url]) => url === '/api/ai-command/confirm')).toBe(false);
  });

  it('R09: a stored refusal tier is unavailable and can never confirm', async () => {
    const refusal = fastOperation(OP_A, {
      projection: projection({
        tier: 'refusal',
        isDestructive: false,
        requiresPhysicalConfirm: false,
        affectedCount: 1,
        reversibility: 'none',
      }),
      requiresPhysicalConfirm: false,
    });
    get.mockResolvedValue({ data: { operation: refusal } });

    render(<HookHarness operationId={OP_A} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('unavailable'));
    fireEvent.click(screen.getByTestId('hook-confirm'));
    expect(post.mock.calls.some(([url]) => url === '/api/ai-command/confirm')).toBe(false);
  });
  it('R09: physical-channel refusal is retryable, terminal denial is not, and voice cannot post', async () => {
    const physical = fastOperation(OP_A, {
      projection: projection({
        tier: 'fire_and_forget',
        isDestructive: false,
        requiresPhysicalConfirm: true,
        affectedCount: 1,
        targetUserId: 42,
        reversibility: 'inverse',
      }),
      requiresPhysicalConfirm: true,
    });
    get.mockResolvedValue({ data: { operation: physical } });
    post
      .mockRejectedValueOnce({ response: { data: { code: 'physical_confirm_required', error: 'tap required' } } })
      .mockResolvedValueOnce({ data: { success: true, type: 'executed' } });

    render(<HookHarness operationId={OP_A} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));

    fireEvent.click(screen.getByTestId('hook-voice'));
    expect(post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('hook-confirm'));
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));
    fireEvent.click(screen.getByTestId('hook-confirm'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));

    post.mockRejectedValue({ response: { data: { code: 'downstream_failed', error: 'unknown' } } });
    cleanup();
    render(<HookHarness operationId={OP_A} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));
    fireEvent.click(screen.getByTestId('hook-confirm'));
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('burned'));
    expect(screen.getByTestId('hook-can-confirm')).toHaveTextContent('false');
  });

  it('R10: actual WebCrypto render digest remains a positive control for a valid producer payload', async () => {
    const actual = await vi.importActual<typeof import('../../utils/renderDigest')>('../../utils/renderDigest');
    const digest = await actual.renderDigestOf(operation(OP_A));
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
  it('R12: malformed fulfilled refusal bodies fail closed without rendering objects', async () => {
    post.mockResolvedValueOnce({
      data: { success: false, code: { raw: 'object-code' }, error: { raw: 'object-error' } },
    });

    render(<HookHarness operationId={OP_A} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));
    fireEvent.click(screen.getByTestId('hook-confirm'));

    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('burned'));
    expect(screen.getByTestId('hook-error')).toHaveTextContent(
      'That confirmation could not be completed.',
    );
  });

  it('R12: malformed rejected refusal bodies fail closed without rendering objects', async () => {
    post.mockRejectedValueOnce({
      response: {
        data: { code: { raw: 'object-code' }, error: { raw: 'object-error' } },
      },
    });

    render(<HookHarness operationId={OP_A} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));
    fireEvent.click(screen.getByTestId('hook-confirm'));

    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('burned'));
    expect(screen.getByTestId('hook-error')).toHaveTextContent(
      'That confirmation could not be completed.',
    );
  });
});

describe('G02 robustness — mounted ConfirmationSheet', () => {
  it('R10: renders stored count/target and retains the exact positive digest contract', async () => {
    const stored = operation(OP_A);
    get.mockResolvedValue({ data: { operation: stored } });
    digestMock.mockResolvedValue('digest:positive');

    render(
      <ConfirmationSheet
        operationId={OP_A}
        input={envelope}
        lockedClientId={61}
      />,
    );

    await waitFor(() => expect(screen.getByText('Cancel session 184')).toBeTruthy());
    expect(screen.getByText('4 records')).toBeTruthy();
    expect(screen.getByTestId('client-chip')).toHaveTextContent('Client-42');

    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').getAttribute('data-state')).toBe('arming'));
    expect(post).not.toHaveBeenCalled();
  });

  it('R01/R10: invalid present projection is unavailable, bounded, and never exposes its details', async () => {
    get.mockResolvedValue({
      data: {
        operation: operation(OP_A, {
          description: 'Private invalid action',
          projection: null,
        }),
      },
    });

    render(<ConfirmationSheet operationId={OP_A} input={envelope} lockedClientId={61} />);
    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').getAttribute('data-state')).toBe('unavailable'));

    expect(screen.queryByText('Private invalid action')).toBeNull();
    expect(screen.queryByTestId('client-chip')).toBeNull();
    expect(screen.queryByTestId('confirm-button')).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});






function lifetimeOperation(id: string, label: string) {
  const fast = fastOperation(id, { description: label });
  const fastProjection = fast.projection as Record<string, unknown>;
  const displayFields = fastProjection.displayFields as Record<string, unknown>;
  return {
    ...fast,
    projection: {
      ...fastProjection,
      displayFields: { ...displayFields, description: label },
    },
  };
}


  async function runLateLifetimeScenario(
    mode: 'digest' | 'read',
    rejectRetired: boolean,
  ) {
    const readA1 = deferred<{ data: { operation: unknown } }>();
    const readB = deferred<{ data: { operation: unknown } }>();
    const readA2 = deferred<{ data: { operation: unknown } }>();
    const digestA1 = deferred<string>();
    const digestB = deferred<string>();
    const digestA2 = deferred<string>();
    const a1 = lifetimeOperation(OP_A, 'A1 retired detail');
    const b = lifetimeOperation(OP_B, 'B current detail');
    const a2 = lifetimeOperation(OP_A, 'A2 current detail');
    const reads = [
      { operationId: OP_A, deferred: readA1 },
      { operationId: OP_B, deferred: readB },
      { operationId: OP_A, deferred: readA2 },
    ];
    const onDone = vi.fn();
    const onCancel = vi.fn();
    const expectedAfterB = mode === 'digest' ? 2 : 1;
    const expectedAfterA2 = mode === 'digest' ? 3 : 2;

    get.mockImplementation((url: string) => {
      const route = reads.shift();
      expect(route).toBeTruthy();
      expect(url).toBe('/api/ai-command/pending/' + route!.operationId);
      return route!.deferred.promise;
    });
    digestMock.mockImplementation((stored: unknown) => {
      if (stored === a1) {
        if (mode === 'read') throw new Error('retired A1 must not be digested');
        return digestA1.promise;
      }
      if (stored === b) return digestB.promise;
      if (stored === a2) return digestA2.promise;
      throw new Error('unexpected digest fixture');
    });

    const view = render(
      <HookHarness operationId={OP_A} onDone={onDone} onCancel={onCancel} />,
    );
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    if (mode === 'digest') {
      readA1.resolve({ data: { operation: a1 } });
      await waitFor(() => expect(digestMock).toHaveBeenCalledTimes(1));
    }

    await act(async () => {
      view.rerender(
        <HookHarness operationId={OP_B} onDone={onDone} onCancel={onCancel} />,
      );
    });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    readB.resolve({ data: { operation: b } });
    await waitFor(() => expect(digestMock).toHaveBeenCalledTimes(expectedAfterB));
    digestB.resolve('digest:B');
    await waitFor(() => {
      expect(screen.getByTestId('hook-state')).toHaveTextContent('ready');
      expect(screen.getByTestId('hook-description')).toHaveTextContent('B current detail');
    });

    await act(async () => {
      view.rerender(
        <HookHarness operationId={OP_A} onDone={onDone} onCancel={onCancel} />,
      );
    });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(3));
    expect(screen.getByTestId('hook-state')).toHaveTextContent('loading');
    expect(screen.getByTestId('hook-operation-id')).toHaveTextContent('');
    expect(screen.getByTestId('hook-description')).toHaveTextContent('');
    expect(screen.getByTestId('hook-can-confirm')).toHaveTextContent('false');
    expect(post).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();

    readA2.resolve({ data: { operation: a2 } });
    await waitFor(() => expect(digestMock).toHaveBeenCalledTimes(expectedAfterA2));
    digestA2.resolve('digest:A2');
    await waitFor(() => {
      expect(screen.getByTestId('hook-state')).toHaveTextContent('ready');
      expect(screen.getByTestId('hook-operation-id')).toHaveTextContent(OP_A);
      expect(screen.getByTestId('hook-description')).toHaveTextContent('A2 current detail');
      expect(screen.getByTestId('hook-error')).toHaveTextContent('');
      expect(screen.getByTestId('hook-can-confirm')).toHaveTextContent('true');
    });

    if (mode === 'digest') {
      if (rejectRetired) digestA1.reject(new Error('retired A1 digest failed'));
      else digestA1.resolve('digest:A1-stale');
    } else if (rejectRetired) {
      readA1.reject(new Error('retired A1 read failed'));
    } else {
      readA1.resolve({ data: { operation: a1 } });
    }
    await flushReact();

    expect(screen.getByTestId('hook-state')).toHaveTextContent('ready');
    expect(screen.getByTestId('hook-operation-id')).toHaveTextContent(OP_A);
    expect(screen.getByTestId('hook-description')).toHaveTextContent('A2 current detail');
    expect(screen.getByTestId('hook-error')).toHaveTextContent('');
    expect(screen.getByTestId('hook-can-confirm')).toHaveTextContent('true');
    expect(onDone).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
    if (mode === 'read') {
      expect(digestMock).toHaveBeenCalledTimes(expectedAfterA2);
      expect(digestMock.mock.calls.some(([stored]) => stored === a1)).toBe(false);
    }

    if (mode === 'digest') {
      expect(post).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('hook-double-confirm'));
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(post.mock.calls).toEqual([
        ['/api/ai-command/confirm', {
          operationId: OP_A,
          renderedDigest: 'digest:A2',
          confirmChannel: 'tap',
        }],
      ]);
      expect(onCancel).not.toHaveBeenCalled();
    } else {
      expect(post).not.toHaveBeenCalled();
    }
  }

  it('R11: late A1 digest success cannot replace ready A2 or prevent one A2 confirm', async () => {
    await runLateLifetimeScenario('digest', false);
  });

  it('R11: late A1 digest rejection cannot publish stale error or affect A2', async () => {
    await runLateLifetimeScenario('digest', true);
  });

  it('R11: late A1 read success is retired before digest generation and cannot affect A2', async () => {
    await runLateLifetimeScenario('read', false);
  });

  it('R11: late A1 read rejection cannot publish stale error or affect A2', async () => {
    await runLateLifetimeScenario('read', true);
  });

it.each([
  ['fulfilled null', null],
  ['fulfilled empty object', {}],
  ['fulfilled array', []],
  ['fulfilled primitive', 'raw-confirm-body'],
  ['fulfilled missing success', { type: 'executed', rawMarker: 'missing-success' }],
  ['fulfilled nonboolean success', { success: 1, rawMarker: 'nonboolean-success' }],
] as const)(
  'R12: malformed confirmation response %s is ambiguous and cannot complete the action',
  async (_label, body) => {
    const onDone = vi.fn();
    post.mockResolvedValue({ data: body });

    render(<HookHarness operationId={OP_A} onDone={onDone} />);
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));

    fireEvent.click(screen.getByTestId('hook-confirm'));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('burned'));

    expect(screen.getByTestId('hook-state')).not.toHaveTextContent('done');
    expect(onDone).not.toHaveBeenCalled();
    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    if (rawBody) expect(document.body.textContent).not.toContain(rawBody);
    expect(screen.getByTestId('hook-error')).not.toHaveTextContent('raw-confirm-body');

    fireEvent.click(screen.getByTestId('hook-confirm'));
    await flushReact();
    expect(post).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('hook-state')).toHaveTextContent('burned');
  },
);

it('R12: exact boolean success remains the positive completion control', async () => {
  const success = { success: true, type: 'executed' };
  const onDone = vi.fn();
  post.mockResolvedValue({ data: success });

  render(<HookHarness operationId={OP_A} onDone={onDone} />);
  await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));

  fireEvent.click(screen.getByTestId('hook-confirm'));
  await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('done'));
  expect(post).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledTimes(1);
  expect(onDone).toHaveBeenCalledWith(success);
});

it.each([
  ['failed pending read', () => Promise.reject(new Error('pending read timeout'))],
  ['ambiguous expired pending read', () => Promise.resolve({
    data: { success: false, code: 'expired', error: 'expired' },
  })],
] as const)(
  'R13: %s stays ambiguous and cannot claim nothing happened or offer reissue',
  async (_label, responseFactory) => {
    const onAcknowledge = vi.fn();
    const onReissue = vi.fn();
    const onCancel = vi.fn();
    get.mockImplementation(() => responseFactory());

    render(
      <ConfirmationSheet
        operationId={OP_A}
        input={envelope}
        onAcknowledge={onAcknowledge}
        onReissue={onReissue}
        onCancel={onCancel}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('confirmation-sheet').getAttribute('data-state')).toBe('unavailable'));
    expect(screen.getByTestId('sheet-status')).not.toHaveTextContent(/nothing happened|ask again|re-issue/i);
    expect(screen.queryByTestId('reissue-button')).toBeNull();
    expect(screen.getByTestId('acknowledge-button')).toBeTruthy();

    fireEvent.click(screen.getByTestId('acknowledge-button'));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    expect(onReissue).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  },
);

it('R13: physical_confirm_required remains a pre-consumption retry, not an ambiguous burn', async () => {
  const physical = fastOperation(OP_A, {
    projection: projection({
      tier: 'fire_and_forget',
      isDestructive: false,
      requiresPhysicalConfirm: true,
      affectedCount: 1,
      targetUserId: 42,
      reversibility: 'inverse',
    }),
    requiresPhysicalConfirm: true,
  });
  const onDone = vi.fn();
  get.mockResolvedValue({ data: { operation: physical } });
  post
    .mockRejectedValueOnce({
      response: { data: { code: 'physical_confirm_required', error: 'tap required' } },
    })
    .mockResolvedValueOnce({ data: { success: true, type: 'executed' } });

  render(<HookHarness operationId={OP_A} onDone={onDone} />);
  await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));

  fireEvent.click(screen.getByTestId('hook-confirm'));
  await waitFor(() => expect(screen.getByTestId('hook-state')).toHaveTextContent('ready'));
  expect(post).toHaveBeenCalledTimes(1);
  expect(onDone).not.toHaveBeenCalled();

  fireEvent.click(screen.getByTestId('hook-confirm'));
  await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  expect(post).toHaveBeenCalledTimes(2);
  expect(post.mock.calls[0][1]).toMatchObject({
    operationId: OP_A,
    confirmChannel: 'tap',
  });
  expect(post.mock.calls[1][1]).toMatchObject({
    operationId: OP_A,
    confirmChannel: 'tap',
  });
});
