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
  - `contract_fail` / `boundary_error` rate for the surface > **0.5%** of gate decisions → **ABORT** (flip back).
  - Funnel step conversion for the surface drops > **relative 10%** vs baseline → **ABORT**, investigate.
  - Any money-path regression (checkout start→success, credit purchase, VIP) → **IMMEDIATE ABORT**, no threshold.
  - Perf budget breach on the live surface (LCP/INP over `PERFORMANCE-BUDGET-CHARTER.md`) → ABORT.
- **Abort = flip the runtime flag OFF.** Fail-closed returns V-prev instantly; no deploy, no code change.

## 3. Rollback drill (REHEARSE before the first money flip)
The runtime flag is the kill switch. Rehearse the reversal so it's muscle memory, not improvised under load:
1. Flip the surface flag OFF via the runtime public-flags source (`/api/config/public-flags.<key>`).
2. Confirm V-prev renders within one cache cycle (hard-refresh; Render bundles may be cached 2–5 min).
3. Confirm gate telemetry shows the surface back on `flag_off` decisions (no more `mounted`).
4. Record: who flipped, when, the trigger metric, the observed recovery time. File under the phase audit (Rule 48).
> The flag WINS over env/override (absolute kill switch); a non-200 flags fetch throws → catch → env, so an
> override can never bypass an unreachable kill. Verify this on staging as part of the drill.

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
