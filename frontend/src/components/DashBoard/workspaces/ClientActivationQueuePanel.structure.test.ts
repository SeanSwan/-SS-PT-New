import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const readWorkspaceFile = (file: string) =>
  readFileSync(resolve(process.cwd(), `src/components/DashBoard/workspaces/${file}`), 'utf8');

describe('ClientActivationQueuePanel structure', () => {
  const files = [
    'ClientActivationQueuePanel.tsx',
    'ClientActivationQueuePanel.logic.ts',
    'ClientActivationQueuePanel.styles.ts',
  ];

  it('keeps the canonical paid-client activation queue split into focused files under the line cap', () => {
    const source = readWorkspaceFile('ClientActivationQueuePanel.tsx');

    expect(source).toContain("from './ClientActivationQueuePanel.logic'");
    expect(source).toContain("from './ClientActivationQueuePanel.styles'");
    expect(source).toContain("from './clientActivationQueue'");

    files.forEach((file) => {
      const fullPath = resolve(process.cwd(), `src/components/DashBoard/workspaces/${file}`);
      expect(existsSync(fullPath), `${file} should exist`).toBe(true);
      expect(readWorkspaceFile(file).split(/\r?\n/).length, `${file} should stay under 300 lines`).toBeLessThanOrEqual(300);
    });
  });

  it('keeps activation queue styling dark-first, touch-safe, and off retired tokens', () => {
    const combined = files.map(readWorkspaceFile).join('\n');

    expect(combined).toContain('min-height: 44px');
    expect(combined).toContain('var(--text-primary, #E0ECF4)');
    expect(combined).toContain('var(--accent-primary, #60C0F0)');
    expect(combined).not.toContain('#00' + 'FFFF');
    expect(combined).not.toContain('#0a' + '0a1a');
    expect(combined).not.toContain('#7851' + 'A9');
  });
});
