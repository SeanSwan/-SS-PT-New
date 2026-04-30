// Phase 19B fallback flatten (2026-04-29): re-export V3 so the lazy fallback
// path in main-routes.tsx no longer renders the visually divergent
// UserDashboard-optimized.tsx. UserDashboard-optimized.tsx remains in the
// tree as a Rule 38 cleanup-backlog candidate per the Phase 19 receipt.
export { default } from './UserDashboard.V3';