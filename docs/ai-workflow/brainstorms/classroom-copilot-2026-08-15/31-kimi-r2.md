# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/30-PACKET-R2.md
**Seed:** (none)
**Tokens:** 2286 in / 8103 out | **Cost:** ~$0.1284 | **Wall:** 262.1s | **finish_reason:** stop

---

## TOP 5 ABSENCES

1. **Contemporaneous incident/injury documentation with export** — *Why she omitted it:* she's never been through an allegation or dispute, and she assumes the school's systems protect her. They protect the school. Her only personal protection is a timestamped record written the same day, in her own words, that she controls. *Slice:* S3, but the record schema must anticipate it in S1 (append-only, expiry-exempt types are not retrofittable — see DISSENT).
2. **Evidence preservation vs. her own scratchpad rule** — she asked for auto-expiry *and* for conference prep, assessments, and character-trait documentation, without noticing the first deletes the raw material of the other three. *Why omitted:* conferences feel far away in week 1. *Slice:* schema flag in S1, real mechanic in S6.
3. **Roster churn** — children join, leave, and age out mid-year; two-year-old rooms churn constantly. A roster baked in as setup-time configuration breaks silently at the first mid-year enrollment. *Why omitted:* she listed her current class, not the class as a changing set. *Slice:* S1 (roster as editable data, never code/config).
4. **The sick-day / substitute handoff** — one bad morning and a stranger gets 12 toddlers with nothing. A one-tap "today sheet" (plan, routines, per-child notes, allergy flags) is cheap and she's never seen it done, so she'd never ask for it. *Slice:* S7.
5. **An off-ramp for her own nervous system** — the unprompted DONE-list request is a tell. What she didn't ask for but described: a shutdown ritual that ends the workday mentally (reset, carry-over declared *done-for-now*, parked ideas confirmed safe). *Why omitted:* people in overload ask for features that produce output, not features that give permission to stop. *Slice:* folded into S2 and S5.

## FULL GAP LIST

