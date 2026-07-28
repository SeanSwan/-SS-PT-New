# External Reference MCP Protocol - Mobbin and Real-Product UI Research

- **Date:** 2026-07-09
- **Status:** CANONICAL within Design Brain scope
- **Scope:** default external UI-reference gate for Mobbin/Mobbin-like MCP tools before SwanStudios UI direction, major redesign, Fable/Village design implementation, or reference-backed visual review work.

---

## 1. Purpose

Real shipped-product references sharpen pattern judgment before an agent designs. They do not replace Swan doctrine. This protocol turns external design libraries into a disciplined research input: study the market, extract principles, translate those principles into Swan's C1-C12 pattern grammar, and reject anything that would dilute the Crystalline Swan system.

The transcript Sean supplied describes Mobbin MCP access to real UI screens and flows. The transcript's core workflow is useful: search screens, flows, and sections before designing; collect a compact visual/report-style synthesis; then design from extracted principles rather than model taste.

## 2. Connector status and setup boundary

- Target connector: **Mobbin MCP**. If someone says "Mobin" in notes or transcripts, normalize it to Mobbin.
- Transcript-proven tools: `search screens`, `search flows`, and `search sections`.
- Requirement: Sean-owned Mobbin subscription plus the account-specific MCP/OAuth connector URL from Mobbin account settings.
- Verified historical status: the Codex runtime on 2026-07-19 authenticated and called `search_screens`, `search_flows`, and `search_sections`. This is not a permanent availability claim; every task must still prove that the tools are callable in its current runtime.
- Secret rule: never commit MCP URLs, OAuth URLs, cookies, tokens, account emails, screenshots containing private account data, or customer data.

Every design-direction task starts by checking whether the Mobbin tools are callable. If the connector is unavailable, write `[MOBBIN UNAVAILABLE]` in the reference receipt and continue from `SWAN-CINEMATIC-DESIGN-SYSTEM.md`, `SWAN-ASSET-STORYBOARDING.md`, and the rest of this Design Brain. Missing Mobbin access is not a blocker for small UI fixes or non-visual work, but the unavailable marker is required when a task would otherwise use external references.

## 3. Authority order

External references are research inputs only. Conflict order is:

1. `CLAUDE.md` / `AGENTS.md` rules, auth/data/security constraints, and mounted-surface receipts.
2. `SWAN-CINEMATIC-DESIGN-SYSTEM.md` and `SWAN-ASSET-STORYBOARDING.md`.
3. `design.md`, `components.md`, `motion.md`, `anti-patterns.md`, and `qa-gates.md`.
4. Mobbin or other external reference principles.
5. Generic model taste.

A Mobbin pattern that requires Tailwind, MUI, non-Swan tokens, copied proprietary layouts, fake metrics, hover-only workflows, inaccessible density, or a non-Swan product model is rejected.

## 4. When to run external-reference intake

Run this before the 2-3 concept-direction gate when any of these are true:

- Net-new page, major redesign, or new dashboard surface.
- Implementation begins from a Fable, AI Village, Gemini, or multi-brain design plan and the target surface has visible UI consequences.
- Checkout, onboarding, settings/profile, admin table, messaging, gallery/storefront, community feed, or command-center workflow where modern product conventions matter.
- Sean asks for modern design examples, Mobbin, inspiration, market patterns, or multiple options.
- A reviewer says the UI feels generic, cramped, outdated, or disconnected from modern product expectations.

Skip or mark not applicable for typo fixes, single-property CSS fixes, narrow bug fixes, route/schema work, backend-only work, or any task where Sean already chose the exact direction and no design exploration is wanted.

## 5. Research flow

1. Define the surface, user role, primary job, primary action, device class, and workflow phase.
2. Check connector availability. If unavailable, emit the receipt with `[MOBBIN UNAVAILABLE]` and stop the external-reference branch.
3. If results will be retained or compared across runs, load `mobbin-learning-system.md`, confirm manual mode/kill-switch/budget state, and use the validating `evidence/2` writer. Pre-governance samples are exploratory only.
4. Search 3-5 targeted queries across screens, flows, and sections. Prefer flows for multi-step tasks and sections for single-page composition patterns.
5. Study 12-32 relevant references for major surfaces. For small redesigns, 6-12 is enough.
6. Build a reference report: category, app/product, reference type, pattern observed, and the design question it answers. Keep links inside the MCP/client when possible; do not commit private screenshots.
   - **For net-new pages and major redesigns, render the report as a styled HTML artifact** (via the Artifact tool or a scratchpad `.html`), NOT just a text table. It must: (a) reuse the target surface's own Swan tokens/styling so Sean previews it in-brand, (b) group references by design question/section, (c) carry the clickable Mobbin deep-links per reference so Sean can verify the agent's work, (d) end with the extracted best-practice principles and a proposed Swan plan for the surface. Sean reviews this artifact and approves/edits the plan **before** any build begins. This is the video's signature step — reference-backed HTML report → Sean's approval → build.
   - For small redesigns, the compact text receipt in §6 is sufficient; the HTML artifact is optional.
