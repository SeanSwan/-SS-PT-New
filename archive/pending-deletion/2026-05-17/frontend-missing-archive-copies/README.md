# Frontend Missing Archive Copies - 2026-05-17

These files were already deleted from the active frontend tree during the broader cleanup workstream, but the archive verification pass found no matching pending-deletion copy.

They were restored from HEAD and immediately moved here so the active paths remain retired while rollback remains possible.

Reference checks before archive:
- frontend/src/components/ClientDashboard/EmergencyDashboard.jsx: no live import found; active emergency route uses frontend/src/components/Emergency/EmergencyDashboard.jsx.
- frontend/src/components/UserDashboard/components/ObservatoryMobileNav.tsx: only referenced by historical Open Design assets and a contract test asserting the retired runtime path is absent.
- frontend/src/components/UserDashboard/styles/ObservatoryMobileNavStyles.ts: paired retired style file for ObservatoryMobileNav.
