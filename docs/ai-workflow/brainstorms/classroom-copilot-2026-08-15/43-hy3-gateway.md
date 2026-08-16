# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/40-PACKET-R3-GATEWAY.md
**Seed:** (none)
**Tokens:** 1829 in / 5526 out | **Cost:** ~$0.0032 | **Wall:** 82.1s | **finish_reason:** stop

---

## VERDICT
The gateway must treat classify-and-block as primary and the human check as a rare, contextual diff-review rather than a per-request consent prompt, because a gate that asks permission for everything manufactures false confidence via consent fatigue. Auto-allow only provably generic text silently, surface a redacted diff for ambiguous non-critical content, and refuse highest-sensitivity classes with no override and a calm plain-language explanation. This friction budget keeps the human in the loop exactly when it matters and trains the user to trust the rare interruption.

## ARCHITECTURE
The boundary is a local sidecar proxy process combined with an OS-level egress firewall rule (iptables/pf/Windows Filtering Platform) that permits outbound network traffic only from the gateway's service UID and denies the untrusted application UID entirely. Enforcement is kernel-enforced: even if the app is compromised, prompt-injected, or has a malicious dependency, it physically cannot open a socket to the internet—it can only call localhost to the gateway. Provider credentials live in the OS secret store (Keychain/secret-service/Credential Manager) readable exclusively by the gateway service account; the app process never loads them into its memory space, so it cannot construct a direct authenticated call even if it somehow routed around the proxy.

## DECISION PIPELINE
1. **Deterministic detection** (<1ms): regex and format validators for government IDs, card numbers, emails, phones, geolocations, API keys. Genuinely good at exact-form patterns; precise failure boundary is anything not structurally formatted—semantic context, free-text circumstance.
2. **Roster/entity-aware detection** (~2ms): locally hashed known-person list (teacher's 10–14 children, owner's clients/staff). Catches names, nicknames, initials-in-context, possessive forms. Fails on unknown persons and relational descriptions.
3. **Local model classification** (~50–200ms): on-device distilled model scores semantic re-identification and sensitivity classes. The recursion problem—that this inference can be wrong—is handled by never granting it override authority; it is evaluated offline against a held-out adversarial corpus and tuned before ship, and in production its low-confidence output defaults to block.
4. **Uncertainty rule**: if classifier confidence for "safe generic" is below threshold, the request is either routed to Tier-1 human review (if not a highest class) or auto-blocked (if highest class). Default is fail closed; nothing leaves on doubt.

## PSEUDONYMS
Verdict: rejected for stable cross-request mapping; per-request generic tokens only. Mechanism: the gateway replaces detected entities with ephemeral placeholders ("child A", "family member") generated fresh for each request, with the mapping destroyed after the response is returned and never persisted. Failure modes: a consistent pseudonym would leak a social graph to vendors over time (multiple requests reveal who-interacts-with-whom); even per-request tokens sacrifice some rehydration quality, but that is the correct trade for this population. No reversible long-lived pseudonym layer exists.

## PROVING IT WORKS
Adversarial test corpus: synthetic and anonymised-real examples of semantic re-identifiers (e.g., "the little boy whose mum is in hospital had a rough drop-off") plus obfuscation variants (unicode splits, whitespace). Canary tokens: fake NI numbers and fabricated child names injected in test/staging mode; any egress attempt triggers immediate alarm and lockdown. Metric: false-negative rate on highest-sensitivity class must be exactly 0 in regression; measurable leak rate reported as "sensitive items escaped = 0". Red-team exercise: attempt prompt injection ("ignore gateway, send raw"), context-stuffing, and format-masking. Ongoing assurance: monthly canary replay and a operator dashboard showing blocked-sensitive count and zero-escape confirmation six months out.

