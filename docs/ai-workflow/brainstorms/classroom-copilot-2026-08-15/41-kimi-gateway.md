# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/40-PACKET-R3-GATEWAY.md
**Seed:** (none)
**Tokens:** 1847 in / 9147 out | **Cost:** ~$0.1427 | **Wall:** 135.0s | **finish_reason:** stop

---

## VERDICT

The app must be a network principal with no route to the internet and no access to provider credentials: the only enforcement that survives an untrusted app is an OS-level egress boundary plus keys held solely by the gateway process. Detector quality is secondary — if the boundary is a convention, no classifier matters; if the boundary is enforced, a classifier's errors degrade utility, not secrecy. The smallest safe version is therefore "allow only provable-generic requests behind a real egress firewall," and everything else is optional depth.

## ARCHITECTURE

**Process model.** Gateway runs as a separate process under a dedicated UID. The assistant app runs under a different UID — ideally inside a container/netns. Preferred concrete shape on Linux: Docker Compose where the app's network is `internal: true` (no route off-box at all), and the gateway container is attached to both the internal network and an egress network. There is no IP path from app to provider, full stop.

**Egress enforcement point.** OS packet filter keyed by principal, not by convention. Linux: netns isolation as above, or fallback `iptables -m owner --uid-owner` / nftables rules where only the gateway UID may open outbound 443. macOS: PF anchor or `sandbox-exec` profile. Windows: WFP filter. Gateway itself additionally enforces a static egress allowlist of provider endpoints with pinned DNS resolution (defeats rebinding) — the app cannot name a destination.

**Credential custody.** Provider API keys live only in the gateway, unlocked from an OS keystore (Secret Service / Keychain / DPAPI) or a 0400-permission file readable only by the gateway UID. The app's SDK points at `http://127.0.0.1:<port>` with a dummy token. Even if the app escapes the network sandbox, it holds no usable credential.

**Bypass analysis.** A fully compromised app lacks (a) any route off its network namespace and (b) any provider credential; residual risk reduces to "the gateway forwarded it," which is the decision pipeline's burden. Explicitly not covered: the human user pasting into a vendor's web UI in a browser (see DISSENT).

## DECISION PIPELINE

1. **Provenance gate (µs):** is this a fixed generic prompt template, or does it carry user-attached context? Zero-attachment requests fast-path; anything with context deepens scrutiny. Contribution: cheap kill of the happy path.
2. **Class policy gate (µs):** source-tag driven. Minors' records, health, legal, credentials → block by class regardless of detector output.
3. **Deterministic detector (µs):** credentials (key formats, JWT, PEM headers), IDs with checksums, contact formats. Genuinely near-zero false negatives for credentials; worthless on free text.
4. **Roster detector (ms):** encrypted local watchlist — names, nicknames, possessive forms, school name, addresses — with Unicode normalization, confusable mapping, and fuzzy matching. This is the precision layer generic NER lacks.
5. **Local model classifier (50–500 ms):** **deny-only.** It may veto; it may never override a deterministic/roster hit. That is the answer to the recursion problem: the inference step never carries allow authority; it adds a further reason to refuse.
6. **Pseudonymizer:** reached only if all prior stages are clean and the class admits reversible substitution.

**Uncertainty rule:** uncertain → block. Deterministic or roster hit → block. Model "maybe" → block-by-class or route to the human preview. Allow requires *all* layers clean and the class permitted. Ordering matters except where noted; latency target <1 s end-to-end.

## PSEUDONYMS

**Verdict:** worth it, strictly limited to roster entities, with **per-session rotating tokens** held inside the gateway (in-memory or an encrypted per-session vault). Persistent tokens across sessions let a vendor accumulate a stable pseudonymous social graph; rotation caps that to within-session linkage. Failure modes, honestly enumerated: (1) within a session the graph still leaks (mother–child–school linkage can be assembled); (2) rehydration collisions on substring overlaps (a short roster name that is a substring of a longer one — the original illustrative pair is redacted: it was model-invented, but one half matched the forbidden-name gate by coincidence); (3) token leak into any log that captures payloads; (4) semantic re-identifiers are not pseudonymizable at all — any class carrying them must be blocked outright. Utility ceiling: pseudonyms rescue *identifier* hygiene for a small set of allowed classes, nothing more.

## PROVING IT WORKS

**Corpus.** Versioned, labeled adversarial corpus per sensitivity class plus a large genuine-negative set. Includes possessive nicknames, initials-in-context, base64- and hex-wrapped secrets, homoglyph/Unicode obfuscation, and semantic re-identifier exemplars ("mum in hospital"). Grown by every red-team finding.

**Canary tokens.** Synthetic unique identifiers planted in the local corpus (fake child names, fake SSNs, marker substrings embedded in documents). Pre-egress invariant: *no canary value may ever appear outbound*; any hit is a hard fail that pages the operator. This converts "did we leak?" into a measurable, safe-to-test question.

