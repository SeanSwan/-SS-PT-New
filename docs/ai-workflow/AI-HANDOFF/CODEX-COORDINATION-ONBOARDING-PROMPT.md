# Codex Onboarding Prompt — Live Pair-Coding Coordination

> Paste the block below to Codex at the start of a session (or whenever it seems unaware of the ledger). It onboards Codex to the real-time coordination system so Claude + Codex don't collide. Created 2026-06-13.

---

**Sean → Codex: new mandatory coordination process (effective now, ~1 month until Fable 5 returns)**

You and Claude are now coding the SAME working tree at the same time. To stop us from stepping on each other and to let us hostile-review each other's work, there's a new **Live Coordination Ledger** at `.ai-workflow/coordination/` (gitignored local files we both share on my machine — instant, zero git churn). This is now codified as **Rule 67** in `CLAUDE.md` and your `AGENTS.md` (Codex Startup step 6). Full spec: `docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md`.

**Do this now and every session:**
1. Read `.ai-workflow/coordination/claude.lane.md` (what Claude is editing RIGHT NOW), `.ai-workflow/coordination/codex.lane.md` (yours), and `.ai-workflow/coordination/review-queue.md` (open review requests for you).
2. Run `node scripts/coordination-prune.mjs`.

**Every slice, for the whole session:**
- **Read-before-edit:** before editing ANY file, re-read `claude.lane.md`. If your target file is in Claude's **🔒 EDITING NOW** list, do NOT edit it — pick another file, queue a review request, or ask me.
- **Claim/release:** overwrite `codex.lane.md` when you start a slice (status, the exact files in 🔒 EDITING NOW, a fresh ISO `Updated:` timestamp); clear 🔒 EDITING NOW when done. NEVER write `claude.lane.md` — that's Claude's.
- **Commit safety:** no `git add -A` while Claude has any file locked — stage explicit paths. You coordinate commit timing on shared slices.
- **Mutual hostile review (this is the main point):** when you finish a substantial slice, append a request to `review-queue.md` for Claude to hostile-review it. When Claude requests a review of its work, pick it up and write back APPROVE / REVISE / REJECT + findings (use rule 17 dual-pass + rule 41 closeout gate + the Business-Logic Audit in `docs/ai-workflow/AI-HANDOFF/HANDOFF-PROTOCOL.md`).

**Current lanes (stay in yours; flag if you must cross):**
- **You (Codex):** storefront purchase path — `StoreV3`/`ProductCard`/`ProductVariantPicker`/`cartRoutes`/`v2PaymentRoutes`/`SessionGrantService`/`cartCheckoutFulfillmentService`/`Order`+`OrderItem`/admin order+fulfillment UI; Coach Command Center; Social/Friends.
- **Claude:** admin product/catalog UI (`admin-packages-view*`, `ProductImageField`, `ProductVariantsManager`); money-path safety tests; cross-cutting infra.
- **Shared (coordinate):** `adminPackageRoutes.mjs`, `CLAUDE.md`/`AGENTS.md`, the coordination dir.

**Status sync from Claude (so you don't redo it):**
- The customer purchase path you built is recon-verified end-to-end and server-authoritative. Claude added **money-path safety tests** — keep them green, don't duplicate: `backend/tests/api/sessionGrantSeparation.contract.test.mjs` (physical products never grant sessions) + `backend/tests/api/moneyPathInvariants.contract.test.mjs` (server-authoritative price, variant safety, tax-only-on-physical). The latter asserts the hardcoded 8% tax **on purpose** — update that test in the same commit when you switch to Stripe Tax.
- There's an OPEN review request for you in `review-queue.md`: hostile-review this coordination system itself (does it actually prevent collisions in our flow? is gitignored-local the right call? holes in read-before-edit / stale-claim / commit rules? is 30-day retention sane?). Please write your verdict back there.

**Confirm** you've read the ledger + protocol and are operating under it.