7. Extract principles, not pixels: information hierarchy, action placement, validation model, density rhythm, empty/error states, mobile behavior, trust cues, and restraint.
8. Translate the winning principles into Swan language: B2 arc, C1-C12 patterns, tokens, components, motion tier, and QA risks.
9. List rejected patterns and why they fail Swan rules or product truth.
10. Feed the receipt into Fable's direction gate, builder receipts, and reviewer checks.

## 6. Required receipt

Leave this in the task thread, slice doc, or design direction doc before implementation begins:

```text
EXTERNAL REFERENCE RECEIPT - <surface>
Status:       <Mobbin used | [MOBBIN UNAVAILABLE] | not applicable>
Surface:      <route/component/product area>
User job:     <one sentence>
Primary action: <one action>
Tools/queries: <search screens/flows/sections + query list, or unavailable reason>
References:   <titles/apps/categories/counts only; no private URLs or screenshots committed>
Patterns extracted:
  - <principle 1>
  - <principle 2>
  - <principle 3>
Swan translation:
  - B2 arc: <acts/phases>
  - C-patterns/components: <C1-C12 / components.md names>
  - Tokens/motion: <Swan tokens + motion tier>
Rejected patterns:
  - <pattern> -> <why rejected>
Design impact: <what changes in the proposed direction because of this research>
```

For major surfaces, add a short reference-report table after the receipt:

```text
Reference report:
  - <category> | <app/product> | <screen/flow/section> | <principle learned> | <Swan translation>
Common convergence:
  - <pattern top products repeat>
Anti-patterns rejected:
  - <pattern rejected and why>
Clarifying questions:
  - <only questions that materially change direction>
```

## 7. Anti-clone rules

- Do not ask an agent to "make it like" a named product.
- Do not reproduce proprietary layouts, assets, copy, screenshots, or exact interaction choreography.
- Use titles/categories and short principle summaries in repo docs; keep external screenshots inside the external tool, not in Git.
- The correct phrasing is: "Reference X taught us principle Y; Swan applies that principle through pattern Z, tokens A/B, and our own product story."

## 8. Integration with other brains

- **swan-design-router:** loads this file for net-new pages, major redesigns, and design-reference requests.
- **Fable:** uses the receipt before producing 2-3 directions; each direction names what research influenced it and what was rejected.
- **Builders (Claude/Codex):** consume the chosen direction plus the reference receipt; they do not independently copy external screens.
- **Reviewers:** check whether the build translated principles into Swan grammar instead of cloning or drifting generic.
- **Knowledge layer:** only promoted principles and decisions enter Obsidian/Graphify; raw Mobbin references stay out of the repo.
- **Hermes/operator layer:** may request a T0/T1 design-research brief and may store the distilled receipt as an output/run artifact, but cannot authorize connector secrets, install MCP connectors, write product styles, or perform external-visible design actions.

## 9. Hermes UI Brain bridge

Hermes can become smarter about UI design by brokering reference-backed briefs, not by becoming an unsupervised designer.

1. Sean asks Hermes for a UI idea, redesign, or workflow improvement.
2. Hermes drafts a T1 `needs_mobbin_reference` brief with surface, role, primary job, data truth, target device, and 3-5 proposed Mobbin queries.
3. If Hermes runtime has callable Mobbin tools, Hermes runs only T0/T1 research and emits the external-reference receipt. If it does not, it queues the brief for Claude/Codex/Fable with `[MOBBIN UNAVAILABLE IN HERMES]`.
4. Fable or the builder consumes the receipt through `swan-design-router`, produces 2-3 Swan concept directions, and waits for Sean when the ideation gate applies.
5. Only distilled principles, Swan translations, and decisions enter Obsidian/Graphify. Raw screenshots, connector URLs, account data, and copied UI never enter the repo or wiki.

## 10. Prompt template

```text
Use the Mobbin MCP before designing <surface>.

Search screens, flows, and sections for <surface archetype>, <workflow phase>, and <user role>. Study at least <N> shipped references across <app categories>. Return:
1. Connector status and tools used.
2. Reference report grouped by design question.
3. Common patterns top products converge on.
4. Patterns Swan should reject and why.
5. Swan translation: B2 arc, C-patterns/components, tokens, motion tier, QA risks.
6. Two or three concept directions if this is net-new or a major redesign.
Ask only clarifying questions that would materially change the direction.
```

## 11. Claude Code Desktop connector notes from transcript

The transcript's setup path is client-side, not repo-side:

1. In Mobbin, open account/profile settings and find the MCP tab.
2. Copy the one-line custom MCP connector URL from Mobbin.
3. In Claude Code/Desktop, open connector/MCP settings, add a custom connector named `Mobbin`, paste the URL, and authorize with the Mobbin account.
4. Confirm the agent can call `search screens`, `search flows`, and `search sections` before claiming the connector is live.

Do not place that connector URL in `CLAUDE.md`, `AGENTS.md`, `.mcp.json`, env files, docs, commits, or prompts.