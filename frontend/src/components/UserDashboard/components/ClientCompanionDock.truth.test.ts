import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const lineCount = (source: string) => source.trimEnd().split(/\r?\n/).length;

describe('Client companion dock source contract', () => {
  const tabSource = read('./ClientDashboardHomeTab.tsx');
  const dockSource = read('./ClientCompanionDock.tsx');
  const styleSource = read('./ClientCompanionDock.styles.ts');

  it('mounts the dock behind a rollout guard on the canonical client home tab', () => {
    expect(tabSource).toContain("import ClientCompanionDock from './ClientCompanionDock';");
    expect(tabSource).toContain("import { isCompanionDockEnabled } from './companionDockPreferences';");
    expect(tabSource).toContain('VITE_ENABLE_COMPANION_DOCK');
    expect(tabSource).toContain('companionDockEnabled && companionUserIdSegment && <ClientCompanionDock');
  });

  it('keeps dock collapse local, reversible, and persisted by user segment', () => {
    expect(dockSource).toContain('readCompanionDockCollapsed(userIdSegment)');
    expect(dockSource).toContain('writeCompanionDockCollapsed(userIdSegment, nextCollapsed)');
    expect(dockSource).toContain('aria-label="Open companion dock"');
    expect(dockSource).toContain('aria-label="Minimize companion dock"');
    expect(dockSource).toContain('DockMiniButton');
  });

  it('keeps dock files compact, tokenized, and motion-aware', () => {
    expect(lineCount(dockSource)).toBeLessThanOrEqual(180);
    expect(lineCount(styleSource)).toBeLessThanOrEqual(220);
    expect(dockSource).not.toContain('style={{');
    expect(styleSource).not.toContain('transition: all');
    expect(styleSource).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
