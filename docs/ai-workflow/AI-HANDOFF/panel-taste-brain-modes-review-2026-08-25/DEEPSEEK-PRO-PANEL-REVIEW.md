# DeepSeek V4 Pro — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Served:** `deepseek/deepseek-v4-pro`
**Document:** docs/ai-workflow/AI-HANDOFF/panel-taste-brain-modes-review-2026-08-25/PACKET.md
**Seed:** (none)
**Tokens:** 4343 in / 7454 out · **Cost:** ~$0.0273 · **Wall:** 94.4s · **finish:** stop

---

## VERDICT
REVISE — the partner-facing “include Midlibrary” checkbox violates the license restriction that Midlibrary images must never be shown to anyone but the owner, and the prompt generator’s failure to consume the compiled taste profiles breaks the core daily loop.

## BLOCKERS
1. **P0** – Partner can include Midlibrary images via the checkbox “include Midlibrary — this desktop only” (described in §2, Page). The pool logic allows `pool === "full"` for a partner profile (since `profile !== "client"`), which inserts Midlibrary refs into the grid. The license states Midlibrary “never leaves the machine, never shown to anyone but the owner on loopback.” Reproduce: partner creates a project, checks the checkbox, opens `/probe`, sees Midlibrary images. Violates the “licence containment” law set by the earlier panel.
2. **P1** – The prompt generator (`generate.mjs`, `swan-prompt.mjs`, `ui.html`) entirely ignores the compiled `taste-profile.json` and `/api/profile` directions. The owner’s prompt page still relies on star ratings from `loved-srefs.md`; partner/client have no prompt generation. The courtroom evidence is never used to steer generation, so the “make → judge → sharpen” loop is non‑functional. Reproduce: open `/` after several grids; the generated prompts do not reflect the chosen pictures or evidence‑tier srefs.

## ATTACKS
- **Correctness**: The function `profileOf(e)` (used in `lib/events.mjs` validateEvent) is not shown. If it returns `e.profileId` and an event with a human source enters without `profileId`, the enforcement `e.source === profileOf(e)` will fail (undefined comparison), blocking legitimate legacy events or any event where `profileId` is missing. The test suite may not cover this path.
- **Security**: The Who select changes the active profile instantly without confirmation. A mis‑click can silently switch from partner to owner, causing the partner’s judgments to be written into the owner’s memory, corrupting the owner’s taste data. The UI must make the active profile salient and gate the change (P2).
- **Data‑truth / schema drift**: The `taste-profile.json` schema is not defined in the document. The proposed P1 will consume it; any mismatch between the compiler’s output and what `generate.mjs` expects will break the linkage. The absence of a schema specification is a drift risk.

## HIGHEST RISK
The partner Midlibrary checkbox is a P0 license violation. De‑risk immediately by removing the checkbox from `probe.html/probe.js` and ensuring the pool logic never returns `pool: "full"` for profile `partner`. The cheapest concrete fix: delete the checkbox and hardcode `poolFor(partner, …)` to always return the shareable mix.

## CONFIDENCE
I cannot verify the exact implementation of `profileOf(e)` and `eventsDirFor` from the document alone; these could cause events to be written to the wrong directory if the mapping for `sean/default` vs. `taste/profiles/…` is incorrect. The 56‑pass test suite for modes gives some confidence, but I would need to see the unit tests covering edge cases (e.g., human source with missing `profileId`, projectId `default` used with a non‑`sean` profile). The `DEFAULT_MIX` variable is also absent from the snippet; without it, the full mix might be mis‑defined. Examining `lib/events.mjs` and `lib/projects.mjs` in full would settle these uncertainties.
