# ROUND 5 — HOSTILE + SECURITY REVIEW OF THE CURRENT BUILD PLAN

## How to answer

**Full spectrum, no lane.** Answer across product, systems/architecture, security, interaction,
data modelling, logic correctness, and strategy. Declare which angle is your strongest, go deepest
there, then cover every other angle anyway. **A reply that stays in one lane is incomplete and
gets re-run.**

You reviewed an earlier round of this project. **This round is different: you are reviewing
decisions the orchestrating agent made ON TOP of your panel's findings — and nobody has checked
those.** They are the least-reviewed material in the project and the most likely to be wrong.

---

## A. THE SPECIFIC CLAIM TO VERIFY OR DESTROY FIRST

The locked kill criterion was *"two wrong-child errors and the model path dies permanently."*
The orchestrator changed it to count only **uncorrected** errors, and asserted:

> *"What counts as a strike is derivable from the v1 schema — no new field needed. A
> `child_corrected` event whose `at_ut` is later than a `handed_off` event on the same
> `record_id` means the wrong attribution reached a family note. Earlier means she caught it in
> review, which is not a strike."*

**Attack this claim specifically.** Is it actually sound? Consider at minimum:
- Clock behaviour: device time changes, DST, NTP correction, timezone travel, two events in the
  same millisecond, monotonicity assumptions.
- Whether `handed_off` on a *record* is even the right granularity, given a family note is
  assembled from multiple records and copied as one blob.
- Re-copy after correction; copy, correct, copy again; copy then dismiss.
- Records edited but never handed off; handed off but never accepted.
- Whether "she corrected it" reliably means "the model was wrong" — she may be changing her mind,
  fixing her own typo, or reassigning a note that was ambiguous rather than wrong.
- Whether this is measurable at all if she never notices the error (the orchestrator already
  concedes the counter under-reports; say whether that concession is sufficient or whether the
  whole criterion is unsound).

If the claim is wrong, say so plainly and give the correct design. If it needs a schema field
after all, name the exact field — the project treats "unrecoverable if missing from v1" as the
real migration risk.

## B. ATTACK THE THREE PROVISIONAL DECISIONS

Each was made by the orchestrator, not by the owner, and each is marked reversible. Attack all
three on merits — product, legal, security, and implementation:

1. **Wrong-child response:** count uncorrected only; graduated degradation (strike 1 →
   suggest-only + confirmation tap; strike 2 → rules-only attribution, model still classifies
   types) instead of permanent death of the model path.
2. **Retention:** ordinary observations retain through end of school year + one term; incidents
   and promoted evidence exempt; opt-in early deletion ("scratch"); scratchpad feel delivered by
   an active/archive **view** rather than deletion. Rationale given: the storage argument for
   expiry is false (5 MB per five years vs a 2,400 MB model file), but indefinite retention is
   also wrong on data-minimisation grounds.
3. **Sync wording:** replace "phone and laptop do not sync" with *"no server, no cloud, no
   account, no background sync; a deliberate, teacher-initiated, encrypted, same-room transfer is
   permitted — a briefcase export, never a sync engine."* Claim attached: with the model on the
   phone, **v1 needs no transfer at all**, so this is decide-now/build-later.

## C. SECURITY REVIEW

Full pass on the design as it now stands. The v1 posture is deliberately built from absences —
no `INTERNET` permission, `allowBackup=false`, no accounts, no third-party SDKs, no notifications,
no stored audio, no photos. Attack that posture. Where does it leak anyway? What has been assumed
rather than verified? Assume a motivated adversary, a lost phone, a subpoena, a prompt-injected
local model, and an unlucky day.

Note the data class: developmental and behavioural records on named children aged 2–3, held by
their teacher on a personal device, plus legally protective incident records.

## D. BUGS, ERRORS, LOGIC UPGRADES

Go through the data model, indexes, the capture→extract→correct loop, the expiry guard, and the
failure paths. Find **concrete defects**: wrong types, missing constraints, race conditions,
incorrect index coverage, guard logic that does not actually guard, states that cannot be reached
or cannot be left, failure paths that silently lose data. Give the corrected version, not just the
complaint.

## E. ENHANCEMENTS

Anything you see that would materially improve this — for the teacher's daily reality, for
correctness, for safety, or for the builder's ability to ship it. Absence-first: what *should*
exist that nobody has listed?

## F. THE NEXT SLICE — YOUR CALL

End with an explicit recommendation: **what should be built or decided next, and why that rather
than the alternatives.** Rank the top three candidates. Be concrete enough to act on without
follow-up questions. Note that three questions to the teacher and her employer remain unanswered,
and say whether any of them block your recommendation.

## Format

Markdown. Lead with the three findings you would defend hardest. Rank everything by severity ×
likelihood × cost-to-fix-later. Include a **DISSENT** section stating where this packet's own
assumptions are wrong.

---

