# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** C:/tmp/ss-dash-trust-20260821/docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-LIVE-AUTH-PASS-HANDOFF-2026-08-21.md
**Seed:** (none)
**Tokens:** 5468 in / 5942 out · **Cost:** ~$0.0302 · **Wall:** 46.4s · **finish:** stop

---

## VERDICT
REVISE — the plan exposes PII to LLMs, lacks concrete test data for key journeys, and substitutes subjective “legibility” for measurable contrast verification, making it unexecutable as written and unsafe.

## BLOCKERS
1. **P0** — The document contains PII in violation of the house rule “zero PII to LLMs (IDs only).” The name “Sean” appears repeatedly, and the path `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT` exposes a username. The next agent will ingest PII, and the handoff itself is non‑compliant.  
   *Evidence:* “Ask Sean to do the click-through”, “Sean has to supply the session”, and the trap warning `c:/Users/BigotSmasher/Desktop/quick-pt/SS-PT`.

2. **P0** — Journey A step 2 writes a real member’s privacy/health settings to the production database via local dev, but no test account is provided. The agent is told to “use a test account, or Sean's own, with his say‑so” without any concrete account identifier or isolation. The agent could irreversibly mutate a real user’s data.  
   *Evidence:* “local dev uses the **production DB** via `DATABASE_URL`” and “Journey A step 2 writes a real member's privacy settings. Use a test account, or Sean's own, with his say‑so.”

3. **P1** — Journey A steps 3 and 4 require “a member with two transformation photos of the same angle” and “a member with **no** transformation photos, and again with **one**.” The plan gives no method to locate or create such members. The agent cannot execute these checks, leaving the slider and empty‑state fixes unverified.  
   *Evidence:* “Find a member with two transformation photos of the same angle.” No query, account list, or seeding instruction follows.

4. **P1** — Journey E’s contrast check is purely subjective (“Text must stay legible”) and ignores the house rule requiring WCAG 4.5:1. The agent may eyeball a failing contrast ratio and pass it, repeating the exact class of bug the workstream was meant to eliminate.  
   *Evidence:* “Text must stay legible. This theme is the only one of sixteen with a dark `text.primary` (`#0B1726`), and it is where a contrast bug already hid once.”

5. **P2** — Journey D asks the agent to measure “the content column” at 1280 px and 1440 px but does not specify which DOM element or how to handle responsive variations. The agent could measure the wrong container and falsely confirm the layout fix.  
   *Evidence:* “Home tab at **1280px and 1440px**. The content column should be roughly **744px** at 1440, not 412px. **Measure it** (devtools, or `getBoundingClientRect()`), and record the number.”

## ATTACKS
- **Completeness:** The journeys omit critical states and failure modes:  
  - No concurrent‑edit scenario (two tabs saving settings simultaneously).  
  - No revoked‑session test (token expiry during a save).  
  - No offline/slow‑network handling (what happens when the save request fails?).  
  - No check that the before/after slider is **absent** when a member has only one transformation photo (the slider requires two; the plan only checks the empty‑state copy).  
  - No verification of the layout fix on mobile/tablet viewports; only 1280 px and 1440 px are mentioned, but the rail policy may affect smaller screens.  
  - No check for the “Open Workout Logger” button when the trainer has zero clients or the admin has no client‑management permissions (only happy‑path routing is tested).

- **Correctness of the settled claims:** The claim “`?intent=log_workout` is consumed” is settled on a single code reference (`ClientsWorkspace.tsx:106`) and an assertion that “~8 existing production surfaces already route to that exact URL.” The agent is forbidden from re‑litigating, yet Journey B/C rely on this claim. If the intent handling is broken in a way the code reference doesn’t reveal (e.g., a runtime guard that fails only for certain roles), the agent would trust the settled claim and might dismiss a test failure as a setup issue. The evidence is thinner than the plan implies.

- **Process/safety:**  
  - The plan offers three execution routes but does not mandate the safest one (Sean‑click‑through) for the write‑sensitive Settings test. The local‑dev route writes to production by default, and the “throwaway account” is never supplied.  
  - The Playwright MCP “supervised pattern” requires Sean to authenticate in a real browser while the harness observes; the plan does not explain how the session is transferred without exposing credentials, creating a credential‑handling risk.  
  - The manual click‑through is unrepeatable and institutionalises a one‑time check instead of adding an automated regression test for the highest‑value journey (Settings persistence). The plan should at least record the manual result as a baseline for future comparison.

- **Self‑defeat:** Journey E’s contrast verification repeats the very mistake the workstream existed to fix: asserting a capability (legibility) without measurable proof. The plan says “Text must stay legible” — exactly the kind of unverified claim that let the original contrast bug ship. The house rule demands WCAG 4.5:1, yet the plan provides no contrast‑checking tool or ratio target.

## HIGHEST RISK
The combination of PII exposure and production‑data mutation without a designated test account. The cheapest de‑risk: redact all PII (replace “Sean” with “the stakeholder” or “the session owner”; remove the `BigotSmasher` path) and provide a concrete test account (or an explicit instruction to request one from the stakeholder with a clear scope) before any write operation. Additionally, mandate the Sean‑click‑through route for Journey A step 2 to avoid agent‑side production writes entirely.

## CONFIDENCE
I cannot verify from the document alone whether test accounts with the required photo configurations (two of the same angle, zero, one) exist or can be created by the agent. The plan assumes the agent can “find” such members but gives no query, UI, or seeding mechanism. Evidence to settle this: a list of test accounts with their data states, or a script to seed the necessary photos. I am also uncertain whether the contrast fix actually meets 4.5:1; the plan should specify using a contrast analyser (e.g., axe‑core or a browser extension) and report the ratio, not a subjective judgment. My confidence in the plan’s executability is low until these gaps are closed.
