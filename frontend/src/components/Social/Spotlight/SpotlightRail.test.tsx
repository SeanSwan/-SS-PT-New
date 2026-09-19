/**
 * SpotlightRail — S3 contract (Social Feed Upgrade, MEGA-BLUEPRINT §5/§6 S3)
 * ===========================================================================
 * Locks the editorial rules: no social affordances ever, ice-cyan only (never gold or
 * purple), self-hiding when the flag is off or the member muted it, and honest
 * localStorage-backed dismissal.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import SpotlightRail, { SPOTLIGHT_DISMISS_KEY, SPOTLIGHT_MUTE_KEY } from './SpotlightRail';

const SOURCE = readFileSync(resolve(__dirname, './SpotlightRail.tsx'), 'utf8');
const STYLE_SOURCE = readFileSync(resolve(__dirname, './SpotlightRail.styles.ts'), 'utf8');

// These files document the bans in prose ("never a gold chrome", "no like affordance"),
// so the ban assertions must run against CODE, not comments.
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const CODE = stripComments(SOURCE);
const STYLE_CODE = stripComments(STYLE_SOURCE);

const { mockUseAuth, mockGet } = vi.hoisted(() => ({ mockUseAuth: vi.fn(), mockGet: vi.fn() }));

vi.mock('../../../context/AuthContext', () => ({ useAuth: mockUseAuth }));

const item = (overrides: Record<string, unknown> = {}) => ({
  itemId: 'a-1',
  headline: 'A community garden doubled its harvest',
  dek: 'Neighbours pooled a season of work and shared the yield.',
  imageUrl: null,
  sourceName: 'Local Greens',
  sourceUrl: 'https://example.org/story',
  curatorNote: null,
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  mockGet.mockReset();
  mockUseAuth.mockReturnValue({ authAxios: { get: mockGet } });
});

describe('SpotlightRail — visibility rules', () => {
  it('renders nothing when the server flag is off', async () => {
    mockGet.mockResolvedValue({ data: { success: true, enabled: false, spotlights: [] } });
    const { container } = render(<SpotlightRail />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no live items (no empty box)', async () => {
    mockGet.mockResolvedValue({ data: { success: true, enabled: true, spotlights: [] } });
    const { container } = render(<SpotlightRail />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the fetch fails — a rail never shows an error state', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    const { container } = render(<SpotlightRail />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the curated items', async () => {
    mockGet.mockResolvedValue({
      data: { success: true, enabled: true, spotlights: [item(), item({ itemId: 'a-2', headline: 'Shelter dogs all rehomed' })] },
    });
    render(<SpotlightRail />);
    await waitFor(() => expect(screen.getByTestId('spotlight-rail')).toBeInTheDocument());
    expect(screen.getAllByTestId('spotlight-card')).toHaveLength(2);
    expect(screen.getByText('Shelter dogs all rehomed')).toBeInTheDocument();
    expect(screen.getAllByText('Curated by Swan')).toHaveLength(2);
  });

  it('opens source links safely', async () => {
    mockGet.mockResolvedValue({ data: { success: true, enabled: true, spotlights: [item()] } });
    render(<SpotlightRail />);
    const link = await screen.findByRole('link', { name: 'Local Greens' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

describe('SpotlightRail — dismissal and mute', () => {
  it('removes a dismissed card and persists the dismissal', async () => {
    mockGet.mockResolvedValue({ data: { success: true, enabled: true, spotlights: [item()] } });
    render(<SpotlightRail />);

    await userEvent.click(
      await screen.findByRole('button', { name: /Dismiss: A community garden/ }),
    );

    await waitFor(() => expect(screen.queryByTestId('spotlight-card')).not.toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem(SPOTLIGHT_DISMISS_KEY) as string)).toEqual(['a-1']);
  });

  it('hides the whole rail on mute and persists it', async () => {
    mockGet.mockResolvedValue({ data: { success: true, enabled: true, spotlights: [item()] } });
    const { container } = render(<SpotlightRail />);

    await userEvent.click(await screen.findByRole('button', { name: 'Hide Swan Spotlight' }));

    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(localStorage.getItem(SPOTLIGHT_MUTE_KEY)).toBe('true');
  });

  it('stays hidden for a member who muted it in a previous session', async () => {
    localStorage.setItem(SPOTLIGHT_MUTE_KEY, 'true');
    const { container } = render(<SpotlightRail />);
    expect(container).toBeEmptyDOMElement();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('does not re-show an item dismissed in a previous session', async () => {
    localStorage.setItem(SPOTLIGHT_DISMISS_KEY, JSON.stringify(['a-1']));
    mockGet.mockResolvedValue({ data: { success: true, enabled: true, spotlights: [item()] } });
    const { container } = render(<SpotlightRail />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('SpotlightRail — editorial bans (never social)', () => {
  it('exposes no like, comment, or share affordance', () => {
    expect(CODE).not.toMatch(/like|Like/);
    expect(CODE).not.toMatch(/comment|Comment/);
    expect(CODE).not.toMatch(/share|Share/);
    expect(CODE).not.toMatch(/likeCount|commentCount|reactionCount/);
  });

  it('uses ice-cyan chrome and never the reserved gold or purple', () => {
    expect(STYLE_CODE).toContain('var(--accent-primary, #60C0F0)');
    expect(STYLE_CODE).not.toContain('#C6A84B');
    expect(STYLE_CODE).not.toContain('#8B5CF6');
  });

  it('gives the dismiss and mute controls a 44px touch target', () => {
    expect(STYLE_CODE).toMatch(/DismissButton[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
    expect(STYLE_CODE).toMatch(/MuteButton[\s\S]*?min-height: 44px;/);
  });
});