# PART 1 — WHAT THE PANEL FOUND LAST ROUND (context)

# Round 4 — Unlensed Panel Synthesis

**Date:** 2026-08-16 · **Rule:** first run under Rule 82 (full-spectrum, no narrow lenses)
**Panel:** GLM 5.3 · Kimi K3 · HY3 — identical packet, identical remit, all angles required
**Cost:** GLM $0 (subscription) · Kimi $0.311 · HY3 $0.007 · **total ≈ $0.32**
**Replies:** `51-glm-r4-unlensed.md` (+ `55-glm-r4-tail.md`) · `52-kimi-r4-unlensed.md` · `53-hy3-r4-unlensed.md`

---

## 0. Did the re-run justify itself?

Yes, decisively. Unlensed, the panel found **defects the lensed round had not surfaced at all**,
including one critical data-leak path that no round had ever named. Two of the three models
independently converged on the same structural defect from different starting angles — which is
the evidence lensing was destroying, because a lensed panel is *designed* not to overlap.

**Rule 82 is now live on `main` (`8257e42b6`), in both `CLAUDE.md` and `AGENTS.md`.**

---

## 1. Per-model calibration — who caught what, on which angle

*(Required by Rule 82; feeds Rule 68 `## External-model calibration`. This is how the routing
table becomes learned from evidence rather than asserted.)*

| Model | Declared strongest | Unique catches nobody else got | Verdict on value |
|---|---|---|---|
| **GLM 5.3** | Systems / architecture | Backup slice **absent from the entire roadmap** while incidents never expire; **O's dev loop is the likeliest first leak** (real captures in logs/screenshots/fixtures); lock-screen notification disclosure; raw-audio retention policy; school-year rollover fields; multilingual families | **Highest.** Deepest blueprint, best-argued reversals, only model to produce a complete setup-day runbook. Vindicates the re-run entirely. |
| **Kimi K3** | Security / privacy | **Android Auto Backup is ON by default and ships the SQLite DB to Google Drive with zero code written** — the single worst finding in the project; `expo-sqlite` is **unencrypted at rest** → SQLCipher + Keystore; paper recovery key (a non-technical user *will* forget a passphrase); **photos** belong on the do-NOT list before someone builds them; O bus-factor; hash-only audit logs; roster lifecycle is 3 screens in S1, not a slice | **Critical.** Worth 20× its $0.31 for the Auto Backup finding alone. Its threat model is the first one properly stated. |
| **HY3** | Systems / architecture | Default expiry is **still wrong even with `pinned`/`expiryExempt`** — expiry must be opt-in per record, not default-on for observations; kill criterion should trigger on **uncorrected** wrong-child, not on a model guess she fixed; **restore on a new phone without O**; a wellbeing nudge for the teacher herself (she is solo, no aide) | **Strong for $0.007.** Sharper than expected on legal-risk framing; weakest on the device-tier question. |

**Routing lesson:** all three produced full-spectrum answers when asked. None needed a lens to
be useful, and the cheapest model produced a legal-risk catch the expensive ones missed.

---

## 2. Convergence — independently reached, therefore high confidence

| Finding | GLM | Kimi | HY3 |
|---|---|---|---|
| The "no sync" lock is mis-framed and makes S6/S8 unbuildable | ✔ | ✔ | ✔ |
| **Q3 employer policy is fatal and blocking** — answer it before anything else | ✔ | ✔ | ✔ |
| Taint-laundering must be its own slice, not folded into the gateway | ✔ | ✔ | ✔ |
| The phone has **no assigned model tier** — the core loop has no brain at the anchor moment | ✔ | ✔ | (different fix) |
| Kill criteria are **unmeasurable** — no events/corrections tables exist | ✔ | ✔ | — |
| Gboard dictation is **not provably on-device** and violates the project's own privacy lock | ✔ | ✔ | (flagged as unknown) |
| **No `INTERNET` permission** is the real v1 boundary, not the classifier | ✔ | ✔ | — |
| The round-3 gateway is **dead code in v1** — nothing egresses yet | ✔ | ✔ | partial |

---

## 3. The six defects that must change

Ranked by severity × likelihood × cost-to-fix-later.

**D1 · Android Auto Backup silently exfiltrates the child database.** *(Kimi, unique)*
An Expo app has `allowBackup` on by default; Android copies the app sandbox — including
`copilot.db` — to the user's Google Drive. Child data leaves the device with **zero code
written and no user action**. Every privacy control designed over three rounds sits downstream
of this. Fix: `android:allowBackup="false"`, `fullBackupContent="false"`, verified on setup day.

