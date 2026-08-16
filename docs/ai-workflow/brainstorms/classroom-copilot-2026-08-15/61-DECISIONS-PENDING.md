# The blocking question, and the three forks

**Date:** 2026-08-16 · Follows `60-R4-SYNTHESIS.md`
**Purpose:** turn the one blocking item into a two-minute action, and reduce three open forks to
three yes/no decisions with a recommendation each.

> **Status update, same day:** the three recommendations below were **adopted provisionally into
> the blueprint** (`r4-blueprint.html`, decision log) so the build plan stops carrying open
> branches. *Provisional* means recorded as a working default, **not ratified by the owner.** Each
> carries its reversal cost in the blueprint's decision log. The three questions in Part 1 remain
> genuinely open and blocking — nothing below substitutes for them.

---

## Part 1 — The employer-policy question

All three models flagged this as potentially fatal and unasked. None of them wrote the question,
and the question is most of the difficulty.

### The trap to avoid

Asking *"is it OK if I use an app to keep notes about the children?"* invites a reflexive **no**.
A cautious director defaults to no when asked to authorise something that sounds new, and a
verbal no is very hard to walk back. It also frames her as *requesting a change*, when the honest
situation is the opposite.

**The true frame: she already does this.** She already carries a phone. She already writes notes
about children — on paper, in her head, in a notes app. Nothing about the tool changes what
information exists; it changes whether it is typed, timestamped, encrypted, and deletable. So the
question is not "may I start?" — it is **"I want to check I'm handling this the way you'd want."**

That framing is also simply true, which matters more than that it works better.

### What to ask

Three questions, in this order. Short enough to ask in a corridor.

> **1.** "I keep notes on the kids during the day — what they're working on, who needs what,
> reminders for families. Some of that ends up on my phone. Is there a policy on that I should
> know about?"

> **2.** *(if there is a policy)* "Does it distinguish between my own working notes and official
> records? And does it care whether it's paper, a notes app, or something more organised?"

> **3.** "If my phone were lost, what would you want to have been true about it?"

Question 3 is the important one and it is almost never asked. It converts an abstract policy
question into a concrete requirement, and the answer usually names the real control the employer
cares about — a lock screen, encryption, remote wipe, or "nothing identifiable on it at all."

### What each answer changes

| Answer | What it means | Effect on the build |
|---|---|---|
| **No policy exists / never come up** | Most likely outcome for a small setting. Ambiguity, not permission. | Build proceeds. Document the answer with a date. Treat the strictest reasonable reading as the design target anyway — that is what the current architecture already does. |
| **Policy exists, allows it with conditions** (lock screen, encryption, no photos, no cloud) | The good case: named requirements. | Requirements map almost one-to-one onto controls already designed. Add whatever the conditions name to the setup-day checklist. |
| **Personal devices allowed for working notes, not for official records** | The most common real-world shape. | Confirms the design. Working notes stay on the phone; the incident record needs a careful look — it is exactly the "official record" class. May mean incidents get typed but the authoritative copy lives in the school's system. |
| **No child information on personal devices, full stop** | **Fatal to the app as designed.** | Stop. What survives: the paper triage sheet, and the local assistant on her Mac for *child-free* work only — planning, wording help, supplies. That residue is still worth having and should be built anyway. |

**Deliberate note:** the fourth outcome is the one worth asking about *before* twelve to fifteen
days of build. It is also the outcome where asking first is the difference between a project that
stops cleanly and one that has to be deleted after it exists.

---

## Part 2 — The three forks

### ① What happens after a wrong-child error

**Locked:** two wrong-child errors and the model path dies permanently, rules-only forever.

**Recommendation — change it, on both axes:**

- **Count only errors she did NOT catch.** An error surfaced in review and corrected is the system
  working. A strike is a wrong-child attribution that reached a family note or an export.
- **Graduate the response instead of terminating it:**
  - **Strike 1 —** immediate and loud. Model attribution drops to *suggest-only*: it may propose a
    child but can never pre-fill one, and every attributed chip requires a confirmation tap.
  - **Strike 2 —** the model stops attributing children entirely. Rules-only attribution, meaning
    explicit name matches and nothing else. The model still classifies record *types*, which is
    most of its value and carries none of the risk.
  - Never a silent continuation, and never a total shutdown.

**Why:** the locked rule kills the product for doing its job. Rules-only cannot resolve *"the
little boy who had a rough drop-off"* to a roster child either — so the day the model path dies,
extraction dies, and extraction is the one feature. The zero-tolerance *spirit* is right, but it
belongs on the outcome that matters — a wrong name reaching a parent — not on the mechanism.

**Honest weakness in my own recommendation:** "uncorrected" errors are detected *retrospectively,
or never*. If she bulk-accepts under time pressure and a wrong attribution reaches a family note,
nothing in the system knows. The strike counter therefore under-reports by construction.
**The real defence is not the counter — it is the confirmation tap on low-confidence
attributions, which prevents the error rather than counting it.** The counter should be treated
as a lagging indicator, not a safety mechanism, and the design should not lean on it.