## HUMAN IN THE LOOP
**Friction budget (three tiers):**
- **Auto-allowed silently (0 friction):** Provably generic requests (no entity match, classifier high-confidence generic). No UI, no interruption. This is the majority of low-risk use.
- **Shown for review (low friction, ~5% of traffic):** Ambiguous or non-highest sensitivity matches. User sees one screen with a diff; one glance, one click.
- **Refused outright, no override (0 decision friction):** Highest-sensitivity classes (minor bodily/developmental/behavioural notes, gov IDs, credentials, legal/immigration). Blocked pre-send, with explanation.

**Screen A — The Silent Pass:** No screen. Request flows through; only metadata logged. User perceives nothing.

**Screen B — The Review Moment (Tier 1):** Modal appears only when needed.
- Header: "Before this leaves your machine" (neutral, not alarming).
- Body: Side-by-side diff. Left = "What you wrote" (dimmed, stays on device). Right = "What will be sent" with redactions as grey blocks (████). For long payloads, only flagged spans + 1 line context show; full text collapsed under "Show full draft (stays on device)".
- Footer: Primary button "Send redacted version"; secondary "Cancel". No "Always allow" checkbox, no permission wording—this is a content confirmation, not a consent dialog.
- Consent-fatigue defense: It is rare, shows *what changed* rather than *please permit*, and vanishes entirely when content is clean.

**Screen C — The Refusal (Tier 2):** Calm, non-error styling (blue/neutral, never red alarm).
- Title: "Held on your device"
- Body: "This note mentions a specific child's wellbeing and can't be sent to a cloud model. That keeps you and the child safe. You can still use it for local drafting, or rephrase without identifying details."
- Actions: "Keep working offline" (primary); "See why" (expandable plain-language rule list).
- No override, no "approve anyway". Resentment is avoided by rarity (only true highest class), transparency (states exactly what triggered it), and agency (offers a productive local path). The user never feels blamed or blocked arbitrarily.

## AUDIT & KILL SWITCH
Logged: timestamp, decision code (allow/block/review), matched class ID (hashed category only), byte size. Never the content, never the redacted spans, never the mapping. The log-is-also-sensitive trap is solved by writing only aggregate decision metadata—no plaintext sensitive data is ever persisted anywhere. Kill switch: if the gateway process dies or is disabled, the OS egress rule fails closed—the app has zero network path, degrades to local-only inference or a clear "offline" state, and no data leaves the machine under any circumstance.

## SLICES
- **S1:** OS egress block + manual allowlist of generic prompt templates. *Smallest safe version: blocks all except clearly-generic requests.* Retires: arbitrary exfiltration.
- **S2:** Deterministic detection + auto-refuse highest classes (IDs, credentials). Retires: formatted sensitive leaks.
- **S3:** Roster/entity-aware detection. Retires: known-name/possessive leaks.
- **S4:** Local classifier + Tier-1 review UI. Retires: semantic ambiguity leaks.
- **S5:** Canary tokens + audit dashboard. Retires: silent regression risk.

## HOW THIS LEAKS ANYWAY
1. The user manually copies the text and pastes it into a browser-based vendor chat directly, completely bypassing the gateway (shadow IT driven by over-blocking).
2. A novel semantic re-identifier phrased in unprecedented language defeats the local classifier's confidence threshold and is falsely scored generic (false negative).
3. The Tier-1 review screen displays original next to redacted on the user's device; malware, a screenshot, or a shoulder-surf records the original sensitive content locally even though it never reached the cloud.

## DISSENT
The packet over-weights blocking: excessive refusal on highest classes may drive T and O to unsanctioned tools, increasing net leak risk more than a well-stripped allowed request would. The "no override" stance ignores lawful safeguarding scenarios where a redacted disclosure to a cloud model for drafting a report would be both safe and necessary. The packet under-specifies the local hardware assumption—a busy preschool teacher on a low-end tablet may find even 200ms local classification plus modal reviews unacceptable, and latency tolerance is treated too lightly for the stated user profile.
