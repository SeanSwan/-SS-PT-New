# ESLint Setup — Week 1 DIY Guide

**Why you're running this instead of Claude:** ESLint setup + initial triage can run for 30-90 min and burn $5-10 of API budget. Sean does this DIY to preserve the $40/mo cap. Claude already wrote the configs; you just install deps, run lint, and fix errors.

**Time estimate:** 30 min install + 1-2 hours triage = 1.5-2.5 hours total.

**Prerequisites:** Node.js + npm in PATH. Open PowerShell/Terminal in repo root.

---

## Step 1 — Frontend install (~5 min)

```bash
cd frontend

npm i -D \
  eslint@^8 \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-react \
  eslint-plugin-react-hooks \
  eslint-plugin-react-refresh \
  eslint-plugin-styled-components-a11y \
  eslint-plugin-jsx-a11y
```

**Note:** Sticking with ESLint 8 because styled-components-a11y and many React plugins haven't caught up to ESLint 9's flat config system yet. When they do, this can be upgraded.

## Step 2 — Backend install (~5 min)

```bash
cd ../backend
npm i -D eslint@^8
```

Backend only needs core ESLint — no TypeScript parser (backend is `.mjs` / `.js` only). If you later add TypeScript to backend, add `@typescript-eslint/parser` + plugin.

## Step 3 — Add lint scripts to both package.json files

Open `frontend/package.json` and add to `scripts`:

```jsonc
"scripts": {
  // ... existing scripts ...
  "lint": "eslint src --ext .ts,.tsx,.js,.jsx --max-warnings 9999",
  "lint:fix": "eslint src --ext .ts,.tsx,.js,.jsx --fix",
  "lint:check": "eslint src --ext .ts,.tsx,.js,.jsx --max-warnings 0"
}
```

Open `backend/package.json` and add:

```jsonc
"scripts": {
  // ... existing scripts ...
  "lint": "eslint . --ext .mjs,.js --max-warnings 9999 --ignore-path .gitignore",
  "lint:fix": "eslint . --ext .mjs,.js --fix --ignore-path .gitignore",
  "lint:check": "eslint . --ext .mjs,.js --max-warnings 0 --ignore-path .gitignore"
}
```

**Three variants:**
- `lint` — runs lint, allows unlimited warnings (OK for triage mode)
- `lint:fix` — auto-fixes safe violations
- `lint:check` — strict mode, 0 warnings allowed (use this in Phase 2 test gate once clean)

## Step 4 — First lint run (auto-fix safe ones) — ~15-30 min

```bash
cd frontend
npm run lint:fix
cd ../backend
npm run lint:fix
```

Auto-fix handles spacing, quote style, semicolons, unused imports (in some cases), etc. Safe.

## Step 5 — Review remaining violations — ~1-2 hours

```bash
cd frontend
npm run lint 2>&1 | tee /tmp/frontend-lint.txt
cd ../backend
npm run lint 2>&1 | tee /tmp/backend-lint.txt
```

Scan `/tmp/frontend-lint.txt` and `/tmp/backend-lint.txt`. Expect hundreds of violations on first pass. Classify each:

| Violation type | Action |
|---|---|
| `no-restricted-imports` → MUI/Recharts found | Rewrite using styled-components / Victory. These are real debt — fix or explicitly deprecate. |
| `no-restricted-syntax` → Galaxy-Swan palette colors | Replace with Crystalline Swan variables. Real debt. |
| `no-restricted-syntax` → inline `style={{}}` | Extract to styled-component. Real debt. |
| `react-hooks/exhaustive-deps` | Review each — some are intentional (stale closures), some are bugs. Fix real bugs. |
| `@typescript-eslint/no-explicit-any` (WARN) | Leave as warnings for now. Convert `any` → proper types during normal refactors. |
| `no-unused-vars` | Fix (remove or prefix with `_`). Usually safe. |
| `no-console` (WARN) | Leave for now unless in production code. |
| `styled-components-a11y/keyframes-css-wrapper` (ERROR) | **CLAUDE.md Rule 43** — this caused the AdminOverviewPanel crash 2026-04-12. Fix all errors here NOW. |

## Step 6 — For violations too many to fix today

Downgrade rules from `'error'` to `'warn'` temporarily. Add a note in the config explaining why + when to escalate back to error:

```js
// In .eslintrc.cjs:
'some-rule': 'warn',  // TODO: 2026-05-01 — fix and re-escalate to 'error'
```

## Step 7 — Lock in a clean baseline

Once the error count is down to something manageable:

```bash
cd frontend && npm run lint:check   # must pass (0 errors)
cd ../backend && npm run lint:check # must pass (0 errors)
```

If both pass, commit:

```bash
git add frontend/.eslintrc.cjs backend/.eslintrc.cjs frontend/package.json backend/package.json
git commit -m "chore(lint): ESLint baseline + SwanStudios custom rules (Week 1 Patch 5 Path B)"
```

## Step 8 — Wire into pre-commit hook

Edit `.githooks/pre-commit` to also run lint on staged JS/TS files:

```bash
# After the secret scanner section, add:

echo "[pre-commit] Running lint on staged frontend files..."
FRONTEND_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^frontend/.*\.(ts|tsx|js|jsx)$' || true)
if [[ -n "$FRONTEND_FILES" ]]; then
  (cd frontend && npx eslint $FRONTEND_FILES --max-warnings 0) || {
    echo "ESLint errors in staged files. Fix or run: cd frontend && npm run lint:fix"
    exit 1
  }
fi

echo "[pre-commit] Running lint on staged backend files..."
BACKEND_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '^backend/.*\.(mjs|js)$' | grep -v 'backend/migrations' | grep -v 'backend/seeders' || true)
if [[ -n "$BACKEND_FILES" ]]; then
  (cd backend && npx eslint $BACKEND_FILES --max-warnings 0) || {
    echo "ESLint errors in staged files. Fix or run: cd backend && npm run lint:fix"
    exit 1
  }
fi
```

## Step 9 — Wire into Phase 2 test gate (future)

In `scripts/ai-workflow-run.sh` (created Week 3+), add a `run_tests` step that includes:

```bash
cd frontend && npm run lint:check && cd ..
cd backend && npm run lint:check && cd ..
```

Consensus in the Phase 2 loop can't be reached unless lint passes.

---

## Triage tips

### Running lint on a single file (faster feedback loop)

```bash
cd frontend
npx eslint src/components/SomeComponent.tsx
```

### Running lint with JSON output (for tool integration)

```bash
cd frontend
npx eslint src --ext .ts,.tsx --format json --output-file lint-report.json
```

### If styled-components-a11y plugin fails to install or crashes

Remove `'plugin:styled-components-a11y/recommended'` from the `extends` array. The a11y rules are nice-to-have. Core lint still works without them.

### If ESLint 8 vs 9 flat config drift bites you later

ESLint 9 uses `eslint.config.js` flat config. If plugins force you to upgrade, migrate this file. The rules stay the same; syntax changes slightly.

---

## Time budget for DIY triage

- Install: 10 min
- First auto-fix pass: 15 min
- Review + fix errors: 60-90 min (first time, then maintenance is fast)
- Wire pre-commit hook: 10 min
- Final verification: 10 min

**Target:** Finish in under 2.5 hours. If violations are overwhelming (> 200 errors), drop rules to warn temporarily and focus only on CLAUDE.md Rule 43 (keyframes css helper) + Rule 1 (no MUI) + the retired palette bans.

---

## Change log

- **2026-04-19:** Created per v3 Patch 5 Path B. Configs written by Claude, triage DIY by Sean to preserve budget.
