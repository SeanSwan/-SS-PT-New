# ROUND 4 — FULL-SPECTRUM HOSTILE REVIEW + BUILD BLUEPRINT

## How to answer (this overrides any habit you have of staying in a lane)

You are the **only** reviewer on this pass. There is no other model covering the angles you
skip. In earlier rounds you were given a narrow lens ("product lead") and you still produced
the best *architectural* catch and the sharpest *security* insight of the whole session —
despite being pointed away from both. That is the proof that lensing was destroying value.
It has been abolished.

**Answer every angle, at full depth:**

1. **Product** — is this the right thing to build for this person, in this order?
2. **Systems / architecture** — data model, storage, sync, failure modes, migration cost.
3. **Interaction** — the actual physical act of using this with 12 two-year-olds in the room.
4. **Visual design** — hierarchy, legibility one-handed at arm's length, what it looks like.
5. **Security & privacy** — attack it. Assume a motivated adversary and an unlucky day.
6. **Strategy** — what makes this succeed or die in the first three weeks.
7. **Synthesis** — what the pieces above mean together that none of them says alone.
8. **Final-decider judgement** — where the existing decisions are simply WRONG, called plainly.

Declare which angle you consider your strongest, give that one your deepest pass — then cover
all the others anyway. **A reply that stays in one lane is incomplete and will be re-run.**

## Your remit on this pass

### A. HOSTILE REVIEW — attack everything below
Section 4 of the brief is a list of decisions marked "locked." **Treat "locked" as a target,
not as a boundary.** For each one you believe is wrong, say so directly and say what breaks.
Section 5 lists open questions and three unsolved problems. Tell us which of those are
actually fatal, which are non-problems, and which ones we have mis-framed.

Also attack what is NOT there. The highest-value finding of the entire project so far was an
absence — a whole category of work nobody had listed. Do that again.

Rank everything you raise by: **severity × likelihood × cost-to-fix-later**. Be specific about
which slice or file each finding lands in. Vague concerns are worthless here.

### B. BUILD BLUEPRINT — this is a build deliverable, not an essay
The owner is going to build from your answer. Produce, concretely:

1. **Architecture** — components, boundaries, what runs where (phone / her Mac / the 5090).
2. **Data model** — every table/entity, every field, types, indexes, and which fields must
   exist in v1 because adding them later is a storage rewrite.
3. **The capture→extract→correct loop** — exact step sequence, including the failure paths.
4. **Mermaid diagrams.** Give at least: one `flowchart` of the system, one `sequenceDiagram`
   of the core capture loop, one `erDiagram` of the data model, and one `stateDiagram-v2` of a
   record's lifecycle. Use fenced ` ```mermaid ` blocks. Make them syntactically valid.
5. **Wireframes** — monospace/ASCII box-drawing, phone-width, for every v1 screen. Show real
   example content, not `[placeholder]`. Mark tap targets. Show the loading, empty, and error
   state of each screen, not just the happy path.
6. **Slice order** — with a day estimate and a hard acceptance test per slice.
7. **The "do NOT" list** — the things a builder will be tempted to add that would damage this.

Write for a competent builder who has never seen this project and cannot ask you a question.
Every decision you leave open is a decision they will make badly.

### C. Format
Markdown. Long is fine — depth is the point. Lead with the three findings you would defend
hardest if someone told you you were wrong.

---

# THE BRIEF

## Part I — who this is for
## 1. WHAT IS BEING BUILT, AND FOR WHOM

**The user (T):** a solo preschool teacher, ~10–14 children aged 2–3, **no classroom aide**.
Her school year started 2026-08-17. She is not technical and will not maintain a system.
She cannot replace two mandated systems: a commercial parent-comms app (daily notes home)
and a school SIS (attendance). Lesson plans go in a weekly shared spreadsheet.

**Her devices:** a **Galaxy S24-class Android** phone (12GB, Snapdragon 8 Gen 3) and a
**high-RAM MacBook Air (24–32GB)**. NOTE: the owner believes 32GB; the 2024 M3 Air topped out
at 24GB and 32GB exists only on the M4 (2025) Air — so it is either a maxed M3 or an M4 and
the year is off by one. Either way, design to a 24GB floor. Confirm on setup day.

**The owner (O):** the teacher's partner. Runs a personal AI operator bridge ("Hermes") on a
**5090 desktop** that is kept powered on. Wants her system to mirror his architecture. His
own data (business, family, immigration) is in scope for the same gateway — **this layer is
dual-use**.

**Two products:**
1. **Classroom Copilot** — a phone-first capture-and-sort tool for T.
2. **The Switchyard** — the model-routing + privacy-gateway layer underneath it, which also
   protects O's own system.

---


