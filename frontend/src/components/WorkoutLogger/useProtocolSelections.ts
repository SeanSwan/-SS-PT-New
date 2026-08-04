/**
 * Blueprint: useProtocolSelections
 * Parent: WorkoutLogger (extracted for the shell line cap, Slice 2)
 * Purpose: owns the NASM protocol-selection cluster — warmup /
 * balance_core / cooldown selections, their open/closed accordion state,
 * preset + rolodex adds, removals, and the section-scoped rolodex
 * request. Behavior is a VERBATIM transplant from WorkoutLogger.tsx;
 * the host keeps rolodex context state and passes the open callback.
 * These selections become phase BANDS inside the runner collection in
 * the §4.5 slice — this hook is their single home either way.
 */
import { useCallback, useState } from 'react';
import type React from 'react';
import type { ProtocolSectionKey, ProtocolSelection } from './CompactProtocolSection';
import type { NASMDefaultItem } from './NASMProtocolDefaults';
import type { ExerciseSlim } from './useExerciseSearch';

export interface UseProtocolSelectionsResult {
  selectedWarmup: ProtocolSelection[];
  selectedBalanceCore: ProtocolSelection[];
  selectedCooldown: ProtocolSelection[];
  nasmSectionsOpen: Record<ProtocolSectionKey, boolean>;
  toggleNasmSection: (key: ProtocolSectionKey) => void;
  protocolSectionSetters: Record<ProtocolSectionKey, React.Dispatch<React.SetStateAction<ProtocolSelection[]>>>;
  addProtocolPreset: (section: ProtocolSectionKey, item: NASMDefaultItem) => void;
  addProtocolFromRolodex: (section: ProtocolSectionKey, exercise: ExerciseSlim) => void;
  removeProtocolItem: (section: ProtocolSectionKey, id: string) => void;
  requestAddForSection: (section: ProtocolSectionKey) => void;
  /** Open the given bands (plan-driven default state, M5). */
  openSections: (keys: ProtocolSectionKey[]) => void;
}

export function useProtocolSelections(
  openRolodexForSection: (section: ProtocolSectionKey) => void,
): UseProtocolSelectionsResult {
  const [selectedWarmup, setSelectedWarmup] = useState<ProtocolSelection[]>([]);
  const [selectedBalanceCore, setSelectedBalanceCore] = useState<ProtocolSelection[]>([]);
  const [selectedCooldown, setSelectedCooldown] = useState<ProtocolSelection[]>([]);
  const [nasmSectionsOpen, setNasmSectionsOpen] = useState<Record<ProtocolSectionKey, boolean>>({
    warmup: false,
    balance_core: false,
    cooldown: false,
  });

  const toggleNasmSection = useCallback((key: ProtocolSectionKey) =>
    setNasmSectionsOpen(prev => ({ ...prev, [key]: !prev[key] })), []);

  const protocolSectionSetters: Record<
    ProtocolSectionKey,
    React.Dispatch<React.SetStateAction<ProtocolSelection[]>>
  > = {
    warmup: setSelectedWarmup,
    balance_core: setSelectedBalanceCore,
    cooldown: setSelectedCooldown,
  };

  const addProtocolPreset = useCallback(
    (section: ProtocolSectionKey, item: NASMDefaultItem) => {
      const setter = protocolSectionSetters[section];
      const entry: ProtocolSelection = {
        id: item.id,
        name: item.name,
        source: 'preset',
        category: item.category,
      };
      setter((prev) => (prev.some((p) => p.id === entry.id) ? prev : [...prev, entry]));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const addProtocolFromRolodex = useCallback(
    (section: ProtocolSectionKey, exercise: ExerciseSlim) => {
      const setter = protocolSectionSetters[section];
      const id = `rolodex-${exercise.id}`;
      const entry: ProtocolSelection = {
        id,
        name: exercise.name,
        source: 'rolodex',
      };
      setter((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, entry]));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const removeProtocolItem = useCallback(
    (section: ProtocolSectionKey, id: string) => {
      const setter = protocolSectionSetters[section];
      setter((prev) => prev.filter((p) => p.id !== id));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const requestAddForSection = useCallback((section: ProtocolSectionKey) => {
    openRolodexForSection(section);
    setNasmSectionsOpen((prev) => ({ ...prev, [section]: true }));
  }, [openRolodexForSection]);

  /** M5 plan-driven band default: a template load OPENS the bands it filled. */
  const openSections = useCallback((keys: ProtocolSectionKey[]) => {
    if (keys.length === 0) return;
    setNasmSectionsOpen((prev) => {
      const next = { ...prev };
      keys.forEach((key) => { next[key] = true; });
      return next;
    });
  }, []);

  return {
    selectedWarmup,
    selectedBalanceCore,
    selectedCooldown,
    nasmSectionsOpen,
    toggleNasmSection,
    protocolSectionSetters,
    addProtocolPreset,
    addProtocolFromRolodex,
    removeProtocolItem,
    requestAddForSection,
    openSections,
  };
}
