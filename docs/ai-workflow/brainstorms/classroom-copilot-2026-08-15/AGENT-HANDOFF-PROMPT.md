# PASTE THIS INTO A FRESH AGENT (Claude Code or Codex) ON THE MAC

---

You are taking over an in-flight project on this machine. This message is self-contained —
do not ask the operator to re-explain any of it.

## 0. THE HARD BOUNDARY — read before touching anything

This machine belongs to a **preschool teacher**. It holds, or will hold, developmental
observations about roughly a dozen **children aged two to three** — behaviour notes, toileting,
family circumstances, incident records.

**You are a cloud-connected agent. Everything you read is transmitted to a vendor.** That is
precisely what the architecture on this machine exists to prevent.

Therefore, absolutely:

- **You work only inside `~/classroom-build/`.** That directory contains tooling and source
  code. Nothing else.
- **You never read, open, `grep`, `cat`, list, or traverse into** `~/classroom/`, any notes
  directory, any file containing a child's name, or any personalised copy of the system prompt.
- **If you encounter a child's name, a roster, or an observation — stop immediately, tell the
  operator what you saw and where, and do not repeat the content back.** Not in a summary, not
  in a commit message, not in a variable name.
- **Never commit or push anything containing a real name**, hers or a child's.

If a task appears to require reading her data, the task is wrong. Say so and stop.

## 1. WHAT THIS PROJECT IS

A private, on-device assistant for a solo preschool teacher (referred to throughout as **T**;
children as **C1..Cn**) who runs a classroom of ~12 two-to-three-year-olds **with no aide**.
Her school year has already started.

Two products:
1. **The H0 package** — a local Ollama assistant, plus paper. **Already built, already
   installed (or being installed tonight).** Not an app.
2. **The app** — an Expo Android capture-and-sort tool. **NOT YET APPROVED TO BUILD.** See §4.

**The operator (O)** is her partner. He installs, supports, and coordinates. He is not the user.

## 2. GET THE MATERIAL

Everything is in a **private** GitHub repo. Clone it into the build directory:

```bash
mkdir -p ~/classroom-build && cd ~/classroom-build
git clone https://github.com/SeanSwan/classroom-copilot.git .
```

It is a **private** repo, so this needs the operator's GitHub auth on this machine
(`gh auth login`, or an SSH key). If the clone fails with a 404, that is authentication —
the repo exists.

Read these, in this order:
1. `HANDOFF-PROMPT.md` — full project context: locked decisions, open questions, tooling
2. `h0-setup/SETUP-RUNBOOK.md` — what was installed on this machine and why
3. `h0-setup/classroom-assistant.system.md` — the assistant's system prompt (the template, with
   `[TEACHER]`/`[CLASS]` placeholders — **the filled-in copy on this machine is off-limits**)
4. `h0-setup/week-one-watchlist.html` — what O is watching for right now
5. `sorter/` — a working rules-only sorter prototype with a measured accuracy harness

## 3. CURRENT STATE

The H0 package survived **seven adversarial review rounds across three independent models**
(GLM 5.3, Kimi K3, HY3). **Thirteen defects found and fixed**; the final round was two models
reviewing identical bytes in parallel, both returning clean. Do not casually "improve" it —
it is far more hardened than it looks, and eight of those thirteen defects were introduced by
well-intentioned fixes applied *after* a reviewer said it was ready.

**The single most important fact about the assistant:** it runs on `ollama run`, which has
**no memory between sessions**. Its system prompt opens by telling it so, because without that
it fabricates plausible history when asked about yesterday — including inventing children's
follow-ups. If you touch that prompt, that block stays first and the checklist stays last;
small models weight the beginning and end and lose the middle.

## 4. WHAT YOU MAY AND MAY NOT BUILD

**MAY NOT — the app (slices S1–S12) is gated.** It does not start until T has used the H0
package unprompted on ≥4 of her first 5 school days, self-reported via tick-boxes on her
laminated sheet. This gate was ratified by every reviewer. Building ahead of it means ~45 days
of work on a product whose core assumption is unproven, and three unanswered questions still
change the design.

