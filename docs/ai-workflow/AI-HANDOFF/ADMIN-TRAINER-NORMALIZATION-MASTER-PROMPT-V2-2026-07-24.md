# Admin↔Trainer Normalization — MASTER PROMPT v2 (Opus 5 orchestrator rewrite)

**Supersedes:** `ADMIN-TRAINER-NORMALIZATION-HANDOFF-PROMPT-2026-07-24.md` (v1, Opus 4.8) and the v1 S0 scorecard's top-line conclusion.
**Author:** Claude Opus 5, acting head orchestrator, 2026-07-24. Sean granted full control to upgrade the plan.
**Why v2 exists:** v1's S0 audited the Client Hub, found it healthy, and concluded the admin→trainer bounce was already fixed. It never opened `UniversalDashboardLayout.tsx`, where the actual role-switch lives. The bug is live, the root cause is architectural, and the fix is bigger and better than v1's plan.

---

## 0. The one-paragraph truth

SwanStudios has **four independent, hand-maintained sources of dashboard truth** — `roleConfigurations` (routes), `WORKSPACE_CONFIG` (admin nav), `trainerNavConfig` (trainer nav), and `canonical-surface-names` (titles/paths). Nothing mechanically enforces that admin is a superset of trainer, so it isn't one: **10 trainer capabilities have no admin mount**. Meanwhile `activeRole` is derived from the URL path segment, so the moment an admin opens a trainer-only capability, the entire shell — routes, sidebar, theme — becomes the trainer dashboard. Sean experiences this as *"it turns me into a trainer,"* and he cannot avoid it, because for `/build-plan` and `/assessments` **there is no admin door to walk through**. v2 fixes the cause, not the symptom: one capability registry that every consumer derives from, plus an executable superset invariant that makes drift impossible to reintroduce.

---

## 1. Verified root-cause evidence (Rule 26 receipt)

| Finding | Evidence | Impact |
|---|---|---|
| `activeRole` comes from the URL | `UniversalDashboardLayout.tsx:69-79` | Any `/dashboard/trainer/*` URL reskins the whole shell for an admin |
| Shell swaps on `activeRole` | `UniversalDashboardLayout.tsx:172` (`roleConfigurations[activeRole]`), `shellPieces.tsx:73` (sidebar switch) | Admin loses the admin sidebar + admin route table |
| **Superset is broken — 10 gaps** | route-table diff (§2) | Admin *must* use a trainer URL for these → forced flip |
| Deliberate View-As is indistinguishable from accidental flip | `UniversalDashboardLayout.tsx:81-83` — `isAdministratorViewAs` is true for BOTH | The system itself can't tell intent apart; neither can Sean |
| Admin nav has no entry for the gap capabilities | `dashboard-tabs.ts:153-212` — no `build-plan`, no `assessments` | Capability is invisible from the admin side |
| Four unsynchronized sources of truth | `routes.tsx`, `dashboard-tabs.ts`, `TrainerStellarSidebar.tsx`, `canonical-surface-names.ts` | Drift is the architectural default |

**What v1 got right and stays true:** System A (`ClientsWorkspace`) is genuinely audience-scoped and correct; the visual-debt gate is genuinely clean (0 MUI, 0 Recharts, 0 Galaxy-Swan, 0 forbidden copy); `MyClientsView*` is genuinely dormant. Do not redo that work — v1's §1-§4 evidence is sound and is carried forward.

---

## 2. The superset gap (the thing to actually fix)

Trainer routes with **no** `/dashboard/admin/*` equivalent:

| Trainer route | Capability | Admin verdict |
|---|---|---|
| `/build-plan` (+ `/workout-forge` alias) | Swan Coach plan-drafting copilot — **canonical surface** | **MUST mount for admin** |
| `/assessments` | Form Assessments | **MUST mount for admin** |
| `/client-progress` | `EnhancedClientProgressView` | **Resolve divergence** — admin has `/client-progress-tracking` → a *different* component (`AdminClientProgressView`). Two components for one job = drift. Pick one, mount for both. |
| `/videos` | Training video library | **MUST mount for admin** (admin `/content` is a different surface) |
| `/clients` | Client Hub | Already equivalent via `/client-management` — ✅ no action |
| `/schedule` | Personal calendar | Admin has `/master-schedule` (different, legitimate) — document as intentional |
| `/live`, `/creators` | Streaming / creator economy | Mount for admin (cheap, removes a flip trigger) |
| `/earnings` | Trainer commission ledger | **Intentionally trainer-only** — admin equivalent is `/trainer-payouts`. Document, don't mount. |

**Rule:** every trainer capability either (a) gets an admin mount, or (b) is explicitly declared trainer-only *in the registry* with a documented admin counterpart. No silent gaps.

---

## 3. The architectural upgrade — ONE capability registry

Create `frontend/src/config/dashboardCapabilities.ts` as the single source of truth:

```ts
export interface DashboardCapability {
  id: string;                     // 'build-plan'
  label: string;                  // display name (canonical-surface aware)
  icon: string;
  section: WorkspaceSection;      // command | clients | training | business | system
  path: string;                   // '/build-plan' — role-agnostic suffix
  roles: DashboardRoleKey[];      // ['admin','trainer'] — THE superset declaration
  component: React.ElementType;
  description: string;
  adminCounterpart?: string;      // for intentionally role-exclusive capabilities
  trainerOnlyReason?: string;     // forces a written justification for any gap
}
```

**Every consumer derives from it — no consumer maintains its own list:**
- `roleConfigurations` → generated by filtering `roles.includes(role)`
- admin sidebar (`WORKSPACE_CONFIG`) → generated, role-filtered
- trainer sidebar (`trainerNavConfig`) → generated, role-filtered (kills the hand-maintained array)
- Cmd+K palette → same registry, same filter
- **superset parity test** → asserts the invariant mechanically