**D2 · The core loop is assigned to the wrong device.** *(GLM + Kimi, converged)*
Round 1 settled on-phone extraction; rounds 3–4 locked the extraction tiers to her Mac. Both
cannot be true. At 12:47 in a dark room with sleeping toddlers, the Mac is in another building.
Fix: **T0 = Qwen3-4B Q4_K_M on the phone** via `llama.rn`, rules-first, model optional. The Mac
becomes the evening/weekly engine for work that is already evening-shaped. Open question #1
("where is the laptop at midday?") is **dissolved**, not answered.

**D3 · The kill criteria cannot be measured, and the history is unrecoverable.** *(GLM + Kimi)*
"≥90% accepted without correction" and "wrong child — zero" require an append-only event log
that does not exist in any schema draft. Day-one behaviour that isn't logged is **gone forever** —
this, not the `pinned` flag, is the true "must exist in v1" item. Fix: `RECORD_EVENT` table
written from the first build, plus `attribution_src` so a model guess is distinguishable from
her own choice.

**D4 · The product ends one step short of its own deliverable.** *(GLM, unique)*
The value is realised *inside the mandated parent app*. The draft→paste handoff, ×10–14 children
against a pickup deadline, appears in no brief, no slice, and no kill criterion. If copying is
clumsy she reverts to typing directly into the parent app and the habit metric reads
false-positive for weeks. Fix: a dedicated Family-Notes screen with per-child **[Copy note]** and
a `handed_off` event per copy.

**D5 · The locked input choice violates the locked privacy constraint.** *(GLM + Kimi)*
"Gboard's on-device dictation" is not provably on-device — it depends on per-device settings,
language packs, and account state, and falls back to network recognition silently. The project
already wrote the correct rule (*uncertainty always blocks*) and failed to apply it to its own
keyboard. Fix: long-form dictation moves in-app to **`whisper.rn`**, which is provably egress-free
once the build has no network permission.

**D6 · There is no backup slice, and the data that never expires has no survival story.**
*(GLM, unique; Kimi adds the recovery key)*
Incidents are legally protective and exempt from expiry — and a lost phone in October destroys
them permanently. S1–S12 contain no backup slice at all. Fix: encrypted backup/restore in S1c,
a **hand-written paper recovery key** in her classroom drawer (never photographed, never in O's
vault), and a quarterly restore drill.

---

## 4. Genuine disagreements — these need your call, not mine

**① The wrong-child response.** Locked: *two errors and the model path dies permanently.*
- **GLM:** uphold it; just define the term precisely and instrument it.
- **Kimi:** it is *a suicide pact* — rules-only cannot resolve "the little boy who had a rough
  drop-off" either, so the day the model dies the **product** dies, because extraction is the
  one feature. Proposes **graduated degradation**: raise the confirmation threshold → shrink
  model scope → rules-plus-manual.
- **HY3:** trigger on **uncorrected** wrong-child only — an error she caught and fixed in the
  review pass is the system working, not failing.

*My read:* Kimi and HY3 are both right about different halves. The criterion should count
**uncorrected** wrong-child reaching a family note (HY3), and the response should be graduated
rather than terminal (Kimi) — but the *zero-tolerance spirit* is what protects her, so the first
strike should be loud and immediate.

**② Expiry default.** HY3 argues that even with `pinned`/`expiryExempt`, defaulting ordinary
observations to expire is a legal time bomb — a contemporaneous note about biting that wasn't
promoted yet can be the only thing that protects her. Proposes expiry becomes **opt-in per
record** ("scratch"). GLM and Kimi both accepted the locked amendment as sufficient.
*This is a real fork and it is cheap to decide now, expensive later.*

**③ Sync.** All three say the lock is mis-framed. GLM: deliberate encrypted "briefcase" export.
Kimi: lock *"no server, no cloud, no account"* instead of "no sync", and same-room E2EE transfer
is fine. HY3: an explicit local transfer path is **mandatory**, not optional.

---

## 5. Blocking — do these before any code

1. **Employer policy on child data on personal devices.** Unanimous: *potentially fatal to
   everything, costs one conversation.* It has been mid-ranked for three rounds while an entire
   tier architecture was designed around an unasked HR question.
2. **Her real rest window and family-note deadline.** The anchor is the product; it has never
   been confirmed, only inferred.
3. **What the parent-comms app already records per child per day.** Determines the handoff
   format, and therefore blocks the S1c UI freeze.

---

## 6. What survived hostile review intact

Worth stating, because after four rounds it is evidence the core is sound: v1-is-one-feature;
the H0 no-app gate; the midday anchor; sensitivity-outranks-capability; child data never touching
O's hardware; separate vaults; never AI-generating an incident narrative; T3/T4 staying unbuilt.
GLM's summary: *"everything else locked survives hostile review substantially intact, which —
after four rounds — is itself evidence the core is sound."*

---

## 7. The organising principle the panel converged on

**Controls must be verifiable by someone who isn't standing there.**

