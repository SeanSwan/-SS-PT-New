# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-19T19:00:00Z
- **Slice:** Flag lifecycle doctrine + registry shipped · ACTIVATION BLOCKER root-caused

## What I did / learned
- Shipped `docs/ai-workflow/references/FLAG-LIFECYCLE-DOCTRINE.md` (commit `102309746`): 5 laws, a mandatory
  6-step lifecycle, and a registry of all 9 surface flags (owner / status / blocker). Written because we had
  9 flags and ZERO deletion tickets — the direct cause of Sean's "do I have to change everything twice" concern.
- While confirming for Sean HOW to flip a flag, I root-caused why activation would silently do nothing.

## ⚠️ THE BLOCKER (verified, highest-value fact in this memo)
Every v-next surface gate's `ContractCheck` requires a lens-shell ancestor:
```js
const scoped = shell.closest('[data-style-lens-shell]');
if (!accent || !scoped) onFail();   // fail closed to the CURRENT surface
```
**`data-style-lens-shell` exists ONLY as CSS selectors** (`adapters/style-lens-swan/styles/lensCoreStyles.ts`,
`lensSurfaceStyles.ts`). **Nothing in the entire frontend ever renders it as a DOM attribute.** `LensPlanFrame`
(`components/DashBoard/Pages/workout-design-lab/LensPlanFrame.tsx:59-117`) emits `--world-*` + `data-lens2-*`
ONLY when a recipe resolves (from the committed appearance `styleLensId`), and never emits that attribute at all.
**Consequence: setting any of the 7 surface flags to `true` changes NOTHING — every gate fails closed to the old
surface.** Anyone flipping a flag would see no change and wrongly conclude the build is broken.

**This is the exact mechanical spec for Lane-A activation:** (1) render `data-style-lens-shell` on the surface
frame, (2) make `--world-*` actually resolve there, (3) wire the Appearance-Studio Apply handler + viewport/
surface CSS mounts + motion licences, (4) one cross-surface smoke test proving a flip produces a visible change.

## Other transferable facts
- **Flag parser is strict:** `publicConfigRoutes.mjs` → `const isTrue = (v) => v === 'true' || v === '1';`
  ONLY the exact strings `true` or `1`. `yes` / `on` / `True` / `enabled` all evaluate FALSE. (Sean had set
  `yes` on Render and expected it to work — it would not have.)
- **`prismCapture` is the ONLY flag that functions today.** PrismCapture's gate checks its flag only (no
  world-contract probe) and carries Crystalline hex fallbacks, so it renders without Lane-A. It is additive
  (no predecessor) → never needs a deletion step. Enable with `PRISM_CAPTURE_ENABLED=true` + `REF_CODE_PEPPER`
  (missing pepper → ref fails closed to null, Share ray hides). Backend vitest still unrun.
- **Doctrine laws worth carrying:** a flag's success condition is its own deletion (delete old surface + gate +
  flag + env within 14 days of clean verification); flip 1-2 surfaces/week max; 60-day delete-or-justify; the
  GATE RULE (features mount in ALL gate branches); `--world-*` survives re-skins but NOT structural redesigns;
  dark work is worth $0 and rots — activate or delete within 30 days.

## State right now
- main @ `f63b82181` + local commits `102309746` (doctrine) and the PRISM gate-parity fix already pushed.
  All 9 flags DARK. Frontend vitest runnable in-worktree; backend vitest is NOT (deps absent).

## Sean owes / blockers
- **Decision pending:** Lane-A activation is the Living-Worlds lane's territory (emitter side); I have stayed a
  pure consumer per Rule 67. Sean must say whether I take Lane-A over or we wait for that lane — I did not start
  it to avoid colliding on the one seam kept clean all program.
- Do NOT flip surface flags before Lane-A lands (no visible change; misleading).
- Before enabling PRISM: run the backend vitest in CI, then set the two env vars (exact value `true`).
