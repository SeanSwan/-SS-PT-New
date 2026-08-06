/**
 * SWA-138 S12 — SwanGlobe contracts.
 * Locks the panel-mandated guarantees: strict M1 (no ambient loop), the
 * capability gate that prevents mobile from EVER fetching the Three.js chunk,
 * the perf contract, keyboard access to city data, and the context-loss escape.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SwanGlobePanel from './SwanGlobePanel';
import { markerScale, latLonToVector3 } from './swanGlobeScene';

const mockAuthAxios = { get: vi.fn() };
vi.mock('../../../../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: mockAuthAxios }),
}));

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const base = 'src/components/DashBoard/Pages/admin-dashboard/components/SwanGlobe';
const scene = read(`${base}/swanGlobeScene.ts`);
const capability = read(`${base}/swanGlobeCapability.ts`);
const panel = read(`${base}/SwanGlobePanel.tsx`);
const overview = read('src/components/DashBoard/Pages/admin-dashboard/overview/AdminTelemetrySection.tsx');

const geoResponse = {
  data: {
    data: {
      totalVisitors: 91,
      uniqueCountries: 4,
      byCity: [
        { city: 'Alpha', country: 'US', lat: 34.05, lon: -118.24, count: 42 },
        { city: 'Beta', country: 'CA', lat: 45.42, lon: -75.69, count: 17 },
      ],
    },
  },
};

describe('SwanGlobe strict-M1 motion discipline (S12/B1)', () => {
  it('renders on demand only — no ambient loop, no auto-rotation', () => {
    expect(scene).toContain('requestRender');
    expect(scene).not.toMatch(/function\s+animate|const\s+animate\s*=/);
    expect(scene).not.toContain('rotation.y += 0.0');
    expect(scene).not.toContain('setAnimationLoop');
  });

  it('pauses when offscreen or backgrounded and disposes everything on teardown', () => {
    expect(scene).toContain('IntersectionObserver');
    expect(scene).toContain("document.addEventListener('visibilitychange'");
    expect(scene).toContain('renderer.dispose()');
    expect(scene).toContain('markerGeometry.dispose()');
    expect(scene).toContain('sphere.geometry.dispose()');
  });

  it('clamps pixel ratio and batches markers into one InstancedMesh (B3)', () => {
    expect(scene).toContain('Math.min(window.devicePixelRatio || 1, MAX_DPR)');
    expect(scene).toContain('new THREE.InstancedMesh');
  });

  it('escapes to the fallback on webglcontextlost (B5)', () => {
    expect(scene).toContain("'webglcontextlost'");
    expect(panel).toContain('onContextLost={() => setContextLost(true)}');
    expect(panel).toContain('graphics context lost');
  });
});

describe('capability gate — mobile never downloads Three.js (S12/B2)', () => {
  it('resolves capability BEFORE the dynamic import decision', () => {
    expect(panel).toContain('const capability = useMemo(() => resolveGlobeCapability(), [])');
    expect(panel).toContain('const showGlobe = capability.enabled');
    expect(panel).toContain("lazy(() => import('./SwanGlobe'))");
  });

  it('blocks coarse pointers, small viewports, reduced motion, and missing WebGL', () => {
    expect(capability).toContain("'(pointer: coarse)'");
    expect(capability).toContain('window.innerWidth < MIN_DESKTOP_WIDTH');
    expect(capability).toContain("'(prefers-reduced-motion: reduce)'");
    expect(capability).toContain('detectWebGL()');
  });
});

describe('geometry helpers', () => {
  it('maps lat/lon onto the sphere surface at the given radius', () => {
    const v = latLonToVector3(0, 0, 1);
    expect(v.length()).toBeCloseTo(1, 5);
    expect(latLonToVector3(90, 0, 1).y).toBeCloseTo(1, 5);
  });

  it('scales markers by visitor count within a bounded range', () => {
    expect(markerScale(1)).toBeLessThan(markerScale(1000));
    expect(markerScale(100000)).toBeLessThanOrEqual(0.055);
  });
});

describe('SwanGlobePanel data + a11y', () => {
  beforeEach(() => {
    mockAuthAxios.get.mockReset().mockResolvedValue(geoResponse);
  });

  it('renders the ranked city table as real keyboard-focusable buttons (fixes the mouse-only tooltip defect)', async () => {
    render(<SwanGlobePanel />);
    const row = await screen.findByRole('button', { name: /Alpha, US/ });
    expect(row).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Beta, CA/ })).toBeInTheDocument();
  });

  it('sorts cities by visitor count descending', async () => {
    render(<SwanGlobePanel />);
    await screen.findByRole('button', { name: /Alpha, US/ });
    const rows = screen.getAllByRole('button').filter((b) => /,\s(US|CA)/.test(b.textContent || ''));
    expect(rows[0].textContent).toContain('Alpha');
  });

  it('a failed fetch shows the shell error, never the empty copy', async () => {
    mockAuthAxios.get.mockReset().mockRejectedValue(new Error('boom'));
    render(<SwanGlobePanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Visitor geography unavailable');
    expect(screen.queryByText('No visitor geography recorded yet')).not.toBeInTheDocument();
  });

  it('is mounted in the admin telemetry band behind a crash boundary', () => {
    expect(overview).toContain("lazy(() => import('../components/SwanGlobe/SwanGlobePanel'))");
    expect(overview).toContain('<WidgetErrorBoundary name="Visitor globe">');
  });
});
