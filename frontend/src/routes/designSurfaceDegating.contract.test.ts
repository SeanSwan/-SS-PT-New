/**
 * Design-surface de-gating contract.
 *
 * Sean's workflow requires committed route wiring to be the production design source of truth. These source
 * assertions prevent a design flag, preview query, or runtime resolver from being reintroduced around the
 * seven parked surfaces while keeping the parked implementations available to the admin Design Studio.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function resolveSrcRoot(): string {
  for (const candidate of [resolve(process.cwd(), 'src'), resolve(process.cwd(), 'frontend/src')]) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Cannot locate frontend/src from cwd=${process.cwd()}`);
}

const SRC_ROOT = resolveSrcRoot();
const routes = readFileSync(resolve(SRC_ROOT, 'routes/main-routes.tsx'), 'utf8');
const REMOVED_GATES = [
  'HomeGate',
  'StoreGate',
  'AboutGate',
  'ContactGate',
  'VideoGate',
  'GalleryGate',
  'DashboardV2RouteGate',
] as const;
const REMOVED_GATE_FILES = [
  'pages/HomePage/HomeGate.tsx',
  'pages/shop/StoreGate.tsx',
  'pages/about/AboutGate.tsx',
  'pages/contactpage/ContactGate.tsx',
  'pages/VideoGate.tsx',
  'pages/GalleryGate.tsx',
  'components/DashBoard/v2/DashboardV2RouteGate.tsx',
  'components/DashBoard/v2/DashboardGate.tsx',
] as const;

describe("Sean's law: design surfaces never gate", () => {
  it('mounts each original public surface directly from the canonical router', () => {
    expect(routes).toMatch(/index:\s*true,[\s\S]*?<HomePage\s*\/>/);
    expect(routes).toMatch(/path:\s*'contact',[\s\S]*?<ContactPage\s*\/>/);
    expect(routes).toMatch(/path:\s*'about',[\s\S]*?<AboutPage\s*\/>/);
    expect(routes).toMatch(/path:\s*'gallery',[\s\S]*?<GalleryPage\s*\/>/);
    expect(routes).toMatch(/path:\s*'video-library',[\s\S]*?<VideoLibrary\s*\/>/);
    expect(routes).toMatch(/path:\s*'store',[\s\S]*?<SwanStudiosStore\s*\/>/);
    expect(routes).toMatch(/path:\s*'dashboard\/\*',[\s\S]*?<UniversalDashboardLayout\s*\/>/);
  });

  it('imports the original gallery rather than the gated gallery wrapper', () => {
    expect(routes).toContain("() => import('../pages/GalleryPage')");
    expect(routes).not.toContain("() => import('../pages/GatedGalleryPage')");
  });

  it('contains no design-gate import, wrapper, or gate file', () => {
    for (const gate of REMOVED_GATES) {
      expect(routes, `${gate} must not participate in canonical routing`).not.toContain(gate);
    }
    for (const file of REMOVED_GATE_FILES) {
      expect(existsSync(resolve(SRC_ROOT, file)), `${file} must be retired`).toBe(false);
    }
  });
});
