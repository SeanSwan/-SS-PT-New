# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** c:/tmp/ss-atelier-v2/docs/ai-workflow/AI-HANDOFF/ATELIER-BRAND-KITS-REVIEW-PACKET-2026-08-26.md
**Seed:** (none)
**Tokens:** 2167 in / 1598 out | **Cost:** ~$0.0305 | **Wall:** 48.0s | **finish_reason:** stop

---

## VERDICT
REVISE — the core DATA/BEHAVIOUR split and fail-closed refusal are sound, but the doc itself admits two brand-integrity holes (taste path, lawProfile override) and zero evidence the kit changes a real image.

## BLOCKERS

1. **P1 — Taste path silently ships Swan taste to non-Swan sites.** Input: `brandKit: "universal"` (or any future non-Swan kit) + a taste-based render → output dressed in Sean's rated Swan corpus with no marker, no refusal, no test. The doc states this plainly (§3 Q1) and then asks reviewers to pick the fix — that is an unresolved correctness defect, not an open question. For a render carrying another site's brand, this produces factually wrong art direction. Evidence: `applyBrandKit` runs only at `composeStills.mjs:206` (brief path); taste path has no kit handling.

2. **P1 — `lawProfile` request override defeats the kit's entire purpose.** Input: `brandKit: "swanstudios"` + explicit `lawProfile: "universal"` in the request → brand laws bypassed, with only `lawProfileOverridden: true` recorded. The laws exist to protect the brand "from exactly this" (doc's own words, §3 Q3); a log flag is not enforcement. If any client-reachable surface can set `lawProfile`, this is an authz-shaped hole: the allowlist is strict about *which* kit but permissive about *gutting* it. Evidence: §3 Q3.

3. **P2 — No verification that the kit affects a real render.** §4 "NOT proven: any real render." Combined with the unmeasured prompt-order claim (§3 Q4), the shipped behavior change is: briefs get extra words prepended/appended, effect unknown, order rationale unvalidated. Not a crash, but the feature's value proposition is unproven. Cheapest fix below.

4. **P2 — `workspaceId` remains an unvalidated free-text field that nothing reads.** §1 admits this and the fix deliberately keeps it free text. Fine as a filing label — but the moment the library filters or groups by `workspaceId` (and §3 Q5 proposes showing kit/workspace in the library), any caller can file assets under arbitrary workspace labels: a multi-tenant scope leak waiting for its first reader. The doc should state the rule now: workspaceId must never be used for authz or scoping without a validation layer.

No P0s. The refusal-into-fallback falsification test is exactly the right discipline.

## ATTACKS

- **Correctness:** Taste-path gap (Blocker 1) is the big one — happy-path-only reasoning assumed "brief path = the only path." Also: what happens when *no* kit is passed? The doc never states the default. If default is `swanstudios`, legacy callers are silently re-governed; if `universal`, Swan renders lose law protection. Unstated defaults on a fail-closed allowlist are a drift vector. The removed `negative` field was handled correctly (good catch re: `honorsNegativePrompt` gate bypass).
- **Security:** `lawProfile` override (Blocker 2) is the authz-adjacent hole. Free-text `workspaceId` (Blocker 4) is a latent IDOR/scope-leak if any future read path trusts it. Kit catalogue is server-side and reviewed — no injection surface; kit words are curated strings, not user input, so prompt-injection risk is low *provided* the "one object plus his answers" flow never becomes user-editable without the §3 Q2 trigger firing. Zero-PII rule: kits send only curated art words — compliant.
- **Data-truth / schema drift:** The module-vs-table decision (§3 Q2) is defensible *today*, but the named trigger ("per-tenant and user-editable") is too late — by the time kits are user-editable you've already built the CRUD surface under pressure. Earlier trigger: "a second real kit is requested" or "kits need per-tenant scoping." Frontend picker sourced from `/limits` rather than a bundle constant is the correct anti-drift pattern; verify `/limits` response shape is contract-tested (the 1 new frontend test covers options-from-server, but not shape drift of the `/limits` payload itself).

## HIGHEST RISK

**Blocker 1 — Swan taste leaking into non-Swan renders.** It's the only defect that produces wrong branded output for a real client with Sean's name on it, and it's currently *silent*. Cheapest de-risk before ship: option (c) — refuse `taste` + non-default kit with a 400 (`E_TASTE_REQUIRES_SWAN_KIT`), one gate check plus one test, mirroring the existing refusal pattern. That converts a silent brand-integrity failure into an explicit unsupported-combination error, and (b) can be designed later without having shipped contamination.

## CONFIDENCE

I could not verify from the document: (1) the default kit when none is passed — the single most behavior-determining fact, and it's absent; the registry source or one test would settle it. (2) Whether `lawProfile` is settable from any client-reachable request or only internal callers — the route handler / request schema would settle it; if internal-only, Blocker 2 drops to P2. (3) Whether anything *now* reads `workspaceId` — a grep would settle Blocker 4's latency vs. activity. (4) The prompt-order claim — unmeasurable without real renders; the doc is admirably honest about this. My P1 on the taste path assumes taste renders are reachable with a non-default kit; if the compose surface can't combine them today, downgrade to P2 — but then say so in the doc with a test pinning the unreachable state.
