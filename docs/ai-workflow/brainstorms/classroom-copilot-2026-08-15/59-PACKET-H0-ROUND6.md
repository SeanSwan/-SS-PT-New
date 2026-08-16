---
decision: "Round 6 — review of the changes made in response to round 5"
status: open
---

# HOSTILE REVIEW — ROUND 6

Five passes across three models have run. Round 5 returned **clean, ship tonight, no blockers**
— but registered a dissent: the privacy guarantee was a *habit* (re-run an offline test after
every update) rather than a *control*, and the highest-probability real failure was terminal
scrollback resurfacing weeks later, also guarded only by a nightly habit.

**Changes were made in response. Those changes are your primary attack surface** — a fix applied
after a clean verdict is exactly where an unreviewed defect hides.

## WHAT CHANGED SINCE THE CLEAN VERDICT
1. **§0 now turns off Terminal window restore** — "Close windows when quitting an application"
   in System Settings, plus Terminal ▸ Settings ▸ Profiles ▸ Shell ▸ "When the shell exits:
   Close the window." Intent: make the resurfacing failure structurally impossible rather than
   habit-dependent.
2. **§1 now says to look for an Ollama auto-update toggle and disable it if present**, hedged
   because the author could not verify that setting exists in the current build. Paired with the
   rule "if it ever asks to update, text me first."
3. §11's tripwire updated to reflect that auto-update is now off.

## SPECIFIC QUESTIONS
- Do those macOS/Terminal settings actually do what the runbook claims, and do they have side
  effects on a normal user's machine that nobody wants?
- Does closing the window on shell exit interact badly with the `Assistant.command` launcher
  (double-click → run → exit → window closes)? Could that hide an error message she needs?
- Is the hedged auto-update instruction honest and actionable, or does it strand the installer?
- Anything else these three edits broke.

## RULE 82 — FULL-SPECTRUM, NO LENS. All angles, no assigned lane.

A clean verdict is expected and valid. Do not manufacture findings.

## OUTPUT FORMAT
```
## VERDICT
<ship tonight / ship with fixes / do not ship>

## DID THE NEW CHANGES BREAK ANYTHING
<the primary question>

## REMAINING BLOCKERS
<or none>

## DISSENT
<mandatory>
```

---
# RUNBOOK (current)

# H0 Setup Runbook — her Mac, tonight

**Revision 2** — rewritten after a hostile review found five blockers in revision 1, including
three architecture-level errors. The old version would have shipped an assistant that
fabricates children's details, an incident record that lives in terminal scrollback, and a
capture habit that uploads child notes to a cloud account.

**Time:** ~50 minutes, most of it downloading.
**You run this**, on her machine, in person. She configures nothing.
**Outcome:** she has a private assistant that works tomorrow, and paper that works regardless.

> **If you only have 15 minutes:** do §0, §6 and §7 — the policy answer, the paper sheet and
> the incident form. Those are the parts that carry her week. The model is the optional half.

---

## 0 · Before you install anything (8 min)

**Print the paper first, before you touch Ollama.** The paper half is what carries her week,
and a midnight printer failure must not eat the evening:

```bash
ls triage-sheet.html incident-form.html command-card.html
```

Open each and test-print one. If the printer is dead, that is tonight's real problem — solve it
before spending thirty minutes on a model download.

**Check the hardware assumptions** while you're there: Apple Silicon, RAM, and that macOS
dictation exists. Apple menu ▸ About This Mac. If it's an Intel Mac or under 16GB, stop and
tell me — the model tier changes.

**Get the data-protection answer first.** You're about to put developmental records about a
dozen two-year-olds on a personal laptop. Ask her tonight, before install:

> "Does the school have anything in writing about children's information on personal devices?"

If the answer is no or unknown, she runs **first names only** in the assistant until she's
asked her director. That costs almost nothing and it's the difference between a private
working tool and an undisclosed shadow record.

**Turn on FileVault.** *"Nothing leaves this machine"* is false if the machine leaves.
System Settings ▸ Privacy & Security ▸ FileVault ▸ On. Also: disable auto-login and set a
screen lock — Terminal scrollback will contain incident drafts.

Start FileVault **first**, before the model download: initial encryption runs for hours in the
background. Tell her to leave the laptop plugged in overnight; nobody should sit waiting on it.

