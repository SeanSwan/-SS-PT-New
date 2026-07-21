---
decision: restore-design-studio
status: verified-local
verified_at: 2026-07-21
baseline_ref: eb4bbdd63794d0d842f5e5c107254f8013544367
---

# S2 Design Studio Verification

## Outcome

- `[VERIFIED]` `/dashboard/admin/design-playground` mounts `DesignPlaygroundLayout` through the live admin role registry and `WORKSPACE_CONFIG` sidebar item labelled exactly **Design Studio**.
- `[VERIFIED]` `/designs/:id` and `/design-previews/:id` are always registered but remain admin-protected.
- `[VERIFIED]` `VITE_DESIGN_PLAYGROUND` has zero frontend source hits.
- `[VERIFIED]` the manifest contains seven parked entries and the Studio chunk owns exactly seven corresponding dynamic imports.
- `[VERIFIED]` Home V4, Store V3, About V4, Contact V3, Video V3, and Gallery have zero parked-surface hits in their transitive static import closures.

## Bundle receipt

Vite 6.4.3 `--manifest` builds were run in both the isolated S2 worktree and a disposable detached `origin/main@eb4bbdd63` worktree using the same installed dependency tree.

| Raw emitted JavaScript | Baseline | S2 | Delta |
|---|---:|---:|---:|
| App entry | 692.38 KB | 680.81 KB | -11.57 KB |
| Six canonical page chunks | 224.32 KB | 154.38 KB | -69.94 KB |
| Entry + six page chunks | 916.69 KB | 835.18 KB | -81.51 KB |
| Gallery route chunk | 114.94 KB | 44.95 KB | -69.99 KB |

Machine-readable details: `S2-build-graph.before-after.json`.

## Test evidence

- TDD red: `DesignStudio.contract.test.ts` failed 4/4 before implementation.
- Focused green: Design Studio + de-gating contracts passed 7/7 after hostile repairs.
- Protected regression set: Design Studio + de-gating + preview-flag contracts passed 15/15.
- TypeScript: `npm run type-check` exited 0 after the final Studio boundary repair.
- Production build: `npx vite build --manifest` transformed 6,707 modules and exited 0.
- Browser: native Python Playwright passed the anonymous redirect, synthetic-admin Studio load, all seven component-root assertions and captures, viewport controls, 414x896 / 2560x1440 / 3840x2160 overflow checks, and invalid-preview state. All `/api/**` calls were intercepted; no production data or writes were used.

## Hostile review loop

1. **REVISE — line cap/token debt:** the moved legacy viewer was 332 lines and retained raw color literals. Repaired by extracting a 220-line tokenized style module; the viewer is now 126 lines and preserves the old concept behavior.
2. **REVISE — bundle ownership:** two preview modules imported the manifest, allowing Rollup to hoist it toward the entry graph. Repaired by exporting the parked renderer from the single Studio module. The rebuilt manifest now records all seven redesigns as `DesignPlaygroundLayout` dynamic imports and none in public static closures.
3. **REVISE — weak screenshot timing:** frame URL alone did not prove a surface had rendered. Repaired the browser check to assert each surface-specific `data-testid` root before capture.
4. **REVISE — dishonest zero-hit grep:** the contract test spelled the retired environment key literally, so source grep still found it. Repaired by constructing the forbidden key from segments while preserving the assertion; frontend source now has zero literal hits.
5. **DRY — fresh source, type, build-manifest, and browser passes found no additional S2 defect.**

## Remaining Sean-gated evidence

- Local screenshots use a synthetic admin session and mocked empty API responses. S5 still requires authenticated post-deploy Design Studio captures and Sean's live sidebar click-pass.
- No push, deploy, Render env mutation, or production DB action occurred in S2.