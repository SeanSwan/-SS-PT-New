/**
 * ContentStudioHub.tabGating.test.tsx
 *
 * Locks the two-kind tab-gating contract at the RENDERED level, not the source level.
 *
 * WHY THIS EXISTS: BlogWriterTab shipped to production in the default tab list with no
 * gate at all, while all three of its endpoints (/blog/outline, /blog/draft, /blog/save)
 * return 404 — they do not exist in backend/routes/contentStudioRoutes.mjs. Every admin
 * saw a tab where every action failed. The existing creationBoundary test asserts on file
 * TEXT, so it could never have caught a tab that renders but is broken.
 *
 * The contract:
 *   requiresService -> an EXTERNAL provider key is configured (feature genuinely works)
 *   requiresFlag    -> the BACKEND is not built yet (key presence proves nothing)
 * A flag-gated tab must stay hidden even if every service key in the world is set.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ContentStudioHub from './ContentStudioHub';

const mockGet = vi.fn();
vi.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: { get: mockGet, post: vi.fn(), patch: vi.fn() } }),
}));

// Child panels are irrelevant to tab gating and pull their own data.
vi.mock('./ContentStudioStorageMeter', () => ({ default: () => null }));
vi.mock('./ContentStudioProjectQueue', () => ({ default: () => null }));

const serviceStatus = (over: Record<string, boolean> = {}) => ({
  data: { success: true, data: { remotion: true, elevenlabs: false, blotato: false, ...over } },
});

const tabNames = () => screen.getAllByRole('tab').map(t => t.textContent?.trim() ?? '');

beforeEach(() => mockGet.mockReset());

describe('ContentStudioHub tab gating', () => {
  it('does not render Blog Drafts — its backend routes do not exist (flag off)', async () => {
    mockGet.mockResolvedValue(serviceStatus());
    render(<ContentStudioHub />);
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(0));
    expect(screen.queryByRole('tab', { name: /Blog Drafts/i })).toBeNull();
  });

  it('keeps Blog Drafts hidden even when every service key is configured', async () => {
    // The N1 bug class: key presence must NEVER reveal a tab whose backend is missing.
    mockGet.mockResolvedValue(serviceStatus({ elevenlabs: true, blotato: true }));
    render(<ContentStudioHub />);
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(0));
    expect(screen.queryByRole('tab', { name: /Blog Drafts/i })).toBeNull();
  });

  it('renders no AI-video tab — the hosted generate path was removed', async () => {
    mockGet.mockResolvedValue(serviceStatus());
    render(<ContentStudioHub />);
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(0));
    const names = tabNames().join(' | ');
    expect(names).not.toMatch(/video generation|ai video/i);
  });

  it('still renders the working tabs', async () => {
    mockGet.mockResolvedValue(serviceStatus());
    render(<ContentStudioHub />);
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(0));
    const names = tabNames();
    ['Workflow', 'Video Library', 'Coverage Tracker', 'Video Optimizer', 'Badge Assets']
      .forEach(label => expect(names.some(n => n.includes(label))).toBe(true));
  });

  it('key-gating still works: Voice Studio appears only with an ElevenLabs key', async () => {
    mockGet.mockResolvedValue(serviceStatus());
    const { unmount } = render(<ContentStudioHub />);
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(0));
    expect(screen.queryByRole('tab', { name: /Voice Studio/i })).toBeNull();
    unmount();

    mockGet.mockResolvedValue(serviceStatus({ elevenlabs: true }));
    render(<ContentStudioHub />);
    await waitFor(() => expect(screen.getByRole('tab', { name: /Voice Studio/i })).toBeTruthy());
  });

  it('degrades to the ungated tabs when service-status is unsuccessful', async () => {
    // The hub guards on `res.data?.success`, so an unsuccessful payload and a thrown
    // request converge on the same behaviour: serviceConfig stays at its defaults and
    // only ungated tabs render. Asserted via the payload path because this vitest setup
    // reports any mock rejection as an unhandled error even when the caller catches it
    // (verified with an isolated probe), which would fail the test for harness reasons
    // rather than product reasons.
    mockGet.mockResolvedValue({ data: { success: false } });
    render(<ContentStudioHub />);
    await waitFor(() => expect(screen.getAllByRole('tab').length).toBeGreaterThan(0));
    expect(screen.queryByRole('tab', { name: /Blog Drafts/i })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Voice Studio/i })).toBeNull();
    expect(tabNames().some(n => n.includes('Workflow'))).toBe(true);
  });
});
