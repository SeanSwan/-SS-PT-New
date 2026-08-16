---
decision: "Round 2 — absence-first gap analysis + the full slice roadmap beyond v1"
status: open
supersedes: none
sanitized: true
---

# CONSULT PACKET — ROUND 2
## "What did she leave out?" + the complete slice roadmap

**You reviewed round 1. This is a different question.** Do not re-argue round 1's settled
decisions (listed in §2). Round 1 asked *what is the smallest thing that earns daily use*.
**Round 2 asks: what is the whole arc, and what is missing from her own description of it?**

Refer to the user as **T** and to children as **C1..Cn**. Never invent a real-sounding name.

---

## 1. WHY THIS ROUND EXISTS

The product owner's words: *"we need to have a plan that reaches out beyond what we're just
gonna set up for the base, so we can continuously work on it and make it better — enterprise
level even. But I want the most important stuff met first."*

So: the v1 stays small. But we now need **the full sequence after it**, and we need to know
**what T left out of her own description** — she wrote a spec by accident, from inside her
own overload, and people in that state under-describe the things that hurt most.

---

## 2. SETTLED — DO NOT RELITIGATE

- **One v1 feature:** messy paragraph in → typed records out → one-tap correction.
- **H0 is not an app.** Local assistant on her laptop + a paper triage sheet + one phone
  capture habit, gated on 5 school days of unprompted use before any app is built.
- **Platform:** Expo **Android** (her phone is a 12GB Snapdragon 8 Gen 3 flagship).
  React Native, TypeScript. No iOS, no native macOS.
- **Her laptop is high-RAM Apple Silicon (24–32GB)** — it can comfortably run a 14B–32B
  class quantised model. It is now clearly the *stronger* of her two devices.
- **Phone and laptop do not sync.** Two tools, different jobs.
- **Voice is a fallback**; text + the phone keyboard's on-device dictation is primary.
- **Grammar-constrained JSON** from a small on-device model; deterministic rules first;
  a rules-only path must remain fully usable if the model never loads.
- **Backup:** encrypted in-app with T's own passphrase, then to T's own cloud account.
  The developer never runs a server, holds a key, or can read a byte.
- **Scratchpad, not archive.** Anything a child's record needs flows same-day into the
  school's mandated systems; child-linked items auto-expire on a rolling window.
- **Timing anchor:** the midday rest window, because family notes are due before pickup.
- **Kill criterion:** if by end of week 2 she drafts family notes from the app on fewer
  than 3 of 5 days, stop building.

---

## 3. WHAT T ASKED FOR, IN HER OWN FRAMING

She listed these domains. **This list is your raw material for absence analysis.**

- **Weekly planning** — pacing, activities, learning centres, art, sensory play, books,
  songs, outdoor ideas, and what must be prepped.
- **Daily planning** — "what do I need tomorrow," turned into a realistic priority list.
- **Children** — individual notes, interests, skills being worked on, observations,
  parent-conference prep, and ideas for supporting each child.
- **Daily family communication** — wording daily notes, developmental observations,
  parent updates, incident/accident communication, reminders. *Highest-frequency task.*
- **Parents** — emails, announcements, newsletters, reminders, difficult conversations,
  warm little classroom updates.
- **Classroom management** — a positive-reinforcement points system with a per-child
  tracker, routines, transitions, cleanup, toileting routines, behaviour supports,
  classroom jobs, labels, visuals, organisation.
- **School/admin** — meetings, deadlines, forms, curriculum requirements, assessments,
  events, dress-up days, mandated trainings, and things administration asks of her.
- **Supplies** — what's low, what to make/buy/print/laminate, what can wait.
- **Her workload** — *she called this the most important*: sorting everything into
  must-do / should-do / would-be-nice so she isn't attempting 47 things after work.
- **An idea parking lot** — so good ideas don't derail today.
- **A DONE list** — "because otherwise you feel like nothing is getting accomplished
  when you're actually doing a ton."
