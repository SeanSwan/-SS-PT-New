# Model Routing — why Fable 5 drops to Opus 4.8, and how to stay on the highest brain

> **TL;DR (root cause, verified against Claude Code docs 2026-07-21):** Fable 5 runs **content safety
> classifiers**. When a request touches one of four domains — **offensive cybersecurity, biology/chemistry,
> distillation attacks, frontier LLM development** — Claude Code silently re-runs it on **Opus 4.8 and keeps the
> session on Opus until you type `/model fable`.** It is *intentional content routing, NOT a quota, availability,
> or account-flag issue.* Our own **hostile-security-review workflow** (exploits, XSS, enumeration, "how would an
> attacker…") is exactly what trips the offensive-cybersecurity classifier and knocks us off Fable.

## The facts (cited)
- **No `[1m]` Fable variant exists.** Fable 5 is natively 1M context. `claude-fable-5[1m]` is ignored or rejected
  by `/model`. Use **`fable`** or `claude-fable-5`. (`[1m]` is only meaningful for `sonnet`/`opus`.)
- **`/config` → "Switch models when a message is flagged"**: turn OFF → a flagged request PAUSES and asks (run
  that one on Opus, or edit wording and stay on Fable) instead of silently switching. It does NOT stop the
  classifier from triggering — it only changes silent-switch → ask-first.
- **`fallbackModel` in settings.json** governs only **availability** fallback (model overloaded/down), NOT the
  content classifier. `"fallbackModel": []` will NOT prevent the security drop.
- There is **no documented way to fully refuse** the classifier — it is intentional and non-configurable.
- `/usage` and `/status` show account quota/limits (to rule out availability pressure).
- Opus 4.8 is the **documented next-best** and the designated fallback decider (CLAUDE.md Co-Orchestrator
  Hierarchy). The drop is a backup, not a cliff.
- Source: Claude Code Model Configuration docs (`code.claude.com/docs/en/model-config.md`) + Anthropic support
  "Why Claude switched models in Fable 5".

## Operating rule (keep max intelligence per model-call)
1. **Pin the model as `fable`** (not `claude-fable-5[1m]`). After any drop, run **`/model fable`** — it does not
   auto-return.
2. **`/config` → turn off silent switch-on-flag** so you always know when a drop is about to happen and can keep
   control.
3. **Route by task type:**
   - **Design / architecture / planning / build / review-of-logic → Fable.** This is the default.
   - **Hostile SECURITY red-teaming (exploit-phrased: "how would an attacker break this", XSS/enumeration/
     injection hunting) → expect the Opus drop, and that's FINE — Opus 4.8 is the intended model for that content
     and is the documented next-best.** Do the security pass deliberately, then `/model fable` for the build.
   - **To stay on Fable during a security task, frame it DEFENSIVELY** — "what is the safe pattern here",
     "harden this input", "is this validation correct" — rather than exploit-narrated. Same rigor, defensive voice.
4. **Don't waste spend diagnosing this with the wrong tool.** Kimi/Gemini/Codex have no visibility into Claude
   Code's model routing — the authoritative source is the Claude Code docs / the `claude-code-guide` agent.

## Session hygiene — keep the downgrade from spreading (Kimi review, 2026-07-21)
The classifier **holds the whole session** at the fallback until `/model fable`, so a mid-session security review
poisons every subsequent build call. Three rules:
1. **Quarantine hostile-review sessions from build sessions (highest leverage).** Run exploit-hunting / red-team
   passes in dedicated, *sacrificial* sessions; keep architecture/build sessions clean so they stay on Fable. Do
   not interleave a security audit into a build session and expect to keep the top brain.
2. **Reframe review prompts offense → defense.** "Audit this file for XSS/enumeration and produce fixes with
   tests" carries the same technical content as "how would an attacker break this" without the adversarial framing
   that trips the router. Keep the exploit-narrated version in the continuity doc as context, not the live prompt.
3. **Match brains to content class.** You're downgraded on security content anyway — so route the exploit-phrased
   hostile pass to a secondary model *on purpose* (or use triangle-fusion: three cross-review passes likely beat
   one downgraded Fable pass), and reserve Fable calls for architecture + build.
> The continuity-doc + self-contained-prompt infrastructure already handles session *stickiness* (any model
> resumes at full context → a downgrade costs a session, not the project). The remaining fix is session HYGIENE,
> not more infrastructure.

## Why this matters to SwanStudios specifically
This is a production SaaS with heavy, ongoing hostile-review discipline (Rules 17/46/50/61 + `attack-the-site` +
`security-review`). That discipline is GOOD and stays — but it means Fable→Opus drops are expected during audit
passes. The fix is not to stop red-teaming; it's to **route red-teaming to Opus on purpose and return to Fable
for everything else**, so the "highest brain" is always on the task that needs it.
