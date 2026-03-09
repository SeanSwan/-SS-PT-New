/**
 * CelebrationContext — Global gamification celebration state
 * ============================================================
 * Provides `useCelebration()` hook to trigger celebrations from anywhere.
 *
 * Architecture (Gemini 3.1 Pro spec):
 *   CelebrationProvider wraps the app → exposes hook →
 *   renders CelebrationPortal (React Portal at z-index 9999, pointer-events: none)
 *
 * Combo System (Candy Crush-inspired, SwanStudios-branded):
 *   SPARK (3x) → IGNITE (5x) → BLAZING (10x) → SUPERNOVA (15x) → ECLIPSE (20x+)
 *
 * Haptic feedback (navigator.vibrate):
 *   XP Pop: [10]  |  Combo: [30, 50, 30]  |  Level Up: [100, 50, 100, 50, 200]
 *
 * Sounds: Muted by default — user opts in via toggle.
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  useMemo,
  useEffect,
} from 'react';
import CelebrationPortal, {
  COMBO_TIERS,
  createBurstParticles,
  type XPPopData,
  type ComboData,
  type LevelUpData,
  type Particle,
  type ComboTier,
} from '../components/Celebrations/CelebrationPortal';
import soundManager from '../utils/soundManager';

// ── Types ─────────────────────────────────────────────────────

interface CelebrationAPI {
  /** Trigger floating "+N XP" text at coordinates */
  triggerXPPop: (amount: number, x?: number, y?: number) => void;
  /** Trigger full-screen level-up celebration */
  triggerLevelUp: (newLevel: number) => void;
  /** Trigger achievement unlock */
  triggerAchievement: (name: string) => void;
  /** Trigger streak milestone */
  triggerStreak: (days: number) => void;
  /** Sound mute toggle */
  soundMuted: boolean;
  setSoundMuted: (muted: boolean) => void;
  /** Retro mode toggle */
  retroMode: boolean;
  setRetroMode: (retro: boolean) => void;
}

const CelebrationCtx = createContext<CelebrationAPI | null>(null);

// ── Combo tracker ─────────────────────────────────────────────

const COMBO_WINDOW_MS = 3000; // Actions within 3s count as combo

// ── Haptic helper ─────────────────────────────────────────────

function haptic(pattern: number[]) {
  try {
    navigator?.vibrate?.(pattern);
  } catch {}
}

// ── Provider ──────────────────────────────────────────────────

