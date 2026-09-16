/**
 * v11 skeleton binding.
 * @module pages/HomePage/three-worlds/v11/skeleton
 *
 * GENERATED alongside v11.tsx. Kept separate so the variant component stays a
 * pure composition and the divergence contract is readable on its own.
 */
import { SKELETONS, type SkeletonContract } from '../skeletons';

const found = SKELETONS.find((s) => s.id === 'v11');
if (!found) throw new Error('skeleton v11 is missing from skeletons.ts');

export const SKELETON: SkeletonContract = found;
