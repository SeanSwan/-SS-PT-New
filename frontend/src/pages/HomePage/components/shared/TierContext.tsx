/**
 * TierContext — the motion tier, with a safe default.
 *
 * The home page resolves its animation tier once and passes it down as a prop
 * to every section. That works until a section forgets the prop — and then the
 * failure mode is MORE motion for a user who asked for less. Reduced motion is
 * an accessibility promise; it must not depend on remembering.
 *
 * The default here is 'essential' (the least motion), so a section that reads
 * the context without a provider degrades toward calm rather than toward
 * cinema. The provider carries the real resolved tier (Blueprint v2 S5 / H9).
 *
 * @module pages/HomePage/components/shared/TierContext
 */
import React, { createContext, useContext } from 'react';
import type { AnimationTier } from '../../../../hooks/useAnimationTier';

const TierContext = createContext<AnimationTier>('essential');

export const TierProvider: React.FC<{ tier: AnimationTier; children: React.ReactNode }> = ({
  tier,
  children,
}) => <TierContext.Provider value={tier}>{children}</TierContext.Provider>;

/** Forgetting the provider yields 'essential' — less motion, never more. */
export const useTier = (): AnimationTier => useContext(TierContext);

export default TierContext;
