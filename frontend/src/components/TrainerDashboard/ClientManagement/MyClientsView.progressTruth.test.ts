import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_SOURCE = readFileSync(resolve(__dirname, './MyClientsView.tsx'), 'utf8');
const RAW_SECTIONS_SOURCE = readFileSync(resolve(__dirname, './MyClientsView.sections.tsx'), 'utf8');
const RAW_CARD_SOURCE = readFileSync(resolve(__dirname, './MyClientsView.clientCard.tsx'), 'utf8');
const RAW_HOOK_SOURCE = readFileSync(resolve(__dirname, './useTrainerClients.ts'), 'utf8');

const SOURCE = RAW_SOURCE
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
const SECTIONS_SOURCE = RAW_SECTIONS_SOURCE
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
const CARD_SOURCE = RAW_CARD_SOURCE
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');
const HOOK_SOURCE = RAW_HOOK_SOURCE
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

describe('MyClientsView workout-proof truth locks', () => {
  it('does not present placeholder progress percentages as real client proof', () => {
    expect(SOURCE).not.toMatch(/Overall Progress/);
    expect(SOURCE).not.toMatch(/Math\.round\(client\.progress\.overallProgress\)/);
    expect(SOURCE).not.toMatch(/Trend:\s*\{client\.progress\.recentTrend\}/);
  });

  it('uses logged workout/session proof copy instead of fake improvement counts', () => {
    expect(HOOK_SOURCE).toMatch(/loggedClients/);
    expect(CARD_SOURCE).toMatch(/Workout Proof/);
    expect(CARD_SOURCE).toMatch(/No logs yet/);
    expect(CARD_SOURCE).toMatch(/Last logged:/);
    expect(SOURCE).not.toMatch(/improvingClients/);
    expect(SOURCE).not.toMatch(/Improving Clients/);
  });

  it('uses source-aware session copy instead of raw sessions-left debt for Move Fitness clients', () => {
    expect(CARD_SOURCE).toMatch(/getClientSessionSignal/);
    expect(CARD_SOURCE).toMatch(/sessionSignal\.label/);
    expect(CARD_SOURCE).toMatch(/sessionSignal\.note/);
    expect(SOURCE).not.toMatch(/Sessions Left/);
  });

  it('summarizes paid session inventory without counting non-deducting client sources', () => {
    expect(HOOK_SOURCE).toMatch(/paidSessionInventory/);
    expect(HOOK_SOURCE).toMatch(/isNonDeductingClientSource/);
    expect(SECTIONS_SOURCE).toMatch(/Paid Session Inventory/);
    expect(HOOK_SOURCE).not.toMatch(/const totalSessions = activeClients\.reduce\(\(sum, a\) => sum \+ a\.client\.availableSessions, 0\)/);
    expect(`${SOURCE}\n${SECTIONS_SOURCE}\n${HOOK_SOURCE}`).not.toMatch(/Sessions Remaining/);
  });
});