## Part II — decisions currently marked LOCKED (attack these), and what is open
## 4. DECISIONS THAT ARE LOCKED — do not relitigate

- **v1 is one feature:** messy paragraph in → typed records out → one-tap correction.
- **H0 is not an app.** Local assistant on her Mac + paper triage sheet + one phone capture
  habit, then watch 5 school days. The app build is **gated** on her doing the ritual
  unprompted on ≥4 of those 5 days.
- **Platform: Expo Android**, TypeScript, styled-components, `expo-sqlite`, `llama.rn` later.
  No iOS, no native macOS, no `react-native-macos`, no Catalyst. Phone and laptop **do not
  sync** — two tools, different jobs.
- **Voice is a fallback.** Text plus Gboard's on-device dictation is primary. Exception: in
  the rest window with sleeping toddlers and hands free, dictation is arguably the *safest*
  input — GLM argued for promoting it in that one window.
- **Timing anchor: the midday rest window.** Family notes are due before pickup, so an
  after-school dump delivers value after its own deadline. This single catch reshaped the
  product.
- **Scratchpad, not archive** — with the amendment below.
- **Observations expire; incidents and promoted evidence never do.** Kimi caught a
  contradiction: blanket auto-expiry deletes the contemporaneous records that legally
  protect her. `pinned` and `expiryExempt` must exist in the **v1** schema or adding them
  later is a storage rewrite.
- **Three kill criteria, not one:** (1) habit — drafts family notes from the app ≥3 of 5 days
  by end of week 2; (2) accuracy — ≥90% of extracted records accepted without correction over
  a logged sample of 20; (3) **wrong child — zero, full stop.** Two wrong-child errors and the
  model path dies for family notes permanently, rules-only forever.