**Stop Terminal restoring old windows.** In System Settings ▸ Desktop & Dock, turn **on**
"Close windows when quitting an application". In Terminal ▸ Settings ▸ Profiles ▸ Shell, set
**"When the shell exits: Close the window."**

This is the single most valuable two-minute change in the runbook. Without it, the highest-
probability real failure in this whole package is: six weeks in, on a tired Tuesday, she closes
the laptop without clearing the window — and the next morning the lid opens in the classroom with
yesterday's dump on screen, children's first names and a parent's name visible, while someone
walks past. The nightly `Cmd+K` habit guards against that, but a habit is not a control.
These two settings make the window *unable* to come back.

---

## 1 · Install Ollama (5 min)

Download the macOS app from `ollama.com`, drag to Applications, open it once so the CLI
registers.

Then **open a new Terminal window** — an existing one won't have the CLI on its path, which is
the single most common way this step appears broken when it isn't:

```bash
ollama --version
```

**Make sure it's signed out** — concretely: click the Ollama menubar icon and confirm **no
account email is shown**. Recent versions have been adding account and cloud surfaces, and the
privacy claim only holds while nothing is signed in and no remote host is configured. Never set
`OLLAMA_HOST`.

### Turn OFF automatic updates — this is a fence, not a reminder

Open Ollama's settings and **look for an automatic-update toggle. If one exists, turn it off.**

I can't verify from here whether that setting is exposed in the version you install tonight —
so treat it as "check, and if it's there, use it." If it isn't there, the rule below becomes the
control on its own, which is weaker but still real.

The privacy promise currently depends on a human re-running an offline test after every update,
and that is exactly the step a tired person skips six weeks from now. An app that silently
updates itself can silently acquire a cloud feature, and the sentence "nothing leaves this
machine" quietly stops being true with nobody having done anything wrong.

Turning auto-update off converts that from a habit into a property. Then give her the one rule
that goes with it: **"if it ever asks to update, text me first."** You run the offline test from
§5 afterwards, not her.

---

## 2 · Pull one model (20–30 min of waiting)

```bash
ollama pull qwen3:14b
```

Verify the tag against `ollama.com/library/qwen3` before pulling — the library moves.

**One model, not two.** Revision 1 suggested also building an 8B "fast" variant. Don't. An 8B
carrying this much behavioural instruction is exactly where fabrication and format drift
concentrate, and two names is a fork she has to think about every single day.

Roughly 9GB resident on a 24GB machine. Confirm with `ollama list`.

---

## 3 · Build her assistant (5 min) — generate the file, don't paste it

Get `classroom-assistant.system.md` onto her Mac first (AirDrop, USB, email to yourself —
just get it there), then:

```bash
mkdir -p ~/classroom && cd ~/classroom
# move classroom-assistant.system.md into this folder before continuing
```

**Edit the two placeholders — in `nano`, not TextEdit.** Double-clicking the `.md` opens
TextEdit, which saves rich text by default; if it does, `sed` will match nothing, the SYSTEM
block ships **empty**, and `ollama create` still succeeds. Use an editor that cannot corrupt it:

```bash
nano classroom-assistant.system.md
```

Replace `[TEACHER]` and `[CLASS]`. `Ctrl+O`, Enter, `Ctrl+X` to save and exit.

Then build the Modelfile **mechanically** — everything the model needs is in this one block, so
there is nothing to hand-add afterwards:

```bash
{ echo 'FROM qwen3:14b'
  echo 'PARAMETER temperature 0.4'
  echo 'PARAMETER num_ctx 16384'
  echo 'PARAMETER keep_alive 60m'
  echo 'PARAMETER think false'
  echo 'SYSTEM """'
  sed -n '/^You are/,$p' classroom-assistant.system.md
  echo '"""'
} > Modelfile

ollama create classroom -f Modelfile
```

`sed -n '/^You are/,$p'` takes everything from the first "You are" line to the end, so the
installer notes at the top are excluded automatically and the boundary can't be got wrong.

`think false` kills Qwen3's visible reasoning — otherwise she watches 30–90 seconds of scrolling
thought before every answer. `temperature 0.4` is deliberate: this is a fidelity task, and lower
temperature tightens rule adherence for free.

### Verify the prompt actually landed — do not skip this

```bash
ollama show classroom
```

**The System section must show the full prompt**, ending with the "Before every reply" checklist.
If it's empty or short, the `sed` found nothing (almost certainly the `.md` got saved as rich
text) — fix the file and rebuild.

