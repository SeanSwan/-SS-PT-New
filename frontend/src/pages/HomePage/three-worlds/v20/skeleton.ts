/**
 * v20 skeleton binding.
 * @module pages/HomePage/three-worlds/v20/skeleton
 *
 * GENERATED alongside v20.tsx. Kept separate so the variant component stays a
 * pure composition and the divergence contract is readable on its own.
 */
import { SKELETONS, type SkeletonContract } from '../skeletons';

const found = SKELETONS.find((s) => s.id === 'v20');
if (!found) throw new Error('skeleton v20 is missing from skeletons.ts');

export const SKELETON: SkeletonContract = found;
