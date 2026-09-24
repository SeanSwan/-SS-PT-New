import { describe, expect, it } from 'vitest';
import { buildSlashItems, commandAliases, pickableExample, slashQuery } from './slashCommands';

const catalog = [
  { type: 'brief_my_day', description: 'Day sheet', group: 'G' },
  { type: 'at_risk_clients', description: 'Show at-risk clients who need attention', group: 'A' },
  { type: 'cancel_session', description: 'Cancel a session', group: 'S', manualOnly: true },
  { type: 'log_workout', description: "Log today's workout for a client", group: 'W', examples: ['Log workout for Ava: squat 3x5'] },
];

describe('slash commands', () => {
  it('parses only a leading /word', () => {
    expect(slashQuery('/br')).toBe('br');
    expect(slashQuery('/')).toBe('');
    expect(slashQuery('/brief me')).toBeNull();
    expect(slashQuery('hello /x')).toBeNull();
  });

  it('aliases appear only for types the role-scoped catalog carries', () => {
    expect(commandAliases(catalog, true).map((item) => item.trigger)).toEqual(['brief', 'attention']);
    expect(commandAliases([], true)).toEqual([]);
    expect(commandAliases(catalog, false)).toEqual([]);
  });

  it('only read-only aliases are instant; catalog rows prefill', () => {
    const items = buildSlashItems('', catalog, { staff: true, notebookAvailable: false });
    const brief = items.find((item) => item.trigger === 'brief');
    const log = items.find((item) => item.kind === 'command' && item.commandType === 'log_workout');
    expect(brief && brief.kind === 'command' && brief.instant).toBe(true);
    expect(log && log.kind === 'command' && log.instant).toBeFalsy();
    expect(log && log.kind === 'command' && log.prompt).toBe('Log workout for Ava: squat 3x5 ');
  });

  it('never offers a manual-only command, staff-only actions to clients, or notebook without a client', () => {
    const staffNoClient = buildSlashItems('', catalog, { staff: true, notebookAvailable: false });
    expect(staffNoClient.some((item) => item.kind === 'command' && item.commandType === 'cancel_session')).toBe(false);
    expect(staffNoClient.some((item) => item.kind === 'action' && item.id === 'note')).toBe(false);
    const client = buildSlashItems('', catalog, { staff: false, notebookAvailable: true });
    expect(client.some((item) => item.kind === 'action' && (item.id === 'review' || item.id === 'note'))).toBe(false);
  });

  it('prefix matches rank before substring matches', () => {
    const items = buildSlashItems('at', catalog, { staff: true, notebookAvailable: true });
    expect(items[0].trigger).toBe('attention');
    expect(items.some((item) => item.trigger === 'at-risk-clients')).toBe(true);
  });
});

// RE-ANCHORED (round-2 review #1): the pickedPrefix tests asserted that a
// templated pick survives the operator filling its slot — which runs the
// command on the PINNED client, whatever name was typed.
describe('pickableExample', () => {
  it('a slot-free example keeps its type only as the exact prompt', () => {
    expect(pickableExample("  Day sheet — today's sessions ")).toBe("Day sheet — today's sessions");
  });
  it('a templated example never carries its type (the classifier must read the slot)', () => {
    expect(pickableExample("show {client}'s billing")).toBeNull();
    expect(pickableExample('Log {client} workout: {exercise}')).toBeNull();
  });
  it('CONTROL: an empty prompt has nothing to pick', () => {
    expect(pickableExample('   ')).toBeNull();
  });
});