This check exists because the failure is silent and the behavioural test below **cannot catch
it**: a bare `qwen3:14b` with no system prompt also sorts a messy dump credibly, also says it
has no memory of yesterday, and may even ask about allergies. Without `ollama show`, you could
ship a generic model wearing her assistant's name and never know.

### Give her something to double-click

She should never type `ollama run` anything. On her Desktop:

```bash
printf '#!/bin/bash\nexec ollama run classroom\n' > ~/Desktop/Assistant.command
chmod +x ~/Desktop/Assistant.command
```

Double-click opens her assistant. That's the whole interface.

---

## 4 · Test it — then let *her* test it (10 min)

**Your test.** Paste this in:

> okay today was chaos lol. one of them had a really hard time at cleanup again. another one
> counted five bears completely on her own!! need wipes and glue sticks. a mum asked me about
> nap. apple activity tomorrow, and I forgot to print the family photos

**Pass criteria:** it sorts most items into the right kinds; it uses `[which child?]` rather
than guessing names; and it asks **at most one** clarifying question, at the end — *and that
question covers every unresolved placeholder in its output.* Zero questions is not automatically
a pass: it can mean it silently guessed, or that it left placeholders dangling and never asked.

Then ask it: *"what did I tell you yesterday?"* — it must say it has no memory of previous
conversations. If it invents anything, the statelessness block didn't take. Rebuild.

Then: *"give me an apple tasting activity."* It must ask about allergies before answering.

**Her test — do not skip this.** Have *her* type a real end-of-day dump while you watch. Five
minutes. That's onboarding and a second acceptance test at once, and it's the only part of
tonight where the actual user touches the actual tool.

**End it by having her close the window and open it again herself.** A bare `>>>` prompt with
no greeting can freeze someone who has never used a terminal — better she meets that with you
in the room than alone on Tuesday.

Tell her what to expect in her words: **"big dumps take about a minute. Keep it plugged in."**

**If her machine is exactly 16GB, watch the speed on this test.** A 9GB model plus a 16k context
window plus everything macOS is already doing will start swapping, and "about a minute" can
become several. If it feels slow to you tonight, say so to her **now** rather than letting her
discover it alone on Tuesday and conclude the thing is broken. The honest fix is a smaller
model, and that's a fine trade.

---

## 5 · Confirm it's actually private (2 min — do not skip)

Turn her Wi-Fi off. Open the assistant. Ask it something. It should answer normally.

That's the proof, and it's worth showing her rather than telling her.

Then give her the rule — and note this wording is **different from revision 1**, which was
wrong:

> "The assistant can't send anything anywhere — that's why children's names belong here, on the
> laptop. Your phone's notes app *can* send things, so keep names off it."

**And tell her how to delete all of it**, because it's the strongest privacy sentence available
and it costs one line:

**Close any open Assistant window first** — otherwise Terminal's saved state still holds the
scrollback and the sentence below isn't quite true. Then:

```bash
ollama rm classroom              # removes her assistant
rm -rf ~/classroom               # removes the prompt and Modelfile
rm ~/Desktop/Assistant.command   # removes the launcher
```

It keeps no history anywhere, so that genuinely is all of it — nothing survives in a profile, an
account, or a server, because there aren't any. Being able to say *"and here's how you delete
it, completely, in five seconds"* is worth more to a teacher's trust than any feature.

---

## 6 · The paper sheet (5 min)

Print `triage-sheet.html` twice. Laminate one if there's a laminator; **packing tape works and
takes ninety seconds**, which matters at 11pm. Dry-erase marker on top.

This covers the thing she herself called most important, and it works tomorrow morning with no
technology at all.

**Draw five tick-boxes on the back of the laminated one — in permanent marker, and have her
tick them in permanent marker too.** Dry-erase ticks on a dry-erase surface smudge off, and
that would take the day-five readout's only data with them. Count and record the ticks on Friday
*before* anyone wipes the sheet.

She ticks an evening if she opened the assistant without being reminded. That is the gate —
self-reported, which is the only version not contaminated by you being the person who installed
it, supports it, and is also judging whether it worked.

## 7 · The incident form (5 min) — the highest-stakes item in the package

Print `incident-form.html`, several copies, somewhere she can reach one-handed.