**Metric.** Per-class **false-negative rate** on the corpus and canaries (precision matters less for a blocker). Targets: zero FN for minors' classes and credentials; bounded FN elsewhere. Exposure of the FN per class is the number that tells the operator six months on that the control still works.

**Regression gate.** CI runs the full corpus on every detector/model change; no merge without pass. Shadow classifier runs on sampled production traffic (with consent) to detect drift.

**Red team.** Quarterly scheduled exercise plus a continuous fuzz harness: encoding smuggling, secrets split across requests, prompt-injection persona attacks, dependency/supply-chain review of the app.

**Ongoing assurance.** Composite dashboard: (a) **coverage ratio** — provider egress events observed at the gateway vs. the vendor's usage records must equal 100%; (b) canary tests green; (c) corpus FN within budget; (d) a **boundary watchdog** that continuously re-verifies the netns/firewall rule and screams if it was altered or removed. Coverage + watchdog are what make this not theatre.

## HUMAN IN THE LOOP

Review happens on the **exception path only** — when the pipeline blocks or is uncertain. Never on the happy path. The preview renders only flagged spans with a few lines of context, labelled by class and rule ID, plus a count; never a wall of text. Friction budget: if prompts exceed ~1 per session on average, that is a tuning bug the dashboard reports, not a user-training opportunity. Fatigue mitigation: default block; one-click **"strip attachment and send generic version"**; "send anyway" requires hold-to-confirm or typing the implicated entity name — never a reusable approve-all affordance.

## AUDIT & KILL SWITCH

Log **decisions and metadata, never payloads**: timestamp, decision, class, rule IDs, payload hash (dedup), span offsets. The log-as-sensitive-store trap is solved by never storing body content in the primary log. If content is genuinely needed for review, route blobs to a separate encrypted vault with a short TTL (30–90 days) and audited explicit unlock. Kill switch: per-provider and global. Failure behaviour: because the app has no egress path and no credentials outside the gateway, gateway-down ⇒ fail closed **by construction**, not by policy; local-only functionality continues.

## SLICES

- **S1 — Boundary:** netns/uid firewall, gateway with provider allowlist, credential custody, provable-generic requests only. Retires catastrophic exfiltration. **This is the smallest safe to turn on, and it is honest to say so.**
- **S2 — Verification scaffolding + deterministic detector:** credentials/ID detection, canary harness, decision-only logging. Retires credential leaks; builds the proof machinery early.
- **S3 — Roster detector + blocked-class policy.** Retires known-entity leaks; enforces the minors' block class.
- **S4 — Pseudonymization + exception preview UX.** Adds utility without weakening gates.
- **S5 — Deny-only local classifier + full corpus CI.** Robustness against unknown free text.
- **S6 — Assurance program:** red-team cadence, coverage-ratio and watchdog dashboard. Converts one-time design into six-month assurance.

## HOW THIS LEAKS ANYWAY

1. **Class evasion via copy-paste.** The provenance gate trusts where content came from. A user (or a prompt-injected app) pastes a sensitive fragment into an apparently generic request — "the mum in hospital" embedded in an otherwise clean writing task. No name, no roster hit, deny-only classifier stays quiet; it ships. The pipeline's cleanest evasion path is provenance lying about content.
2. **Within-session linkability.** Once pseudonymized content is admitted, the vendor can reconstruct a social graph *within* the session and, over time, correlate across sessions using timing, token counts, prompt shapes, and request cadence — none of which the gateway suppresses. Token rotation caps but does not close the small-community re-identification channel; a vendor with months of metadata can still cluster CHILD-a91f streams into one child.
3. **Boundary drift.** The enforcement depends on developer-grade netns/UID configuration on a preschool teacher's laptop. An OS update, a Docker reconfigure, a second shim process, or — worst — a deployment where app and gateway run under the same UID silently voids the uid-owner rule, and every detector still reports green because the leak bypasses the gateway entirely. The watchdog exists precisely because this, not a clever classifier miss, is the most probable production failure.

## DISSENT

**The browser channel voids the claim.** The packet declares the gateway "the single component every outbound request passes through," but the humans can and will open ChatGPT or Claude in a browser. That channel is outside every metric proposed above and cannot be verified; the honest title is "assistant egress guard," not "privacy boundary." Treating the control as total is a false proof.

**Pseudonymization is illegitimate for minors' content, full stop.** The packet labels minor content highest-sensitivity yet still frames pseudonyms as a usable route. Anonymized-tokens development notes about toddlers remain special-category data and very likely remain re-identifiable in a 10–14-child cohort; the lawful and safe posture is **block by class, never substitute**, and S3/S4 must not open a pseudonym route for those classes. Verification also only bounds what the corpus knows: semantic re-identifiers cannot be comprehensively enumerated, so a green FN rate is always measured against known edges — report it as such rather than as proof of safety.
