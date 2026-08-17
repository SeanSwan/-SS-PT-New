# Codex (GPT-5.5) Consult — 2026-08-17T01:00:17.273Z

**Model:** openai/gpt-5.5
**Tokens:** in=29533 out=5443
**Elapsed:** 76.1s

---
FINDING [HIGH]: Account-switch mask misses live speech interim, so prior account words can render under the next account  
Evidence: `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:513-525`; `frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.tsx:369-371`, `406`; `frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.tsx:160-170`; `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSpeech.ts:316-324`  
Why: [VERIFIED] The ownership mask only masks the session values returned by `useFreestyleSession` (`state`, `fragments`, counters, etc.) at `useFreestyleSession.ts:513-525`. [VERIFIED] The overlay’s displayed phrase is not derived only from those masked values: it prefers `speech.interim` at `CoachFreestyleOverlay.tsx:369-371` and renders it at `406`. [VERIFIED] `speech.interim` is cleared only when `speech.stop()` runs, and the overlay calls that from a passive follow effect when masked `state` is no longer `listening` at `160-170`; `speech.stop()` clears interim at `useFreestyleSpeech.ts:316-324`. [LIKELY] Therefore, in the account-switch render/effect gap the UI can show trainer A’s live interim phrase under trainer B even though the session fragments/counters are masked. This is the same class as the Round-8 cross-tenant render-frame fix, but outside the fixed hook.  
Concrete reproduction steps:  
1. Mount `CoachFreestyleOverlay` open with `accountKey="A"` and a fake `SpeechRecognition`.  
2. Start/listen and fire a non-final result such as `"Jane Doe shoulder pain"` so `speech.interim` is populated.  
3. Rerender the same mounted overlay with `accountKey="B"`.  
4. Before the passive effect at `CoachFreestyleOverlay.tsx:160-170` runs, the session view is masked idle/empty, but `LivePhrase` can still render the tail of A’s interim phrase from `speech.interim`.  
Fix: Do not render `speech.interim` unless the masked session is actively owned/listening, e.g. gate `latestPhrase` on `isListening`, or key/clear the speech hook synchronously on account change. A stronger fix is to make the ownership boundary cover both the session buffer and the speech transport’s interim display state.

FINDING [MEDIUM]: Account-switch mismatch window still returns destructive methods; `reset('completed')` can purge the previous owner with the wrong receipt  
Evidence: `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:513-535`; `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:236-245`, `436-445`, `454-463`; `frontend/src/components/DashBoard/Pages/coach-assistant/CoachFreestyleOverlay.tsx:268-271`, `484-487`  
Why: [VERIFIED] The hook masks returned data during owner mismatch at `useFreestyleSession.ts:513-525`, but it still returns the original mutators, including `reset`, at `526-535`. [VERIFIED] `reset` blindly calls `clearBuffer(reason)` with the caller-supplied reason at `436-445`; `clearBuffer` receipts that reason when data exists at `236-245`. [VERIFIED] The real account-switch/logout purge receipt is only emitted later by the passive effect at `454-463`. [LIKELY] In the mismatch frame, the overlay sees masked `fragments.length === 0` and `!isStopped`, so it renders Cancel at `CoachFreestyleOverlay.tsx:484-487`; Cancel calls `handleClose`, which calls `reset('completed')` at `268-271`. That lets the new-account surface purge the old-account buffer and log it as `completed` instead of `account-switch`/`logout`. Content is not displayed, but the retention audit is corrupted and the wrong owner can trigger destruction.  
Concrete reproduction steps:  
1. Under account A, start a freestyle session and append at least one fragment.  
2. Switch `accountKey` to B while the component remains mounted.  
3. In the pre-passive-effect mismatch window, invoke the returned `reset('completed')` or click the now-rendered Cancel affordance.  
4. Observe `onPurge('completed')`; the later account-switch effect has no data left and cannot emit the proper `account-switch`/`logout` receipt.  
Fix: During `ownerRef.current !== ownerKeyRef.current`, return no-op mutators or make every mutator enforce ownership, not just `stop()` and `appendFragment()`. Keep the internal account-switch effect as the sole path that purges mismatched-owner data so the receipt reason cannot be forged.

[VERIFIED] The synchronous TTL handoff fix itself is present: `stop()` calls `purgeExpired()` before building a snapshot at `useFreestyleSession.ts:316-322`, and `purgeExpired()` clears with reason `'ttl'` at `304-314`.

Explicit count: 2 findings.
