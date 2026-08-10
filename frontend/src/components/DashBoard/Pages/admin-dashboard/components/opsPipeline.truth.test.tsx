/**
 * SWA-138 S16 — the last two S11 deferrals (PLAUD health, bootcamp ops).
 * The contract worth locking here is TRIAGE HONESTY: retryable mirror jobs
 * self-heal and must not be alarmed, terminal failures must be; and a bootcamp
 * class whose attendance was never recorded is a real coaching-record gap, not
 * a zero.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BootcampOpsWidget, PlaudHealthWidget } from './OpsPipelineWidgets';

const mockAuthAxios = { get: vi.fn() };
vi.mock('../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
// SWA-138 S16: pipeline rollups split into their own route module (Rule 4).
const route = read('../backend/routes/adminOpsPipelineRoutes.mjs');
const panel = read('src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx');

const plaud = { data: { success: true, data: {
  basis: 'clips and mirror jobs created in window, grouped by status',
  totalClips: 40, merged: 34, lost: 1, stuckClips: 5,
  mirror: { total: 40, mirrored: 36, retrying: 2, terminalFailures: 2 },
  needsAttention: 3,
} } };

const bootcamp = { data: { success: true, data: {
  basis: 'bootcamp classes in window; "logged" = attendance recorded (NULL attendance means never recorded)',
  classes: 20, logged: 17, unlogged: 3, loggedPct: 85,
  byTrainer: [{ trainerId: 7, classes: 9, logged: 6, unlogged: 3 }],
} } };

describe('backend contract (S16)', () => {
  it('registers both aggregates behind admin auth', () => {
    expect(route).toContain("router.get('/ops/plaud-health', protect, adminOnly");
    expect(route).toContain("router.get('/ops/bootcamp-ops', protect, adminOnly");
  });

  it('separates self-healing retries from terminal failures needing a human', () => {
    expect(route).toContain('terminalFailures');
    expect(route).toContain('retrying: mirrors.failed_retryable || 0');
    // needsAttention must NOT include retryable jobs.
    expect(route).toContain('needsAttention: terminalFailures + (clips.lost || 0)');
  });

  it('counts an unrecorded bootcamp attendance as a gap, not a zero', () => {
    expect(route).toContain("[fn('COUNT', col('attendance')), 'logged']");
    expect(route).toContain('unlogged: classes - logged');
    expect(route).toContain('NULL attendance means never recorded');
  });

  it('states its basis and bounds its window like its siblings', () => {
    expect(route).toContain("basis: 'clips and mirror jobs created in window, grouped by status'");
    expect(route).toContain('resolveWindowDays(req.query.days)');
    const core = read('../backend/core/routes.mjs');
    expect(core).toContain("app.use('/api/admin', adminOpsPipelineRoutes)");
  });
});

describe('PlaudHealthWidget', () => {
  beforeEach(() => { mockAuthAxios.get.mockReset().mockResolvedValue(plaud); });

  it('surfaces merged, in-flight, retrying and failed separately', async () => {
    render(<PlaudHealthWidget />);
    expect(await screen.findByText('34')).toBeInTheDocument();
    expect(screen.getByText('Mirror retrying')).toBeInTheDocument();
    expect(screen.getByText('Mirror failed')).toBeInTheDocument();
  });

  it('counts only human-actionable items in the title, not self-healing retries', async () => {
    render(<PlaudHealthWidget />);
    // 2 terminal + 1 lost = 3; the 2 retrying jobs are excluded.
    expect(await screen.findByText(/Voice Ingestion \(3 need attention\)/)).toBeInTheDocument();
  });

  it('a failed fetch shows the shell error, never the empty copy', async () => {
    mockAuthAxios.get.mockReset().mockRejectedValue(new Error('boom'));
    render(<PlaudHealthWidget />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Voice ingestion health unavailable');
    expect(screen.queryByText('No voice clips uploaded in this window.')).not.toBeInTheDocument();
  });
});

describe('BootcampOpsWidget', () => {
  beforeEach(() => { mockAuthAxios.get.mockReset().mockResolvedValue(bootcamp); });

  it('shows class volume, logged attendance, and the never-recorded gap', async () => {
    render(<BootcampOpsWidget />);
    expect(await screen.findByText('20')).toBeInTheDocument();
    expect(screen.getByText('Never recorded')).toBeInTheDocument();
    expect(screen.getByText(/85% of classes have their attendance recorded/)).toBeInTheDocument();
  });

  it('names the trainers with logging gaps so the fix has an owner', async () => {
    render(<BootcampOpsWidget />);
    expect(await screen.findByText(/Trainer #7/)).toBeInTheDocument();
    expect(screen.getByText(/3 of 9 classes unlogged/)).toBeInTheDocument();
  });

  it('flags the unlogged count in the title', async () => {
    render(<BootcampOpsWidget />);
    expect(await screen.findByText(/Bootcamp Ops \(3 unlogged\)/)).toBeInTheDocument();
  });
});

describe('IA', () => {
  it('both mount in the Ops Intelligence band behind crash boundaries', () => {
    expect(panel).toContain('<WidgetErrorBoundary name="Voice ingestion"><PlaudHealthWidget /></WidgetErrorBoundary>');
    expect(panel).toContain('<WidgetErrorBoundary name="Bootcamp ops"><BootcampOpsWidget /></WidgetErrorBoundary>');
  });
});
