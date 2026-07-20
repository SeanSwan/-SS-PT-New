# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-19T18:30:00Z
- **Slice:** GATE RULE established + PRISM gate-parity defect fixed + Kimi activation-model ruling

## What I did / learned
- **Latent defect found (by Sean's question, not by any automated check):** `PrismCapture` — the site's only
  lead-capture — was mounted ONLY in `HomePage.V4`. `HomeGate` renders `HomeVNext` when `HOME_VNEXT_ENABLED`
  flips true, so **activating the Home redesign would have silently deleted the lead-capture from the site.**
  Build, types, lint, and a 3-pass/5-reviewer hostile loop ALL missed it — a divergence between gate branches is
  invisible to every one of them.
- **Fixed + prevented:** mounted in both branches; added `frontend/src/components/marketing/PrismCapture/
  prismGateParity.test.ts` (3/3 pass, **mutation-verified red** when the mount is removed). Pushed `f63b82181`.

## Transferable doctrine (NEW — applies repo-wide)
- **THE GATE RULE:** *No feature may be mounted inside a gated component unless it is mounted in ALL branches of
  that gate, in the same PR.* Prefer a mount point ABOVE the gate; if none exists, create one. Enforce with a
  structural parity test (extend `GATE_BRANCHES` in prismGateParity.test.ts for each new gated surface).
- **Flags are TEMPORARY scaffolding, never a permanent fork.** Lifecycle: flip (1-2 surfaces/wk) → verify 7 days
  vs a pre-flip baseline → **delete the old surface + the gate + the flag + env vars** within 14 days → close a
  retirement ticket in a flag registry. Skipping deletion converts a migration into a permanent fork and you pay
  double-maintenance on every future change forever.
- **Token contract scope (don't oversell):** `--world-*` survives RE-SKINS (palette/theme) — real, and the CI
  firewall enforces it. It does NOT survive STRUCTURAL redesigns (new IA/composition). Half the claim is true and
  it's the valuable half.
- **Dark-shipped work is worth $0** and rots (drift). PRISM was the first documented drift case; there will be
  more. Recommended hard rule: activated or deleted within 30 days of the activation wiring landing.

## Kimi hostile-review verdict on the program (2026-07-19)
- **Building 9 dark surfaces before wiring activation was a STRATEGIC ERROR** ("you built nine cars and no
  ignition"; optimized for the comfortable work, deferred the scary work). Correct shape was: activation wiring +
  ONE pilot surface → prove the full loop INCLUDING deletion → then mass-produce.
- **State:** 9 flags, ZERO deletion tickets, nothing ever activated, real visitors still 100% on the old site.
- **Ruled sequence:** fix PRISM (DONE) → land Lane-A activation (the true blocker) → baseline the funnel →
  activate Home → remaining 6 at 1-2/wk deleting as you go → acquisition push → Gallery then Chart Charter last
  (money surfaces get the highest verification bar, not the fastest slot).
- **Top unaddressed gaps, ranked by money at risk:** (1) no money-path pre-flip verification (checkout/credits/
  VIP/referral/donations) — highest revenue risk, least discussed; (2) rollback drill WRITTEN but never EXECUTED
  in prod (untested rollback = hypothesis); (3) no flag registry/ownership; (4) no analytics tagging of active
  flag state (can't answer "how many sessions ran v-next"); (5) a11y not systematically verified across surfaces.
- Provenance: Kimi K3 (sub-Fable tier) → inbox only, **NOT** eligible for the durable learning corpus.

## State right now
- main @ `f63b82181` (merged another lane's logger fix en route). All flags still OFF. Frontend vitest IS runnable
  in this worktree (backend vitest is NOT — backend deps absent; the PRISM backend suite remains unrun).

## Sean owes / blockers
- **Unblock Lane-A activation** (other lane owns it) — nothing else matters until a flag flip produces a visible change.
- Decide: do I write the flag-retirement doctrine + flag registry next (my lane), or take over Lane-A.
- Before enabling PRISM: run its backend vitest in CI; set `PRISM_CAPTURE_ENABLED=true` + `REF_CODE_PEPPER`.