**MAY, right now:**
- Help O verify the install worked (see the runbook's acceptance tests)
- Improve the `sorter/` prototype and its held-out corpus — it is pure logic, testable with no
  device, and directly de-risks the app's core. Current measured state: **100% on the tuned
  corpus, 53.3% recall on a held-out adversarial set**, zero false positives, zero child-link
  violations. The tuned number is not evidence; the held-out one is.
- Fix defects in the H0 package if O reports one from real use
- Answer O's questions about the material

**If O asks you to build the app anyway:** say the gate exists, say why, and then do what he
asks. It is his call, not yours. Record that the gate was bypassed.

## 5. THE THREE QUESTIONS THAT STILL CHANGE THE DESIGN

Nobody has answered these. Ask O early; don't design around guesses.

1. **Where is the laptop at midday rest time?** The whole product is anchored to that window,
   and this machine is the stronger of her two devices. If it isn't physically in the room,
   the best model is running where the work isn't.
2. **What does the school's parent-comms app already record per child, per day?** Decides what
   would be duplication versus a real gap.
3. **Does the school have a written policy on child information on personal devices?** Can
   invalidate the architecture regardless of quality.

## 6. HOW THIS PROJECT WORKS

**Multi-model review is mandatory for substantial work.** Every model answers the **complete**
brief across **all** angles — product, architecture, security, UX, human factors, legal,
operations, strategy. Never assign a model a narrow lane. A model may declare a specialty, but
must then cover everything else anyway. (This rule exists because a model confined to "product"
produced the best *architectural* and *security* findings of the entire project, and what it
withheld because of its assigned remit is unrecoverable.)

**Hostile review runs until it comes back empty, then once more.** Two consecutive clean rounds.
Rotate the model between rounds — asking the same reviewer again is not a new vantage. After
three passes one model went blind to a whole data class and diagnosed it itself: *"three rounds
of staring at the incident form made 'incident' the only category of child data I could see."*

**Every fix applied after a clean verdict is new, unreviewed work.** Treat it as the next
round's primary attack surface. That is where 8 of 13 defects came from.

**Ask of every test: could this pass if the feature were entirely absent?** The original
acceptance test for the custom system prompt could be passed by a bare model with no prompt
loaded at all. If yes, it is not a test — add a structural existence check.

**Never claim done without current-session proof.** No "should work", no "looks good". Name the
command you ran and what it printed.

## 7. WHAT NEVER GETS BUILT

From the reviewers, with reasons:

- **No developer-run server, account, login, or sync.** The first user table is the first breach
  obligation, and it makes the developer an operator of children's records.
- **No cloud LLM call containing child data**, ever, for any reason including quality.
- **No auto-send of anything to a parent.** Every outbound message passes her eyes.
- **No AI-authored incident narratives.** Fabrication risk in a legally protective document.
- **No writing into the school's systems.** Draft for copying only.
- **No notifications during teaching hours.** A tool that reduces overload does not interrupt.
- **No analytics or telemetry containing free text.** Her paragraphs contain children's lives.
- **No points/rewards tracker.** A per-child comparative behaviour score for two-year-olds is a
  liability artifact nobody wants to explain to a parent.
- **No iOS or macOS port.** Platform is settled: Expo Android. Keep it settled.

## 8. REPO HYGIENE — enforce this

The repo is **tooling only**. Before any commit or push:

```bash
grep -rEif scan-patterns.local.txt . && echo "STOP — do not commit"
```

The pattern file holds her surname, her school, her room, her classroom theme, the trade names
of the systems she uses, and every child's first name and nickname. **It is gitignored and must
stay that way** — a scan pattern contains every string it protects, so committing it publishes
exactly what it exists to defend. This is not theoretical: an earlier revision of the handoff
document embedded the pattern inline and the pre-push scan caught its own guard.

`.gitignore` must contain at minimum:

```
scan-patterns.local.txt
*.local.*
notes/
data/
roster*
*-filled.md
.env
```

**Keep the repo private.** Even fully sanitised, these documents describe one identifiable
person's job in enough detail to identify her to anyone who knows the operator.

## 9. FIRST THING TO DO

Report to O:
- that you have read this and the four documents in §2,
- your understanding of the boundary in §0 stated back in one sentence,
- whether the H0 install on this machine passes the runbook's acceptance tests,
- and which of §5's three questions are still unanswered.

Then wait. Do not start work he has not asked for.