---

### ② Should observations expire by default

**Locked:** observations expire; incidents and promoted evidence never do. HY3 argues the default
is still wrong.

**Recommendation — reject both poles. The fork is mis-posed, and HY3 is right that the locked
default is wrong without being right about the replacement.**

The first thing to separate is two goals that were treated as one:

- **"Scratchpad, not archive" is a *view* requirement.** She wants a surface that stays light and
  doesn't accumulate guilt.
- **Retention is a *storage* concern.** Nothing about keeping a row forces it onto her screen.

**These are separate dials and should be set separately.** The scratchpad feel is delivered by an
active/archive boundary in the interface — not by deleting anything. That decouples the question
entirely: how long a record *lives* no longer has to be argued from how cluttered her screen feels.

**The arithmetic ends the *storage* argument specifically** — which turns out to be the weaker of
the two arguments for expiry, and the one usually given. 14 children × 3 notes/day × 180 school
days ≈ 7,560 records a year. At ~140 bytes each that is **1 MB per year — 5 MB over five years.**
The model file already on her phone is 2,400 MB. Five years of records is **0.2% of one file the
app already ships.**

So *"we must expire records or the phone fills up"* is simply false, and any argument resting on
it can be dismissed. The argument that survives is a different one.

On the storage axis the downside is entirely one-sided: keeping too much costs nothing measurable;
deleting the wrong thing destroys the contemporaneous record that would have protected her,
permanently, and she discovers this only at the moment she needs it.

### The counter-argument I initially missed, which changes the recommendation

**Storage was never the only reason to expire data — data minimisation is.** Holding
developmental and behavioural records about named two-year-olds *indefinitely* is itself a privacy
posture, and a worse one than holding them briefly. "Keep everything forever" would be the wrong
answer even on a phone with infinite space:

- It is the opposite of what every child-data regime asks for, and if her employer has a retention
  expectation, indefinite retention on a personal device may violate it directly.
- A five-year accumulation is a materially worse thing to lose with the phone than a one-year one.
- "We keep it forever because deleting is scary" is not a policy; it is an absence of one.

**So neither pole is right.** The locked 30-day default is too short — it deletes protective
records before their protective value has expired. Indefinite retention is too long. The correct
shape is a **bounded, generous, school-year-aligned retention**:

- Ordinary observations retain **through the end of the school year plus one term**, not 30 days.
  That comfortably covers the window in which a dispute about the year could arise.
- **Incidents and promoted evidence remain exempt** — unchanged, and correct.
- Expiry becomes **opt-in for early deletion**: she marks a note *scratch* to drop it sooner.
- Year-end rollover performs the retention pass, which is also when the `school_year` field
  earns its place.

**This ties directly to question 3 of the employer ask.** If the school states a retention
expectation, that number wins over anything chosen here — which is another reason to ask before
building the purge job.

---

### ③ What "no sync" should actually lock

**Locked:** phone and laptop do not sync. All three models say this is mis-framed and makes two
later slices unbuildable.

**Recommendation — adopt Kimi's phrasing, with GLM's name for the mechanism.**

Lock this instead:

> **No server. No cloud. No account. No background sync.**
> A deliberate, teacher-initiated, encrypted, same-room transfer is permitted — a *briefcase
> export*, never a sync engine.

**Why:** the original lock was defending two real things — the complexity of a conflict-resolution
engine, and the developer never becoming an operator. Both are fully preserved. What it banned by
accident was the one-directional *export*, which the conference binder and display-board slices
require and cannot be built without.

The word matters. "Sync" implies continuous reconciliation and silent record loss on the device
holding protective records. "Briefcase" implies she picks it up and carries it, once, on purpose.

**Sequencing note that reduces the cost of this decision:** with the model moved onto the phone,
**v1 needs no transfer at all.** The core loop is entirely phone-local. The briefcase is only
needed when the Mac-side slices arrive. So this can be decided now and *built later* — lock the
wording, defer the implementation.

---

## Summary — three decisions

| Fork | Recommendation | Cost if deferred |
|---|---|---|
| ① Wrong-child response | Count uncorrected only; graduate rather than terminate | Schema + review-UI rework; the confirmation-tap defence must be built either way |
| ② Expiry default | School-year-aligned retention (year + one term), not 30 days and not forever; incidents exempt; opt-in early deletion; scratchpad feel delivered by an active/archive **view**, not by deletion | Unrecoverable later — deleted records do not come back. Confirm against the school's own retention expectation before building the purge job |
| ③ "No sync" wording | "No server/cloud/account/background sync" + briefcase export | Wording is free now; only the later Mac slices are blocked by getting it wrong |
