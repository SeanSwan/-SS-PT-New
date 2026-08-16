---
decision: "Design a local-first, phone-first AI classroom assistant for a solo preschool teacher; pick the v1 feature set that ships fastest"
status: open
supersedes: none
sanitized: true
---

# CONSULT PACKET — "Classroom Copilot"
## A local-first AI assistant for one preschool teacher working without an aide

**You are one of several independent reviewers.** Answer on your own. Do not hedge toward
a consensus you cannot see. Disagreement is more useful to us than agreement.

---

## 0. PRIVACY NOTICE — READ FIRST

This packet is **deliberately sanitized**. The real user is a specific person and the real
data is developmental observations about **named children aged 2–3**. All names, the school,
the room, the region, and the classroom theme have been stripped. Do not ask for them, do not
invent them, and do not include any placeholder that looks like a real name in your reply.

Refer to the user as **"T"** (the teacher) and to children as **C1..Cn**.

---

## 1. THE USER

- One preschool teacher. Class of roughly 10–14 children, ages ~2–3.
- **No classroom aide.** She is alone with the class all day.
- Day runs ~8:30–14:45 with extended care bracketing it (7:30 early, 17:30 late).
- She already uses, and **cannot replace**, two center-mandated systems:
  - A commercial **parent-communication app** (daily reports, photos, incident notes to families).
  - A separate **school SIS** for attendance.
  - Lesson plans are submitted weekly as a **shared spreadsheet**.
- She is not technical. She will not maintain a system. She will not learn a schema.
- Her stated ask, verbatim in spirit: *"I want to be more organized — like my assistant for the
  whole year, because I don't have an aide."*

### Her own words about how she wants to interact with it
She described dumping a chaotic voice-to-text paragraph at the end of a day, e.g.:

> "today was crazy. C4 had a hard time cleaning up. C7 loved the playdough. I need more wipes.
> A parent asked me about nap. I need an apple activity for tomorrow and I forgot to print the
> family pictures."

…and having it sorted automatically into: child follow-up, developmental observation, parent
follow-up, supply need, tomorrow's activity, prep task. **This unstructured-in / structured-out
loop is the product.** Everything else is furniture.

She named three habitual moments she would actually use:
- **Morning:** "what do I need today?"
- **After school:** "end-of-day reset" — the brain dump above.
- **Friday:** "weekly reset" — close the week, set up next week.

Plus all-day micro-capture: *"add: need glue sticks"*, *"C7 counted 5 bears by herself"*,
*"a parent said C2 is out Friday."*

### The domains she listed as needing help
Weekly planning · daily planning · per-child notes & observations · parent-app daily notes ·
parent emails/newsletters/hard conversations · classroom management (a points/reward system,
routines, transitions) · school admin (meetings, deadlines, forms, trainings) · supplies &
prep · and — she flagged this as **the most important one** — triaging her workload into
**MUST / SHOULD / EXTRA** so she isn't attempting 47 things after work.

