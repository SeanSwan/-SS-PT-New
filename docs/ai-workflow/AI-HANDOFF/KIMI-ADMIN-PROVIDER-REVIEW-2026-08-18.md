# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/ADMIN-PROVIDER-CHOICE-LOCAL-QWEN-DESIGN-2026-08-18.md
**Seed:** (none)
**Tokens:** 2406 in / 1215 out | **Cost:** ~$0.0254 | **Wall:** 52.6s | **finish_reason:** stop

---

# Hostile Review

## 1. Your revised position is over-rotated — you're solving the wrong problem by restricting it

You went from "B is the best privacy result" to "B is a labeled scratchpad only" in one review cycle. Both are wrong in the same way: **they accept the premise that local Qwen should live adjacent to the existing chat at all.**

The scratchpad concession is a tell. A "clearly-labeled, ungrounded, unpersisted scratchpad" is a feature Sean will use twice and abandon — it delivers none of his actual goals (it doesn't touch client interactions, doesn't cut client-facing cost, doesn't provide Gemini independence *where it matters*). You've preserved the ticket while gutting its value, which is worse than closing it. If the honest answer is "local Qwen is not viable inside a health-intake chat surface," then the honest recommendation is **don't ship it there** — not ship a neutered version to avoid saying no.

The reviewer pushed you on grounding and you correctly updated the facts — but you over-corrected the conclusion. The right conclusion from "chat is a health-intake surface" is: *the existing chat surface should never have a local provider option*, full stop. Not "it can, if sufficiently labeled."

## 2. The entire admin-provider-choice framing is the wrong answer to Sean's goals

Sean's goals: **(a) independence from Gemini, (b) cost control as paying clients arrive.** Neither is served by an admin-only provider picker:

- **(a)** His Gemini dependency is 100% in the *client-facing* chat (the onboarding/intake surface that must stay grounded, persisted, and moderated). Admin traffic is irrelevant to it. A local admin scratchpad leaves the dependency fully intact.
- **(b)** You said it yourself: admin is the smallest consumer. But you buried the real answer in "separate piece of work." It isn't separate — **it is the work.** The correct design is a **server-side, role/tier-aware model router**, not a provider preference:
  - Cheap tasks (classification, template loading, simple Q&A) → cheap model (Gemini Flash-class, or Haiku).
  - Intake/health conversations → the strongest model, with the grounding and persistence already there.
  - Per-tier quotas, context caps, response caching, spend ceiling with graceful degradation.
  - Provider abstraction with a **fixed allowlist** (fixing the SWA-107 gap as a prerequisite) so a second hosted vendor can be added for resilience.

That gets (b) directly, and gets most of (a) — vendor *diversity* is the real hedge against "Gemini acting funny," not vendor *locality*. A second hosted provider behind the same abstraction is a weekend of work with zero new attack surface.

**Local Qwen's legitimate niche, stated plainly:** dev/eval tooling (it already exists as `consult-qwen.mjs`) and possibly offline batch tasks with no client data. Recommend extending that, and closing the production-chat idea. If Sean wants his *own* usage off the meter, note that his usage is noise — say so with the cost breakdown, not a feature.

## 3. The legal/consent angle nobody raised

Several, and they cut *against* the "local = privacy win" instinct:

1. **Client consent scope.** Clients consented (or will) to their data being processed by the platform and its disclosed sub-processors. "Sean's home desktop" is not a disclosed processor. Moving health data to a new processing location is arguably a **material change requiring updated privacy notice and possibly re-consent** under WA My Health My Data (which is notably broad — covers inferences, has a private right of action) and NV SB 370. Self-hosting doesn't exempt you; it makes you a processor you've never disclosed.
2. **No BAA-equivalent / no vendor safety layer, but full liability remains.** With Gemini you at least have a vendor DPA and the vendor's own safety filtering as (weak) mitigation. Self-hosted, Sean bears 100% of liability for model outputs — including a `coach_action_proposal` that tells a client with disclosed injuries something harmful. There's no indemnity, no abuse monitoring, no audit trail from any third party. And per your own finding, tool dispatch is client-executed, so an unvalidated proposal *acts*.
3. **Model license/provenance.** Qwen's license permits commercial use at this scale, but outputs used in a *health-adjacent commercial product* have no vendor warranty whatsoever, and Apache/Tongyi terms disclaim fitness. That matters when the output touches `healthConcerns`.
4. **Security posture as a legal fact.** WA MHMD requires "reasonable security." A home desktop behind a tunnel (Option A) is very hard to defend as reasonable safeguards for health data; even B puts the data in a browser heap outside your session/storage controls, with zero `AiConversation` record — which also defeats your own ability to respond to **consumer access/deletion requests**, a specific MHMD obligation. Unpersisted isn't privacy-positive here; it's non-compliance.

## Bottom line

- Kill the admin-provider-picker as conceived. Don't replace it with a scratchpad — that's face-saving scope.
- Recommend: (1) fix the provider allowlist (SWA-107), (2) build the tier-aware router + cost controls, (3) add a second *hosted* provider for resilience, (4) keep Qwen as dev/eval tooling.
- The legal angle doesn't merely complicate local-Qwen-for-health-data; it's an independent reason the answer is no, regardless of architecture A/B/C.
