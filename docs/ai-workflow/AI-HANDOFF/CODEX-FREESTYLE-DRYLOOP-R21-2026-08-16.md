# Codex (GPT-5.5) Consult — 2026-08-17T19:14:09.401Z

**Model:** openai/gpt-5.5
**Tokens:** in=32421 out=6111
**Elapsed:** 98.4s

---
[VERIFIED] Round-20 fix #1 is present: `hasWords` includes visible interim text at `CoachFreestyleOverlay.tsx:351`, and Escape routes through `handleRequestDiscard()` when `hasWords` is true at `CoachFreestyleOverlay.tsx:363-365`.

[VERIFIED] Round-20 fix #2 is present: terminating `closeSession` calls `speech.abandon()` rather than `speech.stop()` at `CoachFreestyleOverlay.tsx:321-327`, and `abandon()` clears interim without promoting it through `onPhrase` at `useFreestyleSpeech.ts:348-352`. Deliberate stop paths still flush via `stop()` at `useFreestyleSpeech.ts:331-339`.

FINDING [MEDIUM]: Expired freestyle buffers can be armed and purged as “discard” instead of TTL / Evidence: `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:264-279`, `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:380-396`, `frontend/src/components/DashBoard/Pages/coach-assistant/hooks/useFreestyleSession.ts:412-418` / Why: [VERIFIED] The hook has a synchronous TTL purge helper, and expiry is defined as `>= effectiveTtlMs` at lines 264-279. [VERIFIED] `requestDiscard()` does not call `purgeExpired()` before arming discard and pausing the session at lines 380-396. [VERIFIED] If the user then confirms, `discard()` calls `clearBuffer('discard')` at line 417, so an already-expired buffer is receipted as user discard rather than TTL. [LIKELY] This violates the retention/audit contract because the buffer can survive past its ceiling long enough to be displayed in the discard confirmation and destroyed under the wrong receipt. Reproduction: render `useFreestyleSession({ accountKey: 'a', ttlMs: 500, now, onPurge })`; set `now=0`; call `start()` and `appendFragment('client name')`; set `now=500` or later before the 1s sweep fires; call `requestDiscard()`; observe `discardPending === true`, fragments still returned, and no `onPurge('ttl')`; call `discard()`; observe `onPurge('discard')` instead of `ttl`. / Fix: Call `purgeExpired()` at the start of `requestDiscard()` and return if it purged. Consider the same guard on other user-visible transition methods that can interact with an expired live buffer before the interval sweep runs.

Explicit count: 1 finding.
