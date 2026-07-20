# Flag-Flip Runbook — Swan Lens surface activation (Kimi roadmap #4)

> **Purpose.** The 7 design-overhaul surfaces shipped flag-OFF, fail-closed. This runbook makes their activation
> *reversible-in-practice*, not just reversible-by-design: a written flip order, dwell times, abort criteria, a
> rehearsed rollback drill, and the gate-telemetry signal that tells you a flip went wrong before a user does.
> Read before flipping ANY `*VNext` flag on Render. Pairs with `MEASUREMENT-CHARTER.md` (baseline first) and
> `PERFORMANCE-BUDGET-CHARTER.md` (budgets that gate the money surfaces).

## 0. Preconditions (ALL must be true before the first flip)
- [ ] Measurement baseline captured (`MEASUREMENT-CHARTER.md`) — you cannot read lift you never baselined.
- [ ] `npm run lint:swan-lens` green on the surface (de-galaxy + token-discipline).
- [ ] Playwright cross-surface QA green (cascade / flicker / forced-colors) for the surface being flipped.
- [ ] Performance budgets met for the surface (`PERFORMANCE-BUDGET-CHARTER.md`); money surfaces (Store, Gallery) measured FIRST.
- [ ] Gate telemetry wired: the surface's `*Gate.tsx` emits `emitGateEvent` at mount / contract_fail / boundary_error (see §4).
- [ ] The current (V-prev) surface is unchanged and confirmed as the fail-closed fallback.
- [ ] **`VITE_<SURFACE>_VNEXT` is unset/false in the Render build env.** A `true` build env DEFEATS the runtime
      kill switch whenever the flags endpoint is unreachable (see §3) — the exact condition you'd be aborting in.

## 1. Flip order — blast-radius ASCENDING (money last)
Flip ONE surface at a time, lowest-risk first, each with its own dwell + abort gate. Never batch flips.
1. **About** — static, no money, no data.
2. **Contact** — a form, no money (lead only).
3. **Home** — high traffic, no money on the surface itself.
4. **Video** — data-bound (library), no money.
5. **Dashboards** — data-bound, auth-gated, no checkout.
6. **Store** — MONEY. Flip only after 1–5 are stable and the drill (§3) has been rehearsed.
7. **Gallery** — MONEY + identity (credits/VIP/referral/donation). Flip LAST, on a proven drill.

## 2. Dwell + abort criteria (per surface)
- **Dwell:** hold each flip ≥ 24h (money surfaces ≥ 48h) before flipping the next. No same-day cascades.
- **Watch (from gate telemetry, §4 + Measurement funnel):**
  - `contract_fail` / `boundary_error` rate for the surface > **0.5%** → **ABORT** (flip back). **Denominator is
    `mounted + contract_fail + boundary_error` — `flag_off` is EXCLUDED.** (`flag_off` is optional/sampled and its
    volume is huge during a staged rollout, so including it dilutes the rate toward zero and the abort never fires.)
  - Funnel step conversion for the surface drops > **relative 10%** vs baseline → **ABORT**, investigate.
  - Any money-path regression (checkout start→success, credit purchase, VIP) → **IMMEDIATE ABORT**, no threshold.
  - Perf budget breach on the live surface (LCP/INP over `PERFORMANCE-BUDGET-CHARTER.md`) → ABORT.
- **Abort = flip the runtime flag OFF.** New page loads get V-prev immediately; **open sessions recover on their
  next reload / route remount** — the flag hook is `useEffect(…, [])`, it resolves ONCE per mount and never
  re-polls. No deploy or code change either way. Do NOT tell an incident channel the surface reverted
  "instantly" for everyone: an operator watching the error rate fail to drop will escalate to a rollback they
  don't need.

## 3. Rollback drill (REHEARSE before the first money flip)
The runtime flag is the kill switch. Rehearse the reversal so it's muscle memory, not improvised under load:
1. Flip the surface flag OFF via the runtime public-flags source (`/api/config/public-flags.<key>`).
2. Confirm V-prev renders within one cache cycle (hard-refresh; Render bundles may be cached 2–5 min).
3. Confirm gate telemetry shows the surface back on `flag_off` decisions (no more `mounted`).
4. Record: who flipped, when, the trigger metric, the observed recovery time. File under the phase audit (Rule 48).
> ⚠️ **The kill switch is only absolute while the build env stays FALSE — read this before trusting it.**
> The runtime flag wins over the **QA localStorage override**. It does NOT win over the build env: a non-200 or
> unreachable `/api/config/public-flags` is caught and falls back to `ENV_FALLBACK` (`VITE_<SURFACE>_VNEXT`).
> So if that env var is ever set to `true`, an unreachable flags endpoint turns the surface **ON**, not off —
> and backend degradation is both a common *reason* to abort and the same condition that makes the flags
> endpoint fail. The kill switch would be least reliable exactly when you need it most.
> **Currently safe by accident, not by control:** no `VITE_*_VNEXT` is set in `render.yaml`, `frontend/.env*`,
> or `vite.config`, so `ENV_FALLBACK` is `false` everywhere today. Do NOT "promote" a flag to the build env
> after a successful flip — that is the natural next instinct and it springs this trap.
> Verify on staging as part of the drill.

## 4. Gate telemetry contract (`adapters/style-lens-swan/gateTelemetry.ts`)
Each `*Gate.tsx` emits one event at its decision point (a one-line add per gate — the WIRING slice):
| Point in the gate | Call |
|---|---|
| V-next rendered, contract satisfied | `emitGateEvent({ surface, outcome: 'mounted' })` |
| `ContractCheck.onFail` (world contract missing) → V-prev | `emitGateEvent({ surface, outcome: 'contract_fail' })` |
| `GateBoundary` caught a lazy-chunk/runtime error | `emitGateEvent({ surface, outcome: 'boundary_error' })` |
| flag off/unresolved → V-prev (optional/sampled) | `emitGateEvent({ surface, outcome: 'flag_off' })` |
Privacy (Rule 8): surface + outcome + coarse viewport bucket ONLY. The emitter is best-effort, non-blocking, and
swallows all errors — telemetry can never affect the fail-closed path. An app-level listener on
`GATE_EVENT_NAME` (`swan:gate-event`) forwards to a beacon; absent a listener it is a no-op.

## 5. Status
- Telemetry helper: **SHIPPED** (`gateTelemetry.ts`). Per-gate wiring: **pending** (the wiring slice).
- CI firewall: **SHIPPED** (`npm run lint:swan-lens`). Playwright QA + Measurement/Perf baselines: **pending**.
- No flags flipped yet. First flip is gated on the §0 preconditions.
