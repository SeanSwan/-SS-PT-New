---
title: Panel triage — Kimi K3 / HY3 / Sol reviews, verified against current source
date: 2026-08-16
author: Claude Fable 5 (vs-claude)
decision: paid panel reviews triaged; valid findings folded into dry-loop round 1
status: shipped
supersedes: none
---

# Triage of the three previously-unread paid panel reviews

The Kimi ($0.21), HY3 ($0.006) and Sol (~$0.53) reviews were commissioned against the
**pre-S2c packet** and captured without triage. This document settles that debt. Every
finding below was verified against the CURRENT working tree (commit `9913d30ac` + docs),
not against the packet they reviewed. Verification: direct file reads of
`CoachFreestyleOverlay.tsx`, `useFreestyleSession.ts`, `useFreestyleSpeech.ts`,
`useCoachCapture.ts:150-274`, `CoachFreestyleOverlay.styles.ts` (grep for `color-mix`).

## Verdict summary

| Reviewer | Findings | Still valid | Already fixed (stale) | Wrong |
|---|---|---|---|---|
| Kimi K3 | 10 major + attack list | 6 | 3 | 1 partial |
| HY3 | 6 | 2 | 3 | 1 (palette prescription conflicts w/ ratified danger tokens) |
| Sol | ~30 across sections | ~10 | ~12 (pre-S2c aim) | rest = S3/S4-scoped, deferred not wrong |

**The panel was worth reading.** Three findings nobody else produced survived into the
round-1 fix list (atMs pause-skew, color-mix no-fallback, SR live-region spam), and
Kimi's auto-restart-after-purge finding — although fixed independently in S2c — was
found BEFORE S2c fixed it, i.e. it was a real catch at review time.

## STALE — already fixed in current source (do not re-fix)

| Finding | Who | Fixed where |
|---|---|---|
| Overlay never opens the microphone | HY3 #1, Sol b1 | S2c wired `useFreestyleSpeech` (`CoachFreestyleOverlay.tsx:80`, engine-follows-session effect `:121-126`) |
| Auto-restart after TTL/account purge re-arms mic | Kimi S1, Sol b8 | `autoStartedRef` once-per-open (`CoachFreestyleOverlay.tsx:96-103`) |
| `onStopped` passes the live mutable array | Kimi | Frozen snapshot (`:131-135`) — ownerless-ness still open as GLM S2 |
| Full transcript on screen (LivePhrase) | Kimi, Sol c8 | Tail-3-words only (`:178-181`) — residual: 3 words can still be a name (open, LOW) |
| Purge receipts mislabeled on close | Kimi | `reset(reason)` + `'completed'` reason exist (`useFreestyleSession.ts:238-246`) |
| `reset()` clears the stop latch (mic after reset) | Sol b2 | `reset` now preserves `stopRequestedRef` (`useCoachCapture.ts:222-235`) |
| `start()` capture flag not set synchronously | Sol b3 | Set sync + rollback on throw (`useCoachCapture.ts:193-214`) |
| Raw audio blob → Gemini in the freestyle path | Sol c1/f | Freestyle no longer uses the RECORD pipeline; the RECORD path itself remains and the audio decision is Sean's open §5 call |

## VALID and folded into dry-loop round 1

| # | Finding | Who | Evidence (current) |
|---|---|---|---|
| P1 | `start()` is an unguarded wipe — callable from `stopped`/`listening`, no purge receipt | Kimi, Sol b5, Codex R1 | `useFreestyleSession.ts:162-174` |
| P2 | `discard()` does not enforce its own two-step (armed check lives only in UI) | Sol b6 | `useFreestyleSession.ts:213-223` |
| P3 | `atMs` includes paused wall-time; `elapsedMs` excludes it — fragment timeline skew feeds S4 ordering | Kimi, Sol d4 | `useFreestyleSession.ts:235` vs `:287-292` |
| P4 | `color-mix()` has no plain fallback declaration; whole declaration invalid on iOS <16.2; no `-webkit-backdrop-filter` | Kimi | `CoachFreestyleOverlay.styles.ts:39,60,102-103,171-194,222-223` |
| P5 | Closed overlay stays in the a11y tree as an `aria-modal` dialog (opacity-hide only) | Kimi, Sol c7, Codex R1 | `CoachFreestyleOverlay.tsx:184`, styles `:41-42` |
| P6 | `quietFor` ticks every second inside `aria-live="polite"` — SR announces the counter forever | Kimi | `CoachFreestyleOverlay.tsx:215-217` |
| P7 | Discard arm never times out | Kimi | `useFreestyleSession.ts:210-211` |
| P8 | Empty-buffer / duplicate purge receipts (unmount after reset; StrictMode replay) | Sol c9, Codex R1 | `useFreestyleSession.ts:151-160,279-280` |
| P9 | `ttlMs` unvalidated (can exceed 24h ceiling, `Infinity`, negative); boundary uses `>` | Sol b10 | `useFreestyleSession.ts:119,268` |
| P10 | `accountKey` `"42"` vs `42` are distinct owners; null semantics undefined | Sol d1 | `useFreestyleSession.ts:75` |
| P11 | `audioBlob` retained in memory after auto-stop with "Nothing was saved" copy | Kimi, Codex R1 | `useCoachCapture.ts:249,262-267` |

## DEFERRED — correct but scoped to S3/S4/S7 (recorded, not round-1 work)

- Sol: `onStopped` snapshot needs tenant/session binding + schema version (extends GLM S2; fix lands with S3 store design)
- Sol: fragment IDs reset per session — documented non-DB key; S3 must mint its own keys
- Sol: prompt-injection posture for dictated text — S4 blueprint already carries the
  schema-constrained/no-prose-passthrough design; keep as an S4 gate check
- Sol: 10-minute cap / memory bounds — product call, fold into S3/S4 grill
- Kimi/Sol: wake lock, haptics, route-change pause, level meter — enhancement backlog
- HY3/Kimi: 320px thumb-arc / sticky full-width Done — fold into the S4-era design pass

## WRONG or conflicting — rejected with reasons

- **HY3 #2 prescription** (danger buttons should be Wing Purple with Ice Wing glow):
  rejected. A destructive action styled identically to the primary/glow language removes
  the danger affordance; the ratified `--danger-soft-text` tokens pass contrast
  (7.98–9.13:1). The five conflicting `--danger-text` fallbacks repo-wide remain a real
  token-drift issue (already flagged for Linear).
- **Sol b4 sentence** "onStopped receives the previous render's fragment array" — the
  snapshot is frozen copies at call time; the real defect is the *interim* phrase loss
  (Codex R1 MEDIUM), not a stale-render array.

## External-model calibration addendum

- **Kimi K3**: best single catch of the batch (auto-restart-after-purge) plus two
  uniques that survived (atMs skew, SR spam, color-mix). High hit-rate on real code.
- **HY3**: cheap and fast; headline finding was stale within hours (reviewed a
  snapshot); its palette prescription contradicted ratified tokens. Value ≈ its price.
- **Sol**: deepest contract/tenancy thinking (owner-binding, receipts, TTL validation)
  — most of its S2-level line findings were stale by the time of triage, but its
  S3/S4 boundary requirements are the best input the S3 design has. Expensive but
  earned it.