**Safety & legal (highest value, all invisible to her)**
- Incident/accident records (above, #1).
- Amendment-not-edit discipline: locked-after-save with amendments, so a record can never look retroactively doctored.
- Witness/time/notification prompts on incident capture — the fields she'll forget at 10:40 with a crying child.
- Export-to-PDF drill: proof she can produce a record in under a minute, tested before it's needed.

**Lifecycle & time**
- Roster churn (above, #3).
- Evidence pin/promote (above, #2).
- Assessment-season view: the mandated assessments she listed as bullets are actually a seasonal crunch needing a per-child coverage matrix (S6).
- Lead-time deadlines: trainings and forms fail at "due today," they succeed at "due in 10 days" (S12).

**Emotional energy (distinct from time)**
- DONE list and shutdown ritual (above, #5).
- Difficult-conversation drafting for parents *with a cooling-off step* — she listed this; what she didn't list is that these get written at 9pm angry. Draft-now, review-in-the-morning is a feature, not a workflow she'll self-impose (S6-adjacent, no slice of its own).
- "47 things" is a grief problem as much as a sorting problem: the triage slice must visibly *close* the would-be-nice list, not just demote it.

**Invisible hand-work**
- The print/laminate/cut/make queue — she listed "supplies" but the actual labor is a production queue with lead times (S10).
- Re-writing the same warm-update phrasing across 12 families daily — v1 covers drafting; per-child variation without templated sameness is the subtle part (S1 acceptance criterion, not a slice).
- Translating school-mandated system fields from her own notes — the same-day re-entry into mandated systems is manual double-entry that should at least be a copy-friendly export format (S1).

**Month-3 events**
- Child regression, difficult family, licensing visit — all collapse to "produce a credible per-child timeline fast" = S6.
- Her own sick day = S7.

## SLICE ROADMAP

All efforts assume one developer plus ~30 min/day of T's feedback. Slices are sized so no slice exceeds 5 days of work; if one does, it's wrong, split it.

```
S1 · v1 capture core (as settled in round 1)
  Ships:      Messy paragraph in → typed records → one-tap correction → family-note
              draft. Roster as editable data (add/remove child, never config).
              Record schema with: type field (incl. incident), pinned flag,
              expiry-exempt flag, local UUIDs, append-only-capable storage.
              Encrypted backup to her cloud with passphrase; restore drill run once
              before ship. Rules-only path exercised in a no-model test build.
  Value:      Kills the midday family-note crunch — the highest-frequency task.
  Depends on: H0 gate pass (5 school days unprompted capture habit).
  Gate:       Settled kill criterion (≥3/5 days drafting family notes from the app
              by end of week 2) AND ≥90% of extracted records accepted without
              correction on a self-logged sample of 20. Both, not either.
  Effort:     12–15 days
```

Schema note for the builder, no further questions needed: every record carries `{id: uuid, childIds: uuid[], type, createdAt, pinned: bool, expiryExempt: bool, amended: bool}`. Roster is a table, not a constant. This is the entire month-3 insurance policy and costs one day inside S1.

```
S2 · Morale bundle: DONE list + idea parking lot
  Ships:      Auto-populated DONE list from completed/sent records; parking lot
              capture (one line, one tap); parked items resurface at weekly reset.
  Value:      Highest value-per-day in the entire roadmap. Directly treats the
              "doing a ton, feels like nothing" wound she named unprompted. This
              is retention engineering for the habit itself.
  Depends on: S1 (DONE list feeds off records).
  Gate:       She opens the DONE list unprompted ≥4/5 days for one week; ≥5 ideas
              parked within two weeks.
  Effort:     2 days
```

```
S3 · Incident & injury record
  Ships:      Structured incident capture (time, children, witnesses, description,
              action taken, parent notified) with prompts for fields she'll forget
              mid-crisis; locked after save — later changes are timestamped
              amendments, never edits; one-tap PDF to share sheet; exempt from
              auto-expiry by type, permanently.
  Value:      The only slice that protects *her* rather than saving her time. With
              10–14 two-year-olds, the next incident is days away, not months.
              Retires the single largest risk in the whole product: that the tool
              she trusts is useless the one time she needs it legally.
  Depends on: S1 schema (append-only, expiry-exempt — why it's in S1).
  Gate:       The next real incident gets filed in the app instead of on paper;
              she completes a produce-a-PDF drill in <60 seconds.
  Effort:     4 days
```

```
S4 · Triage: must / should / would-be-nice + tomorrow list
  Ships:      Every task/idea sorts into three buckets; would-be-nice is visibly
              closed, not hidden; "tomorrow" list auto-seeded from the fixed
              rhythm, specials days, and carried items; capped at a hard limit
              she sets.
  Value:      The one she called most important. Ships only after S2/S3 because
              morale and safety outrank it on risk-adjusted value — but nothing
              else may jump it.
  Depends on: S1, S2 (parking lot feeds triage).
  Gate:       Triage used to plan tomorrow ≥3/5 days for two consecutive weeks;
              one-question weekly pulse ("did you attempt fewer things after
              work?") trends yes.
  Effort:     3 days
```

```
S5 · Weekly reset
  Ships:      Friday close-out: unfinished items carried over or consciously
              dropped, parked ideas reviewed, next week seeded from rhythm +
              triage. Doubles as the shutdown ritual.
  Value:      Converts Sunday-night dread into a 10-minute Friday act; makes S4
              self-cleaning so the list never rots.
  Depends on: S4.
  Gate:       Two consecutive resets completed unprompted.
  Effort:     2 days
```

```
S6 · Promote-to-keep & conference binder
  Ships:      Pin/promote observations out of the expiry window into a per-child
              timeline; monthly character-trait tag on records with a coverage
              view; conference/assessment export per child; export format readable
              by the laptop tool (see DISSENT 3).
  Value:      Retires the month-3 break: auto-expiry silently eating the evidence
              base for conferences, assessments, regressions, and difficult-family
              timelines. This is the slice the whole scratchpad design was
              quietly betting against.
  Depends on: S1 schema (pinned flag), S3 (incidents must appear in timelines).
  Gate:       First real conference or assessment cycle prepped ≥80% from app
              exports; trait documentation on time one month.
  Effort:     4 days
```

```
S7 · Day sheet / substitute & sick-day export
  Ships:      One-tap printable "today": plan, routines, transitions, roster
              notes, flags, specials schedule.
  Value:      The handoff she's never had. Converts a sick morning from a
              40-minute phone tree into 90 seconds.
  Depends on: S4 (tomorrow list), S6 (roster notes).
  Gate:       One real or drilled use producing a handoff sheet in <2 minutes.
  Effort:     2 days
```

```
S8 · Display-board narratives (laptop assist)
  Ships:      On the laptop: promoted observation → short narrative → skill
              demonstrated → what to offer next; print-ready. Ingests S6's export
              file via her cloud folder — a manual, explicit move, not sync.
  Value:      The two "making learning visible" boards, currently pure evening
              labor, become assembly instead of authorship.
  Depends on: S6 (export format is the contract; no-sync is settled, so the
              file handoff is the interface).
  Gate:       Both boards produced from the tool for one full month cycle.
  Effort:     4 days
```

```
S9 · Supplies & make/buy/print/laminate queue
  Ships:      Production queue with lead times and a "can wait" flag, wired into
              S4 triage so supply work competes fairly with everything else.
  Value:      Kills the invisible hand-work category.
  Depends on: S4.
  Gate:       One supply run planned entirely from the queue.
  Effort:     2 days
```

```
S10 · Weekly/daily planning templates
  Ships:      Lesson-plan drafting seeded from rhythm, specials, triage, and
              promoted parking-lot ideas; exports in the shared-spreadsheet shape
              the school mandates.
  Value:      Weekly lesson-plan submission stops being a from-scratch act.
              Deliberately late: planning tools feel productive and are the most
              seductive scope-creep trap in the packet; they earn their slot only
              after capture, triage, and evidence are proven habits.
  Depends on: S4, S5, S2.
  Gate:       One weekly plan drafted in-tool, exported, submitted on time.
  Effort:     5 days
```

```
S11 · Admin deadline calendar
  Ships:      Trainings, forms, events, dress-up days with lead-time reminders
              (10-day, 3-day), manually entered, local notifications only.
  Value:      Missed-deadline anxiety is cheap to remove — but only after the
              daily system is stable, or it's one more feed she ignores.
  Depends on: S5 (deadlines surface in weekly reset).
  Gate:       Zero missed admin deadlines over one month.
  Effort:     2 days
```

```
S12 · Trust hardening (the honest "enterprise" slice)
  Ships:      Automated restore drill, full plain-export-everything in open
              formats (so the tool can die and her data survives), schema
              migration test harness, model version pinned with grammar tests in
              CI against silent parser drift.
  Value:      Robustness, recoverability, longevity — what enterprise-grade must
              mean for this product (see ENTERPRISE VERDICT).
  Depends on: S1–S6 stable for ≥4 weeks.
  Gate:       Restore from a fresh device succeeds in a timed drill; export opens
              correctly in generic tools with no app present.
  Effort:     3 days
```

Total: ~40–45 days across twelve slices, each independently shippable and independently killable.

## IF SHE ONLY GETS THREE MORE SLICES

**S2, S3, S4 — in that order.**
- **S2** because it's 2 days and it's the difference between a tool she uses and a tool she abandons in week 5; morale features here are load-bearing, not decorative.
- **S3** because it's the only slice whose absence can harm her rather than merely fail to help her. Every week without it is uninsurable exposure.
- **S4** because she named it as the most important thing in her own words, and a roadmap that ignores the user's stated #1 after v1 has failed at listening regardless of how clever the ordering is.

Everything after S4 is quality-of-life; these three are survival-of-the-habit, survival-of-the-teacher, and survival-of-her-evenings.

## ENTERPRISE VERDICT

**No multi-tenant enterprise path preserves the compliance posture. The fork exists, it is exact, and it is this: the first line of sync code.**

The precise fork point is the moment any byte of child-linked data moves to anywhere other than (a) the device and (b) T's own cloud account encrypted with a key derived from her passphrase. Before that line, the developer holds nothing, operates nothing, and is nobody's data processor. After it — even a "harmless" presence-sync relay — the developer holds metadata, availability obligations, breach duties, and a school that never signed anything. That fork cannot be retrofitted: end-to-end encryption bolted onto an architecture that assumed a server can see records is a rewrite, not a feature.

There is exactly one posture-compatible expansion, and it is **not multi-teacher**: multi-device for the *same* teacher, syncing via her own cloud storage with the same passphrase-derived encryption. That is a 3–5 day slice whenever she wants the laptop and phone to share; it keeps the developer an operator of nothing. Multi-teacher / centre-wide is a different product in a lane with funded incumbents, and the correct answer to it is "no," not "later."

So "enterprise level" for this product means, and the owner should be told this plainly:
- **Reliability:** the rules-only path works with no model, no network, no account, forever.
- **Recoverability:** restores are drilled, not hoped for (S12).
- **Trustworthiness:** append-only incidents, open export formats, pinned model versions with parser tests.
- **Longevity:** if the developer disappears, the app and the data both keep working — the true enterprise bar for a single-user tool.

Two cheap decisions in S1 keep the fork open without committing to either side: local UUIDs as the only record identity (never server-issued), and keys derived from her passphrase (never developer-held). That is all the enterprise insurance this product is allowed to buy.

## NEVER BUILD

1. **Any developer-run server, account system, or login.** Ends the compliance posture instantly; the first user table is the first breach obligation.
2. **"Anonymous" analytics or crash telemetry containing free text.** Her paragraphs contain children's lives. Telemetry of child data is not anonymous because you say so.
3. **Cloud LLM calls with child-linked content.** One API call converts a local tool into a data-sharing arrangement with a third party and a school that never consented.
4. **Auto-send of anything to parents.** Every outbound message must pass her eyes. The first auto-sent mistake to a parent ends trust in the tool permanently.
5. **The positive-reinforcement points tracker as specified.** Token economies for 24–36-month-olds are developmentally dubious, and a per-child comparative score record is a liability artifact: a parent-requested data dump of toddler behavior points is a document no one wants to explain. This is the packet's best-sounding trap. If she wants reinforcement visuals, that's a printable, not a database.
6. **Replacing or scraping the mandated school systems.** They are institutionally owned; touching them converts the tool from a personal scratchpad into unauthorized school software.
7. **A notification/nag engine.** A tool built to reduce overload that interrupts her is self-defeating; local, batched, user-timed reminders only.
8. **iOS or macOS ports before S12.** Doubling the test surface during habit formation is how single-dev products die; the platform decision is settled, keep it settled.
9. **Social/community/template-sharing features.** Sounds like engagement; is actually a moderation obligation, a server, and scope annihilation.
10. **Retrofitted sync "just for backup" through developer infrastructure.** Backup goes to *her* cloud under *her* key, per the settled decision. No exceptions dressed as convenience.

## DISSENT

1. **The packet contradicts itself and doesn't notice.** §2 settles "child-linked items auto-expire on a rolling window." §4.1 then hints that contemporaneous documentation is "often the only protection a teacher has." These cannot both be true. An auto-expiring scratchpad deletes precisely the contemporaneous records that protect her, at almost exactly the horizon (a rolling window of weeks) when an incident becomes a dispute. This is not a nuance to resolve later — append-only and expiry-exempt record *types* must exist in the S1 schema or S3 becomes a storage-layer rewrite. The settled decisions should be amended: *observations* expire; *incidents and pinned evidence* never do.

2. **The kill criterion measures habit and is blind to correctness.** Five days of unprompted use and 3-of-5 days of drafting both pass even if the extraction model is silently mangling 15% of records and she's stopped trusting corrections without being able to say why. A tool that is used daily and quietly wrong is worse than a tool that fails the gate. Add the accuracy check to S1's gate (as written above): ≥90% of records accepted without correction on a self-logged sample. If the model can't hit that, the rules-only path becomes primary and the model becomes a suggestion layer — decide that in week 2, not month 3.

3. **"Phone and laptop do not sync" silently undercuts the roadmap's own later slices.** S8's display-board narratives need the phone's observations on the laptop; S6's conference binder is where that contract actually gets defined. If the export format isn't designed as a deliberate, documented file interface at S6, S8 arrives with an implicit manual-sync requirement nobody scheduled, and "just this once, email it to yourself" becomes the architecture. Two tools with different jobs is right — but they still need a *handshake*, and the handshake is a slice dependency, not a vibe.

4. **Minor but real: the roadmap as requested in the packet risks treating her stated #1 (workload triage) as slice-4.** I've defended that ordering on risk grounds, but it should be flagged honestly: if S2+S3 take three calendar weeks and she spends those weeks still attempting 47 things after work, we may lose the user before her top priority ships. If S1's gate data shows triage-level distress, S4 jumps S3 and we accept the legal exposure knowingly, with her, out loud — not by default.
