/**
 * Contract: the admin landing surfaces proof-of-value before utility.
 *
 * Five-surface review A1 (corrected by the Sol pass: 8th of ELEVEN bands, not
 * last): "who trained / who's stale / who needs intervention" rendered below an
 * AI terminal and three money bands. CLAUDE.md's admin priority says client
 * workout/progress truth outranks decorative or low-revenue features.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-dashboard/overview/AdminOverviewPanel.tsx'),
  'utf8',
);
const at = (needle: string) => {
  const i = source.indexOf(needle);
  expect(i, `missing marker: ${needle}`).toBeGreaterThan(-1);
  return i;
};

describe('admin overview band order', () => {
  it('work queues and operations render above the AI terminal', () => {
    const terminal = at('name="Admin Assistant"');
    expect(at('id="admin-queues"')).toBeLessThan(terminal);
    expect(at('id="admin-operations"')).toBeLessThan(terminal);
  });

  it('operations still follows queues (tasks, then who needs intervention)', () => {
    expect(at('id="admin-queues"')).toBeLessThan(at('id="admin-operations"'));
  });

  it('the signal bar and quick actions stay first', () => {
    expect(at('name="Signal bar"')).toBeLessThan(at('name="Quick actions"'));
    expect(at('name="Quick actions"')).toBeLessThan(at('id="admin-queues"'));
  });

  it('all eleven bands survive the move', () => {
    for (const id of ['admin-queues', 'admin-operations', 'admin-alerts', 'admin-business-lens',
      'admin-revenue-integrity', 'admin-ops-intelligence', 'admin-community-safety']) {
      expect(source).toContain(`id="${id}"`);
    }
    for (const w of ['Signal bar', 'Quick actions', 'Admin Assistant']) {
      expect(source).toContain(`name="${w}"`);
    }
    expect(source).toContain('AdminTelemetrySection');
  });

  it('the moved operations band keeps its authAxios dependency', () => {
    const start = at('id="admin-operations"');
    const end = source.indexOf('</AdminOverviewSection>', start);
    expect(source.slice(start, end)).toContain('authAxios={authAxios}');
  });
});
