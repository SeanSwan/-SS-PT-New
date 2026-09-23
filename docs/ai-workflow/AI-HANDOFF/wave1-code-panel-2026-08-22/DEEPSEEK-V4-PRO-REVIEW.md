# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/WAVE1-CODE-REVIEW-PACKET-2026-08-22.md
**Seed:** (none)
**Tokens:** 26040 in / 8010 out · **Cost:** ~$0.0104 · **Wall:** 219.1s · **finish:** stop

---

## VERDICT: REVISE
**Evidence:** `backend/services/deIdentificationService.mjs:58-69` introduces `GATED_HEALTH_PATHS` gated behind `COACH_HEALTH_FIELDS_ENABLED`. The consent copy in `frontend/src/content/aiConsentCopy.ts` declares those fields are withheld. The env flag can be toggled **without any code change or consent-version bump**, making the user-facing disclosure false the moment the flag is flipped. The code comment warns but does not enforce. This is a privacy-compliance time bomb.

---

## BLOCKERS (must fix before push)

1. **Consent-drift via env flag (privacy/compliance).**  
   `areGatedHealthFieldsEnabled()` reads `COACH_HEALTH_FIELDS_ENABLED` at runtime. If an operator sets it to `true` in production, the system starts forwarding supplements/sleep/stress data while the consent copy still claims they are withheld. The comment says “bump AI_CONSENT_VERSION … and re-consent before enabling,” but nothing in the code prevents the flag from being enabled without those steps.  
   **De-risk:** Add a startup guard that compares `AI_CONSENT_VERSION` against a required minimum version when the flag is on, and refuse to start (or at least log a critical error and force the flag off) if the version is insufficient. Alternatively, tie the gated set to a code constant that can only be changed with a consent-version bump in the same commit.

2. **House-rule violation: file exceeds 300 lines.**  
   `backend/tests/api/messagingRelationshipLane.test.mjs` is **343 lines**. The binding rule is `<=300 lines/file` with no exception for tests.  
   **Fix:** Split the test file (e.g., separate the `resolveMessagingCapabilities` describe block into its own file).

---

## FINDINGS (should fix, not blocking)

### Correctness

- **TOCTOU race in relationship lane.**  
  `requireMessagingAccess` loads counterparties first, then conversation members. If an assignment is revoked between those two queries, a client could still access a conversation with a now-unassigned trainer. The window is small but real.  
  **Mitigation:** Re-query the assignment after the membership check, or wrap both in a serializable transaction. At minimum, document the accepted risk.

- **Stale messaging capabilities on the frontend.**  
  `useMessagingCapabilities` fetches once on mount and never refreshes on assignment changes. A newly assigned client will see the upsell until they manually refresh or remount. The server enforces access, so no security bypass, but the UX is misleading.  
  **Mitigation:** Expose a refresh trigger on assignment change events, or poll lightly.

- **Focus-trap visibility fallback in jsdom only.**  
  `useFocusTrap` uses `hasLayout` to decide whether to apply `offsetParent` filtering. In a real browser this works; in jsdom it degrades to attribute-only, which could include `display:none` elements. The tests pass because they don’t use `display:none`. Not a production bug, but the trap’s test coverage is incomplete for hidden elements.  
  **Mitigation:** Add a test with a `display:none` button inside the trap to ensure it’s skipped even in the attribute-only path (the attribute check already skips `hidden` and `aria-hidden`, but not `display:none`).

### Security

- **No re-consent enforcement.**  
  The diff introduces `AI_CONSENT_VERSION = '2.0'` and a re-consent prompt, but no backend or frontend logic forces users who consented under v1.0 to re-consent. They will continue using Swan Coach under the old consent until they visit the settings screen. This is a compliance gap.  
  **Mitigation:** Add a version check on the consent status endpoint; if the stored version < current, require re-consent before allowing further AI processing.

- **Scope misconfiguration could weaken authorization.**  
  The middleware’s `scope` parameter is trusted from the route definition. If a future route mistakenly uses `scope: 'list'` for a conversation-specific endpoint, the membership check would be skipped. No such bug exists now, but the design invites drift.  
  **Mitigation:** Consider deriving the scope from the route pattern or adding an explicit allowlist in the middleware.

### Data-truth / schema-drift

- **Sequelize model drift acknowledged but not fixed.**  
  The comment in `requireMessagingAccess.mjs` notes that the `ConversationParticipants` model is drifted and unused at runtime. All queries use raw SQL with correct snake_case. This is not a bug in this diff, but the drifted model remains a trap for future developers.  
  **Mitigation:** Add a ticket to either fix or remove the drifted model.

- **Frontend response shape is strictly validated.**  
  `useMessagingCapabilities` does `=== true` checks, so any truthy non-boolean (e.g., `"yes"`, `1`) is denied. This is correct and prevents drift.

---

## WHAT I TRIED AND COULD NOT BREAK

- **Authorization bypass via string/number mismatch:** `toId` coerces both `req.user.id` (string) and DB results (number) to safe integers. All comparisons use numbers.  
- **Membership check bypass:** The dry-loop fix ensures the actor is a member; I could not construct a request where a non-member accesses a conversation.  
- **Community lane escalation:** Elite/trial users bypass the relationship lane entirely; free users cannot reach community DMs even if they have an assignment.  
- **SQL injection:** All queries use parameterized `replacements`; route params are validated as integers.  
- **PII leak in logs:** The gated-health-field logger logs only the field path, never the value.  
- **Staff bypass:** Trainers and admins skip all checks, matching existing behavior.  
- **Kill switch:** `TIER_GATING_ENABLED=false` still opens everything, and the middleware respects it.  
- **De-identification still strips direct identifiers:** The new gate does not interfere with the existing denylist; medications, surgeries, etc., remain stripped.

---

## CONFIDENCE + WHAT WOULD CHANGE MY MIND

**Confidence: HIGH** that the diff is functionally correct and the authorization model is sound.  
**What would change my mind to APPROVE:**  
- A binding operational control that prevents `COACH_HEALTH_FIELDS_ENABLED` from being set to `true` without a corresponding consent-version bump (e.g., a startup assertion that crashes the process if the version is stale).  
- The test file split to meet the 300-line rule.  

Without those, the consent-drift risk and the house-rule violation make this a **REVISE**.
