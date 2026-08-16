# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/30-PACKET-R2.md
**Tokens:** 2246 in / 21740 out (reasoning: 17079) | total 23986
**Wall:** 381.9s

---

## TOP 5 ABSENCES

Ranked by value to T — frequency × stakes × whether the cost is recoverable if we're late. Not by novelty.

**1. The protective record (contemporaneous documentation as her shield).**
*What:* An append-only, timestamped, phone-side factual log for incidents, injuries, bites, and hard conversations: what happened, who saw it, who was told, exact wording used, when the director/parent was notified, what was promised. 90-second capture during nap, rules-only path, export as PDF for the school file. Timestamps never move; corrections are visible additions, not edits.
*Why she omitted it:* She listed incident **communication** — the telling. The record that protects *her* is the part nobody assigns. Training frames documentation as paperwork the school requires, never as self-defense. In a dispute, a parent's screenshot of the mandated app versus her memory is not a fair fight; a timestamped log written the same hour is the only thing that makes it one. She did not mention this once because emotionally the whole weight sits on the conversation, and the shield is invisible until the day it's needed — and then it's too late to build.
*Slice:* S2.

**2. The five-fold rewrite (one observation, four hand-copies).**
*What:* Right now every meaningful observation gets semantically rewritten ~4–5 times by hand: the daily family note, the display-board narrative, conference prep, assessment evidence, the child's file. Her own display-board rubric — *what happened → what was practised → which skill → what to offer next* — is secretly an assessment instrument. She has never noticed that the board and the checkpoint are the same cognitive object, so she experiences one transformation as four unrelated writing tasks in four systems at four deadlines.
*Why she omitted it:* She has never seen software do composability, so she can't ask for it. Each copy is invisible because each happens in a different context on a different day. This is the single largest recurring manual labor in her list and it's nowhere in her list.
*Slices:* Seeded in S1; first true fan-out in S5, then S8, S13.

**3. Attention equity ("who haven't I noticed?").**
*What:* A per-child coverage counter over her own notes — which child has gone nine days without a documented observation, which parents haven't heard warmth in a fortnight. Trivial for software, impossible for a human tracking 12 toddlers.
*Why she omitted it:* The failure is silent. Squeaky wheels generate notes; quiet kids generate nothing; nobody notices until a parent asks why C9 is in every note and C11 is in none. She has never seen a tool do this because no tool she's touched has ever known who her children are.
*Slice:* S4.

**4. The antecedent pattern view.**
*What:* Aggregating her incident and behavior records into patterns: time of day, which transition, which peer pair, proximity to nap or meal. Two-year-old rooms have biting seasons; "it's always during the 4pm transition, always the same two children, both missed snack" is the answer to the parent meeting — and no teacher doing hand-ABC logs across 12 children will ever produce it.
*Why she omitted it:* Hand pattern-tracking at this scale is infeasible, so nobody does it, so she doesn't know it's possible. It also requires S2's records to exist first — which is one more reason S2 ships immediately.
*Slice:* S9.

**5. The shadow list and the hard words.**
*What:* Two things. (a) Surfacing avoided conversations at the weekly reset — the parent email she's been not-writing for six days — plus a ledger of promises made at pickup ("what did I tell C2's mother I'd try?"). (b) Scaffolds for the three hardest messages in toddler teaching: bite notification, injury call, and the developmental concern ("I'm seeing something in C4's speech") that teachers agonize over wording for weeks.
*Why she omitted it:* She named the DONE list unprompted — a morale feature. That is the signal: she knows she needs emotional scaffolding. But the DONE list's shadow went unspoken because avoidance doesn't file as a task, and asking for help wording a hard message feels like an admission of incompetence. This is her highest *emotional*-energy cost after the notes themselves.
*Slice:* S10.

## FULL GAP LIST

**Group: Schedule realism — the container her planning is missing**
- *The day's skeleton as data* — specials days, extended-care brackets, true sizes of the gaps in her day. Omitted because the schedule is the water she swims in; she's never imagined a tool that knows her clock. → S3
- *Two-minute versions of every task* — toddler days hand out 3-minute windows; a "realistic priority list" needs task sizes, not just priorities. → S3
- *Pickup glance card*, sorted by expected pickup time — 90 seconds of cheerful informedness × 12. Low but real. → S3 polish, possibly never.

