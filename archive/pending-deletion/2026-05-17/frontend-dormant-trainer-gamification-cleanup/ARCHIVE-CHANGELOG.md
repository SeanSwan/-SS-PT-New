# Frontend Dormant Trainer/Gamification Cleanup Archive - 2026-05-17

Scope: frontend-only archive pass for dormant trainer dashboard layout/routes, old trainer content-form/workout surfaces, unreferenced old workout management wrapper, and old gamification overlay directory.

Active trainer route remains `frontend/src/components/TrainerDashboard/TrainerDashboard.tsx` -> `StellarComponents/StellarTrainerDashboard.tsx`.
Active workout plan builder files under `frontend/src/components/WorkoutManagement/` remain in place because dashboard workspaces import them directly.
Active gamification hooks and dashboard/admin gamification pages remain in place; this pass only moved the unreferenced `frontend/src/components/Gamification/` overlay directory.

See `ARCHIVE-MANIFEST.tsv` for original and archived paths.
