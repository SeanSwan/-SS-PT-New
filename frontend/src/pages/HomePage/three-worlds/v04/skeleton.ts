/**
 * v04 skeleton binding.
 * @module pages/HomePage/three-worlds/v04/skeleton
 *
 * GENERATED alongside v04.tsx. Kept separate so the variant component stays a
 * pure composition and the divergence contract is readable on its own.
 */
import { SKELETONS, type SkeletonContract } from '../skeletons';

const found = SKELETONS.find((s) => s.id === 'v04');
if (!found) throw new Error('skeleton v04 is missing from skeletons.ts');

export const SKELETON: SkeletonContract = found;
