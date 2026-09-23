# Consult reply — Tencent HY3 (tencent/hy3) — 2026-08-12T03:19:00.208Z

> tokens: prompt=3029 completion=3561 | finish_reason: stop | max_tokens: 60000

# Hostile Review — Tencent HY3

## 1. VERDICT
**SEND-BACK** — §4 fixes the mechanical truncation but reinvents the core-loop gap one level up, ignores visual/UX integrity (the actual brand risk), and its exhaustiveness claim is structurally liar-prone.

## 2. What this architecture STILL misses after all 5 parts ship
**Bug class: Rendered‑UI / responsive / accessibility regressions and cross‑role temporal defects.**

- The crawler (§4.2) only asserts “route loaded, no 404, no console error, candidates clickable.” It never evaluates **layout, overlap, contrast, mobile viewport breakage, or ARIA state**. For a dark‑first premium “Crystalline Swan” product, a page that loads clean but displays broken grids or unreadable Ice‑Wing‑cyan‑on‑sapphire text is a defect the suite will certify green.
- §4.3 scripts journeys per‑role but the core loop is **multi‑persona and asynchronous**: trainer logs workout → client’s chart updates later. A single‑role scripted lane cannot prove the data landed in the other dashboard unless explicitly choreographed across auth states. The plan treats “write” as a solitary act, not a handed‑off flow.

The design is blind because it equates *visited DOM* with *correct product*.

## 3. Where the architecture itself is wrong
**Decomposition error:** §4.2 (read‑only crawler) and §4.3 (write lane) are split by permission而不是 by behavior. This creates two maintenance surfaces and repeats the §2.1 failure mode—someone must hand‑author journeys.

**Right shape:** A single **Execution Engine** with a `mode: read | write` flag, sharing the same BFS frontier, manifest seed, and visited‑set. In staging, the engine lifts the verb banlist and follows action‑semantics (not labels) to drive flows. Cross‑role orchestration is a sequence of engine sessions swapping personas over the same seeded DB. This removes the “scripted journeys” authoring tax and lets the crawler *discover* write paths the way it discovers read paths.

Also: §4.1 manifest must be **augmented with runtime route introspection** (React tree after feature‑flag evaluation), or dynamic routes stay invisible exactly as in §2.1.

## 4. Attack on §4.5 (“cannot stop until entire site is visited”)
The claim silently under‑reports while looking green via three holes:

1. **Total is sourced from the static manifest.** If §4.1 misses a route (conditional rendering, A/B test, lazy‑loaded child not in parse), `total` is too low. The run prints `visited / total = 100%` while entire surfaces were never in the denominator.
2. **Reachable‑but‑absent routes are “findings,” not completeness failures.** A link in UI leads to a route not in manifest → flagged, but `total` unchanged. The summary can be complete while the site graph is larger than audited.
3. **Persisted visited‑set across deploys.** If a build ships new DOM but the queue resumes from yesterday’s `visited` markers, stale signatures mark routes “visited” without re‑executing. No build‑hash gate on the persisted state → false completeness.

A partial run *can* masquerade as full if the manifest is decayed.

## 5. Ranked build order (only 2 of 5 this month)
1. **§4.1 Route Manifest Generator + drift gate** — cheapest, stops the “page ships un‑audited” root cause. Immediate CI failure on new routes.
2. **§4.3 rewritten as cross‑role orchestrated write journeys** (not isolated scripts) — directly attacks the owner’s #1 pain (core loop unproven). Build a minimal persona‑swap harness against seeded staging; skip the full BFS rewrite.

*Hotfix outside the 2:* patch existing crawler with per‑route `try/catch` + incremental report (subset of §4.2) to stop the “dies at route 7” symptom this week.

---

## 6. Judgment on Open Questions

**Q1 – Depth control:** Fixed depth 3 is wrong. Terminate on **stable candidate set**: after interaction, if re‑enumerated selectors ⊆ visited‑for‑this‑route and no new DOM branches, back out. Use per‑route interaction budget with explicit `TRUNCATED` (already in §4.2) but don’t cap depth blindly.

**Q2 – Visited‑set keying:** DOM‑signature on full HTML thrashes on React async (timestamps, random IDs). Key on `(route, role, ordered‑hash‑of‑interactive‑selectors)` ignoring text/content. Stable enough.

**Q3 – Manifest authority:** Authoritative (fail on undiscovered) is correct *if* supplemented by runtime discovery reconciliation. Worst failure mode of advisory: silent omission. Worst of authoritative‑alone: false negatives on dynamic routes. Hybrid: manifest seeds, runtime must reconcile or fail.

**Q4 – §4.3 shape:** Yes, pure scripted journeys reinvent §2.1 at higher cost. Use a **guided write‑crawler** in staging that follows non‑banned actions to complete flows, with scripted *assertions* only at contract boundaries (record exists, chart updates). Keeps discovery, adds proof.

**Q5 – Cheapest honest §4.5:** A JSON file in CI artifact storing `{route, role, status, buildHash}`. Print `visited/total` from manifest; hard‑fail if any manifest route lacks terminal status for current `buildHash`. No queue persistence needed—just status+hash.

---
*Reviewed as frontend architect. The plan is salvageable but not as written; the brand’s risk is visual, not just mechanical, and the core loop is cross‑role—architect accordingly.*