- **Model tiers (v1 has NO cloud vendor at all):**
  - T1 — her Mac, Qwen3 8B (same brain as O's, so he can support it). Child data: yes.
  - T2 — her Mac, 14B Q4. **Ceiling for child data**, and the fallback for everything.
  - T3 — O's 5090, 70B+, over an encrypted peer-to-peer mesh. Child data: **no**.
  - T4 — a cloud vendor: **deliberately not built.** Add later only on evidence of a real gap.
- **Sensitivity outranks capability, always.** "This is hard" is never a reason to route
  outward — only upward, locally. This is why the high-RAM Mac is load-bearing.
- **Child data never reaches O's 5090.** The school authorised *her*, not him. Encryption
  doesn't change that a person outside the authorised circle controls the hardware. The owner
  accepted this reasoning.
- **Separate knowledge vaults for her and O** — same folder architecture and disciplines,
  separate instances. A merged vault means retrieval bleed both ways, a permanent indexed
  copy of children's records on O's machine, and it collapses the gateway (everything becomes
  potentially tainted). An explicitly-shared third vault for household matters is fine.
- **Hostile review is ported from the owner's own rules**, with a fork: child-data work is
  reviewed by the **local** 14B; child-free project work by a cheap capable reasoner. Trigger:
  *does this output leave her head and go somewhere real?* Never review the trivial sorting pass.
- **Never AI-generate an incident narrative.** Fabrication risk in a legally protective
  document. The assistant checks her fields; it never writes the account.
- **Gateway:** classify-and-block is primary; stripping is defence-in-depth only. Free text
  cannot be reliably de-identified — *"the little boy whose mum is in hospital"* has no name
  and identifies a child completely. The local classifier is **deny-only**: it may veto,
  never authorise. Uncertainty always blocks. The boundary is installed **once, in person, by
  O** — a teacher will not maintain a firewall — with a watchdog that verifies it hasn't
  drifted.

---

## 5. GENUINELY OPEN — needs answers, do not guess

1. **Where is the laptop at midday?** GLM's catch, and nobody had asked. The rest window is
   the anchor, the laptop is the stronger machine, and the devices don't sync — so if the
   laptop isn't physically in the room at rest time, the best model is running where the work
   isn't. **Structural, not a detail.**
2. **What exactly does the school's parent-comms app already record per child per day?**
   Changes the gap list materially — the difference between a top-five absence and a banned
   duplicate.
3. **Does her employer have a policy on child information on personal devices?** Can
   invalidate the whole architecture. Nobody has checked.
4. **Her real rest window and family-note deadline.** Inferred from her schedule, never
   confirmed. If wrong, the anchor is wrong, and the anchor is the product.
5. **Exact Samsung model**, confirmed on setup day.
6. **Does her school network permit a peer-to-peer mesh VPN?** If not, T3 never fires from
   work and everything falls to T2 — which the design already handles, but it should be known.

### Unsolved design problems, flagged honestly by the panel
- **The browser channel voids the privacy claim.** She can open a vendor's chat and paste.
  The honest name for the gateway is "assistant egress guard," not "privacy boundary." The
  mitigation is *not* a stricter gate — a stricter gate increases this risk. It's making the
  local path good enough that she never wants the browser tab.
- **The local model can launder tainted data.** A prompt-injected local assistant with tool
  access can paraphrase a child's note into clean-looking prose before egress; the gateway
  inspects at the door and sees something clean. Taint must propagate through every local
  transform, enforced at the store/tool layer. **This is its own design problem — scope it as
  its own slice, don't pretend the current design covers it.**
- **"Proof" is the wrong standard.** Bounding an adversary's auxiliary information is
  impossible by construction. Report measured miss-rate under adaptive attack, canary values
  that must never appear outbound, and a coverage check — the destination's own records must
  match the gateway's log exactly.

---


## Part III — the slice roadmap as it stands, and the absences found so far
## 7. THE SLICE ROADMAP (from the lensed run — re-derive it, but don't lose it)

S1 capture core (12–15d) · **S2 DONE list + parking lot (2d)** · **S3 incident record (4d)** ·
**S4 triage must/should/extra (3d)** · S5 weekly reset (2d) · S6 promote-to-keep + conference
binder (4d) · S7 sub/sick day sheet (2d) · S8 display-board narratives (4d) · S9 attention
equity + patterns (3d) · S10 supplies queue (2d) · S11 lesson planning (5d) · S12 trust
hardening (3d).

**If she only ever gets three more: S2, S3, S4 — in that order.** S2 because morale features
are load-bearing not decorative and it's two days. S3 because it's the only slice whose
absence can *harm* her. S4 because it's her own stated number one, and a roadmap that ignores
that has failed at listening.

**Honest flag:** her stated #1 lands at slice four. If week-2 data shows triage-level distress,
S4 jumps S3 — knowingly, out loud, with her.

### The absences she never mentioned (the highest-value findings of the whole project)
1. **The protective record** — contemporaneous incident documentation. She listed incident
   *communication*; the record that protects *her* is the part nobody assigns.
2. **Write once, appears four times** — one observation is currently hand-rewritten into the
   family note, the display board, conference prep, and assessment evidence. Her display-board
   rubric *is* an assessment instrument; she's never noticed they're the same object. Largest
   recurring manual labour in her job, absent from her own list.
3. **Attention equity** — which child has gone 9 days with no documented observation.
4. **Pattern view** — same transition, same two children, both missed snack.
5. **A day she isn't there** — sub/sick handoff sheet.
6. **The shadow list** — the email she's been avoiding, promises made at pickup, and wording
   for the three hardest messages in toddler teaching.

---


---

# ORIGINAL ROUND-1 BRIEF (full product context)

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

---

# ORIGINAL ROUND-2 BRIEF (absences + roadmap)

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

---

# ORIGINAL ROUND-3 BRIEF (the privacy gateway)

---
decision: "Design the privacy gateway that sits between a local assistant and any cloud model"
status: open
supersedes: none
sanitized: true
---

# CONSULT PACKET — ROUND 3
## The Redaction Gateway — the component that decides what may leave the machine

**This is a security component.** Design it as one. We want the version that survives a
hostile review, not the version that demos well.

---

## 1. WHAT IT IS

Two people will run a local-first AI assistant:

- **T** — a solo preschool teacher. Her assistant holds developmental observations,
  behaviour notes, toileting and nap records, family circumstances, and incident notes
  about **10–14 children aged 2–3**.
- **O** — the owner/operator. His assistant holds business records, client records, and
  **family/medical/immigration matters**.

Both want to reach strong cloud models (multiple vendors, several providers) for the work
that genuinely benefits: lesson and activity planning, drafting, research, second opinions,
long-form writing, code.

**Neither may leak a real person's identity or sensitive circumstances to any vendor.**

The gateway is the single component every outbound request must pass through. Nothing
reaches a cloud provider except through it.

---

## 2. THE HARD PART — READ THIS BEFORE PROPOSING REGEX

Naive designs strip names and ship the rest. That fails, badly, on free text.

> *"The little boy whose mum is in hospital had a rough drop-off again."*

Zero names. Zero identifiers. Fully re-identifying to anyone at that school. Regex,
named-entity recognition, and token substitution **all pass this through untouched.**

So the central question is not "how do we strip identifiers." It is:

**How do we decide what may leave at all — and how do we prove the decision was right?**

Our working hypothesis, which we want you to attack or improve:

> **Classify-and-block is primary. Stripping is defence-in-depth, never the sole control.**
> Certain content classes never leave the machine regardless of how clean they look after
> redaction. The gateway's main job is refusing, not scrubbing.

If you think that's wrong — that a sufficiently good stripping layer makes free text safe
to send — argue it explicitly and say what would make you confident.

---

## 3. WHAT MUST NEVER REACH A VENDOR

Non-exhaustive; extend it. Assume the worst input, not the typical one.

- Names of children, family members, clients, or staff — including nicknames, initials
  in context, and the possessive forms teachers actually write.
- Government identifiers: national insurance / social-security numbers, passport, visa,
  immigration case numbers, driving licence, tax IDs.
- Contact and location: addresses, phone numbers, email, precise geolocation, the
  school/employer name, room or class identifiers.
- Health: diagnoses, medications, allergies, injuries, therapy, developmental concerns,
  mental-health notes, pregnancy.
- Legal and immigration: case status, hearings, filings, counsel, custody arrangements,
  safeguarding or protective-services involvement.
- Financial: account numbers, card data, balances, payment disputes.
- Credentials: API keys, tokens, passwords, private keys, connection strings.
- **Semantic re-identifiers** — the hard class above. Unique circumstance descriptions
  that identify a person to anyone in their community without naming them.
- **Minor-specific:** any behavioural, developmental, or bodily-function note about an
  identified or identifiable child. Treat this as the highest-sensitivity class in the
  system.

---

## 4. WHAT WE WANT FROM YOU

### 4.1 Architecture
Where does the boundary physically live, and how is bypass made *impossible* rather than
discouraged? Consider: in-process library vs local proxy process vs OS-level egress
control. **Assume the application code is untrusted** — the gateway must hold even if the
app has a bug, a bad dependency, or a prompt-injected instruction telling it to exfiltrate.
Name the enforcement mechanism, not the convention.

Where do provider credentials live, such that the app itself cannot make a direct call?

### 4.2 The decision pipeline
Design the stages a request passes through, in order, with what each contributes and what
it costs in latency. Address at minimum:
- deterministic detection (what it's genuinely good at, and its precise failure boundary)
- roster/entity-aware detection (both users have a small known set of real people)
- model-based classification — and the recursion problem: **a local model classifying
  whether text is safe is itself an inference step; what happens if it's wrong, and how
  is it evaluated?**
- the uncertainty rule: what happens when confidence is low. Be specific about the
  default and why.

### 4.3 Reversible pseudonyms — or not
Substituting stable tokens for real entities lets a cloud reply be re-hydrated locally, so
the user still gets usable output. Tell us whether this is worth it, where the mapping
lives, and how it fails. In particular: does a consistent pseudonym across many requests
leak a social graph to a vendor over time?

### 4.4 Proving it works
**This is the section we care most about.** A privacy control nobody can verify is theatre.
Design the verification: adversarial test corpus, canary tokens, measurable leak rate,
regression gates, and what a red-team exercise against this looks like. What metric would
tell the operator "this is still working" six months from now?

### 4.5 The human in the loop
Both users are the last line of defence and both are busy. Design the moment where a person
sees what is about to be sent. How much friction is correct? What does the preview look
like when the payload is long? What is the failure mode of over-prompting (consent fatigue
— users click through everything), and how do you avoid it without removing the check?

### 4.6 Audit, retention, kill switch
What is logged, where, for how long — and note the trap: **an audit log of what was
redacted is itself a concentrated store of exactly the sensitive data you removed.** Solve
that. Also: the kill switch, and what the system does when the gateway is unavailable
(hint: consider what "fail closed" must mean here).

### 4.7 Slices
Break it into shippable slices ordered by risk retired per day. What is the smallest
version that is genuinely safe to turn on? Be honest if the smallest safe version is
"block everything except an allowlist of clearly-generic requests."

---

## 5. OUTPUT FORMAT (required)

```
## VERDICT
<3 sentences: the single most important design decision>

## ARCHITECTURE
<boundary, enforcement, credential custody, bypass analysis>

## DECISION PIPELINE
<ordered stages, contribution, latency, uncertainty rule>

## PSEUDONYMS
<verdict + mechanism + failure modes>

## PROVING IT WORKS
<test design, metrics, red-team, ongoing assurance>

## HUMAN IN THE LOOP
<the review moment, friction budget, consent-fatigue mitigation>

## AUDIT & KILL SWITCH
<logging, the log-is-also-sensitive problem, failure behaviour>

## SLICES
<S1..Sn, risk retired per slice, smallest safe version>

## HOW THIS LEAKS ANYWAY
<3 concrete mechanisms by which this design still leaks. mandatory.>

## DISSENT
<where this packet is wrong. mandatory.>
```

Both **HOW THIS LEAKS ANYWAY** and **DISSENT** are mandatory. We are explicitly hunting
the reviewer who breaks our own proposal.
