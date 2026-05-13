// Phase 19B fallback flatten (2026-04-29): re-export V3 so the lazy fallback
// path in main-routes.tsx no longer renders the visually divergent
// legacy dashboard. The old UserDashboard-optimized.tsx file was archived
// during the 2026-05-12 cleanup pass.
export { default } from './UserDashboard.V3';
