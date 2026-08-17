# GLM Consult

**Model:** glm-5.3
**Document:** .ai-workflow/review-round9-packet.md
**Tokens:** 30015 in / 16542 out (reasoning: 15449) | total 46557
**Wall:** 298.3s

---

# HOSTILE REVIEW ROUND 9 — Swan Coach freestyle capture layer

Both round-8 fixes attacked hard, full re-sweep performed. One finding survives. The ownership mask's render-assigned `ownerKeyRef` semantics were attacked specifically (see clearance notes) — the break is elsewhere, and it's in the mask's own claimed territory.

---

**FINDING [HIGH]: The ownership mask does not cover the LivePhrase — `speech.interim` still renders trainer A's in-flight words in the cross-tenant frame / Evidence: CoachFreestyleOverlay.tsx:369–371 (`latestPhrase = speech.interim ? tailWords(speech.interim) : …`) rendered at :406; useFreestyleSession.ts:208, :513–525 (mask applied only to session-derived return values); CoachFreestyleOverlay.tsx:160–170 (engine stop is a *post-commit* effect); useFreestyleSpeech.ts:316–325 (interim cleared only inside `speech.stop()`)** / Why: The mask's stated guarantee — "during the one-commit ownership mismatch window the surface sees an empty session, never the previous account's words" (:513–515) — is enforced only on values the *session hook* returns. But `latestPhrase`'s **primary** source is `speech.interim`, a different hook the mask never touches. Sequence on a shared tablet, trainer A mid-speech when `accountKey` flips to B: render with B commits → session values mask to idle/zeroed, but `speech.interim` still holds A's pending phrase (nothing clears it — `setInterimBoth('')` runs only inside `speechStop()`, and the follow effect that calls it, plus the purge effect itself, are passive effects that flush **after paint** — the exact paintability the mask's own NOT COVERED BY TESTS note asserts). The painted frame therefore shows zeroed counters under B's account with A's last three spoken words — client names, the packet's most sensitive data class — still on screen in `LivePhrase`. This is the same leak class as Codex R8 ("the overlay rendered A's latest phrase under B's session") surviving the fix through the unmasked path of the very element named in that finding; `tailWords` slicing does not save it, since interim text is the live tail by construction. Under main-thread contention the passive flush can lag paint by hundreds of ms, and the recogniser is still live and still updating that interim across the window. / Fix: Expose the mask from the hook (e.g., return `isOwner: owned` alongside the masked view) and gate every speech-derived display on it in the overlay: `const latestPhrase = session.isOwner ? (speech.interim ? tailWords(speech.interim) : …) : '';`. The session-side refusal guards (`stop`/`appendFragment`) are correct and unchanged; the fix is closing the display path, not re-architecting the mask.

---

## Attacked and cleared (for the record)

- **Render-assigned `ownerKeyRef` same-tick semantics (explicit remit target):** Pre-commit calls see a *stale-but-matching* A/A pair — consistent, correct handoff to A's still-committed surface. Post-commit calls see the intended A/B refusal. The one pathological case — an interrupted/discarded concurrent render leaving `ownerKeyRef.current` at B while `ownerRef.current` stays A — is the fenced concurrent-tearing class, and its failure mode is fail-closed (append refuses; words dropped, never mis-owned), and React retries interrupted updates, resolving the divergence at commit. No independent finding.
- **TTL-handoff guard:** Guard ordering in `stop()` (ownership before expiry) gives correct receipt precedence; `purgeExpired` is idempotent against the 1s sweep post-wipe (`startedAt` nulled); the `>=` boundary is deliberate and commented; hoist order introduces no TDZ; a second `stop()` in `stopped` purges a genuinely expired held buffer, which is contract-correct.
- **Unmasked mutators (`reset`/`discard`/`start`) during the window:** A mis-receipt path exists in theory (Escape → `reset('completed')` wiping A's buffer before the switch receipt), but React 18 flushes pending passive effects before discrete input handlers, so those events cannot land inside the window; non-discrete native events (`pagehide` → `pause`) mutate a buffer the purge effect then wipes anyway — nothing receiptable survives. Not reachable; not reported.
- **Re-sweep:** `useVoiceRecorder` (flight/latch interplay, late-grant, late-chunk detach, stray-stop) clean. `useCoachCapture` (mirror effect, late-arrival guard, in-flight transcribe, reset latch) clean — the guard at :164 is now unreachable defense-in-depth, which is the fenced dead-defensive class. `useFreestyleSpeech` (restart pacing, flush-before-clear, resultIndex dedupe) clean. Overlay focus/escape/tab-trap/live-region logic unchanged since prior rounds and clean. Styles unchanged, clean.

## Count: 1
