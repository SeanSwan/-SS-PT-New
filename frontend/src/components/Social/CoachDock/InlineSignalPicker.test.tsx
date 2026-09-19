/**
 * InlineSignalPicker — S1 contract (Social Feed Upgrade, MEGA-BLUEPRINT §6 S1)
 * ===========================================================================
 * Added by the rule-61 hostile review (findings F1.4 / F4.1). The critical test is
 * the FIRST one: a source-drift guard that reads the real SocialPost.type ENUM out of
 * the backend model and fails if the picker ever filters on a type that does not
 * exist — which is exactly what S1 shipped (`transformation`, `progress`) while
 * omitting `general`, the default type of every post.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import InlineSignalPicker from './InlineSignalPicker';

const PICKER_SOURCE = readFileSync(resolve(__dirname, './InlineSignalPicker.tsx'), 'utf8');
const MODEL_SOURCE = readFileSync(
  resolve(__dirname, '../../../../../backend/models/social/SocialPost.mjs'),
  'utf8',
);

const { mockUseAuth, mockGet, mockPost, mockNavigate } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

const quoted = (block: string) => [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]);

const realPostTypes = () => {
  const match = MODEL_SOURCE.match(/DataTypes\.ENUM\(([^)]*)\)/);
  if (!match) throw new Error('could not read the SocialPost.type ENUM');
  return quoted(match[1]);
};

const signalableTypes = () => {
  const match = PICKER_SOURCE.match(/const SIGNALABLE_TYPES = new Set\(\[([\s\S]*?)\]\)/);
  if (!match) throw new Error('could not read SIGNALABLE_TYPES');
  return quoted(match[1]);
};

const post = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  content: 'Crushed it today',
  type: 'workout',
  user: { id: '20', firstName: 'Ava', username: 'ava' },
  ...overrides,
});

const wire = (posts: unknown[], clients: string[] = ['20']) => {
  mockGet.mockImplementation(async (url: string) =>
    url.includes('/feed')
      ? { data: { posts } }
      : { data: { assignments: clients.map((id) => ({ client: { id } })) } },
  );
};

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
  mockNavigate.mockClear();
  mockPost.mockResolvedValue({ data: { success: true } });
  mockUseAuth.mockReturnValue({ user: { id: '7', role: 'trainer' }, authAxios: { get: mockGet, post: mockPost } });
});

describe('InlineSignalPicker — post-type drift guard', () => {
  it('filters ONLY on types that exist in the real SocialPost.type ENUM', () => {
    const real = new Set(realPostTypes());
    const phantom = signalableTypes().filter((t) => !real.has(t));
    expect(phantom, `picker filters on non-existent post types: ${phantom.join(', ')}`).toEqual([]);
  });

  it('can signal the default post type, so ordinary client posts are never invisible', () => {
    const defaultType = MODEL_SOURCE.match(/defaultValue:\s*'([a-z]+)'/)?.[1];
    expect(defaultType).toBe('general');
    expect(signalableTypes()).toContain(defaultType);
  });

  it('keeps a human label for every signalable type', () => {
    for (const type of signalableTypes()) {
      expect(PICKER_SOURCE, `missing TYPE_LABELS entry for ${type}`).toMatch(
        new RegExp(`\\b${type}:\\s*'`),
      );
    }
  });
});

describe('InlineSignalPicker — candidate selection', () => {
  it('lists only un-signaled wins belonging to the coach\'s own active clients', async () => {
    wire([
      post({ id: 1, type: 'milestone', user: { id: '20', firstName: 'Ava' } }),
      post({ id: 2, type: 'workout', user: { id: '99', firstName: 'Stranger' } }),
      post({ id: 3, type: 'workout', user: { id: '20' }, coachSignal: { coachId: 7 } }),
      post({ id: 4, type: 'dance', user: { id: '20', firstName: 'Ava' } }),
    ], ['20']);

    render(<InlineSignalPicker />);

    await waitFor(() => expect(screen.getByText(/Ava hit a milestone/)).toBeInTheDocument());
    expect(screen.queryByText(/Stranger/)).not.toBeInTheDocument();
    // p3 already carries a coachSignal, p4 is a non-signalable type
    expect(screen.getAllByRole('button', { name: /Send a coach signal to/ })).toHaveLength(1);
  });

  it('shows an honest empty state instead of a bare panel', async () => {
    wire([post({ user: { id: '99' } })], ['20']);
    render(<InlineSignalPicker />);
    await waitFor(() => expect(screen.getByText(/No un-signaled client wins/)).toBeInTheDocument());
  });
});

describe('InlineSignalPicker — send path', () => {
  it('posts the numeric postId and the trimmed note, then shows the receipt', async () => {
    wire([post({ id: 1, type: 'workout', user: { id: '20', firstName: 'Ava' } })], ['20']);
    render(<InlineSignalPicker />);
    await waitFor(() => expect(screen.getByLabelText('Optional signal note')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText('Optional signal note'), '  Proud of that PR  ');
    await userEvent.click(screen.getByRole('button', { name: /Send a coach signal to Ava/ }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/api/social/coach-signals', {
        postId: 1,
        note: 'Proud of that PR',
      }),
    );
    await waitFor(() => expect(screen.getByText('Signaled')).toBeInTheDocument());
  });

  it('renders the honest cap message on 429 and disables further sends', async () => {
    wire([post({ id: 1, type: 'workout', user: { id: '20', firstName: 'Ava' } })], ['20']);
    mockPost.mockRejectedValue({ response: { status: 429 } });
    render(<InlineSignalPicker />);

    await userEvent.click(
      await screen.findByRole('button', { name: /Send a coach signal to Ava/ }),
    );

    await waitFor(() => expect(screen.getByText(/Daily signal limit reached \(5\)/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Send a coach signal to Ava/ })).toBeDisabled();
  });

  it('never POSTs NaN for a non-numeric post id — fails locally instead', async () => {
    wire([post({ id: 'not-a-number', type: 'workout', user: { id: '20', firstName: 'Ava' } })], ['20']);
    render(<InlineSignalPicker />);

    await userEvent.click(
      await screen.findByRole('button', { name: /Send a coach signal to Ava/ }),
    );

    await waitFor(() => expect(screen.getByText(/didn't go through/)).toBeInTheDocument());
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('renders the honest permission message on 403', async () => {
    wire([post({ id: 1, type: 'workout', user: { id: '20', firstName: 'Ava' } })], ['20']);
    mockPost.mockRejectedValue({ response: { status: 403 } });
    render(<InlineSignalPicker />);

    await userEvent.click(
      await screen.findByRole('button', { name: /Send a coach signal to Ava/ }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Only the member's active coach can send that signal/)).toBeInTheDocument(),
    );
  });
});