export const CelebrationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [xpPops, setXPPops] = useState<XPPopData[]>([]);
  const [combos, setCombos] = useState<ComboData[]>([]);
  const [levelUp, setLevelUp] = useState<LevelUpData | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [soundMuted, setSoundMutedState] = useState(soundManager.getMuted());
  const [retroMode, setRetroModeState] = useState(soundManager.getRetroMode());

  // Reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Combo tracking
  const comboCountRef = useRef(0);
  const comboTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idCounter = useRef(0);

  const nextId = () => String(++idCounter.current);

  // ── Sound/Retro setters ───────────────────────────────────

  const setSoundMuted = useCallback((muted: boolean) => {
    setSoundMutedState(muted);
    soundManager.setMuted(muted);
  }, []);

  const setRetroMode = useCallback((retro: boolean) => {
    setRetroModeState(retro);
    soundManager.setRetroMode(retro);
  }, []);

  // ── Cleanup helpers ───────────────────────────────────────

  const removeXPPop = useCallback((id: string) => {
    setXPPops(prev => prev.filter(p => p.id !== id));
  }, []);

  const removeCombo = useCallback((id: string) => {
    setCombos(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Get current combo tier ────────────────────────────────

  const getComboTier = (count: number): ComboTier | null => {
    for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
      if (count >= COMBO_TIERS[i].threshold) return COMBO_TIERS[i];
    }
    return null;
  };

  // ── Celebration triggers ──────────────────────────────────

  const triggerXPPop = useCallback(
    (amount: number, x?: number, y?: number) => {
      // Default position: center-ish with some randomness
      const popX = x ?? window.innerWidth / 2 + (Math.random() - 0.5) * 100;
      const popY = y ?? window.innerHeight / 2 + (Math.random() - 0.5) * 60;

      const id = nextId();
      setXPPops(prev => [...prev, { id, amount, x: popX, y: popY }]);

      // Sound + haptic
      soundManager.play('xp_pop');
      haptic([10]);

      // Particle burst at pop location (small)
      if (!reducedMotion) {
        const isMobile = window.innerWidth < 768;
        const count = isMobile ? 8 : 15;
        setParticles(prev => [...prev, ...createBurstParticles(popX, popY, count)]);
      }

      // Combo tracking
      comboCountRef.current++;
      if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
      comboTimerRef.current = setTimeout(() => {
        comboCountRef.current = 0;
      }, COMBO_WINDOW_MS);

      const tier = getComboTier(comboCountRef.current);
      if (tier) {
        const comboId = nextId();
        setCombos(prev => [...prev, { id: comboId, tier }]);

        // Combo sound
        const soundKey = `combo_${tier.name.toLowerCase()}` as Parameters<typeof soundManager.play>[0];
        soundManager.play(soundKey);
        haptic([30, 50, 30]);

        // Extra particles for higher combos
        if (!reducedMotion) {
          const tierIdx = COMBO_TIERS.indexOf(tier);
          const isMobile = window.innerWidth < 768;
          const burstCount = isMobile
            ? 15 + tierIdx * 10
            : 30 + tierIdx * 20;
          setParticles(prev => [
            ...prev,
            ...createBurstParticles(window.innerWidth / 2, window.innerHeight / 2, burstCount),
          ]);
        }
      }
    },
    [reducedMotion],
  );

  const triggerLevelUp = useCallback(
    (newLevel: number) => {
      const dismiss = () => setLevelUp(null);
      setLevelUp({ id: nextId(), newLevel, dismiss });

      // Sound + haptic
      soundManager.play('level_up');
      haptic([100, 50, 100, 50, 200]);

      // Big particle burst
      if (!reducedMotion) {
        const isMobile = window.innerWidth < 768;
        const count = isMobile ? 100 : 300;
        setParticles(prev => [
          ...prev,
          ...createBurstParticles(window.innerWidth / 2, window.innerHeight / 2, count),
        ]);
      }

      // Auto-dismiss after 6s
      setTimeout(dismiss, 6000);
    },
    [reducedMotion],
  );

  const triggerAchievement = useCallback(
    (_name: string) => {
      soundManager.play('achievement');
      haptic([30, 50, 30]);

      if (!reducedMotion) {
        const isMobile = window.innerWidth < 768;
        const count = isMobile ? 30 : 60;
        setParticles(prev => [
          ...prev,
          ...createBurstParticles(window.innerWidth / 2, window.innerHeight * 0.35, count),
        ]);
      }
    },
    [reducedMotion],
  );

  const triggerStreak = useCallback(
    (_days: number) => {
      soundManager.play('streak');
      haptic([20, 30, 20]);

      if (!reducedMotion) {
        const isMobile = window.innerWidth < 768;
        const count = isMobile ? 20 : 40;
        setParticles(prev => [
          ...prev,
          ...createBurstParticles(window.innerWidth / 2, window.innerHeight * 0.4, count),
        ]);
      }
    },
    [reducedMotion],
  );

  // ── Context value ─────────────────────────────────────────

  const api = useMemo<CelebrationAPI>(
    () => ({
      triggerXPPop,
      triggerLevelUp,
      triggerAchievement,
      triggerStreak,
      soundMuted,
      setSoundMuted,
      retroMode,
      setRetroMode,
    }),
    [
      triggerXPPop,
      triggerLevelUp,
      triggerAchievement,
      triggerStreak,
      soundMuted,
      setSoundMuted,
      retroMode,
      setRetroMode,
    ],
  );

  return (
    <CelebrationCtx.Provider value={api}>
      {children}
      <CelebrationPortal
        xpPops={xpPops}
        combos={combos}
        levelUp={levelUp}
        particles={particles}
        onXPPopDone={removeXPPop}
        onComboDone={removeCombo}
        reducedMotion={reducedMotion}
      />
    </CelebrationCtx.Provider>
  );
};

// ── Hook ──────────────────────────────────────────────────────

export function useCelebration(): CelebrationAPI {
  const ctx = useContext(CelebrationCtx);
  if (!ctx) {
    throw new Error('useCelebration must be used within <CelebrationProvider>');
  }
  return ctx;
}

export default CelebrationProvider;
