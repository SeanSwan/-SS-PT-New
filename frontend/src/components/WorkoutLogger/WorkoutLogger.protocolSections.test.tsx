/**
 * Phase 16.1-UX (2026-04-17) — WorkoutLogger protocol-sections refactor
 * =======================================================================
 * Before this slice, WorkoutLogger.tsx always rendered three giant
 * NASMProtocolSection components carrying 25 warmup rows + 20 balance/core
 * rows + 15 cooldown rows as hardcoded checklists. The actual primary add
 * mechanism — NASMExerciseRolodex — sat below the fold.
 *
 * This test file locks the replacement contract:
 *   - First render does NOT dump the full static default list as the primary UI
 *   - Each of the three protocol sections exposes a visible, labeled Add action
 *   - The Add action opens the rolodex with the correct `sectionContext`
 *   - Selections from the rolodex land in the section's compact selected-items list
 *   - `loadPhaseTemplate` populates the compact selected-items list, not a
 *     giant checklist dump
 *   - The Swan Coach workout-generation entry point (AITerminalPanel) is
 *     preserved during the protocol-section refactor
 *
 * Strategy: source-text locks on WorkoutLogger.tsx for structural claims +
 * behavioral unit tests on CompactProtocolSection for the Add / preset /
 * remove interaction contract. Full RTL mount of the 700-line WorkoutLogger
 * is brittle — the component needs auth, NASM protocol state, offline
 * queue, ghost pre-fill, and many other hooks. Source-text locks catch
 * literal-regression patterns; component unit tests catch callback-wiring
 * regressions. Together they cover Sean's six test requirements.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompactProtocolSection, {
  type ProtocolSelection,
} from './CompactProtocolSection';
import type { NASMDefaultItem } from './NASMProtocolDefaults';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RAW_SOURCE = readFileSync(
  resolve(__dirname, './WorkoutLogger.tsx'),
  'utf8',
);

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
}

const SOURCE = stripComments(RAW_SOURCE);

// ─────────────────────────────────────────────────────────────
// Source-text locks (regression class: "big checklist came back")
// ─────────────────────────────────────────────────────────────

describe('Phase 16.1-UX — WorkoutLogger.tsx no longer renders the giant static protocol checklists', () => {
  it('does NOT import NASMProtocolSection (the 25/20/15-row checklist component)', () => {
    // If a future edit reimports NASMProtocolSection into the logger,
    // the page is at risk of returning to the always-rendered static
    // dump. CompactProtocolSection is the replacement.
    expect(SOURCE).not.toMatch(
      /import\s+NASMProtocolSection\s+from\s+['"]\.\/NASMProtocolSection['"]/,
    );
  });

  it('imports the CompactProtocolSection replacement', () => {
    expect(SOURCE).toMatch(
      /import\s+CompactProtocolSection[,\s\S]*?from\s+['"]\.\/CompactProtocolSection['"]/,
    );
  });

  it('does NOT pass the full DEFAULT_*_ITEMS arrays as the section UI', () => {
    // Ban the old pattern `items={warmupItems}` / `items={balanceCoreItems}`
    // / `items={cooldownItems}` that fed the giant checklist. Those
    // variables are gone; this grep is defense-in-depth.
    expect(SOURCE).not.toMatch(/\bitems\s*=\s*\{\s*warmupItems\s*\}/);
    expect(SOURCE).not.toMatch(/\bitems\s*=\s*\{\s*balanceCoreItems\s*\}/);
    expect(SOURCE).not.toMatch(/\bitems\s*=\s*\{\s*cooldownItems\s*\}/);
  });

  it('does NOT hold the full NASMItem[] protocol state arrays anymore', () => {
    // Old state: `const [warmupItems, setWarmupItems] = useState<NASMItem[]>(DEFAULT_WARMUP_ITEMS)`.
    // This is exactly what dumped 25 rows into the page on every mount.
    expect(SOURCE).not.toMatch(/useState<\s*NASMItem\[\]\s*>\s*\(\s*DEFAULT_WARMUP_ITEMS\s*\)/);
    expect(SOURCE).not.toMatch(/useState<\s*NASMItem\[\]\s*>\s*\(\s*DEFAULT_BALANCE_CORE_ITEMS\s*\)/);
    expect(SOURCE).not.toMatch(/useState<\s*NASMItem\[\]\s*>\s*\(\s*DEFAULT_COOLDOWN_ITEMS\s*\)/);
  });

  it('uses the compact ProtocolSelection state instead', () => {
    // Small, only-what-the-user-selected lists — these replace the
    // 25/20/15 static arrays.
    expect(SOURCE).toMatch(/selectedWarmup/);
    expect(SOURCE).toMatch(/selectedBalanceCore/);
    expect(SOURCE).toMatch(/selectedCooldown/);
  });
});

// ─────────────────────────────────────────────────────────────
// Source-text locks: each section renders a CompactProtocolSection
// with the right `sectionKey` wired to the shared rolodex.
// ─────────────────────────────────────────────────────────────

describe('Phase 16.1-UX — WorkoutLogger.tsx wires the three canonical protocol sections', () => {
  it('renders CompactProtocolSection for warmup (sectionKey="warmup")', () => {
    expect(SOURCE).toMatch(
      /<CompactProtocolSection[\s\S]*?sectionKey=\s*["']warmup["'][\s\S]*?\/>/,
    );
  });

  it('renders CompactProtocolSection for balance_core (sectionKey="balance_core")', () => {
    expect(SOURCE).toMatch(
      /<CompactProtocolSection[\s\S]*?sectionKey=\s*["']balance_core["'][\s\S]*?\/>/,
    );
  });

  it('renders CompactProtocolSection for cooldown (sectionKey="cooldown")', () => {
    expect(SOURCE).toMatch(
      /<CompactProtocolSection[\s\S]*?sectionKey=\s*["']cooldown["'][\s\S]*?\/>/,
    );
  });

  it('section titles match the canonical names exactly', () => {
    expect(SOURCE).toMatch(/title=\s*["']Warmup & Corrective["']/);
    expect(SOURCE).toMatch(/title=\s*["']Balance, Core & Stability["']/);
    expect(SOURCE).toMatch(/title=\s*["']Cooldown & Recovery["']/);
  });

  it('each section wires onAddFromRolodex to requestAddForSection', () => {
    // requestAddForSection is the helper that stashes the sectionContext
    // on pendingSectionContext and opens the rolodex — the single choke
    // point for routing a selection into the right section.
    expect(SOURCE).toMatch(/onAddFromRolodex=\s*\{\s*\(\)\s*=>\s*requestAddForSection\(\s*['"]warmup['"]\s*\)\s*\}/);
    expect(SOURCE).toMatch(/onAddFromRolodex=\s*\{\s*\(\)\s*=>\s*requestAddForSection\(\s*['"]balance_core['"]\s*\)\s*\}/);
    expect(SOURCE).toMatch(/onAddFromRolodex=\s*\{\s*\(\)\s*=>\s*requestAddForSection\(\s*['"]cooldown['"]\s*\)\s*\}/);
  });

  it('rolodex receives a pending sectionContext and routes selection accordingly', () => {
    // The shared rolodex uses `pendingSectionContext` to decide whether
    // a selected exercise belongs in the main `exercises` array (Phase
    // 16's null-honest path) or in a protocol section's compact list.
    expect(SOURCE).toMatch(/sectionContext=\s*\{\s*pendingSectionContext\s*\?\?\s*['"]main['"]\s*\}/);
    expect(SOURCE).toMatch(/addProtocolFromRolodex\s*\(\s*pendingSectionContext\s*,/);
  });

  it('main rolodex selections retain metadata for challenge progress rules', () => {
    const fnIdx = SOURCE.indexOf('const addExercise');
    expect(fnIdx).toBeGreaterThan(-1);
    const body = SOURCE.slice(fnIdx, fnIdx + 2200);

    expect(body).toMatch(/category:\s*movementPattern/);
    expect(body).toMatch(/exerciseFamily:\s*movementPattern/);
    expect(body).toMatch(/nasmMovementPattern:\s*movementPattern/);
    expect(body).toMatch(/bodyPartCategory/);
    expect(body).toMatch(/muscleGroups/);
    expect(body).toMatch(/tags/);
  });
});

// ─────────────────────────────────────────────────────────────
// Source-text lock: loadPhaseTemplate feeds the compact selected-items
// list, not the giant checklist dump.
// ─────────────────────────────────────────────────────────────

describe('Phase 16.1-UX — loadPhaseTemplate no longer revives the giant checklist', () => {
  it('removes the old setWarmupItems / setBalanceCoreItems / setCooldownItems identifiers entirely', () => {
    // These setters ONLY existed to mutate the 25/20/15-row checklist.
    // They're deleted from this slice. 2026-04-17 hardening: the
    // original regex `\\bsetWarmupItems\\s*\\(` only caught CALL sites;
    // Codex caught a real regression where `setter = ... setWarmupItems`
    // was still referenced in the AI_TOGGLE_NASM_ITEM handler as a
    // bare identifier (no paren). Any remaining reference is a bug —
    // the identifier must be fully gone from the source.
    expect(SOURCE).not.toMatch(/\bsetWarmupItems\b/);
    expect(SOURCE).not.toMatch(/\bsetBalanceCoreItems\b/);
    expect(SOURCE).not.toMatch(/\bsetCooldownItems\b/);
  });

  it('populates the compact selected arrays with ProtocolSelection records', () => {
    const fn = SOURCE.indexOf('const loadPhaseTemplate');
    expect(fn).toBeGreaterThan(-1);
    const body = SOURCE.slice(fn, fn + 2500);
    expect(body).toMatch(/setSelectedWarmup\s*\(/);
    expect(body).toMatch(/setSelectedBalanceCore\s*\(/);
    expect(body).toMatch(/setSelectedCooldown\s*\(/);
    // The records are built via findProtocolDefaultById (the shared
    // helper), not by marking `.completed` on the old static arrays.
    expect(body).toMatch(/findProtocolDefaultById/);
    expect(body).not.toMatch(/completed:\s*template\./);
  });
});

// ─────────────────────────────────────────────────────────────
// AI_TOGGLE_NASM_ITEM dispatcher bridge — compact-model wiring
// (Codex Round 2 regression: the pre-fix onToggleItem handler still
// called setWarmupItems / setBalanceCoreItems / setCooldownItems —
// now-deleted identifiers — so any Swan Coach AI_TOGGLE_NASM_ITEM
// event would throw at runtime. These tests lock the new compact
// wiring.)
// ─────────────────────────────────────────────────────────────

describe('Phase 16.1-UX — AI_TOGGLE_NASM_ITEM bridges to compact ProtocolSelection state', () => {
  it('AI_TOGGLE_NASM_ITEM listener registration remains', () => {
    // Assistant/frontend-dispatch contract in utils/aiWorkoutEvents.ts
    // is unchanged — the handler implementation is what changed. Lock
    // that the handler is still registered (not deleted by accident).
    expect(SOURCE).toMatch(/addEventListener\(\s*['"]AI_TOGGLE_NASM_ITEM['"]/);
    expect(SOURCE).toMatch(/removeEventListener\(\s*['"]AI_TOGGLE_NASM_ITEM['"]/);
  });

  it('onToggleItem handler uses the compact ProtocolSelection state, not deleted checklist setters', () => {
    // The regression Codex flagged: the handler was still referencing
    // setWarmupItems / setBalanceCoreItems / setCooldownItems as if the
    // old checklist state existed. This test explicitly locks the new
    // path — the handler must reach the compact state via the
    // protocolSectionSetters map.
    const fnIdx = SOURCE.indexOf('const onToggleItem');
    expect(fnIdx).toBeGreaterThan(-1);
    const body = SOURCE.slice(fnIdx, fnIdx + 3000);
    expect(body).toMatch(/protocolSectionSetters/);
    expect(body).not.toMatch(/\bsetWarmupItems\b/);
    expect(body).not.toMatch(/\bsetBalanceCoreItems\b/);
    expect(body).not.toMatch(/\bsetCooldownItems\b/);
  });

  it('onToggleItem maps markAll:true completed:true to phase-appropriate recommendations', () => {
    const fnIdx = SOURCE.indexOf('const onToggleItem');
    const body = SOURCE.slice(fnIdx, fnIdx + 3000);
    expect(body).toMatch(/getRecommendedProtocolItems\s*\(\s*section\s*,/);
  });

  it('onToggleItem maps markAll:false itemName to findProtocolDefaultByName', () => {
    const fnIdx = SOURCE.indexOf('const onToggleItem');
    const body = SOURCE.slice(fnIdx, fnIdx + 3000);
    expect(body).toMatch(/findProtocolDefaultByName\s*\(/);
  });

  it('onToggleItem handles completed:false as a remove operation on the compact state', () => {
    const fnIdx = SOURCE.indexOf('const onToggleItem');
    const body = SOURCE.slice(fnIdx, fnIdx + 3000);
    // The shouldAdd branch handles add; the else branch filters out
    // matching items from the selected list. Lock that a filter-based
    // remove path exists (not just add).
    expect(body).toMatch(/prev\.filter/);
  });

  it('AI_TOGGLE_NASM_ITEM event-name constant contract with aiWorkoutEvents.ts is stable', () => {
    // Read the dispatcher module and confirm the event name + payload
    // shape the handler expects still matches what the AI dispatcher
    // emits. If a future refactor renames the event, this test fails
    // loudly in the logger test file (not just in some distant utils
    // file that nobody runs tests on).
    const DISPATCHER = readFileSync(
      resolve(__dirname, '../../utils/aiWorkoutEvents.ts'),
      'utf8',
    );
    expect(DISPATCHER).toMatch(/AI_TOGGLE_NASM_ITEM\s*=\s*['"]AI_TOGGLE_NASM_ITEM['"]/);
    expect(DISPATCHER).toMatch(
      /AIToggleNASMItemPayload[\s\S]*?section\s*:\s*['"]warmup['"]\s*\|\s*['"]balance_core['"]\s*\|\s*['"]cooldown['"]/,
    );
  });
});

// ─────────────────────────────────────────────────────────────
// Swan Coach workout-generation regression lock.
// ─────────────────────────────────────────────────────────────

describe('Phase 16.1-UX — Swan Coach workout-generation entry point preserved', () => {
  it('WorkoutLogger mounts the WorkoutLoggerCoachTerminal, which bridges to AITerminalPanel (workout_generation)', () => {
    // 2026-06-18: the Coach workout-generation bridge moved one layer down
    // into the WorkoutLoggerCoachTerminal wrapper (WorkoutLoggerCoachTerminal.tsx
    // renders <AITerminalPanel context="workout_generation">). The original
    // assertion grepped the logger file directly for AITerminalPanel and went
    // stale after that refactor. The INTENT — "the Swan Coach generation entry
    // point is not stranded" — is preserved by asserting (a) the logger mounts
    // the Coach terminal, and (b) the terminal still carries the context.
    expect(RAW_SOURCE).toMatch(/<WorkoutLoggerCoachTerminal/);

    const COACH_TERMINAL = readFileSync(
      resolve(__dirname, './WorkoutLoggerCoachTerminal.tsx'),
      'utf8',
    );
    expect(COACH_TERMINAL).toMatch(/AITerminalPanel/);
    expect(COACH_TERMINAL).toMatch(/context=\s*["']workout_generation["']/);
  });
});

// ─────────────────────────────────────────────────────────────
// Phase 16 null-honest behavior still present (defense-in-depth).
// ─────────────────────────────────────────────────────────────

describe('Phase 16.1-UX — Phase 16 null-honest writer behavior survived the refactor', () => {
  it('overallIntensity state still initializes to null', () => {
    expect(SOURCE).toMatch(/useState<number\s*\|\s*null>\s*\(\s*null\s*\)/);
  });

  it('save-path still omits untouched rating fields via buildWorkoutFormSubmitBody', () => {
    expect(SOURCE).toMatch(/buildWorkoutFormSubmitBody\s*\(/);
  });

  it('no phantom seed patterns snuck back in', () => {
    expect(SOURCE).not.toMatch(/\brpe\s*:\s*5\b/);
    expect(SOURCE).not.toMatch(/\bformQuality\s*:\s*3\b/);
    expect(SOURCE).not.toMatch(/\bformRating\s*:\s*3\b/);
  });
});

// ─────────────────────────────────────────────────────────────
// Behavioral unit tests on CompactProtocolSection.
// Mounts the component in isolation so the interaction contract is
// covered without the brittleness of a full WorkoutLogger render.
// ─────────────────────────────────────────────────────────────

const ITEMS_RECOMMENDED: NASMDefaultItem[] = [
  { id: 'warmup-1', name: 'Foam Roll — IT Band', category: 'smr', phases: [1, 2, 3, 4, 5], completed: false },
  { id: 'warmup-2', name: 'Static Stretch — Hip Flexors', category: 'static_stretch', phases: [1, 2, 3, 4, 5], completed: false },
];

function mountSection({
  isOpen = true,
  selectedItems = [] as ProtocolSelection[],
  recommendedItems = ITEMS_RECOMMENDED,
  onAddFromRolodex = vi.fn(),
  onQuickAddPreset = vi.fn(),
  onRemoveSelected = vi.fn(),
  onToggleOpen = vi.fn(),
  sectionKey = 'warmup' as const,
  title = 'Warmup & Corrective',
} = {}) {
  const icon = <span data-testid="test-icon">❤</span>;
  const utils = render(
    <CompactProtocolSection
      title={title}
      icon={icon}
      sectionKey={sectionKey}
      selectedItems={selectedItems}
      recommendedItems={recommendedItems}
      isOpen={isOpen}
      onToggleOpen={onToggleOpen}
      onAddFromRolodex={onAddFromRolodex}
      onQuickAddPreset={onQuickAddPreset}
      onRemoveSelected={onRemoveSelected}
    />,
  );
  return { ...utils, onAddFromRolodex, onQuickAddPreset, onRemoveSelected, onToggleOpen };
}

describe('CompactProtocolSection — Add action behavior', () => {
  it('exposes a visible labeled Add action (not just an icon-only button)', () => {
    mountSection();
    const addBtn = screen.getByTestId('compact-protocol-add-warmup');
    expect(addBtn).toBeTruthy();
    // The label "Add" should be present in the DOM for sighted users
    // at desktop widths. The responsive hidden treatment is a css
    // media query, not a conditional render, so the text is always
    // in the DOM — matches the "visible label, not icon-only" bar.
    expect(addBtn.textContent).toMatch(/add/i);
  });

  it('invokes onAddFromRolodex when the Add button is clicked', async () => {
    const user = userEvent.setup();
    const { onAddFromRolodex } = mountSection();
    await user.click(screen.getByTestId('compact-protocol-add-warmup'));
    expect(onAddFromRolodex).toHaveBeenCalledTimes(1);
  });

  it('does NOT toggle the section open/close when the Add button is clicked (stops propagation)', async () => {
    const user = userEvent.setup();
    const { onToggleOpen, onAddFromRolodex } = mountSection();
    await user.click(screen.getByTestId('compact-protocol-add-warmup'));
    expect(onAddFromRolodex).toHaveBeenCalledTimes(1);
    expect(onToggleOpen).not.toHaveBeenCalled();
  });
});

describe('CompactProtocolSection — quick-add preset chips', () => {
  it('shows a recommended chip for each phase-appropriate default item', () => {
    mountSection();
    expect(screen.getByText('Foam Roll — IT Band')).toBeTruthy();
    expect(screen.getByText('Static Stretch — Hip Flexors')).toBeTruthy();
  });

  it('invokes onQuickAddPreset with the clicked item', async () => {
    const user = userEvent.setup();
    const { onQuickAddPreset } = mountSection();
    await user.click(screen.getByLabelText('Quick-add Foam Roll — IT Band'));
    expect(onQuickAddPreset).toHaveBeenCalledTimes(1);
    expect(onQuickAddPreset).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'warmup-1', name: 'Foam Roll — IT Band' }),
    );
  });

  it('hides a recommendation once it is already in selectedItems', () => {
    mountSection({
      selectedItems: [
        { id: 'warmup-1', name: 'Foam Roll — IT Band', source: 'preset' },
      ],
    });
    // The "Quick-add" affordance for the already-selected item should
    // be gone; the item appears in the selected chip list instead.
    expect(screen.queryByLabelText('Quick-add Foam Roll — IT Band')).toBeNull();
    // Still present as a selected chip, with a remove button.
    expect(screen.getByLabelText('Remove Foam Roll — IT Band')).toBeTruthy();
  });
});

describe('CompactProtocolSection — selected-item chips + remove', () => {
  it('renders each selected item as a chip with a remove button', () => {
    mountSection({
      selectedItems: [
        { id: 'warmup-1', name: 'Foam Roll — IT Band', source: 'template' },
        { id: 'rolodex-bench-1', name: 'Barbell Bench Press', source: 'rolodex' },
      ],
    });
    expect(screen.getByText('Foam Roll — IT Band')).toBeTruthy();
    expect(screen.getByText('Barbell Bench Press')).toBeTruthy();
  });

  it('invokes onRemoveSelected with the chip id', async () => {
    const user = userEvent.setup();
    const { onRemoveSelected } = mountSection({
      selectedItems: [
        { id: 'warmup-1', name: 'Foam Roll — IT Band', source: 'template' },
      ],
    });
    await user.click(screen.getByLabelText('Remove Foam Roll — IT Band'));
    expect(onRemoveSelected).toHaveBeenCalledTimes(1);
    expect(onRemoveSelected).toHaveBeenCalledWith('warmup-1');
  });
});
