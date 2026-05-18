# Frontend Dormant Admin Pages Archive

Date: 2026-05-17

## Decision

Archived the legacy `frontend/src/pages/admin` folder instead of lint-polishing it.

## Import Proof

Targeted `rg` checks found only self-references and intra-folder imports. The canonical admin and client dashboard surfaces are mounted through `frontend/src/components/DashBoard`, not this older `frontend/src/pages/admin` folder.

## Reason

This folder contained old page-level admin surfaces with substantial lint debt. Keeping it in active source made ESLint and future AI cleanup passes chase unmounted code instead of production-reachable dashboard files.