No-network beats a classifier (you can `aapt dump` it). Synthetic fixtures beat a no-real-data
policy (a repo diff proves it). Events beat impressions (SQL counts them). The v1 security
posture is built almost entirely from **absences** — no network, no accounts, no SDKs, no
notifications, no stored audio, no photos, no backup-to-Google — and gates appear only when
egress does. That is also why the round-3 gateway, however well designed, is the wrong thing to
build first: **v1's strongest boundary is an empty socket.**

---

# PART 2 — THE ORCHESTRATOR'S DECISIONS (your primary review target)

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

---

# PART 3 — THE TECHNICAL SPEC AS IT NOW STANDS

## B1. Architecture

```text
┌────────────────────────── PHONE (Galaxy S24-class) ──────────────────────────┐
│  Classroom Copilot — Expo dev-build target, RELEASE BUILD HAS NO             │
│  android.permission.INTERNET (verified: aapt dump permissions)               │
│                                                                              │
│  UI layer (React Native, styled-components)                                 │
│    CaptureScreen (rest mode + day mode) · InboxScreen · CorrectionSheet      │
│    FamilyNotesScreen · IncidentScreen · TodayScreen · Settings(O-gated)      │
│                                                                              │
│  Services (pure TS where possible)                                           │
│    rulesEngine      — sentence split, roster phonetic match, regex classify   │
│    extractionService— llama.rn, Qwen3-4B-Instruct Q4_K_M, JSON-schema-       │
│                       constrained output; OPTIONAL — app fully works without │
│    dictationService — whisper.rn ggml-base int8; audio never persisted       │
│    store            — expo-sqlite, raw SQL + typed helpers, no ORM           │
│    handoff          — per-child Clipboard.setStringAsync                     │
│    backup           — WebCrypto AES-256-GCM, key = PBKDF2(expo-crypto)       │
│                       writes .ccbak via SAF; share-sheet → her Drive app     │
│    modelImport      — SAF ACTION_OPEN_DOCUMENT → copy GGUF into sandbox      │
│                       (no network needed, ever)                              │
└──────────────────────────────────────────────────────────────────────────────┘
        │ deliberate encrypted briefcase (USB / home Wi-Fi), weekly, manual
┌────────────────────────── MAC (home, evenings) ──────────────────────────────┐
│  Briefcase Studio — small local web app (Vite + Node, localhost only)        │
│  Reads decrypted snapshot READ-ONLY · runs Ollama Qwen3-14B for the heavy    │
│  jobs (S6 conference binder, S8 display narratives, S11 planning, later      │
│  translation). Outputs PDFs/print. No writeback to phone in v1.              │
└──────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────── O'S 5090 / ANY CLOUD ──────────────────────────────┐
│  NOT BUILT IN v1. T3 (child-free only, mesh) and T4 activate only with a     │
│  future evidence-gated slice, at which point the round-3 gateway design      │
│  (classify-and-block, deny-only, taint propagation, canaries) ships WITH     │
│  the first egress path, not before.                                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Why no-network is the real v1 boundary.** The app cannot leak what it cannot send — this holds against bugs, poisoned dependencies, and prompt injection alike (round 3's untrusted-application requirement), costs one config line, and is machine-auditable. Dev/debug builds keep network for Metro; her daily build does not have the permission at all. Model files enter via the system file picker (SAF), which needs no INTERNET permission. Backups reach her cloud *through the OS*: the app hands an encrypted file to the Drive app via share sheet — the developer of Copilot never operates anything, satisfying round 1's operator-avoidance exactly.

**Known integration risk (flagged, with fallback):** `llama.rn` inside an Expo dev build on current RN/Hermes. If it stalls, S1b slips and the app still ships — the rules-only path is a locked design feature, not a degradation mode we're embarrassed by.

**Storage layout on device (app sandbox):**

```text
/files/copilot/
  copilot.db            # expo-sqlite DB (see B2); OS file-based encryption at rest
  models/
    qwen3-4b-q4km.gguf  # ~2.4GB, imported via SAF on setup day
    whisper-base.int8.gguf
  backups/              # .ccbak staging before share-to-Drive
  logs/                 # redacted diagnostics (event counts, errors — never record bodies)
