/**
 * Phase 3 Slice 3.13 — PlaudMergePage source-text + render locks
 * ================================================================
 * Page-level locks for the standalone /dashboard/plaud-merge route.
 * Full interaction testing runs in slice 3.14 Playwright with a real
 * browser at multiple viewports.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock react-router-dom's useNavigate so the page doesn't blow up
vi.mock('react-router-dom', async (orig) => {
  const actual = await (orig as () => Promise<typeof import('react-router-dom')>)();
  return { ...actual, useNavigate: () => vi.fn() };
});

// Mock hooks used by child components so render is fast + deterministic
vi.mock('../../hooks/usePlaudClipQueue', () => ({
  usePlaudClipQueue: () => ({
    clips: [],
    isLoading: false,
    isUploading: false,
    uploadError: null,
    rejectedClips: [],
    selectedIds: new Set(),
    selectedCount: 0,
    canMerge: false,
    refresh: vi.fn(),
    upload: vi.fn(),
    removeClip: vi.fn(),
    toggleSelect: vi.fn(),
    selectAll: vi.fn(),
    clearSelection: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePlaudPendingReviews', () => ({
  usePlaudPendingReviews: () => ({
    reviews: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    loadDetail: vi.fn(),
    discard: vi.fn(),
  }),
}));

import { PlaudMergePage } from './PlaudMergePage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PAGE_SRC = readFileSync(resolve(__dirname, 'PlaudMergePage.tsx'), 'utf8');
const WORKSPACE_SRC = readFileSync(resolve(__dirname, '../../components/PlaudClipMerge/PlaudMergeWorkspace.tsx'), 'utf8');
const WORKSPACE_STYLES_SRC = readFileSync(resolve(__dirname, '../../components/PlaudClipMerge/PlaudMergeWorkspace.styles.ts'), 'utf8');
const ROUTES_SRC = readFileSync(resolve(__dirname, '../../routes/main-routes.tsx'), 'utf8');

describe('Slice 3.13 — PlaudMergePage source contract', () => {
  it('uses styled-components + Crystalline Swan tokens', () => {
    expect(WORKSPACE_STYLES_SRC).toMatch(/import\s+styled\s+from\s+['"]styled-components['"]/);
    expect(WORKSPACE_STYLES_SRC).toMatch(/var\(--text-primary,\s*#E0ECF4\)/);
    expect(WORKSPACE_STYLES_SRC).not.toMatch(/from\s+['"]@mui/);
  });

  it('two-column layout: single col mobile, 1.5fr+1fr at 1024px+', () => {
    expect(WORKSPACE_STYLES_SRC).toMatch(/grid-template-columns:\s*1fr;/);
    expect(WORKSPACE_STYLES_SRC).toMatch(/min-width:\s*1024px[\s\S]{0,200}grid-template-columns:\s*1\.5fr\s+1fr/);
  });

  it('three-state machine: queue / review / confirmed', () => {
    expect(WORKSPACE_SRC).toMatch(/reviewState/);
    expect(WORKSPACE_SRC).toMatch(/confirmState/);
    expect(WORKSPACE_SRC).toMatch(/handleResetReview/);
  });

  it('apply path passes source: plaud_merge + mergeRequestId', () => {
    expect(WORKSPACE_SRC).toMatch(/source:\s*['"]plaud_merge['"]/);
    expect(WORKSPACE_SRC).toMatch(/mergeRequestId:\s*args\.mergeRequestId/);
  });

  it('apply path POSTs to /api/admin/clients/:clientId/workouts', () => {
    expect(WORKSPACE_SRC).toMatch(/\/api\/admin\/clients\/\$\{args\.clientId\}\/workouts/);
  });

  it('boundary banner shown when warning=true with re-select handler', () => {
    expect(WORKSPACE_SRC).toMatch(/PlaudMergeBoundaryBanner/);
    expect(WORKSPACE_SRC).toMatch(/onReSelect=\{handleResetReview\}/);
  });

  it('confirm screen offers "Process another merge" reset action', () => {
    expect(WORKSPACE_SRC).toMatch(/Process another merge/);
  });

  it('44px+ button heights (Rule 2 touch targets)', () => {
    expect(WORKSPACE_STYLES_SRC).toMatch(/height:\s*44px/);
    expect(WORKSPACE_STYLES_SRC).toMatch(/height:\s*48px/);
  });

  it('mobile-first responsive media queries scale up at 768px and 1024px', () => {
    expect(WORKSPACE_STYLES_SRC).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);
    expect(WORKSPACE_STYLES_SRC).toMatch(/@media\s*\(\s*min-width:\s*1024px\s*\)/);
  });

  it('bearer token sourced from localStorage for apply request', () => {
    expect(WORKSPACE_SRC).toMatch(/localStorage\.getItem\(['"]token['"]\)/);
  });

  it('parsed exercises empty -> shows red error banner', () => {
    expect(WORKSPACE_SRC).toMatch(/No exercises parsed/);
  });

  it('route shell passes optional clientId query into reusable workspace', () => {
    expect(PAGE_SRC).toMatch(/useSearchParams/);
    expect(PAGE_SRC).toMatch(/parseClientId\(searchParams\.get\(['"]clientId['"]\)\)/);
    expect(PAGE_SRC).toMatch(/initialClientId=\{initialClientId\}/);
  });
});

describe('Slice 3.13 - canonical main-routes mount', () => {
  it('mounts /dashboard/plaud-merge with admin+trainer protectedRoute', () => {
    expect(ROUTES_SRC).toMatch(/path:\s*['"]dashboard\/plaud-merge['"]/);
    expect(ROUTES_SRC).toMatch(/allowedRoles=\{\[['"]admin['"],\s*['"]trainer['"]\]\}/);
  });

  it('mounts BEFORE the catch-all /dashboard/* (specificity ordering)', () => {
    const exactMatch = /path:\s*['"]dashboard\/plaud-merge['"]/.exec(ROUTES_SRC);
    const catchAllMatch = /path:\s*['"]dashboard\/\*['"]/.exec(ROUTES_SRC);
    expect(exactMatch?.index).toBeGreaterThan(0);
    expect(catchAllMatch?.index).toBeGreaterThan(exactMatch?.index ?? 0);
  });

  it('lazy-imports PlaudMergePage with React.Suspense fallback', () => {
    expect(ROUTES_SRC).toMatch(/lazyLoadWithErrorHandling\([\s\S]{0,120}PlaudMergePage/);
    expect(ROUTES_SRC).toMatch(/Suspense/);
  });
});

describe('Slice 3.13 — PlaudMergePage render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders queue state with merge panel + pending reviews list', () => {
    render(<MemoryRouter><PlaudMergePage /></MemoryRouter>);
    // Page test-id present
    expect(screen.getByTestId('plaud-merge-page')).toBeTruthy();
    // The merge panel test-id (left column) is rendered
    expect(screen.getByTestId('plaud-merge-panel')).toBeTruthy();
    // The pending reviews test-id (right column) is rendered
    expect(screen.getByTestId('plaud-pending-reviews')).toBeTruthy();
  });

  it('Back to dashboard link present in queue state', () => {
    render(<MemoryRouter><PlaudMergePage /></MemoryRouter>);
    expect(screen.getByText(/Dashboard/i)).toBeTruthy();
  });
});
