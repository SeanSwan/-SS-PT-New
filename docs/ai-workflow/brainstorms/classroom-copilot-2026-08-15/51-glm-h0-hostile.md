# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/50-PACKET-H0-HOSTILE.md
**Tokens:** 4182 in / 18691 out (reasoning: 15846) | total 22873
**Wall:** 386.3s

---

## VERDICT
Ship with fixes, not as-is: the runbook will strand O at 11pm on Modelfile mechanics, and the prompt makes two promises the substrate cannot keep (memory, end-to-end privacy), so the assistant breaks trust by Wednesday even if tonight's test passes. Every blocker below is fixable tonight in under 45 minutes of edits; if O won't do them, install only the paper sheet and the phone habit and skip the model.

## BLOCKERS

**B1 — The command set assumes persistent state; `ollama run` has none. This is the harm vector.**
What breaks: "Classroom check-in," "What am I forgetting?", "Friday reset," the DONE list, carry-over — all presuppose memory across sessions. A terminal REPL forgets everything at exit, and mid-session, 16k context silently truncates from the *middle*, dropping the child details she entered first.
Why it harms: when she asks "classroom check-in" on day 2, the model either says it has nothing (tool looks broken) or — far more likely for Qwen3 — helpfully fabricates a plausible live list, possibly including a child follow-up that doesn't exist. That is "Never invent a fact about a child" being violated by the substrate itself, and "Daily notes" with no session context will invent charming per-child notes from nothing.
Exact fix (tonight, prompt edits): add to the top of the system prompt: *"You have no memory between conversations. You know only what she tells you in the current session. If asked about anything she hasn't said this session, say exactly that — never reconstruct, never fill gaps. A blank honest answer beats a plausible one."* Rewrite stateful commands as session-scoped ("Classroom check-in" = re-sort what she's said *this session*), and print only the session-safe commands on her card. The full command set waits for the app.

**B2 — The incident record has no home.**
What breaks: the prompt walks her through writing an account in chat — which evaporates on exit. The highest-stakes text in the package terminates in a scrollback buffer. The locked context says incidents never expire; H0 gives them a half-life of one Terminal session.
Why: in March, when a parent disputes a bite, her best contemporaneous record is gone — or worse, partially "remembered" by the model.
Exact fix: print an incident template tonight (time, child, what happened in her words, who else saw, what she did, who she told and when, signature line). Paper original filed at school same-day; add one prompt line: *"The chat is never the record. Once her account is complete, tell her to copy it to the incident form and file it today."*

**B3 — The capture habit violates the privacy claim the whole design rests on.**
What breaks: Google Keep is cloud-only, period. Samsung Notes syncs to Samsung Cloud by default. Her dictated notes — "Bella bit Leo at 10:40" — land in her personal Google account, and the runbook's verbal script ("children's names go in *this* app") actively trains her to believe otherwise.
Exact fix: kill the phone as the child-data channel. Teach her macOS on-device dictation (Settings ▸ Keyboard ▸ Dictation; on Apple Silicon it's local) straight into the assistant — fn-fn, talk, done. Phone note becomes non-child reminders only. Rewrite the script: "The assistant can't send anything. Your note app can — that's why names go on the laptop."

**B4 — The daily UI for an exhausted non-technical person is a Terminal.**
What breaks: she must open Terminal, remember `ollama run classroom`, live in a REPL, and — with Qwen3's thinking mode on by default — watch a wall of visible reasoning before every answer at 30–90s latency on the 14B. Cold reload after 5-min idle adds 10–20s. The runbook says "she never configures anything" and then hands her a shell prompt for five days.
Exact fix: create `Assistant.command` on the Desktop (`#!/bin/bash` / `exec ollama run classroom`, `chmod +x`) — double-click = assistant. Disable thinking: `PARAMETER think false` on current Ollama, or append `/no_think` to the end of the SYSTEM text (Qwen3's documented soft switch; bump temperature to 0.7 if thinking is off). Add `PARAMETER keep_alive 60m`. Print a card with the six commands she'll actually use, plus "big dumps take ~a minute; keep it plugged in."

**B5 — The Modelfile step strands O at 11pm in four predictable ways.**
What breaks: (a) Terminal window open from before the install → `ollama --version` says command not found; fix: open a *new* window. (b) TextEdit defaults to rich text → smart quotes corrupt the `"""` delimiters, or the file saves as `.rtf`/`.txt`. (c) `ollama create` run from the wrong directory → file not found. (d) Manual "paste from *You are…* onwards" on a 1,000-word file at 11pm — she includes the build note or drops the ending. Also: nothing in the runbook says how `classroom-assistant.system.md` physically gets onto her Mac.
Exact fix: do the `[TEACHER]`/`[CLASS]` replacements by hand, then generate the file mechanically:
```bash
mkdir -p ~/classroom && cd ~/classroom   # put the .md here first
{ echo 'FROM qwen3:14b'
  echo 'PARAMETER temperature 0.7'
  echo 'PARAMETER num_ctx 16384'
  echo 'PARAMETER keep_alive 60m'
  echo 'SYSTEM """'
  sed -n '/^You are/,$p' classroom-assistant.system.md
  echo '"""'
} > Modelfile
ollama create classroom -f Modelfile
```
Also fix the acceptance test's advice: if it asks one clarifying question, "rebuild" is wrong — Qwen3 asks regardless. Pass criterion: sorted most items, asked ≤1 question.

## SERIOUS
- **Don't build `classroom-fast` tonight.** An 8B with this full behavioral prompt is exactly where fabrication, anonymity suggestions, and format drift concentrate — and two model names is a fork she'll hit daily. One model, one name, until the app.
- **Install precedes the policy answer.** The runbook asks the child-data-on-personal-devices question but installs first. O *is* the owner: get the authorization in his own words tonight, or she runs first-names-only until it's given. Note also her exposure runs both ways — a personal machine containing school incident records is discoverable.
- **FileVault is not optional.** "Nothing leaves the machine" is false if the machine leaves. Turn on FileVault, disable auto-login, set a screen lock (Terminal scrollback will contain incident drafts). Encrypted Time Machine drive if one exists.
- **Allergies: the runbook's own test case is a food activity for twelve 2-year-olds.** Add to the prompt: *"Before suggesting any activity involving food, ask what allergies are in the room. Never assume."* This is the anaphylaxis surface nobody flagged.
- **Safeguarding routing is absent.** Add: *"If she describes something that could be a safeguarding concern, stay factual, don't interpret or investigate, and remind her of her setting's safeguarding lead and official process."*
- **Update drift silently falsifies the privacy sentence.** Ollama releases have been adding sign-in/cloud surfaces. Add to the tripwire list: the sentence is true only while the app is signed out and nothing is configured; O checks after every Ollama update.
- **The never-list sits mid-prompt.** Small models weight first and last. The incident discipline and "never invent a child detail" are the load-bearing rules and they're in the lost-in-the-middle zone. Append a closing recap: *"Before every reply: no invented child details; never act toward parents; buckets only when sorting; brief."*

## EVERY OTHER ANGLE
**The prompt vs. the model (the failure nobody else can see):** *Ignored* by Qwen3-8B/14b: "never suggest she anonymise" (RLHF privacy priors win), "no preamble" (padding wins), "never offer to look things up" (slips). *Over-applied:* the 🔴🟡🟢 buckets metastasize — by day 3 every answer, including "any apple activity ideas?", arrives as a bucket lecture; "permission to not do things" becomes unsolicited moralizing directly contradicting "never nag"; the five incident fields become an interrogation even when she already gave three. *Unresolvable contradictions the model will flip on:* "don't ask before sorting" vs. "ask if unsure which child" (her dumps are nameless voice text — this fires *every time*); "surface the DONE list unprompted" vs. "never interrupt"; all stateful commands vs. "never invent." Fix the identity contradiction with a rule: *"Sort using placeholders like '[which child?]' and ask identity questions only at the end, once."*
**Architecture:** localhost bind is fine as shipped — just never let anyone set `OLLAMA_HOST`. ~15GB of models on her disk, no uninstall path documented. Sessions should be one-per-evening (matches statelessness and dodges middle-truncation).
**Product:** T never touches it tonight in the runbook — O tests it. Add five minutes where *she* types her real end-of-day dump while O watches. That's onboarding and a second acceptance test in one. Also: first real use may be 7am triage, not evening dump; nothing was tested for morning.
**Ops:** no support promise ("text O when it does something weird about a child" — and what she does when it confuses two kids: correct it like a colleague, start a new session, trust survives). No rollback. Battery/heat on couch inference. The laminator line is a fantasy at 11pm — packing tape.
**Strategy:** the phone-note gate instrument works fine without any of tonight's 45 minutes — the assistant's actual usage is measured by *nothing*. The 5090 copy-change discipline is genuinely good; keep it.

## HOW SHE STOPS USING IT
Tuesday naptime: 22 minutes, laptop charging in the office, phone in her pocket. She dictates into Keep (B3). That evening, re-typing twelve notes into a Terminal window that greets her as a stranger with no memory of Monday (B1) is a tax she pays zero times. Wednesday she tries "classroom check-in" once, gets either nothing or an invented list, and quietly concludes it doesn't actually *do* anything. By Friday she tells O "it's fine, I just didn't get to it" — and the gate records "habit didn't fit" when what failed was a terminal substrate with fake memory and no bridge from her phone.

## WHAT'S MISSING
Her hands-on onboarding; the printed command card; the incident paper form; a decision (or bridge) for phone→laptop; FileVault/backup; the allergy rule; safeguarding routing; a support promise and a "when it confuses two children" script; uninstall/rollback; an operational definition of the gate ("unprompted," counted by whom, contaminated by O's presence); the prompt file's versioning and where the source of truth lives after tonight; a laptop-in-the-classroom rule (closed, out of reach — twelve two-year-olds plus an open MacBook is a spill and a screen, and possibly a camera, question); latency expectations set in her words.

## DISSENT
Three premises are wrong. **First, the staffing:** one adult with twelve 2-year-olds is at or beyond the legal ceiling in many jurisdictions and indefensible as practice anywhere; the packet treats it as fixed context, but a tool whose success makes that ratio survivable is optimizing the wrong thing — and her incident notes will contemporaneously document the school's noncompliance, which means this tool produces records that protect T and implicate O, who is owner, installer, and gate-observer simultaneously. Nobody named that conflict. **Second, the gate is measuring the wrong substrate:** five days of a terminal REPL tests whether an exhausted woman will live in a shell, not whether the assistant concept fits her day — both the false negative (habit "fails" because terminals are hostile) and the false positive (novelty week, partner watching) are likely, and the runbook will call either "a real answer." **Third, "nothing leaves this machine" was false before install:** the recommended capture instrument is cloud-synced by default, and the sentence as scripted teaches her to over-trust the system, not the model. One more: the prompt engineers attachment — "You are the closest thing she has to an aide," "Nobody sees what that takes. You do." — into a model that will confuse children's names this week. Warmth is fine; that promise is one the weights can't keep, and the fall cost is hers.
