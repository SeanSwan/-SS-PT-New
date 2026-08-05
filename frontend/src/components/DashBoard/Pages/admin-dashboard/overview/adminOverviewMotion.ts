/**
 * SWA-138 S8 — structural enforcement of the admin dashboard's M1 motion
 * licence (surfaceMotionTiers 'dashboard.admin': essential feedback only).
 * Fed to framer-motion's <MotionConfig reducedMotion>: when the licence
 * forbids reveals, motion is reduced for EVERYONE, not only
 * prefers-reduced-motion users.
 */
import { motionAffordances, resolveMotionTier } from '../../../../../core/motion/surfaceMotionTiers';

export const ADMIN_MOTION_POLICY: 'user' | 'always' =
  motionAffordances(resolveMotionTier('dashboard.admin', 'full')).allowsReveals ? 'user' : 'always';
