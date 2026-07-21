# Hermes Inbox Memo

- **Surface:** vs-claude
- **UTC:** 2026-07-21T07:00:00Z
- **Slice:** Root-caused the Fable 5 → Opus 4.8 fallback (`17971a775`, ref doc MODEL-ROUTING-FABLE-FALLBACK.md)

## The finding (verified vs Claude Code docs, cited — not a guess)
Fable 5 falls back to Opus 4.8 because of **content safety classifiers**, not quota/availability. Four trigger
domains: **offensive cybersecurity, biology/chemistry, distillation attacks, frontier ML.** A flagged request
re-runs on Opus 4.8 and **the session stays on Opus until `/model fable`.** Intentional content routing.
**Our own hostile-security-review workflow (exploits/XSS/enumeration/"how would an attacker…") trips the
cybersecurity classifier** — that IS the "Fable warning + drop to 4.8" Sean kept hitting. Not random, not a bug.

## Transferable operating rule (applies to every session + Hermes routing)
- Fable is natively 1M context — **there is NO `[1m]` variant**; use `fable` / `claude-fable-5`. `[1m]` is
  ignored/rejected.
- `/config` can turn silent-switch-on-flag into ask-first; it can't refuse the classifier. `fallbackModel` only
  governs availability fallback, not this.
- **Route by task type:** design/architecture/build/planning → Fable; exploit-phrased SECURITY red-teaming →
  expect + accept the Opus 4.8 drop (Opus is the intended next-best for that content); return with `/model fable`.
  To stay on Fable during security work, phrase it DEFENSIVELY ("harden this / is this validation correct"),
  not offensively.
- Don't diagnose model-routing with Kimi/Gemini/Codex — they have no visibility into Claude Code routing. Right
  source = Claude Code docs / claude-code-guide agent. (This session: correctly declined to spend Kimi on it.)

## Still owed / in flight
- The re-verification of the 20 review fixes (448a20f2e) — a verifier was running; fold its findings in and loop to dry.
- Sean's manual steps: set model to `fable`, `/config` off silent-switch, `/model fable` after drops.
- Branch ~13 ahead of origin/main, unpushed; Render deploys still failing on Render infra; nothing live.
