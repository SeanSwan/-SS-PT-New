/**
 * FILE: slashCommands.ts
 * PURPOSE: The composer's "/" menu — one list that merges the workspace's own
 * actions with the server's role-scoped command catalog (brain-v4 J12).
 *
 * The catalog stays the authority for what can execute: picking a catalog row
 * PREFILLS the composer and remembers the row's exact `type`, so the send carries
 * the type instead of making the classifier re-guess (CoachIntentBar F-17). Only
 * the read-only, no-argument "Quick" aliases send on pick; every write still
 * stops at the approval sheet.
 */
import type { CoachCommandCatalogEntry } from '../../../../hooks/coachCommandCatalog';

export type WorkspaceActionId =
  | 'new-chat' | 'review' | 'schedule' | 'logger' | 'planner' | 'note' | 'draft-from-notes' | 'catalog' | 'context';

export type SlashItem =
  | { kind: 'action'; id: WorkspaceActionId; trigger: string; label: string; group: 'Workspace' }
  | { kind: 'command'; trigger: string; label: string; prompt: string; commandType: string; group: string; instant?: boolean };

export type SlashContext = { staff: boolean; notebookAvailable: boolean };

const ACTIONS: Array<Extract<SlashItem, { kind: 'action' }> & { staffOnly?: boolean; notebook?: boolean }> = [
  { kind: 'action', id: 'new-chat', trigger: 'new', label: 'Start a new chat', group: 'Workspace' },
  { kind: 'action', id: 'schedule', trigger: 'schedule', label: "Open today's schedule", group: 'Workspace' },
  { kind: 'action', id: 'logger', trigger: 'log', label: 'Open the workout logger', group: 'Workspace' },
  { kind: 'action', id: 'planner', trigger: 'plan', label: 'Open the workout planner', group: 'Workspace' },
  { kind: 'action', id: 'review', trigger: 'review', label: 'Review intake, audio, and drafts', group: 'Workspace', staffOnly: true },
  { kind: 'action', id: 'note', trigger: 'note', label: 'Capture a client note', group: 'Workspace', staffOnly: true, notebook: true },
  { kind: 'action', id: 'draft-from-notes', trigger: 'draft', label: 'Draft workouts from saved notes', group: 'Workspace', staffOnly: true, notebook: true },
  { kind: 'action', id: 'context', trigger: 'context', label: 'Show client context', group: 'Workspace' },
  { kind: 'action', id: 'catalog', trigger: 'commands', label: 'Browse every coach command', group: 'Workspace' },
];

/**
 * Short aliases for the read-only commands a coach reaches for most. Each maps to
 * a REAL registry type (backend commandRegistry) and appears only when the
 * role-scoped catalog actually carries that type — never a promise the server
 * cannot keep.
 */
// `instant`: read-only, no arguments → one tap sends it (registry: destructive
// false, requiresConfirmation false). brief_client needs a client, so it prefills.
const ALIASES: Array<{ trigger: string; commandType: string; label: string; prompt: string; staff: boolean; instant: boolean }> = [
  { trigger: 'brief', commandType: 'brief_my_day', label: "Today's day sheet with attention flags", prompt: 'Brief my day', staff: true, instant: true },
  { trigger: 'attention', commandType: 'at_risk_clients', label: 'Clients who need attention', prompt: 'Who are my at-risk clients', staff: true, instant: true },
  { trigger: 'client', commandType: 'brief_client', label: 'Brief me on the selected client', prompt: 'Brief me on this client', staff: true, instant: false },
  { trigger: 'today', commandType: 'my_workout_today', label: "Today's workout", prompt: "What's my workout today", staff: false, instant: true },
  { trigger: 'progress', commandType: 'my_progress', label: 'My progress this month', prompt: 'Show my progress', staff: false, instant: true },
];

export function commandAliases(commands: CoachCommandCatalogEntry[], staff: boolean): SlashItem[] {
  const available = new Set(commands.map((command) => command.type));
  return ALIASES.filter((alias) => alias.staff === staff && available.has(alias.commandType)).map((alias) => ({
    kind: 'command' as const, trigger: alias.trigger, label: alias.label, prompt: alias.prompt, commandType: alias.commandType, group: 'Quick', instant: alias.instant,
  }));
}

/** `/foo bar` → 'foo'; anything not starting with "/" or already past the first word → null. */
export function slashQuery(text: string): string | null {
  if (!text.startsWith('/')) return null;
  const rest = text.slice(1);
  if (/\s/.test(rest)) return null;
  return rest.toLowerCase();
}

function catalogItems(commands: CoachCommandCatalogEntry[]): SlashItem[] {
  return commands
    .filter((command) => command.canExecute !== false && !command.manualOnly)
    .map((command) => ({
      kind: 'command' as const,
      trigger: command.type.replace(/_/g, '-'),
      label: command.description,
      prompt: `${command.examples?.[0] ?? command.description} `.replace(/\s+$/, ' '),
      commandType: command.type,
      group: command.group || 'Commands',
    }));
}

/** Every item that matches the query, workspace actions first, catalog last. */
export function buildSlashItems(query: string, commands: CoachCommandCatalogEntry[], context: SlashContext, limit = 40): SlashItem[] {
  const actions = ACTIONS.filter((item) => (!item.staffOnly || context.staff) && (!item.notebook || context.notebookAvailable))
    .map(({ staffOnly: _s, notebook: _n, ...item }) => item);
  const all: SlashItem[] = [...actions, ...commandAliases(commands, context.staff), ...catalogItems(commands)];
  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, limit);
  const starts = all.filter((item) => item.trigger.startsWith(q));
  const contains = all.filter((item) => !item.trigger.startsWith(q)
    && (item.trigger.includes(q) || item.label.toLowerCase().includes(q)));
  return [...starts, ...contains].slice(0, limit);
}

/**
 * The part of a picked command's prompt that must still lead the text for the
 * picked type to apply (review #11). A templated example ("Log {client}'s
 * workout") is cut at its first "{" — the operator replaces the slot, so the
 * whole-prompt prefix never matched and the pick silently fell back to the
 * classifier. Null when nothing fixed precedes the slot.
 */
export function pickedPrefix(prompt: string): string | null {
  const fixed = prompt.split('{')[0].trim().slice(0, 16).trimEnd();
  return fixed.length >= 3 ? fixed : null;
}
