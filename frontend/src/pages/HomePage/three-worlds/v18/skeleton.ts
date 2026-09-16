/**
 * v18 skeleton binding.
 * @module pages/HomePage/three-worlds/v18/skeleton
 *
 * GENERATED alongside v18.tsx. Kept separate so the variant component stays a
 * pure composition and the divergence contract is readable on its own.
 */
import { SKELETONS, type SkeletonContract } from '../skeletons';

const found = SKELETONS.find((s) => s.id === 'v18');
if (!found) throw new Error('skeleton v18 is missing from skeletons.ts');

export const SKELETON: SkeletonContract = found;