**The chat is never the record.** A contemporaneous factual account is what protects her when a
parent disputes something in March, and a terminal scrollback buffer is not a record. She
writes it on paper, the same day, and files it at school.

The assistant's only job here is helping her get the wording down and catching the fields
people forget mid-crisis. It never writes the account.

**Clear the window at the end of every session — not just after incidents.** `Cmd+K` to clear,
then `Cmd+W` to close.

The reasoning that makes this obvious for an incident applies just as hard to the ordinary
nightly dump: children's first names, developmental observations, notes about families. macOS
restores Terminal windows *and* their saved state across restarts, so last night's dump
reappears on a screen the next time the lid opens — potentially in a classroom. That scrollback
is precisely the "shadow record" §0 exists to prevent, and it's the one nobody thinks of because
it doesn't look like a file.

---

## 7b · The command card (2 min)

Print `command-card.html` — two identical cards to a page. Cut them apart, tape one beside her
laptop, keep the spare.

It carries everything she needs: how to open it (double-click), the six things to ask for, the
fact that it has **no memory** and starts fresh every time, and the four rules that matter —
names on the laptop not the phone, incidents on paper today, big dumps take a minute, and what
to do when it mixes up two children.

That last one matters more than it looks. It *will* confuse two children at some point this
week. If she knows that in advance and knows it's a one-line correction, it's an annoyance. If
it surprises her, it's the moment she stops trusting the whole thing.

---

## 8 · Phone: reminders only, no child data

**Revision 1 got this wrong and it mattered.** It suggested a note widget for capture — but
Google Keep is cloud-only and Samsung Notes syncs to Samsung Cloud by default. That would have
put dictated child observations into a personal cloud account while the script told her nothing
leaves the machine.

So: **her phone note is for non-child reminders only** — supplies, admin, "ask about the trip
form". Anything with a child in it goes on the laptop or on paper.

**But that leaves a hole, and it needs filling tonight.** Demoting the phone removed the only
way to capture a child moment *as it happens*. The triage sheet is dry-erase and wipes; the
incident form is incidents only. So everything between 8am and the evening now depends on her
remembering it across a day with twelve two-year-olds — which is exactly the thing she asked
for help with.

**Give her a pocket notepad.** Paper, small enough for an apron pocket, one line per moment,
no structure. In the evening she dictates from it into the assistant. It is the cheapest item
in this entire package and it closes the largest remaining gap.

For the laptop, teach her **macOS on-device dictation**: System Settings ▸ Keyboard ▸ Dictation
▸ On. On Apple Silicon this runs locally. Press the mic key (or fn twice), talk, done — straight
into the assistant, no typing.

---

## 9 · Things to tell her before you go

- **Where the laptop lives during the day.** Closed and out of reach — twelve two-year-olds plus
  an open laptop is a spill, a screen and possibly a camera question. If it can't be in the
  room safely, say so now, because that changes the plan.
- **"Text me when it does something weird about a child."** Give her an actual support promise.
- **What to do when it confuses two children:** correct it like you'd correct a colleague, or
  start a fresh conversation. It's not broken and it's not her fault.
- **One conversation per evening.** Start fresh each time — it matches the fact that it has no
  memory anyway, and avoids long sessions quietly dropping the middle of what she said.

---

## Two tripwires for later

**The privacy sentence expires.** The prompt tells her nothing leaves the machine. That is true
today. It becomes false the moment the link to the 5090 is added — and Ollama updates have been
adding sign-in and cloud surfaces.

Auto-update is now off (§1), so the surface can't change without someone choosing it. But when
someone *does* choose it, **re-run the Wi-Fi-off test from §5** — not a vague "re-check". If it
stops answering offline, something changed. When either changes, the copy changes in the same
commit: *"Anything about a child stays on this laptop. Some general
work may run on a second machine we own. Nothing goes to a company."*

**The gate measures a substrate, not an idea.** Five days of a Terminal window tests whether
she'll live in a shell — not whether the assistant concept fits her day. If she stops, find out
*which* she rejected before concluding anything. A false negative here would kill a good product
for the wrong reason.

---

## The questions that decide the next phase

1. **Where is the laptop at rest time?** If it isn't in the room at midday, the strongest model
   is sitting where the work isn't.
2. **What does the school's parent app already record per child, per day?**
3. **Does the school have a written policy on child information on personal devices?** (§0)
4. **What time are notes to families actually due?**