**Group: The last 100 meters — outputs into mandated systems**
- *Weekly plan → the shared spreadsheet's exact shape.* She assumes tools end at their own edge; the re-keying is where Friday goes. → S6
- *Clipboard pack for the mandated parent app* — twelve notes, one child-confirmed copy action each. → S1 polish
- *The newsletter is an aggregation.* A newsletter is just the week's notes re-voiced for all parents; near-free once S1+S6 exist. She's never seen aggregation, so she lists it as a separate chore. → S6
- *Batching* make/buy/print/laminate into one weekly session — she listed supplies, not batching. → S6

**Group: Month-3 events (invisible in week 1)**
- *Conference packets* assembled from promoted observations. → S8 (requires the promote-to-export amendment — see DISSENT)
- *Checkpoint evidence assembly.* → S13
- *Child joins mid-year:* a two-week settling burst of daily observation prompts, plus same-day purge of a leaver's scratch items when a child departs. Episodic, guilt-heavy, always improvised. → S11
- *Her sick day / substitute day:* a printed sub folder generated from the skeleton plus non-sensitive operational notes. When she's out she cannot plan, so this cost is invisible to her by construction. → S7
- *Licensing visit:* mostly school-owned; a one-page readiness check at most. Low.

**Group: Families**
- Promise ledger + developmental-concern scaffolds. → S10 (top-5 #5)
- *Photo triage at midday* — 60 photos of 12 two-year-olds, sorted by child, manual tags only. Real friction, but heavy privacy surface; only if boards/newsletters prove photo-bound. Mid.
- *The points system she actually requested:* parked, honestly. For two-year-olds a per-child points tracker mostly bookkeeps adults. If she reports genuinely keeping points by month 2, build the tracker then (~1 day). Until then it's the lowest-value item on her own list.

**Group: Durable professional memory**
- *Moves library* — "what worked for separation anxiety in January." Non-child-linked, so it legitimately survives the expiry window. She never asked for it because everything she'd save feels child-linked — but the reusable part, the *move*, isn't. → S12

**Group: Money (low)**
- Receipts for her own spending, tax-season export. A note field in S6, never a feature.

**Group: Conditional — verify first**
- Nap/diaper/meal trend flags: **only if** the mandated app does not already own that data. If it does, this is banned duplicate entry (see NEVER BUILD). See DISSENT item 4.

## SLICE ROADMAP

```
S1 · Capture → typed records → one-tap correction (settled v1)
  Ships:      Messy midday paragraph in; clean per-child records out; correction by tap.
  Value:      The highest-frequency task (family notes) stops being handwritten prose.
  Depends on: nothing.
  Gate:       3 of 5 school days drafting family notes from it — else stop (settled kill criterion).
  Effort:     as specced in round 1.

S2 · The protective record
  Ships:      Append-only timestamped incident/conversation log on the phone; PDF export;
              one tested full restore from backup (records this serious demand proof of recovery).
  Value:      Her word becomes defensible. Career-grade risk retired for ~2 days of work.
  Depends on: S1 (records UI).
  Gate:       First real incident or hard conversation logged within 24h, unprompted, by her.
  Effort:     ~2–3d.

S3 · The day sheet (absorb the paper)
  Ships:      Schedule skeleton with specials; must/should/nice triage; two-minute task versions;
              DONE list; parking lot; weekly reset with carryover.
  Value:      Her self-declared #1 need moves from paper to the app; the list becomes schedule-real.
  Depends on: S1 gate passed (app exists; paper was the H0 instrument).
  Gate:       Paper triage retired; 5/5 days she checks the app list unprompted; reset used 2 weeks running.
  Effort:     ~3–4d.

S4 · Attention equity + trait noticing
  Ships:      Per-child coverage counter; "quietest child" surface; monthly-trait-aware capture prompts.
  Value:      Quiet children stop disappearing from documentation; uneven-notes parent moment prevented.
  Depends on: S1 data.
  Gate:       She names a child she'd been missing, unprompted, within two weeks.
  Effort:     ~1–2d.

S5 · Display-board drafts (first fan-out)
  Ships:      Observation → happened / practised / skill / next-offer narrative, tagged by domain.
              Rules-only path = manual tag picker.
  Value:      Boards stop being blank-page writing; tagging discipline begins (feeds S8/S13).
  Depends on: S1.
  Gate:       Next board cycle built from an app draft with edits, not from scratch; ≤20 min per board.
  Effort:     ~3–4d.

S6 · Weekly plan → the spreadsheet (the last 100 meters)
  Ships:      Weekly plan exported in the mandated spreadsheet's exact shape; prep list batches
              make/buy/print/laminate; newsletter assembled from the week's notes.
  Value:      Friday submission becomes assembly; Sunday dread shrinks.
  Depends on: S1; benefits from S3's skeleton.
  Gate:       Plan filed in ≤15 min from app output, two consecutive weeks.
  Effort:     ~3d.

S7 · The sub folder
  Ships:      One-tap printed handoff: day skeleton, where things are, operational per-child notes,
              verifiable against posted sheets — physical, locked in the room.
  Value:      Her sick day stops being a guilt crisis; the room runs without her memory.
  Depends on: S3.
  Gate:       One real absence day (or a drill she'd hand over with confidence).
  Effort:     ~2–3d.

S8 · Conference packets
  Ships:      Per-child rollup of promoted observations; coverage holes flagged before she walks in.
  Value:      Conference prep becomes retrieval, not archaeology.
  Depends on: S5 tagging; the promote-to-export amendment (DISSENT).
  Gate:       One conference cycle prepped from the rollup; she reports ≥1 hour saved, nothing missing.
  Effort:     ~3–4d.

S9 · Pattern view
  Ships:      Aggregates of her incident records: time-of-day, transition, peer pair, nap/meal proximity.
  Value:      The biting-season parent meeting answered with a pattern, not an apology.
  Depends on: S2 with accumulated records.
  Gate:       She cites the view in one real behavior conversation with director or parents.
  Effort:     ~2–3d.

S10 · Shadow list + hard words
  Ships:      Avoided-conversation surfacing at weekly reset; promise ledger; three message scaffolds.
  Value:      The dread stops compounding silently; the hardest emails get started.
  Depends on: S3.
  Gate:       One avoided conversation surfaced and completed within 48h of surfacing.
  Effort:     ~2d.

S11 · Arrivals and departures
  Ships:      Two-week settling prompt burst for a new child; departure summary; same-day purge of a leaver's scratch data.
  Value:      Mid-year churn stops being improvised under parent anxiety.
  Depends on: S1.
  Gate:       One new child's first two weeks: daily settling notes without her designing prompts.
  Effort:     ~2d.

S12 · Moves library
  Ships:      Durable, non-child-linked "what worked" notes, searchable.
  Value:      January's solution answers November's problem; the one asset that compounds.
  Depends on: nothing (nice after S5).
  Gate:       She retrieves a past move for a current problem, once.
  Effort:     ~1–2d.

S13 · Checkpoint evidence assembly
  Ships:      Tagged observations rolled up against the assessment framework's codes; export.
  Value:      Checkpoint season stops being a weekend of memory-mining.
  Depends on: S5, S8, and months of tagging discipline.
  Gate:       One checkpoint window assembled without archaeology; her estimate: under half the prior effort.
  Effort:     ~4–5d.
```

## IF SHE ONLY GETS THREE MORE SLICES

**S2, S3, S4. Then stop.**

S2 because two days of work retires the one unrecoverable risk — a missed incident record cannot be reconstructed after the fact, and a semester of small frictions never outweighs one career-threatening dispute. S3 because it is her *own stated #1 priority*, use twice daily, and it completes the loop the paper triage started. S4 because it is nearly free and protects the children the tool would otherwise silently fail.

The painful cut is S5. It is the proof of composability — the thesis of absence #2 — and I hate losing it. But boards can survive another term as hand work fed by S1's notes, and if three slices is truly the budget, stakes and stated need beat thesis.

## ENTERPRISE VERDICT

There is no enterprise path that preserves the compliance posture, and the fork is a trap. Name it plainly: "enterprise" means multi-user, admin oversight, audit, SSO, retention policy — and every one of those requires the developer to authenticate someone, store something, or broker access. The moment a second teacher's data touches shared infrastructure, the developer is an operator of children's records: consent, retention, breach notification, parental access, and a school that never procured them. That posture is not a feature to trade away later; it is the entire reason the product is legally safe to exist. And commercially, centre-wide platforms with admin consoles are exactly the lane of well-funded incumbents selling to administrators. Entering it means competing for procurement budgets with no organization, on their turf, carrying liability they've already priced in.

The only multi-user shape that survives is **N × single-user with file interchange**: every teacher runs their own copy under their own key; the school's systems ingest exports the school itself stores; the developer is never in the data path. That is not an enterprise product — it is a personal tool adopted teacher by teacher, and it is the correct ceiling.

So take the honest reframe, which I believe is also what T actually meant: **enterprise-grade for a single user.** That means: verified recoverability (a tested restore, a printed recovery card for the day the laptop dies); exports in the formats the school's systems ingest, so her data is never hostage; append-only, timestamp-stable records that would survive scrutiny in a dispute; a deterministic rules-only core that works when nothing loads; the expiry window *as a policy she can show a director*; and a one-page privacy posture — "no vendor server, teacher-held keys, nothing to breach" — which is, not coincidentally, the bottom-up adoption artifact when a director asks "where does the data live?"

Timing: decide now, and the decision is *never*. Nothing in S1–S13 carries shared-state assumptions. The standing rule going forward: any feature that requires the developer to authenticate, store, or broker is dead on sight — including "harmless read-only admin views," which are the thin end of the same wedge. If a centre ever demands central administration, the answer is N copies plus the school's own storage; if that fails their procurement, walk away. That is Brightwheel's problem, not ours.

## NEVER BUILD

Round 1's bans stand. Extended — each of these sounds obviously good:

1. **Allergy / medical / medication records in-app.** A stale duplicate of safety-critical data is worse than none; the posted sheet and the office file are authoritative. Build the Monday "verify the posted sheet" check instead.
2. **Face recognition / auto photo-tagging of children.** Biometric identifiers on minors are a different legal category; one false match in a parent-facing artifact is unrecoverable. Manual tags or nothing.
3. **Auto-send to parents, or auto-posting to the mandated app.** Transmission makes the developer an operator, and machine-sent notes about someone's toddler are a trust bomb. She is always the sender; clipboard out, forever.
4. **Silent AI task triage / auto-dropping tasks.** One silently erased task destroys the DONE-list trust she explicitly asked for. The tool may reorder visibly; it may never erase.
5. **Predictive behavior labels on children** ("C7: aggression trending up"). The tool surfaces what *she* wrote; it never generates characterizations of a toddler she didn't write herself. The first generated label that leaks into a conference ends the product.
6. **Headcount / ratio tool.** A phone in her hand during active supervision *is* the licensing violation; the attendance system already exists. Counting stays on a lanyard counter.
7. **A notification engine.** An overloaded user mutes a chatty app within a week. All surfacing lives inside the midday ritual, never outside it.
8. **Ambient classroom voice recording.** Consent nightmare, supervision cost, and it turns the tool into a surveillance object in the room.
9. **Dev-authored activity / curriculum content marketplace.** Server, safety liability for activity advice, permanent maintenance treadmill. Her moves library (S12) is the durable version and owns none of the risk.
10. **Portfolios / yearbooks / keepsake archives.** Archive-shaped hostage data, storage bloat, in direct conflict with the expiry posture. Exports yes; curated memory products no.
11. **Duplicate entry of anything the school already owns** — attendance, medical, and (pending verification) diaper/nap/meal logs. The app captures only what no existing system captures: her observations and her judgments.
12. **Any multi-teacher or admin-visibility feature, including "just read-only."** See enterprise verdict.

## DISSENT

1. **The settled expiry window quietly kills S8 and S13.** Conferences and checkpoints need months of observation history; "child-linked items auto-expire on a rolling window" deletes exactly that. I am not relitigating the scratchpad posture — the app must not become the archive — but the rule as written needs one amendment: **promote-to-export.** One tap rescues a record-worthy item to T's own encrypted store in her own cloud; the app still expires everything unpromoted; the developer still holds nothing. Without this amendment, the two highest-value month-3 slices are building on sand, and absence #2 is only ever half-solved.

2. **Round 1 never located the laptop in space.** The midday rest window is the timing anchor; family notes are due before pickup; the laptop is the stronger device and *the two devices do not sync*. If the laptop is not physically in the classroom at 12:30, the current design has her strongest model running where the work isn't. Either the laptop lives in the room, or the phone's 12GB Snapdragon runs a small constrained decoder for same-window transforms. This is a structural question, not a detail, and the packet is silent on it.

3. **The kill criterion measures the wrong risk.** "3 of 5 days drafting notes" measures adoption; the existential risk is *wrong-child errors* — a family note about C7's day sent to C9's parents. That is a trust-ender with parents and possibly a reportable disclosure. Week 2 needs a second gate: zero wrong-child fields in shipped drafts, full stop. Two wrong-child errors and the model path is dead for family notes regardless of frequency — rules-only forever.

4. **The packet carries an unverified assumption about the mandated parent app's scope.** Whether it already collects diaper/nap/meal logs and photos changes the gap list materially — it's the difference between "trend flags" being a top-5 absence and a banned duplicate. One question to T before S3/S4 design: *what exactly does the school app already record per child per day?*

5. **Minor:** round 1 made voice a blanket fallback. Inside the midday window specifically — twelve sleeping toddlers, hands free — dictation is not the fallback, it's the safest input. Its polish deserves promotion for that one window, even while staying fallback everywhere else.
