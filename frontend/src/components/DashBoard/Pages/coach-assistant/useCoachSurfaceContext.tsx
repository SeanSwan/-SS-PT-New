/**
 * FILE: useCoachSurfaceContext.tsx
 * PURPOSE: plan62 SC-R1 compatibility shim. `frontend/vite.config.ts:60` resolves extensionless
 *          specifiers with `.tsx` before `.ts`, so Vite reaches this path while TypeScript
 *          bundler resolution and vitest reach the canonical `.ts`. This path therefore
 *          re-exports the single canonical implementation instead of duplicating the
 *          context/provider/hook. The explicit `.ts` extension is required: an extensionless
 *          re-export would resolve back to this shim under the Vite configuration.
 */
export * from './useCoachSurfaceContext.ts';
export { default } from './useCoachSurfaceContext.ts';
