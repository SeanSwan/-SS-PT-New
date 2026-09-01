# Publish shipped, five panel fixes landed — and six seats misread one sentence identically

**From:** vs-claude (Fable 5) · terminal · 2026-08-25 · commit `dde001654` on `feat/atelier-v2-compose` (PR #73)
**Surface:** atelier / publishAsset / atelierPublicRoutes / persistStills / motionBind / localStillLane / Compose UI
**Type:** loop iteration 1 — Publish slice + six-seat hostile panel (Ox, GLM-5.3, Kimi K3, Grok 4.6, Qwen, HY3; ~$0.108) + arbitration + fixes. PR unmerged; probe still Sean's.

## What shipped

- **Publish rung**: `draft → approved → published` (no jumps); publish requires an explicit human **declaration** (`consentConfirmed:true` + `intendedUse`), welded onto `provenance.policyFlags` with who/when; the frozen licence snapshot still refuses a commercial declaration on a grant-required run with no grant.
- **Stable permalink** `GET /api/atelier/public/:id` — no auth, UUID-only, published-only, 302 to a fresh signed URL; snippet points at it; Unpublish revokes on the next request. Signed URL = preview only.
- Panel fixes: content-derived Motion idempotency key (no minute bucket); `reserveGpu()` **before** the VRAM read; content-addressed R2 key (no month); hash-derived ComfyUI upload name pinned by test.
- `AtelierCompose.words.ts` split (api.ts crossed the cap); publish-panel DOM test.

## The lesson

**Six seats produced the same P0 from one ambiguous sentence.** The packet said *"nothing in the pipeline sets a flag yet, so today the consent gate never trips."* Every seat read that as either fail-open (H3 ships) or fail-closed (nobody can publish). Neither was true: `policyFlags` was an **empty array**, and the separate **grant clause** on the licence snapshot did fire, with a test proving it. The seats could not tell, because the packet described the gate in prose instead of by its predicate and its test name. Their underlying point — nothing writes a flag, so a human must — was right, and became the declaration.

**A review packet describes a gate by its predicate and the test that pins it, or the panel reviews the sentence, not the gate.**

Second: the **signed-URL-in-a-snippet** defect was found by all six independently. Unanimity from six different models on a design flaw is a stronger signal than any single P0; it was the first thing fixed.

## Live-state facts

- Panel tooling (`consult-panel.mjs`) lives on the wip checkout, not main — run it from there with absolute paths.
- Seat costs this run: Kimi $0.041, Grok $0.064, HY3 $0.003; three free. Kimi's ONE-review rule honoured.
- The remaining unanimous P1 — synchronous ~2-min local `/stills` — is deliberately **deferred to its own iteration** (SWA-209 #1) rather than crammed in.
- In-process single-flight cannot see the render agent's own Motion job; live-VRAM admission mitigates. Stated in the synthesis.
- `SWAN_PUBLIC_BASE_URL` (new, optional) prefixes the permalink; absent → path-relative.
- "Globe button" (Sean, mid-loop) is almost certainly `ui/buttons/GlowButton.tsx` (10 colour variants); recorded on SWA-205 for Sean to confirm — the Forge codemod replaced it in 27 call sites.

## Mistakes I made

- **Wrote the consent-gate state as prose ("never trips") in a review packet**, and six seats built a P0 on the ambiguity. **MECHANISM:** a packet describes each gate as `predicate → refusal code` plus the test that pins it; a gate with no test is written as UNTESTED, never as prose.
- **Split a 352-line file with a regex classifier** that left a phantom import and a missing type import; the earlier green build masked it, the scoped tsc caught it at the commit gate. **MECHANISM:** after any mechanical split, run the scoped tsc BEFORE running the build; the build is not a type check.
- **Injected a test title containing an apostrophe into a single-quoted string** — suite failed at load. **MECHANISM:** generated test titles use double quotes.
- **Cancelled by Sean mid-batch and mis-explained** — no: Sean's cancel was a mis-click; nothing ran; re-issued verbatim. Not a mistake, recorded for the ledger's completeness.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Previously written up? | What stopped it |
|---|---|---|---|
| Ambiguous prose in a packet becomes a false finding | 1 (+ the 296-line count yesterday — same class: packet input, not code) | **Yes — yesterday's packet, "a stale number you supply comes back as a finding"** | Reading the code, not the packet, while arbitrating |
| Mechanical split leaves dangling imports | 1 | No | Scoped tsc at the commit gate |
| Quote-escaping in generated test source | 2 today (heredoc earlier; title now) | Yes (earlier today) | Load failure, not procedure |

**The repeat that matters:** *packet input that is not code becomes a panel finding* is the second occurrence in two days, and the first was written up. The write-up said "measure numbers in-session"; it did not generalise to prose. The procedural form now: gates are described by predicate + test, never by sentence.

## External-model calibration

See `docs/ai-workflow/AI-HANDOFF/PANEL-ATELIER-LADDER-SYNTHESIS-2026-08-25.md` — per-seat real/disproven/cost table. Headline: Ox and GLM highest yield; Grok longest and most repetitive for two real catches; Qwen REJECT on wrong reads but right on the VRAM race; HY3 concise and cheap.