This is the "better way to do things overall" Sean asked for: fix the four-sources problem once, and route drift, nav drift, palette drift, and parity drift all become structurally impossible at the same time.

**Migration discipline:** the registry is introduced *additively* and the existing exports are re-derived from it, so no route changes shape in the same slice that introduces the registry. Byte-identical output is the acceptance bar for the refactor slice (v1's `clientHubAudience` contract note — "admin values MUST stay byte-identical" — is the precedent).

---

## 4. Slice plan v2 (each slice: design contract if visible → build → hostile-review until dry → PROOF → commit)

| Slice | Deliverable | Why it's ordered here |
|---|---|---|
| **S0** ✅ | Maturity scorecard + visual-debt gate (v1, carried forward) + **this v2 root-cause correction** | Gates are green; the reframe is the new load-bearing finding |
| **S1** | **Superset Invariant test (RED first)** — enumerate trainer capabilities, assert each has an admin mount or a declared `trainerOnlyReason`. Ships failing, proving the 10 gaps. | TDD: the bug must be provable before it's fixable. This is the regression wall v1 wanted, but pointed at the real defect. |
| **S2** | **Capability registry** + re-derive `roleConfigurations` / `WORKSPACE_CONFIG` / `trainerNavConfig`. Byte-identical output proof. | The structural fix. Everything downstream gets cheap. |
| **S3** | **Close the superset gaps** — mount `build-plan`, `assessments`, `videos`, `live`, `creators` for admin; resolve the `client-progress` two-component divergence; declare `earnings`/`schedule` exclusions with counterparts. **S1 goes GREEN.** | The actual "admin can do everything from admin" fix — the whole point of the workstream. |
| **S4** | **Intent-aware View-As** — distinguish deliberate impersonation from URL drift; redesign `ViewAsBanner` (warning-adjacent token — NOT `--accent-primary` cyan, which reads as "normal"; full-width; persistent; ≥44px exit; Dual-Button Glow; reduced-motion). | Once admin never *needs* a trainer URL, any trainer URL is either deliberate View-As or a bug — and the banner must say which, unmistakably. |
| **S5** | **Cmd+K command palette** over the registry — role-filtered, client-aware, zero nav traversal. | The registry makes this ~free, and it's the real least-clicks answer + the signature moment. |
| **S6** | **Selected-client context persistence** — the chosen client survives navigation across surfaces. | Directly answers Sean's *"the transition while I'm logging client info is confusing"* — context locality, not just route locality. Kimi flagged it; v1 never planned it. |

**Dropped from v1:** "migrate System B into System A / retire System B" — already done upstream; `MyClientsView*` deletion stays a documented, Sean-gated Rule-34 proposal, not an action.

---

## 5. Non-negotiable guardrails (unchanged from house rules)

- **Admin = strict superset. Trainer = scoped subset.** "Everyone has everything" means every role gets its full entitled set — trainers do NOT gain admin-only surfaces. Asymmetry is intentional and must be *declared*, never accidental.
- **No feature loss.** Normalization rounds UP. Deleting a redundant duplicate render path ≠ feature loss, and still requires Sean's approval (Rule 34).
- styled-components only (no MUI) · Victory only (no Recharts) · `var(--token, #CrystallineFallback)` · reject retired Galaxy-Swan `#0a0a1a/#00FFFF/#7851A9` · 44px touch targets · `prefers-reduced-motion` · 300-line file cap (extract sub-components) · WCAG 4.5:1 · no yoga/meditation ("stretching"/"flexibility") · "26+ years / NASM-protocol", never "NASM-certified".
- **Design contract before pixels** for every visible surface (S4/S5/S6): token map, anatomy, spacing rhythm, empty/loading/error states, one signature moment, responsive at 320/375/414/768/1024/1440/2560/3840. Client detail has 6 tabs — spec the 375px tab-overflow pattern. Clickable rows containing action buttons need `stopPropagation` + separate focus targets. Role-filtered nav must preserve logical focus order (filter ≠ unmount mid-tab-order).
- **Per slice:** hostile-review until a full pass finds nothing (**DRY-LOOP CLEAN×2**), a `PROOF:` line with real executed evidence, no "done" without proof (Rule 74). Subagent output is a hypothesis until verified (Rule 30).
- **Shared tree (Rule 67):** read `.ai-workflow/coordination/*.lane.md` before editing; stage **explicit paths only**, never `git add -A`.
- **Branch:** `feat/admin-trainer-normalization`, worktree `c:/tmp/ss-admin-trainer-norm`, off fresh `origin/main@e57f6804a`. Commit per slice; **batch-push at the end** (Rule 70); no merge to main without Sean's OK.
- **Scope honesty:** live authenticated browser verification is not available in this environment. Claims are scoped to the unit/contract tier and that limitation is stated explicitly at closeout (Rule 73 escape hatch), never papered over.

---

## 6. Definition of done for the workstream

1. `superset-invariant.test.ts` passes — **every** trainer capability has an admin mount or a written `trainerOnlyReason` + `adminCounterpart`.
2. Sean can reach every coaching capability from `/dashboard/admin/*` without the shell ever reskinning to trainer.
3. Both sidebars derive from one registry; a drift-lock test fails if anyone hand-edits a nav array again.
4. Landing on a trainer URL as admin is either **deliberate View-As** (loud, unmistakable banner) or **impossible**.
5. Cmd+K reaches any capability or client action in ≤2 keystrokes + Enter.
6. Selected client survives navigation.

**First action:** S1 — write the Superset Invariant test and let it fail, proving the 10 gaps with executed output. Everything else follows from a red test.
</content>