```

## B2. Data model

Every table, every field. `UT` = Unix ms UTC. The v1-must-exist list at the end is ordered by *unrecoverable-if-missing*, which is the actual rewrite risk — not column additions, which SQLite migrations handle trivially.

**CHILD**
| field | type | notes |
|---|---|---|
| id | TEXT PK | uuid |
| first_name | TEXT NOT NULL | what she calls them |
| last_initial | TEXT | |
| color | TEXT NOT NULL | chip color, chosen to avoid collisions |
| status | TEXT CHECK IN (`active`,`left`) | deactivation, never deletion |
| join_date / leave_date | TEXT ISO date | mid-year churn, rollover |
| school_year | TEXT NOT NULL | e.g. `2026-27`; rollover partitioning |
| aliases | TEXT JSON | nicknames, dictation variants (generic nickname variants) |

**CAPTURE** — the raw dump, retained always (it is the audit + re-extraction source).
| field | type |
|---|---|
| id TEXT PK · raw_text TEXT NOT NULL · source TEXT CHECK IN (`typed`,`dictated`) · created_at_ut INTEGER · local_offset_min INTEGER · rest_window INTEGER 0/1 |

**RECORD**
| field | type | notes |
|---|---|---|
| id | TEXT PK | |
| capture_id | TEXT FK→CAPTURE | provenance |
| child_id | TEXT FK→CHILD NULL | NULL = unattributed (visible "who?" chip) |
| rtype | TEXT CHECK IN (`obs`,`parent`,`supply`,`task`,`activity`,`admin`) | closed enum, chip-rail order |
| body | TEXT NOT NULL | cleaned fragment |
| due_date | TEXT NULL | "tomorrow" resolved at capture |
| confidence | REAL | model or rule score |
| attribution_src | TEXT CHECK IN (`rule`,`model`,`user`) | feeds the wrong-child strike counter |
| status | TEXT CHECK IN (`pending`,`accepted`,`corrected`,`dismissed`,`expired`,`promoted`) | |
| pinned | INTEGER 0/1 | locked: exempt from expiry |
| expiry_exempt | INTEGER 0/1 | locked: set for incident links & promoted items |
| expires_at_ut | INTEGER NULL | null while pending; set on acceptance (default +30d, O-managed setting) |
| taint | TEXT CHECK IN (`child`,`none`) | round-3 deferral made cheap; propagates to every derived object |
| created_at_ut / accepted_at_ut | INTEGER | |

**RECORD_EVENT** — the kill criteria live here. Append-only.
| field | type |
|---|---|
| id TEXT PK · record_id FK · event TEXT CHECK IN (`accepted`,`type_corrected`,`child_corrected`,`edited`,`dismissed`,`wrong_child`,`handed_off`,`promoted`,`pinned`) · from_value TEXT · to_value TEXT · at_ut INTEGER |

**INCIDENT** (schema ships in S1a; UI is S3). Append-only after lock.
| field | type |
|---|---|
| id TEXT PK · child_id FK NOT NULL · capture_id FK NULL · what_happened TEXT NOT NULL (her words only) · response TEXT · witnesses TEXT · occurred_at_ut INTEGER · notified TEXT JSON · locked_at_ut INTEGER NULL |

**INCIDENT_EVENT** — id PK, incident_id FK, kind CHECK IN (`append`,`correction`,`export`), payload TEXT (deltas only, never full rewrites), at_ut.

**DONE_ITEM** — id PK, label TEXT, source TEXT CHECK IN (`auto_from_record`,`manual`), record_id FK NULL, day TEXT ISO, at_ut.
**PARKING_ITEM** — id PK, text TEXT, created_at_ut, promoted_to_record_id FK NULL.
**SETTING** — key TEXT PK, value TEXT. O-gated behind a long-press gesture; T never sees settings (lock C5).

**Indexes:** `records(child_id,status)`; `records(expires_at_ut) WHERE status='accepted' AND pinned=0 AND expiry_exempt=0`; `record_events(record_id)`; `record_events(event, at_ut)`; `captures(created_at_ut)`.

**Must exist in v1 because missing them later is unrecoverable (ordered):**
1. `RECORD_EVENT` rows written from the first build — acceptance rate, wrong-child strikes, and handoff counts are the kill criteria; unlogged history cannot be reconstructed.
2. `CAPTURE.raw_text` retained — re-extraction after model changes, and any audit, die without it.
3. `attribution_src` — strikes must distinguish model guesses from user choices.
4. `pinned` / `expiry_exempt` (locked — agreed).
5. `taint` — one column now; a retrofit across derived objects later is the real rewrite.
6. `school_year`, `join_date`, `leave_date`, `status` on CHILD — cheap now, spring-rollover-blocking later.

## B3. The capture → extract → correct loop (with every failure path)

1. **Enter.** Rest window: Capture screen in rest mode (black, giant mic). She taps mic, speaks the dump; whisper.rn streams a live transcript; **audio is never written to disk**. Day mode: she types. Either way: one text blob, zero pre-organization (C4).
2. **Persist raw first.** `CAPTURE` row inserted before any processing. If the app dies here, the dump survives — worst case she triages it manually later. *(Failure path: DB write error → blob held in memory, screen shows "not saved yet," retry loop; never silently drop.)*
3. **Rules pass (deterministic, always runs).** Sentence-split → per fragment: roster match (exact, then fuzzy ≤2 edits, then phonetic against names + aliases) → regex classify (supplies "need/low/out of", dates "tomorrow/Friday", parent markers "mom asked/dad said", activity asks) → due-date resolution.
4. **Ambiguity handling.** Two roster candidates within threshold → fragment marked `ambiguous`, rendered with a "who?" chip showing both children. **The rules never guess; the model never guesses silently; only she resolves ambiguity.** Unattributed fragments stay unattributed with a visible chip. *(This rule is the wrong-child-kill-criterion's first line of defense.)*
5. **Model pass (optional tier).** Fragments still untyped or low-confidence go to Qwen3-4B in **one batched call**, JSON-schema-constrained (`llama.rn` schema support), ≤2k context. Schema: array of `{fragment_id, rtype, child_code|null, confidence}`. Model may only choose from the enum and the roster — it cannot invent children or types. *(Failure paths: model not imported → skip to 6 with rules-only banner; OOM → release model, retry rules-only; >8s wall clock → cancel, rules-only. All three are the same UX: "Model's asleep — rules sorted N of M. Tap what's missing.")*
6. **Attribution policy.** Explicit name match → `rule`. Pronoun/ellipsis resolution → `model`, and only within the same fragment chain after a named child; otherwise null. Every record shows its child chip + confidence forever. Corrections to `child_id` where `attribution_src='model'` log a `wrong_child` event; **two cumulative → local flag disables model extraction for family-note paths permanently** (locked kill criterion), app continues rules-only.
7. **Review.** Inbox lists pending records (newest capture's records expanded, rest collapsed). Per record: ✓ accept, ✎ edit, ✕ dismiss. Type correction = one tap on the card's chip rail. Child correction = tap chip → bottom-sheet roster grid (64dp tiles) → tap child. "Looks right — all N" bulk-accepts with per-card undo (toast, 5s).
8. **Handoff.** FamilyNotesScreen builds per-child drafts **from accepted `obs`/`parent` records only**, never from incidents. Per-child **[Copy note]** → clipboard → she pastes into the mandated app. Each copy logs `handed_off(child_id)`. *(Failure path: clipboard set fails → screen shows the note as selectable text; she long-press-selects. Never a dead end.)*
9. **Expiry.** On acceptance, child-linked non-exempt records get `expires_at_ut = +30d` (O-managed). A purge job hard-deletes expired+7d-grace records, guarded by **two independent checks** (`pinned=0 AND expiry_exempt=0`) plus a negative join against incidents/promotions; guarded by a unit test that attempts to delete exempt fixtures and asserts failure. Weekly purge count goes to `logs/` as a number only — no content (the audit-log-is-sensitive trap, avoided at app scale).
10. **Backup.** Any time from Settings: dump DB → AES-256-GCM encrypt (PBKDF2 passphrase, 600k iters, salt+versioned header) → `.ccbak` → SAF save or share-to-Drive. Restore: SAF-pick → decrypt → verify schema version → replace. Quarterly restore drill on O's test device (runbook B8).


## Slice order + do-NOT list

## B6 — Slice order

| Slice | Days | What ships | Hard acceptance test (demonstrated, not asserted) |
|---|---|---|---|
| **S0** — H0 foundation | ~3 hrs build + 5 school days observation | **No app.** Her Mac: Ollama + Qwen3 8B, three saved prompts (end-of-day sort / morning brief / wording helper), pinned tab named "Assistant." Her phone: local-only notes app + one-tap home-screen widget, Gboard offline dictation verified, biometric lock, auto-lock ≤1 min. Paper triage sheet on a clipboard, ritual written on it **in her handwriting**. Egress denial installed in person by O + weekly watchdog on O's calendar. | (1) Mac Wi-Fi **OFF** → prompt A correctly sorts a test dump (proves zero network dependency, not just "no visible calls"). (2) Firewall log shows **zero outbound attempts** by the assistant stack across a full session. (3) Gboard dictation of "C7 counted five bears by herself" succeeds in airplane mode. (4) **THE GATE:** on ≥4 of 5 consecutive school days, T performs the ritual **unprompted** (note-app edit timestamps are the evidence; O checks silently each evening, says nothing). <4/5 → one reset week, then the project stops. No app code is written before this passes. |
| **S1** — Capture core | 12–15 | The app. Expo/Android: messy paragraph in → typed records out (rules-first; model-assist when a brain is reachable), roster picker, one-tap correction of type/child/date, crash-proof draft persistence, encrypted backup file **plus tested import**. | Over **20 real captures on real school days** across ≥5 days: ≥18/20 records accepted without correction (90%); **zero wrong-child attributions** in the entire sample — one occurrence halts the build and counts against kill-criterion 3; every correction is exactly one tap; full loop runs in airplane mode (rules-only) and still yields typed records; kill the app mid-entry → draft intact on reopen; capture-to-reviewed <60s for a 4-sentence dump. Restore drill: Friday's backup file restores on a clean install Monday, verified by record count. |
| **S2** — DONE list + parking lot | 2 | DONE list auto-populated from completed/corrected records + one-tap manual adds. Idea parking lot reachable in ≤2 taps from any screen. | On 4 of 5 days the DONE list contains ≥3 true items she never typed; a Monday-parked idea is retrievable Friday in ≤2 taps; **T opens DONE unprompted at end-of-day on ≥4 of 5 days** — if she doesn't look at it, the slice failed even if it works. |
| **S3** — Incident record | 4 | Fielded, timestamped incident template; append-only revisions; `pinned` + `expiryExempt` enforced; one-tap export block for the parent app that **assembles her words only**; included in nightly backup; never expires. | Simulated incident → complete record in **≤90 seconds, one-handed, standing up**; any edit creates revision 2 with revision 1 byte-identical; forced clock +60 days → incident intact while a sibling scratch record expires on schedule; diff of the export shows 100% of narrative text traceable to fields she typed (zero model-generated sentences); works offline; record present in backup within 24h. |
| **S4** — Triage MUST/SHOULD/EXTRA | 3 | Today's list auto-sorted into three tiers, capacity-capped, one-tap override, honest carry-over with reason prompt at day end. | 4 of 5 mornings T opens triage **unprompted before first circle**; MUST count ≤5 every day of the test week with zero manual filing by her; category override is one tap; an unfinished MUST at day end reappears Monday automatically — no silent drops. |
| **S5** — Weekly reset | 2 | Friday close-out: carry-over rollup, next-week skeleton, DONE-week rollup, parking-lot surfacing. | First real Friday: start-to-finish **≤10 minutes**; every unfinished MUST from that week appears in Monday's triage with zero re-entry; rollup shows ≥15 true DONE items. |
| **S6** — Promote-to-keep + conference binder | 4 | One-tap promote of any record to permanent per-child evidence, grouped by developmental domain; print-ready export per child. | Promote = one tap; promoted record survives +60-day clock-advance while an unpromoted twin expires on schedule (both directions tested); seeded child with 3 promoted observations renders a binder grouped by domain; export fits one printed page per child with no manual reformatting. |
| **S7** — Sub/sick-day sheet | 2 | One-page handoff: routines, roster needs, day plan, who-to-ask. Generated on device, printed locally. | Sick-morning drill at **06:30**: decision → printed sheet in ≤5 minutes; after removing a child from the roster, regeneration contains zero traces of that child; generation succeeds in airplane mode. |
| **S8** — Display-board narratives | 4 | Promoted observation → board scaffold: what happened / what the child was practising / skill tag / next offer. Her words verbatim in event fields; model supplies only the skill tag and next-offer options, both swappable. | Promoted record → printable board draft in one tap and **≤15 min end-to-end** (against her paper baseline, timed once for comparison); "what happened" text is **byte-identical** to her original record; boundary log shows zero roster names in any generic-ideas lookup; output fits her physical board format. |
| **S9** — Attention equity + patterns | 3 | Per-child flag for no documented observation in N school days; co-occurrence pattern view (same transition, same pair, both missed snack). | Seeded synthetic year: flags **exactly** the one child with 9 silent days and no others, computing in <1s; pattern view surfaces the seeded pair from ≥3 co-occurring notes; zero false flags on control children. **Synthetic data only — never her real roster.** |
| **S10** — Supplies queue | 2 | "Need wipes" inside any dump auto-types to a running list ordered by needed-by; one-tap copy-all; one-tap clear. | 10 seeded supply mentions inside real dumps → 10/10 land in the queue with zero taps; copy-all pastes into her ordering channel unedited; a cleared item never re-enters from the same source capture. |
| **S11** — Lesson planning | 5 | Weekly skeleton assembled from parking lot + observations + activity library; output shaped to the school spreadsheet's exact column order; generic-idea lookups via the boundary only. | Friday: next week's skeleton in ≤15 min; paste into the real shared spreadsheet needs **zero column reordering** (tested against last week's actual sheet); canary test — a child's name injected into an idea request is **blocked** by the boundary. |
| **S12** — Trust hardening | 3 | Biometric app-lock (10-minute re-auth window, PIN fallback, `FLAG_SECURE` so record content never appears in the app-switcher snapshot); nightly encrypted backup to **T's own** cloud account; taint propagation through local transforms; watchdog cadence formalized; global kill switch. | After 10 min backgrounded: reopening demands biometrics and the recents screen shows a blank card; restore on a clean device recovers **100% of pinned + promoted records** (count + spot-hash); seeded poisoned record (canary + child ref) run through the local summarize tool produces output the gateway **still blocks**; boundary process killed → all outbound fails closed and the UI says why in one plain sentence; kill switch on → airplane-mode-equivalent behavior while every core S1 loop still passes. |

**Cross-cutting gates (not per-slice — project-level):**
- Kill criterion 1: family notes drafted from the app ≥3 of 5 days by end of week 2 → else stop building.
- Kill criterion 2: the S1 accuracy test above, on a logged sample of 20.
- Kill criterion 3: **wrong child — zero, full stop.** Two occurrences kills the model path for family notes permanently; rules-only forever.
- Swap rule: if week-2 data shows triage-level distress, **S4 jumps S3** — knowingly, out loud, with her.
- Every slice's acceptance runs on her real days, **except S9**, which is synthetic-only. Total build time after the S0 gate: ~43–46 days.

---

## B7 — The do-NOT list

**Product & scope**

1. **Do NOT add photos of children.** The single most tempting addition. Photos are biometric-class PII of minors: they explode the sensitivity of every downstream control (backup, export, boards, gateway), and the parent-comms app *already owns* photos — you'd be rebuilding the mandated system you're banned from duplicating. If photos ever come, they're a separately designed slice with their own threat model, never a bolt-on to capture.
2. **Do NOT store voice audio.** A stored child's voice is COPPA-sensitive data with zero product need. Gboard dictation is on-device and ephemeral — the moment your app records and keeps audio, you've turned a keyboard into an evidence liability. Also: loud-room ASR garbage-in poisons the accuracy metric the whole project lives or dies on.
3. **Do NOT add cross-device sync.** Sync is a conflict-resolution engine wearing a feature costume. Its dominant failure mode is **silent record loss on the device that holds protective records** — the one unrecoverable error. It also doubles the attack surface. Two tools, different jobs: the Mac is a brain, the phone is a hand.
4. **Do NOT port to iOS/macOS.** Zero second users exist. Every Catalyst/react-native-macos week is a week not spent on extraction accuracy — which is the actual product. The Mac is served by the local assistant, not by an app.
5. **Do NOT build accounts, auth, or "a tiny backend."** The entire legal posture is *the developer never sees a byte*. One relay server touching a child record makes the developer a COPPA operator with consent, retention, breach, and parental-access obligations, and a school that never procured any of it.
6. **Do NOT add streaks, badges, or notification nudges.** Morale features must *forgive* the bad week; streaks punish exactly the moments she needs the tool most — a broken streak is a quit event. A phone that nags a teacher mid-class gets silenced by uninstalling.
7. **Do NOT build analytics dashboards.** Charts imply archive posture, contradicting scratchpad. She needs **flags** ("C8 silent for 9 days"), not visualizations. Chart libraries are permanent maintenance debt for a one-user tool.
8. **Do NOT polish export formats early.** PDF/DOCX/print-perfection is the classic week-eater that arrives before accuracy is proven. Plain text that fits her school's existing formats wins.
9. **Do NOT build enterprise/multi-teacher sharing.** Shared infrastructure creates operator status, a different buyer, and puts you in a lane with funded incumbents. "Enterprise-grade for one" means robustness, recoverability, trustworthiness — build those.

**Data & privacy**

10. **Do NOT put any cloud vendor in the child-data path.** Sensitivity outranks capability: "this is hard" routes *upward, locally* — never outward. The gateway can't un-send.
11. **Do NOT auto-send anything to parents or auto-submit to mandated systems.** A wrong-child message to a family is the one error with no recovery, and the project's stated tolerance is zero. Draft-and-human-sends is the *permanent* shape, not a v1 limitation.
12. **Do NOT let any note draft introduce a fact absent from the record.** Family-note drafting is assembly-and-polish of her typed facts. Any generated sentence without a source fact is flagged or deleted. (The absolute version of this ban — incidents — is already locked: the model checks fields, never writes the account.)
13. **Do NOT weaken auto-expiry exemptions.** Blanket expiry deletes the contemporaneous records that legally protect her. `pinned`/`expiryExempt` exist in v1 for this reason; no "simplification" may remove them.

**Security & the gateway**

14. **Do NOT make redaction primary.** *"The little boy whose mum is in hospital"* passes every scrubber ever written. Classify-and-deny, uncertainty blocks, stripping as depth only.
15. **Do NOT merge the vaults.** A merged T+O vault means retrieval bleed both ways, a permanent indexed copy of children's records on O's machine, and total gateway taint. The school authorized *her*.
16. **Do NOT police her browser.** The browser channel can't be closed, and trying makes things worse: a stricter gate makes the vendor tab *more* attractive. The mitigation is local quality, not surveillance of your own user.
17. **Do NOT ship free-form "chat with all my data."** It's the prompt-injection and taint-laundering surface, and it converts a typed, auditable tool into an assistant she'll over-trust. The model gets tool schemas and typed operations, nothing else.
18. **Do NOT auto-update models or extraction logic silently.** The trust contract is "corrections stick." If the sorter's behavior drifts invisibly, she can't build a mental model of it and stops correcting. Pin versions; one-line changelog per change.

**Builder discipline**

19. **Do NOT test with real child data on any machine but hers.** Synthetic rosters everywhere else, full stop. A "quick parse test" with a real export on the 5090 is precisely the boundary breach this architecture exists to prevent — and the one with no undo.

---