She also asked for an **idea parking lot** (so good ideas don't derail today) and a **DONE
list** (because otherwise she feels like nothing is getting accomplished when she is in fact
doing a great deal). Both are morale features, not organizational ones. Treat them as such.

### Two documentation obligations that recur forever
1. **Daily family notes** in the parent app — she must write these every day, per child or per
   class. This is the single highest-frequency writing task she has.
2. **"Making learning visible" boards** — physical displays where an observation is turned into
   a short narrative: what happened → what the child was practising → which developmental skill
   it shows → what to offer next. She must keep two of these current.

---

## 2. HARD CONSTRAINTS (already decided — do not relitigate)

| # | Constraint | Why |
|---|---|---|
| C1 | **Child data never leaves her device.** On-device inference only for anything containing a child's name, note, or observation. | See §3. This is a legal posture, not a preference. |
| C2 | Cloud AI is permitted **only** for generic content containing zero child data (activity ideas, song lists, a newsletter template). | Quality where it's free of risk. |
| C3 | Phone-first capture, laptop second. | Her highest-value moments happen mid-class with a phone in one hand. |
| C4 | She must never have to organize her input before speaking. | The whole point. If she must categorize, we've rebuilt the burden. |
| C5 | Zero maintenance. No schema editing, no admin panel, no "set up your taxonomy." | She will abandon anything that asks for upkeep. |
| C6 | It must not duplicate the parent-comms app or the SIS. It **feeds** them. | Center-mandated; unreplaceable; re-typing is the enemy. |

### The owner's stack (for reuse, not for dogma)
React 18 + TypeScript + styled-components; Node/Express + Sequelize + PostgreSQL. The owner
proposed **React Native** so it runs on her **2024 MacBook Air (Apple Silicon)**.

**Known complication we want you to resolve, not dodge:** Expo does not target macOS. Native
Mac means Microsoft's `react-native-macos` fork or Mac Catalyst, neither of which is a clean
Expo path. Meanwhile an iOS build of an Expo app *does* run on Apple Silicon Macs. State
plainly which platform path you would take and what it costs.

---

## 3. THE LEGAL / ETHICAL FRAME (context for your recommendation)

- **FERPA** governs the education record and who may access it.
- **COPPA** regulates *operators* who collect personal information from children under 13.
- A teacher's **personal, on-device planning notes** are legally close to her paper notebook.
- **The moment those notes sync to a server the developer controls, the developer becomes an
  operator of the developmental records of a dozen 2-year-olds** — with consent, retention,
  breach, and parental-access obligations attached, and a school that never vetted them.
- She may also be bound by her employer's own data policy, which we have not seen.

We have therefore chosen local-first. **Tell us if you think this is wrong**, and tell us the
specific failure mode our choice creates (e.g. device loss, no backup, no cross-device sync).

---

## 4. THE THING NOBODY SAID OUT LOUD

**Her school year starts in 2 days.** Her current unfinished list is physical and immediate:
classroom labels, a per-child display, the reward-system mechanics, first-week lesson plan,
first-day materials, rest-time and restroom procedures, and getting the parent-comms app and
attendance system ready.

No trustworthy app ships in 48 hours. So we want your plan in **three explicitly separate
horizons**, and we want you to be honest about which horizon actually matters most:

- **H0 — this weekend (0–2 days):** what genuinely helps her Monday. It is entirely acceptable
  for your answer to be "not an app."
- **H1 — first 2 weeks:** the smallest shippable thing that earns daily use.
- **H2 — the school year:** what it grows into, and what must be designed for now so H1 doesn't
  block it.

A plan that is architecturally beautiful and arrives in October has failed.

---

## 5. WHAT WE WANT FROM YOU

Answer these directly. Be concrete. Name real libraries, real model sizes, real file layouts.

1. **The ONE feature.** If she gets exactly one working feature, which is it, and why that one?
   Defend it against the two runners-up.
2. **H0 / H1 / H2 plan** per §4, with a rough day-count on H1.
3. **Platform verdict.** Resolve §2's Expo-vs-macOS fork. What actually gets built, and what
   is the fallback if the primary path stalls?
4. **Local inference design.** Which model, which runtime, which quantization, what RAM floor?
   Note: the machine may have **8GB or 16GB** — we do not know yet. Give an answer for both,
   and say what degrades on 8GB. What runs when the model is too slow or absent — what is the
   non-AI fallback path so the app is still useful?
5. **Voice capture.** On-device speech-to-text choice and its failure modes in a **loud room
   full of toddlers**. This is the riskiest input assumption in the whole product — attack it.
6. **Data model.** The minimum entity set. Be ruthless; we suspect it is far smaller than the
   domain list in §1 suggests.
7. **The sorting engine.** How does one messy paragraph become correctly-typed records? What
   happens when it guesses wrong? Design the correction affordance — she will not tolerate
   cleaning up after it.
8. **Backup & device loss.** Local-first's biggest hole. Solve it without becoming an operator.
9. **What we are missing.** Absence-first: what should exist in this product that nobody in this
   packet has mentioned? Rank by value to her, not by novelty.
10. **How this fails.** Three concrete, specific failure modes. Not "adoption risk" — actual
    mechanisms. The most useful answer you can give us is the one that stops us shipping
    something she quietly abandons in week 3.

### Also address, briefly
- Is a **general-purpose local assistant** (Ollama + a good system prompt + a notes folder) a
  better answer for her than a **purpose-built app**? Argue it honestly — the owner has an
  existing personal AI-operator setup he could clone onto her Mac in an evening. If cloning
  that is the right call, say so and we will not build an app.
- What does she gain that a **paper notebook plus the parent-comms app** does not already give
  her? If the honest answer is "not much," say that.

---

## 6. OUTPUT FORMAT (required — we synthesize across reviewers)

```
## VERDICT
<3 sentences max. The single most important thing we should do.>

## THE ONE FEATURE
<name it, defend it, name what you rejected>

## H0 / H1 / H2
<the three horizons, with day counts on H1>

## ARCHITECTURE
<platform verdict, stack, local-inference design, data model, file layout>

## RISKS
<3 concrete failure mechanisms, most likely first>

## WHAT YOU'RE MISSING
<absence-first gap list, ranked>

## DISSENT
<where you think this packet's own assumptions are wrong — required, not optional>
```

The **DISSENT** section is mandatory. A reply without it is incomplete. We are explicitly
looking for the reviewer who tells us the premise is flawed.
