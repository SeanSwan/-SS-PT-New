# Build Hardening Checklist
> Reference doc extracted from CLAUDE.md. Loaded on-demand, not every message.
> Read when: pre-commit review, React/backend/Sequelize rules

---

## Build Hardening Checklist (MANDATORY)
Every component and endpoint must pass these checks BEFORE commit. These rules exist because AI Village repeatedly caught these same patterns post-build.

### React Component Rules
- **No portals inside `.map()` loops** — Creates N portals per render, leaks memory. Use ONE portal outside the loop, driven by state (`activeId`).
- **Every button must have an `onClick`** — Dead buttons with no handler are a recurring bug. If the handler isn't built yet, add `onClick={() => console.warn('TODO: implement')}` with a `// TODO` comment.
- **Wrap expensive parsing in `useMemo`** — Any `parse*()`, `JSON.parse()`, or regex in render must be memoized. Re-parsing on every keystroke kills performance.
- **`React.memo` on list item components** — Any component rendered inside `.map()` over a data array must be wrapped in `React.memo`.
- **Lazy-load heavy components** — `React.lazy()` for 3D, AI, charts, and any component >30KB. Keep CRUD modals eager.
- **No hardcoded hex colors** — Use `${({ theme }) => theme.x || '#fallback'}` pattern. Fallback MUST be from the active Crystalline Swan palette, never retired Galaxy-Swan tokens.
- **All interactive elements: 44px min touch target** — Buttons, pills, tabs, close icons. No exceptions.
- **WCAG contrast: 4.5:1 minimum** — Test text color against its background. Common failures: `#64748b` on dark bg (use `#94a3b8`+), `rgba(255,255,255,0.3)` placeholder (use `0.5`+).
- **Focus trap on modals/drawers** — `role="dialog" aria-modal="true"`, Escape to close, focus returns to trigger on close.
- **Error boundaries on async UI** — Any component that fetches data needs error state + retry button, not silent failure.

### Backend Rules
- **Audit untracked files before every push** — Before pushing any feature that adds `import` statements to already-tracked files, run:
  ```bash
  git ls-files --others --exclude-standard backend/
  ```
  Any untracked file that appears in an import chain will cause `ERR_MODULE_NOT_FOUND` on Render and crash-loop the server. This happened 2026-04-12 when 10 dispatcher/service files written during Swan Coach v1–v15 development were never committed. The server crash-looped until each missing file was found and committed. Run this check before every push; it takes under a second.

- **Non-fatal dependency creation** — If creating a child record (e.g., `ClientProgress`) during a parent create (e.g., `User`), check table existence first. Never let optional records kill the transaction.
  ```javascript
  // Pattern: Check table exists before insert in transaction
  const [check] = await sequelize.query(`SELECT to_regclass('table_name') AS exists`, { transaction });
  if (check?.[0]?.exists) { await Model.create({...}, { transaction }); }
  ```
- **Soft-delete with audit trail** — Never hard-delete user data. Use `isActive: false, deletedAt, deletedBy`.
- **Destructive endpoints require confirmation** — Delete routes must require `confirmEmail` matching the record, not a boolean.
- **Every `async` callback needs try/catch** — Especially `refreshAllData`, `fetchClients`, and similar reload functions. Set error state on failure.
- **Don't reference non-existent columns in models** — Before adding a foreign key field to a Sequelize model, verify the referenced table AND column exist in production. Check migrations actually ran.
- **Route aliases for external services** — When external services (Stripe, SendGrid) are configured with a webhook URL, mount the handler at THAT EXACT path. Don't assume they'll follow your internal routing.

### Sequelize Model Rules
- **No `challengeId`-style phantom columns** — If a model references another table via FK, that table MUST exist and the migration MUST have run. Check `SequelizeMeta` in prod before assuming.
- **Association `constraints: false`** — Cross-model associations that reference tables which may not exist yet must use `constraints: false` to prevent sync failures.
- **ENUM values must match exactly** — When inserting data, values must match the ENUM definition in the model. Case-sensitive. Test with actual enum values before deploying.

### Pre-Commit Mental Checklist
Before every commit, mentally verify:
1. Every new button has an `onClick` handler
2. No portals/heavy components inside `.map()`
3. All colors use theme tokens with Crystalline Swan fallbacks
4. Backend creates handle missing tables gracefully
5. All model FKs reference tables that exist in production
6. Error states exist for every data fetch
7. **Run `git ls-files --others --exclude-standard backend/` — any untracked file in an import chain will crash Render**
