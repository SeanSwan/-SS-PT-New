/**
 * Phase 3 Slice 3.11 — PLAUD UI component locks
 * ===============================================
 * Source-text + lightweight render locks for the four UI components.
 * Full interaction testing runs in slice 3.14 Playwright with a real
 * browser at multiple viewports.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen } from '@testing-library/react';
import { PlaudMergeBoundaryBanner } from './PlaudMergeBoundaryBanner';
import { PlaudClipQueue } from './PlaudClipQueue';
import { buildClipTimeline } from './plaudClipTimeline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const UPLOADER_SRC = readFileSync(resolve(__dirname, 'PlaudClipUploader.tsx'), 'utf8');
const QUEUE_SRC = readFileSync(resolve(__dirname, 'PlaudClipQueue.tsx'), 'utf8');
const PANEL_SRC = readFileSync(resolve(__dirname, 'PlaudClipMergePanel.tsx'), 'utf8');
const PANEL_STYLES_SRC = readFileSync(resolve(__dirname, 'PlaudClipMergePanel.styles.ts'), 'utf8');
const RESOLVER_SRC = readFileSync(resolve(__dirname, 'PlaudClientResolver.tsx'), 'utf8');
const RESOLVER_STYLES_SRC = readFileSync(resolve(__dirname, 'PlaudClientResolver.styles.ts'), 'utf8');
const BANNER_SRC = readFileSync(resolve(__dirname, 'PlaudMergeBoundaryBanner.tsx'), 'utf8');
const WORKSPACE_SRC = readFileSync(resolve(__dirname, 'PlaudMergeWorkspace.tsx'), 'utf8');
const REVIEW_SRC = readFileSync(resolve(__dirname, 'PlaudMergeReview.tsx'), 'utf8');
const DATE_SPLIT_SRC = readFileSync(resolve(__dirname, 'PlaudDateSplitCandidatePanel.tsx'), 'utf8');
const APPROVAL_SRC = readFileSync(resolve(__dirname, 'PlaudMergeWorkspace.apply.ts'), 'utf8');
const MERGE_SERVICE_SRC = readFileSync(resolve(__dirname, '../../services/plaudMergeService.ts'), 'utf8');

describe('Slice 3.11 — PlaudClipUploader source contract', () => {
  it('uses styled-components (NOT MUI) per CLAUDE.md Rule 1', () => {
    expect(UPLOADER_SRC).toMatch(/import\s+styled\s+from\s+['"]styled-components['"]/);
    expect(UPLOADER_SRC).not.toMatch(/from\s+['"]@mui/);
  });

  it('uses CSS custom properties with fallbacks (Rule 6)', () => {
    expect(UPLOADER_SRC).toMatch(/var\(--accent-primary,\s*#60C0F0\)/);
    expect(UPLOADER_SRC).toMatch(/var\(--text-primary,\s*#E0ECF4\)/);
  });

  it('44px+ touch targets on all interactive elements (Rule 2)', () => {
    expect(UPLOADER_SRC).toMatch(/min-height:\s*44px/);
  });

  it('mobile-first responsive: media queries scale up at 768px', () => {
    expect(UPLOADER_SRC).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);
  });

  it('Crystalline Swan Dual-Button-Glow rule on Choose Files button (purple bg → cyan glow)', () => {
    // Or vice versa: blue bg → purple glow. Here we use blue bg + purple glow.
    expect(UPLOADER_SRC).toMatch(/box-shadow:\s*0\s+0\s+\d+px\s+rgba\(139,\s*92,\s*246,\s*0\.\d+\)/);
  });

  it('keyboard accessible (Enter / Space activates picker)', () => {
    expect(UPLOADER_SRC).toMatch(/e\.key\s*===\s*['"]Enter['"]/);
    expect(UPLOADER_SRC).toMatch(/e\.key\s*===\s*['"]\s['"]/);
  });

  it('rejects > 5 files client-side', () => {
    expect(UPLOADER_SRC).toMatch(/MAX_FILES\s*=\s*5/);
  });

  it('mime allowlist enforced client-side', () => {
    expect(UPLOADER_SRC).toMatch(/ACCEPTED_MIMES/);
    expect(UPLOADER_SRC).toMatch(/audio\/mpeg/);
    expect(UPLOADER_SRC).toMatch(/audio\/x-m4a/);
  });

  it('drag-and-drop handlers wired (onDragOver, onDragLeave, onDrop)', () => {
    expect(UPLOADER_SRC).toMatch(/onDragOver/);
    expect(UPLOADER_SRC).toMatch(/onDragLeave/);
    expect(UPLOADER_SRC).toMatch(/onDrop/);
  });

  it('aria-disabled when isUploading', () => {
    expect(UPLOADER_SRC).toMatch(/aria-disabled/);
  });
});

describe('Slice 3.11 — PlaudClipQueue source contract', () => {
  it('checkbox semantics via role+aria-checked for screen readers', () => {
    expect(QUEUE_SRC).toMatch(/role="checkbox"/);
    expect(QUEUE_SRC).toMatch(/aria-checked=\{selected\}/);
  });

  it('44px touch targets on checkbox + delete buttons', () => {
    expect(QUEUE_SRC).toMatch(/width:\s*44px/);
    expect(QUEUE_SRC).toMatch(/height:\s*44px/);
  });

  it('status pill colors: lost/expired uses red, merged uses purple', () => {
    expect(QUEUE_SRC).toMatch(/status\s*===\s*['"]lost['"]/);
    expect(QUEUE_SRC).toMatch(/status\s*===\s*['"]merged['"]/);
  });

  it('responsive grid layout adapts at 768px+', () => {
    expect(QUEUE_SRC).toMatch(/@media\s*\(\s*min-width:\s*768px\s*\)/);
  });
});

describe('Slice 3.11 — PlaudClipQueue render', () => {
  it('renders empty state when no clips', () => {
    render(<PlaudClipQueue clips={[]} selectedIds={new Set()} onToggleSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText(/No clips uploaded yet/i)).toBeTruthy();
  });

  it('renders list of clips', () => {
    const clips = [
      { clipId: '11111111-1111-1111-1111-111111111111', filename: 'rec1.mp3', mimetype: 'audio/mpeg', size: 1024, durationSec: 45, status: 'pending_merge', uploadedAt: '2026-05-04', expiresAt: '2026-05-05' },
      { clipId: '22222222-2222-2222-2222-222222222222', filename: 'rec2.mp3', mimetype: 'audio/mpeg', size: 2048, durationSec: 60, status: 'pending_merge', uploadedAt: '2026-05-04', expiresAt: '2026-05-05' },
    ];
    render(<PlaudClipQueue clips={clips} selectedIds={new Set()} onToggleSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('rec1.mp3')).toBeTruthy();
    expect(screen.getByText('rec2.mp3')).toBeTruthy();
  });

  it('renders aria-checked=true for selected clips', () => {
    const clips = [
      { clipId: '11111111-1111-1111-1111-111111111111', filename: 'rec1.mp3', mimetype: 'audio/mpeg', size: 1024, durationSec: 45, status: 'pending_merge', uploadedAt: '2026-05-04', expiresAt: '2026-05-05' },
    ];
    render(<PlaudClipQueue clips={clips} selectedIds={new Set(['11111111-1111-1111-1111-111111111111'])} onToggleSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole('checkbox', { checked: true })).toBeTruthy();
  });

  it('shows the selected chronological merge order', () => {
    const clips = [
      { clipId: '22222222-2222-2222-2222-222222222222', filename: 'late.mp3', mimetype: 'audio/mpeg', size: 1024, durationSec: 45, status: 'pending_merge', uploadedAt: '2026-05-04T11:30:00.000Z', expiresAt: '2026-05-05' },
      { clipId: '11111111-1111-1111-1111-111111111111', filename: 'early.mp3', mimetype: 'audio/mpeg', size: 2048, durationSec: 60, status: 'pending_merge', uploadedAt: '2026-05-04T11:00:00.000Z', expiresAt: '2026-05-05' },
    ];
    render(<PlaudClipQueue clips={clips} selectedIds={new Set(clips.map((c) => c.clipId))} onToggleSelect={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('Merge step 1')).toBeTruthy();
    expect(screen.getByText('Merge step 2')).toBeTruthy();
  });
});

describe('Slice 3.11 — PlaudClipMergePanel source contract', () => {
  it('uses usePlaudClipQueue hook + submitMerge from service', () => {
    expect(PANEL_SRC).toMatch(/usePlaudClipQueue/);
    expect(PANEL_SRC).toMatch(/submitMerge/);
  });

  it('Merge button disabled until 2-5 selected AND client resolved', () => {
    expect(PANEL_SRC).toMatch(/queue\.canMerge/);
    expect(PANEL_SRC).toMatch(/resolvedClient/);
  });

  it('uses PlaudClientResolver instead of raw numeric Client ID input', () => {
    expect(PANEL_SRC).toMatch(/PlaudClientResolver/);
    expect(PANEL_SRC).not.toMatch(/plaud-client-id-input/);
    expect(PANEL_SRC).not.toMatch(/type="number"/);
  });

  it('aria-live="polite" status message announces selection count', () => {
    expect(PANEL_SRC).toMatch(/aria-live="polite"/);
  });

  it('on success: clears selection + refreshes queue + invokes onMergeReady', () => {
    expect(PANEL_SRC).toMatch(/clearSelection\(\)/);
    expect(PANEL_SRC).toMatch(/queue\.refresh\(\)/);
    expect(PANEL_SRC).toMatch(/onMergeReady\(/);
    expect(PANEL_SRC).toMatch(/clientId:\s*resolvedClient\.id/);
    expect(PANEL_SRC).toMatch(/clientName:\s*resolvedClient\.fullName/);
  });

  it('Merge button emits cyan glow per Dual-Button-Glow rule', () => {
    expect(PANEL_STYLES_SRC).toMatch(/box-shadow:[\s\S]{0,80}rgba\(96,192,240/);
  });

  it('submits selected clips in chronological timeline order', () => {
    expect(PANEL_SRC).toMatch(/selectedClipIdsInTimelineOrder/);
    expect(PANEL_SRC).toMatch(/orderMode:\s*'uploaded_at_asc'/);
    expect(PANEL_SRC).not.toMatch(/Array\.from\(queue\.selectedIds\)/);
  });
});

describe('PLAUD clip timeline utility', () => {
  it('sorts selected clips by uploadedAt and flags large gaps', () => {
    const clips = [
      { clipId: 'b', filename: 'later.mp3', mimetype: 'audio/mpeg', size: 1, durationSec: 30, status: 'pending_merge', uploadedAt: '2026-05-04T13:20:00.000Z', expiresAt: '2026-05-05' },
      { clipId: 'a', filename: 'first.mp3', mimetype: 'audio/mpeg', size: 1, durationSec: 30, status: 'pending_merge', uploadedAt: '2026-05-04T10:00:00.000Z', expiresAt: '2026-05-05' },
      { clipId: 'c', filename: 'middle.mp3', mimetype: 'audio/mpeg', size: 1, durationSec: 30, status: 'pending_merge', uploadedAt: '2026-05-04T10:08:00.000Z', expiresAt: '2026-05-05' },
    ];
    const timeline = buildClipTimeline(clips, new Set(['a', 'b', 'c']));
    expect(timeline.selectedClipIdsInTimelineOrder).toEqual(['a', 'c', 'b']);
    expect(timeline.maxGapMinutes).toBe(192);
    expect(timeline.hasLargeGap).toBe(true);
  });

  it('does not fabricate large gaps from missing uploadedAt values', () => {
    const clips = [
      { clipId: 'known', filename: 'known.mp3', mimetype: 'audio/mpeg', size: 1, durationSec: 30, status: 'pending_merge', uploadedAt: '2026-05-04T10:00:00.000Z', expiresAt: '2026-05-05' },
      { clipId: 'unknown', filename: 'unknown.mp3', mimetype: 'audio/mpeg', size: 1, durationSec: 30, status: 'pending_merge', uploadedAt: '', expiresAt: '2026-05-05' },
    ];
    const timeline = buildClipTimeline(clips, new Set(['known', 'unknown']));
    expect(timeline.selectedClipIdsInTimelineOrder).toEqual(['known', 'unknown']);
    expect(timeline.maxGapMinutes).toBe(0);
    expect(timeline.hasLargeGap).toBe(false);
  });
});

describe('Slice 3.11 — PlaudMergeBoundaryBanner', () => {
  it('renders nothing when warning=false', () => {
    const { container } = render(<PlaudMergeBoundaryBanner boundaryWarning={{ warning: false, confidence: 'low', detectedNames: [] }} />);
    expect(container.querySelector('[data-testid="plaud-boundary-banner"]')).toBeNull();
  });

  it('renders alert role when warning=true', () => {
    const { container } = render(<PlaudMergeBoundaryBanner boundaryWarning={{ warning: true, confidence: 'medium', detectedNames: [{ id: 1, firstName: 'Sarah', lastName: 'J', mentions: 2 }] }} />);
    expect(container.querySelector('[data-testid="plaud-boundary-banner"]')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });

  it('lists detected names', () => {
    render(<PlaudMergeBoundaryBanner boundaryWarning={{ warning: true, confidence: 'medium', detectedNames: [
      { id: 1, firstName: 'Sarah', lastName: 'Johnson', mentions: 3 },
      { id: 2, firstName: 'Michael', lastName: 'Stevens', mentions: 2 },
    ] }} />);
    const text = document.body.textContent || '';
    expect(text).toMatch(/Sarah Johnson/);
    expect(text).toMatch(/Michael Stevens/);
  });

  it('shows Continue + Re-select buttons when handlers passed', () => {
    render(<PlaudMergeBoundaryBanner
      boundaryWarning={{ warning: true, confidence: 'medium', detectedNames: [{ id: 1, firstName: 'A', lastName: 'B', mentions: 1 }] }}
      onContinue={() => {}}
      onReSelect={() => {}}
    />);
    expect(screen.getByText(/Continue anyway/i)).toBeTruthy();
    expect(screen.getByText(/Go back and re-select/i)).toBeTruthy();
  });

  it('source uses gold accent token for warning theme', () => {
    expect(BANNER_SRC).toMatch(/var\(--accent-gold,\s*#C6A84B\)/);
  });
});

describe('PlaudClientResolver source contract', () => {
  it('loads active clients through the admin client service', () => {
    expect(RESOLVER_SRC).toMatch(/createAdminClientService/);
    expect(RESOLVER_SRC).toMatch(/getClients\(\{/);
    expect(RESOLVER_SRC).toMatch(/status:\s*['"]active['"]/);
  });

  it('supports preselected client context but still exposes Change client', () => {
    expect(RESOLVER_SRC).toMatch(/initialClientId/);
    expect(RESOLVER_SRC).toMatch(/initialClientName/);
    expect(RESOLVER_SRC).toMatch(/Change client/);
  });

  it('includes New client handoff via existing CreateClientModal', () => {
    expect(RESOLVER_SRC).toMatch(/CreateClientModal/);
    expect(RESOLVER_SRC).toMatch(/New client/);
    expect(RESOLVER_SRC).toMatch(/createExternalClient/);
    expect(RESOLVER_SRC).toMatch(/createClient/);
  });

  it('keeps resolver controls 44px+ and tokenized', () => {
    expect(RESOLVER_STYLES_SRC).toMatch(/min-height:\s*44px/);
    expect(RESOLVER_STYLES_SRC).toMatch(/var\(--text-primary,\s*#E0ECF4\)/);
    expect(RESOLVER_STYLES_SRC).not.toMatch(/from\s+['"]@mui/);
  });
});

describe('PlaudMergeWorkspace Coach handoff contract', () => {
  it('delegates approval mapping to the shared Coach transcript mapper', () => {
    expect(REVIEW_SRC).toMatch(/applyMergeApproval/);
    expect(WORKSPACE_SRC).not.toMatch(/axios\.post/);
    expect(APPROVAL_SRC).toMatch(/parsedWorkoutToLogPayload/);
    expect(APPROVAL_SRC).toMatch(/source:\s*'plaud_merge'/);
    expect(APPROVAL_SRC).toMatch(/mergeRequestId/);
  });

  it('marks approved merge requests after the workout log write succeeds', () => {
    expect(MERGE_SERVICE_SRC).toMatch(/approveMergeRequest/);
    expect(MERGE_SERVICE_SRC).toMatch(/\/approve/);
    expect(APPROVAL_SRC).toMatch(/approveMergeRequest/);
  });

  it('surfaces encrypted source clip timeline metadata in review', () => {
    expect(MERGE_SERVICE_SRC).toMatch(/MergeClipTimelineItem/);
    expect(REVIEW_SRC).toMatch(/clipTimeline/);
    expect(REVIEW_SRC).toMatch(/Source clip timeline/);
  });

  it('surfaces deterministic date split candidates in review', () => {
    expect(REVIEW_SRC).toMatch(/PlaudDateSplitCandidatePanel/);
    expect(REVIEW_SRC).toMatch(/dateSplitCandidates/);
    expect(WORKSPACE_SRC).toMatch(/getMergeRequest\(response\.mergeRequestId\)/);
    expect(DATE_SPLIT_SRC).toMatch(/futureDateBlocked/);
    expect(DATE_SPLIT_SRC).toMatch(/needsDateConfirmation/);
  });

  it('supports per-segment parsing and log writes for split workouts', () => {
    expect(REVIEW_SRC).toMatch(/parseMergeRequestSegment/);
    expect(REVIEW_SRC).toMatch(/applyMergeSegmentApproval/);
    expect(REVIEW_SRC).toMatch(/approveMergeRequest/);
    expect(REVIEW_SRC).toMatch(/segmentDateOverrides/);
    expect(REVIEW_SRC).toMatch(/buildEffectiveSegment/);
    expect(REVIEW_SRC).toMatch(/shouldRenderSegmentApproval/);
    expect(DATE_SPLIT_SRC).toMatch(/Trainer-confirmed date/);
    expect(MERGE_SERVICE_SRC).toMatch(/\/segments\/\$\{encodeURIComponent\(args\.segmentId\)\}\/parse/);
    expect(MERGE_SERVICE_SRC).toMatch(/dateOverride/);
    expect(APPROVAL_SRC).toMatch(/source:\s*'plaud_merge_segment'/);
    expect(APPROVAL_SRC).toMatch(/targetDate:\s*args\.segment\.date/);
  });
});