- **A weekly reset** — close the week, carry over what didn't finish, set up next week.
- **Two "making learning visible" display boards** — an observation turned into a short
  narrative: what happened → what the child was practising → which developmental skill
  it demonstrates → what to offer next.
- **A monthly character-trait focus** she must notice and document children exhibiting.

Structural facts about her situation: solo with 10–14 two-year-olds, no aide; a fixed
daily rhythm with specials on set days; extended care bracketing the school day; lesson
plans submitted weekly as a shared spreadsheet; a separate mandated parent-comms app and
a separate school attendance system, neither replaceable.

---

## 4. WHAT WE WANT FROM YOU

### 4.1 Absence-first gap analysis — the main event
**What did T leave out?** She described her job from inside her own overload. People in
that state systematically under-report certain categories. Find them.

Consider at minimum, and go beyond them:
- What does a solo teacher of two-year-olds need that she would **never think to ask
  software for** — because she assumes it's just part of the job, or because she's
  never seen it done?
- What is she doing **repeatedly by hand** that she didn't list because it's invisible
  to her?
- What costs her the most **emotional** energy, as distinct from time? (She named a
  morale feature unprompted — that is a signal, not a decoration.)
- What will she need in **month 3** that is invisible in week 1? (Conferences,
  assessments, a child who regresses, a difficult family, a licensing visit, a
  substitute day, her own sick day.)
- What breaks when a child **joins or leaves mid-year**?
- What does she need when something goes **wrong** — an incident, an allegation, a
  parent dispute, an injury? Note that contemporaneous documentation is often the only
  protection a teacher has, and she did not mention this once.

Rank every gap by **value to her**, not novelty. For each: name it, say why she omitted
it, and say which slice it belongs in.

### 4.2 The complete slice roadmap
Give a numbered sequence of **independently shippable slices**, from the v1 already
decided through the mature product. For each slice:

```
S<n> · <name>
  Ships:      <what exists after this slice that didn't before>
  Value:      <the specific thing that gets better for T>
  Depends on: <prior slices>
  Gate:       <the observable fact that says "this worked, go on">
  Effort:     <rough days>
```

Order by **value-per-day and risk-retirement**, not by architectural tidiness. State
plainly where you would stop if she only ever gets three more slices.

### 4.3 The "enterprise level" question — answer honestly
The owner used the phrase "enterprise level." **There is a real tension here and we want
you to name it, not flatter it.** Enterprise normally means multi-user, admin oversight,
audit, SSO, retention policy, support. But:

- This product's entire compliance posture rests on **no developer-controlled
  infrastructure**. The moment a second teacher's data touches shared infrastructure the
  developer becomes an operator of children's records, with consent, retention, breach,
  and parental-access obligations, and a school that never procured them.
- There are already well-funded incumbents selling centre-wide platforms to
  administrators. A solo-teacher tool is a different product in a different lane.

So answer: **Is there an enterprise path that does not destroy the local-first posture?**
If yes, describe the exact architectural fork and when it must be taken. If no, say so and
describe what "enterprise-grade" should mean *for a single-user tool* instead — robustness,
recoverability, trustworthiness, and the professional-quality bar — which may be the more
useful reading of the owner's intent.

### 4.4 What to never build
An explicit ban list, with reasons. Round 1 produced several; extend it. The most valuable
entries are things that sound obviously good and are actually traps.

---

## 5. OUTPUT FORMAT (required)

```
## TOP 5 ABSENCES
<ranked; each: what / why she omitted it / which slice>

## FULL GAP LIST
<everything else, grouped, ranked within group>

## SLICE ROADMAP
<S1..Sn in the block format above>

## IF SHE ONLY GETS THREE MORE SLICES
<which three, and why those>

## ENTERPRISE VERDICT
<the fork, or the honest reframe>

## NEVER BUILD
<ban list with reasons>

## DISSENT
<where this packet or round 1 is still wrong — mandatory>
```

DISSENT is mandatory. We are explicitly hunting the reviewer who says the plan is still
wrong about something important.
