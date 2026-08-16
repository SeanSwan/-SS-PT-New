# PANEL REPLIES — three independent reviewers on the Classroom Copilot packet

Reviewers answered the SAME sanitized packet independently, each with a different lens.
They converged on much, and disagree sharply on five points listed at the end.

# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/00-PACKET.md
**Seed:** (none)
**Tokens:** 2671 in / 5005 out | **Cost:** ~$0.0831 | **Wall:** 118.8s | **finish_reason:** stop

---

## VERDICT
Build the iOS capture-and-sort loop only, on-device, with Apple Speech for STT and a 3B-class local LLM doing constrained JSON extraction — and ship nothing this weekend except a paper triage sheet and a cloned Ollama setup on her Mac for child-data-free planning help. The 8GB RAM question is real but survivable: 3B Q4 fits, 8B does not, and the sorting task does not need 8B. The thing that will actually kill this product is not inference — it's voice capture in a loud toddler room and a review queue that becomes a second inbox.

## THE ONE FEATURE
**The end-of-day brain dump → typed records → one-tap confirm queue.** It is the loop she described unprompted, it runs at the one moment she reliably has (after dismissal), and it produces the raw material every other feature consumes (observations, tasks, parent follow-ups, supplies, DONE list). Rejected: (1) *morning "what do I need today"* — it's a read view over data that doesn't exist until the dump feature has run for two weeks; shipping it first means shipping an empty screen. (2) *parent-app daily note drafting* — highest frequency, yes, but it's a writing task that needs the observation store to be non-generic, and it feeds a mandated external app (C6), so it's H2. The dump feature also degrades gracefully: with zero AI, it's still a timestamped inbox she can triage manually — which is exactly the non-AI fallback path.

## H0 / H1 / H2
**H0 (this weekend, ~4 hours, not an app):** (a) A printed half-sheet: three columns MUST / SHOULD / EXTRA plus a parking-lot box, laminated, dry-erase. This covers her self-declared most important need by Monday. (b) An iOS Shortcut: dictate → append timestamped text to a single "Brain Dump" note in Apple Notes. Zero build, works Monday. (c) Clone the owner's Ollama setup onto her MacBook (Llama 3.1 8B Q4_K_M if 16GB, Llama 3.2 3B Q4_K_M if 8GB) with a system prompt for *generic-only* content: activity ideas, newsletter skeletons, first-week plans. Explicit rule taped to the laptop: no child names into Ollama until the app exists.

**H1 (10–14 working days):** Expo iOS app, phone only. Four screens: Capture (big mic button + text field), Review Queue (card stack of parsed records, tap to confirm, one-tap retype), Today (MUST/SHOULD/EXTRA + today's follow-ups), Done (auto-logged confirmations). On-device sort via local LLM. No sync, no Mac client, no parent-app integration. Day count is honest only if the owner already has Expo + SQLite scaffolding experience; add 4 days if not.

**H2 (the year):** Friday weekly-reset flow; parent-note drafter that pushes text into the parent app via iOS share sheet (feeds, never duplicates — C6); "making learning visible" narrative generator (observation → 4-part board text); iCloud Drive sync + Mac companion (Expo web/PWA reading the same synced SQLite); correction-history few-shot tuning of the sorter. Design now for H2: the `entries` schema must carry `corrected_from` and `confirmed_at` from day one, or you can't improve the sorter later.

## ARCHITECTURE
**Platform verdict:** Build **Expo iOS only**. Do not touch react-native-macos or Catalyst — both are maintenance traps for a zero-maintenance user (C5). The Mac path is: H1 has none (phone-first is the constraint anyway, C3); H2 adds an Expo-web PWA on the Mac reading the same database via iCloud Drive file sync. The "iOS app runs on Apple Silicon Macs" path requires App Store distribution with the Mac checkbox — fine for a real release, useless for a private single-user build, so don't plan on it. Fallback if Expo stalls: SwiftUI native iOS — for this feature set it's genuinely less code than RN + a llama.cpp React Native binding, and it gets Apple's on-device Foundation Models framework (iOS 26, iPhone 15 Pro+) for free, which solves inference, structured output, and model-shipping in one move.

**Local inference (the RAM math):**
- **Task reality:** the sorter is extraction/classification into a fixed enum with short outputs. This is a 3B-model job with constrained decoding, not a reasoning job.
- **8GB MacBook Air:** macOS + browser ≈ 3.5–4GB resident, leaving ~4GB. Llama 3.2 3B Instruct Q4_K_M = 2.0GB weights + ~0.4GB KV at 4k context ≈ 2.5GB working set → comfortable, ~20–30 tok/s on M2/M3. An 8B Q4_K_M (4.9GB + context) forces swap, beachballs, ~5 tok/s — do not ship it on 8GB. What degrades on 8GB: nuance in narrative drafting (H2 boards), not the H1 sorter.
- **16GB:** Llama 3.1 8B or Qwen3 8B Q4_K_M (~5.5GB all-in) for drafting quality; keep 3B for the sorter regardless — latency beats eloquence in a confirm queue.
- **Phone:** this is the real floor, and the packet doesn't know her iPhone model — find out before writing a line of code. 3B Q4 needs a 6GB-RAM iPhone (13 Pro/14+) to run without jetsam kills; on a 4GB iPhone it's marginal. If she's on iOS 26 + iPhone 15 Pro or later, use Foundation Models with `@Generable` guided generation and ship zero model weights. Otherwise bundle Llama 3.2 3B Q4_K_M via llama.cpp (~2GB app download — put it behind a Wi-Fi-gated first-launch download, not the App Store binary).
- **Non-AI fallback:** if the model is absent/slow/evicted by storage pressure, capture still works: every dump lands as one raw entry, sentence-split by a regex, presented untyped in the same review queue with manual type buttons. The app is a structured inbox that AI accelerates, never an AI that gates the inbox.

**Voice capture:** Apple Speech framework (`SFSpeechRecognizer`, `requiresOnDeviceRecognition = true`) — free, streaming, no bundled weights, on-device since iOS 13. Whisper (whisper.cpp tiny/base) is the fallback but strictly worse here. Failure modes in a toddler room, attacked: (1) far-field babble destroys accuracy → push-to-talk only, never always-on; recommend any headset/AirPods, which matters 10x more than model choice; (2) child names mangled → post-transcription fuzzy-match against the C1..Cn roster and highlight low-confidence matches in the review UI; (3) the social reality — she will not narrate into a phone in front of 2-year-olds → micro-capture must be equally fast as *typed* ("add: glue sticks" is 8 seconds typed); voice is for the 14:45 dump alone in the room. If on-device recognition isn't downloaded for her locale, fail loudly at setup, not silently at capture.

**Data model (ruthless version — 4 tables):**
```
children(id, code_name, created_at)              -- C1..Cn, ~14 rows ever
entries(id, raw_text, captured_at, source)       -- immutable inbox, source = voice|text
items(id, entry_id, type, child_id?, body, due,  -- type ∈ child_followup|observation|
      bucket, status, corrected_from, confirmed_at) --  parent|supply|prep|idea|admin;
                                                   -- bucket ∈ must|should|extra|null
done_log(item_id, done_at)                       -- the morale feature
```
No taxonomy table, no settings table, no schema UI (C5). Weekly plans and board narratives are *generated documents* stored as files, not entities.

**File layout (app container, mirrored to iCloud Drive in H2):**
```
ClassroomCopilot/
  copilot.sqlite            -- the four tables
  attachments/              -- photos of board displays, if ever
  exports/2025-W36.ccbackup -- weekly encrypted zip (SQLCipher key from her passphrase)
  prompts/sorter.system.md  -- versioned, so prompt fixes ship as content updates
```

**Sorting engine:** two stages. Stage 1, deterministic: split on sentence boundaries, regex the cheap wins ("need more X" → supply, "parent asked/said" → parent, "tomorrow" → prep with due=tomorrow). Stage 2, LLM: one call per dump with the full paragraph + child roster, constrained to a JSON schema (GBNF grammar in llama.cpp; `@Generable` in Foundation Models) emitting `[{type, child_code, body, due, bucket}]`. Constrained decoding is non-negotiable — free-text JSON from a 3B model will break parsing weekly. When it guesses wrong: the review queue shows each item as a card with the type as a single-tap chip row; retyping is one tap, child reassignment is one tap on the roster strip. Corrections write `corrected_from` and become few-shot examples in the next prompt. Hard rule: **observations and child follow-ups never auto-file silently** — they require confirm. A misattributed observation about a 2-year-old that nobody catches is worse than no system.

**Backup & device loss:** Do not run a server — the packet's §3 analysis is correct. Two layers: (1) iCloud Drive sync of the app folder (H2; Apple is the processor, not the developer — no operator obligations attach to *you*, and her school has near-certainly already vetted Apple); (2) H1 stopgap: every Friday reset produces an encrypted export she AirDrops to her own MacBook — 10 seconds, zero infrastructure, and it doubles as the cross-device story. Say plainly to her: lose the phone before H2 without a Friday export and you lose the week, not the year.

## RISKS
1. **Voice capture fails socially before it fails technically.** She won't dictate child observations in front of children or parents, and at 14:45 she's starting extended care until 17:30, not sitting down to dump. The dump habit never forms; the app starves; week-3 abandonment. Mitigation: typed capture parity, and anchor the dump to the Friday reset first (weekly is an easier habit than daily).
2. **Child-attribution errors destroy trust in one event.** The sorter swaps C4 and C7 on a behavioral note, a parent gets told the wrong child's nap story, and she reverts to paper permanently — and now there's a misfiled developmental record sitting in the store. Mitigation: mandatory confirm on anything child-typed, confidence highlighting, roster fuzzy-match.
3. **Silent model rot.** iOS storage pressure evicts the 2GB weights, or an OS update breaks the llama.cpp binding, and sorting quietly degrades to the regex path. She doesn't notice errors — she notices the app "got dumber" and stops trusting it. Mitigation: a health check on launch with a one-tap re-download, and the non-AI fallback path being genuinely good rather than vestigial.

## WHAT YOU'RE MISSING
1. **Her iPhone model and iOS version.** This decides the entire inference architecture (Foundation Models vs bundled 3B vs Mac-only). Nobody asked. Ask Monday.
2. **A capture-free day view.** Everything described requires her to input; the single highest-value screen is one that shows tomorrow's MUST list + unfilled parent notes + this week's observation gaps per child *without her typing anything*. Retrieval is the payoff that justifies capture; without it, capture is pure cost.
3. **Per-child observation coverage nudge.** With 10–14 kids, 2–3 will silently get zero observations for a month. A dumb "C9: no notes in 14 days" line is worth more than any generative feature and is 20 lines of SQL.
4. **Employer data-policy sign-off.** §3 admits her employer's policy is unseen. A personal device holding named-child developmental records may violate it regardless of where inference runs. This is a conversation before H1, not after.
5. **The DONE list as the retention mechanic.** It's filed as morale furniture; it's actually the churn-fighter. Week 3 is when she feels the app gives nothing back — the DONE log is the proof it does.

## DISSENT
Three places this packet is wrong. **First, C1 is over-broad as stated.** The legal tripwire in §3 is *the developer operating a server*, not data leaving the device per se. iCloud Drive sync — especially under Apple's Advanced Data Protection, where Apple itself cannot read it — does not make the developer an operator of anything, and refusing it converts a legal posture into a real data-loss risk for a solo non-technical user who will never do manual backups. The correct constraint is "no developer-controlled infrastructure," not "never leaves the device." **Second, the React Native premise is dogma, not reuse.** The owner's stack is React/Node/Postgres — none of which runs on-device anyway. For this feature set, SwiftUI + Foundation Models + SwiftData is less total code, no 2GB weight-shipping problem, and no binding maintenance. Choosing RN to honor a stack that doesn't apply to the constraint set is how you get a beautiful October failure. **Third, the honest answer to the two closing questions:** yes — for H0 and arguably H1, cloning the Ollama setup onto her Mac is 80% of the *planning* value for an evening of work, and you should do it this weekend regardless of what gets built. And versus paper: the app beats a notebook only on re-sorting, retrieval, and drafting — if she won't reliably run the confirm queue, paper plus the parent app genuinely wins, and the correct product decision is to ship the H0 paper sheet, watch whether she uses it for two weeks, and let that evidence gate the H1 build.

---

# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/00-PACKET.md
**Tokens:** 2584 in / 14753 out (reasoning: 12153) | total 17337
**Wall:** 268.9s

---

## VERDICT
Ship exactly one loop and nothing else: a button that takes her dictated brain-dump and returns six sorted lists, running locally on her phone during naptime. Every other listed domain is furniture until that loop survives two real weeks — and note the packet's timing error: the dump's payoff is due before the 14:45 pickup, so "after-school reset" is the wrong anchor. If inference can't run at school, the product delivers value after her deadlines and she quits by week 3.

## THE ONE FEATURE
**The Dump: messy paragraph in → typed records out.** It's the only touchpoint she described as daily and emotionally central, and it is upstream of every other value in this product: the morning brief is a query over its output, family-note drafting consumes its observations, the Friday reset aggregates it, the DONE list is fed by it.

Rejected runners-up:
- **Family-note drafter** — her highest-frequency obligation, yes, but with no captured observations it's an empty template. It's the first bolt-on *after* the dump works (days 11–14), not the core.
- **Morning brief** — zero cold-start value; it's a read view. Ship it as a query, not as a feature.

Explicitly killed from v1: points/rewards system (two-year-olds need physical token routines; a phone mid-transition is the wrong modality — this is not a software problem), anything photo-adjacent (the parent app owns it; #1 scope-creep magnet and privacy hazard), newsletters, boards, dashboards, "insights."

## H0 / H1 / H2
**H0 (this weekend, not an app):** The owner spends one evening being the aide, with a cloud LLM on generic content (zero child data — C2 permits this): first-week lesson plan, activity bank, room labels, reward mechanics, rest/restroom procedure scripts, first-day checklist, parent-app and attendance setup. Print everything. Give her a paper dump sheet with her six boxes and a DONE whiteboard — it trains the category vocabulary the app will later inherit. Get the director's verbal sign-off on local notes (see Missing).

**H1 (10 working days):**
- Days 1–3: Expo dev-client app; SQLite schema; Dump screen (iOS keyboard dictation into a textarea — no custom STT); items list; DONE swipe.
- Days 4–6: llama.rn with Qwen2.5-1.5B Q4_K_M, GBNF grammar-constrained JSON output; rules-based fallback parser; roster fuzzy-match correction chips.
- Days 7–8: Today view (the morning brief as a query), quick-add, DONE count.
- Days 9–10: per-child family-note drafter (2 sentences from today's observations, copy-to-clipboard for the parent app); encrypted iCloud export; TestFlight install on her phone and the MacBook, done *for* her.
- **Success bar:** she runs the dump ≥4 of 5 school days in week two unprompted. If not, stop and find out why before writing another feature.

**H2 (rest of year, only if the loop holds):** whisper.rn big-button capture and batch voice-memo transcription; "making learning visible" board drafter (blocked on knowing the school's skill framework — see Missing); Friday reset with MUST/SHOULD/EXTRA triage and a done-count digest; lesson-plan export to the shared spreadsheet; 3B model on 16GB devices. Never: rewards, photos, analytics, multi-teacher, cloud sync of child data.

## ARCHITECTURE
**Platform verdict:** Expo (prebuild/dev-client, not Expo Go) iOS app via TestFlight ($99 dev account). The same IPA runs on her phone *and* on the 2024 MBA — Apple silicon runs iOS TestFlight builds natively. Cost, stated plainly: there is no real macOS app; she gets an iPad-shaped UI on the Mac. Acceptable, because the Mac is a fallback, not the product — and this is why **react-native-macos and Catalyst are rejected outright**: weeks of yak-shaving for a machine she opens twice a week. Fallback if native modules stall: a PWA in the owner's exact web stack (~2 days) with llama.cpp served by a daemon on the Mac — phone captures offline, processes on home Wi-Fi. Cost of the fallback: no at-school inference, so naptime note-drafting degrades to manual-from-sorted-scraps.

**Inference:** llama.cpp via llama.rn. 16GB: Qwen2.5-3B-Instruct Q4_K_M (~2GB file, ~3GB RAM, ~15–25 tok/s on M2/M3). 8GB: Qwen2.5-1.5B-Instruct Q4_K_M (~1GB, ~1.5GB RAM, ~12–20 tok/s). What degrades on 8GB: long-form drafting speed and rare-label classification slightly — barely material, because output is grammar-constrained JSON over 8 labels; small models are reliable at this. Phone: 1.5B on 4GB+ devices, 3B only on 6GB+. **Non-AI fallback (mandatory, in v1):** keyword/regex rules + roster match correctly type ~60–70% of dumps; the rest land as untyped items she tags with one tap. The app must be a useful dumb notepad if the model never loads.

**STT:** v1 ships no speech integration. iOS keyboard dictation is on-device, free, good, and already in her thumb. Attack on the whisper assumption: toddler rooms run 85–95dB; she's at arm's length while verbally de-escalating; models trained on close, adult-directed speech garble child names precisely where accuracy matters; whisper.cpp offers no roster-constrained decoding, so you'd fix names post-hoc anyway. Dictation + fuzzy roster match (Levenshtein ≥0.75 against ~12 names/nicknames, "did you mean" chip) beats DIY STT for months.

**Data model — 3 tables, SQLite:** `child(id, name, nickname, active)`; `note(id, created_at, raw_text)` — immutable source of truth, never mutated; `item(id, note_id?, child_id?, type ∈ child|observation|parent|supply|activity|prep|admin|idea, text, due_date?, priority, status ∈ open|done|parked)`. Day/week/brief views are queries. No tags, no schema editing (C5). Postgres/Sequelize is server-brain; expo-sqlite is the right tool.

**Sorting engine:** note → few-shot prompt + GBNF grammar forcing `{"items":[{type, child, text, due, confidence}]}` → post-pass (roster fuzzy-match, relative-date resolution, dedupe) → cards. Correction affordance: type chip (tap cycles 8 icons, no menus), child chip (tap → roster sheet), swipe = done/park. Everything unreviewed still auto-files into Today so nothing hides, and the raw paragraph is always viewable beneath the cards. Budget: a wrong guess costs exactly one tap. A accumulating "review queue" is a design failure.

**Layout:** `src/screens/{Dump,Today,Child,Friday}` · `src/engine/{parse.ts, llm.ts, sort.gbnf, roster.ts}` · `src/db/` (expo-sqlite + migrations) · `src/backup/export.ts` (VACUUM INTO → gzip → AES-256-GCM, key from a once-set four-word passphrase).

**Backup / device loss:** DB in app Documents → covered by her iCloud device backup automatically (her Apple ID — we are never an operator). Plus on-open encrypted export to iCloud Drive via share sheet; we cannot read it, she holds the passphrase. Phone lost → restore from iCloud; worst case loses captures since last open. Blast radius is bounded regardless: the parent app and SIS remain the systems of record; this is her notebook, not the archive. Local-first stance is correct — the alternative makes the developer an operator of toddlers' developmental records overnight.

**Clone question, honestly:** Ollama + prompt + notes folder is right *for this weekend* and wrong as the product. Chat is unstructured-in/unstructured-out: no persisted typed state, no roster, no brief object, corrections mean retyping, and non-technical users do not maintain system prompts. But steal its bones — this app is a thin opinionated shell over the same local models. **Vs. paper + parent app:** paper captures just as fast. She gains exactly three things: per-child aggregation at note-writing time, 20-second drafts, and retrieval ("when did C4 last fall apart at cleanup?"). If H1 doesn't measurably deliver those three, paper wins and we stop.

## RISKS
1. **Timing miss.** The packet's "after-school dump" lands after the 14:45 family-note deadline. If the payoff arrives after pickup, she never feels the daily win → quiet abandonment. Anchor everything to the 12:30–14:00 nap window.
2. **Name-garbling spiral.** Dictation mangles names → correction fatigue → she stops dictating → starving app → stale brief → dead. Roster fuzzy-match ships in v1 or not at all.
3. **Device/install reality.** If her phone is 3–4GB or full, the model won't load; without a visible, good rules fallback the "app" is an error message. Same for TestFlight friction: if install isn't done for her, day 11 dies in a setup screen.

## WHAT YOU'RE MISSING
1. **Roster onboarding and mid-year churn** — 12 names + nicknames, add/remove. It gates dictation matching and per-child everything. Nobody mentioned it.
2. **Her actual clock as the information architecture** — naptime write-window, 14:45 deadline, pickup. The app's schedule is not "morning/after school/Friday."
3. **Employer sign-off.** The center's data policy is unseen; a one-page "what this is / how to delete it" for the director, in writing, before week 2. If the center says no personal-device notes, architecture is moot.
4. **The school's early-learning framework vocabulary** — required input for the boards feature; unknown today.
5. **Quiet defaults and substitute mode** — zero notifications ever; one-tap shareable "today" for the day she's out sick.

## DISSENT
1. **The packet romanticizes all-day micro-capture.** A solo teacher mid-incident cannot operate a phone — her hands are on children and her attention *is* the pedagogy. Real behavior: ten-second scraps right after events plus the naptime dump. Design for that, or your capture metrics will lie to you.
2. **§1's domain list is ~5× inflated.** Points/rewards and "classroom management" are not software problems for two-year-olds; most "domains" are one enum value, not features; and the "most important" MUST/SHOULD/EXTRA ask is a priority field plus a Friday screen, not a system. If §1 drives scope, H1 arrives in October.
3. **The platform question is mis-framed.** "Runs on her Mac" was never her requirement — it's the owner's stack talking. Phone is the product; Mac is a viewer. I would spend zero days on macOS.
4. **No app helps Monday, and some of her load is a staffing problem.** The honest H0 is a human being the aide for one evening. The app's job is memory and drafting, not presence — don't let "assistant" in the name promise an aide; it will under-deliver and she'll blame herself.
5. **Add the kill criterion this packet lacks:** if by end of week two she isn't drafting family notes from the app at least 3 days in 5, stop building, interview her, and seriously consider clone-plus-paper as the answer. Building H2 on an unproven loop is the failure mode this panel is actively courting.

---

# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/brainstorms/classroom-copilot-2026-08-15/00-PACKET.md
**Seed:** (none)
**Tokens:** 2652 in / 5409 out | **Cost:** ~$0.0032 | **Wall:** 102.9s | **finish_reason:** stop

---

## VERDICT
Build a one-thumb unstructured text capture invoked from any screen plus a two-tap end-of-day sort review; voice is a fallback, not the backbone, because toddler-room noise destroys speech-to-text. Local-first is correct but backup must go to her personal iCloud, not our servers, or device loss becomes a legal crisis. For Monday, ship a paper triage board and a phone Notes widget—not an app.

## THE ONE FEATURE
**Name:** *Instant Unstructured Capture + Guided Sort Review* (the full loop, but with text-first input).

**Defense:** The two runners-up are (a) *automated voice brain-dump sorting*—rejected because in a loud room STT fails and she cannot verify mid-class, and (b) *parent-app auto-draft generator*—rejected because C6 forbids duplicating the mandated app and it is lower frequency than all-day capture. The one feature that survives physical reality is a capture that never asks her to categorize, followed by a 90-second evening review that fixes the machine’s guesses with one tap.

**Capture gesture (screen by screen, tap by tap):**
1. T is holding a child; phone is in other hand or pocket. She double-taps the back of her iPhone (iOS Accessibility > Back Tap) or presses volume-up twice.
2. A system-level translucent sheet slides up (60% height) over any app: top shows timestamp “14:32”; center is a single large multiline text field, placeholder “Type anything—no categories”; bottom has a mic icon (secondary) and a big “Save” pill.
3. She taps the field, one-handed thumb-types “C7 counted 5 bears” (or taps mic, sees live transcript, immediately edits). On dismiss or Save tap, the raw string is written to local SQLite with `created_at` and `source=quick`. No tag UI appears. This honors C4.

**End-of-day sorting review UI (screen by screen, tap by tap):**
- *Screen A – Evening Reset:* App opens to “Today’s Raw Captures” (chronological list, raw text + time). Bottom button: “Sort 12 items”.
- *Screen B – One card at a time:* Full-screen card shows raw text. Beneath: “I think:” with 1–3 pre-filled category chips (e.g., “Dev obs”, “Supply”, “Parent”). Below that, a horizontal scroll of all six categories as small chips.
- *Tap interaction:* She taps any wrong chip → it highlights red → a popover of categories appears → she taps the correct one → chip updates instantly. If category is child-related, a 4×4 grid of colored squares labeled C1..C14 slides up; one tap assigns the child. Right-swipe confirms and advances; left-swipe deletes the capture.
- *Correction affordance:* When the sorter guesses wrong, the chip shows a “?” and low-confidence orange border. She never types to correct—only taps. After the last card, a “Done – 2 needs review” summary appears; she can ignore or fix later.

## H0 / H1 / H2
**H0 (0–2 days):** No app. Print a MUST/SHOULD/EXTRA triage poster and a pack of sticky notes. On her iPhone, pre-create a Notes folder “Class Log” and add a Siri Shortcut “Add to Class Log” that appends typed/text dictation to that note. Zero build, helps Monday.

**H1 (days 1–12 of school year):** Ship Expo React Native iOS app (see Architecture) with the capture sheet (text-first) and the Screen A/B sort review using deterministic keyword rules (no ML). Day count: functional build by day 10, tested by day 12. Earns daily use because it replaces the Siri shortcut with one-hand gesture and gives the evening sort.

**H2 (the year):** Add on-device Phi-3-mini for smarter sorting, iCloud encrypted backup, idea parking lot, DONE list, and a “feeds parent app” copy-paste template generator. Design data model now so H1 isn’t blocked.

## ARCHITECTURE
**Platform verdict:** Primary path = **Expo iOS build** (React Native). It runs on her iPhone (phone-first, C3) and can be mirrored to her Apple Silicon Mac via iPhone Mirroring; we do NOT target macOS natively. Cost: no native mac window, but laptop is secondary. Fallback if Expo stalls: **SwiftUI iOS app** (owner hires a week of native help) – still avoids macOS fork and runs on Mac via Catalyst later.

**Stack:** React Native + Expo, TypeScript, styled-components. Local DB: SQLite via `expo-sqlite`. State: Zustand.

**Local inference design:** H1 uses regex/keyword sort (e.g., “need|wipes|glue” → Supply). H2: `phi-3-mini-4k-instruct` quantized to **q4_0** via `llama.cpp` (bindings through a tiny native module). RAM floor: 8GB works (model ~2.3GB RAM, may swap—sorts take 2–3s instead of 0.5s); 16GB is smooth. If model absent or slow, app silently falls back to rule-based sort—still useful.

**Voice attack:** On-device Apple Speech or Whisper.cpp small fails when SNR < 0dB (toddler screams, distance). We make voice optional, show live transcript before save, and default to text. Failure mode acknowledged: if she relies on voice mid-class, 40% of captures are gibberish; thus text-first.

**Data model (ruthless):**
- `Note(id, raw_text, created_at, source)`
- `Tag(id, label)` (six fixed: ChildFollowup, DevObs, Parent, Supply, Tomorrow, Prep)
- `NoteTag(note_id, tag_id, confidence, child_id_nullable)`
- `Child(id, alias_Cn, color)`
That’s it. No schema editing (C5).

**File layout:**
```
/app
  /capture (QuickCaptureSheet.tsx, useBackTap.ts)
  /review (SortReviewScreen.tsx, CategoryChips.tsx, ChildGrid.tsx)
  /db (schema.sql, notesRepo.ts)
  /sort (rules.ts, modelRunner.ts)
  /backup (icloudSync.ts)
```

## RISKS
1. **Voice-first assumption kills trust:** In week 1 she tries dictation during cleanup, STT mangles “C4 hard time” into “cry heart time,” she can’t fix it, concludes app is broken and reverts to paper.
2. **Device loss / no backup:** Phone dropped in sensory bin, child data gone; local-first with no personal-cloud sync means total loss and a FERPA-adjacent incident.
3. **Sort fatigue:** If the evening review shows >3 wrong guesses per day and correction takes >10 seconds each, she skips Friday reset by week 3 and the loop dies.

## WHAT YOU'RE MISSING
1. **Encrypted personal-iCloud backup UX** – local-first hole; she needs one-tap “backup to my Drive” without us seeing data.
2. **One-handed color/icon child picker** – typing “C7” is slower than tapping a yellow square; absent from packet.
3. **DONE list celebration animation** – morale feature she named but packet treats as furniture; a daily “You did 14 things” screen prevents burnout.
4. **Copy-to-parent-app bridge** – not API, just formatted text + photo stub so she doesn’t re-type family notes.
5. **Accessibility for wet/busy hands** – glove/multi-touch tolerance not mentioned.

## DISSENT
The packet’s core assumption—that the product is “unstructured voice-to-text paragraph in, sorted records out”—is physically wrong for a solo toddler teacher. Voice in a loud room is the riskiest input, not the spine; the teacher’s own words were aspirational, not observed. I dissent that we should build a purpose-built app for H0/H1 at all: cloning the owner’s existing Ollama + notes-folder operator onto her Mac (or using Notes + Shortcuts) delivers 80% of value in an evening and respects C5/C6. A paper notebook plus the mandated parent app already covers daily family notes; the app only earns its keep if it delivers the MUST/SHOULD/EXTRA triage and DONE morale boost, which the packet underweights. Local-first is right, but the packet’s casual “cloud AI for generic content” ignores that she will not mentally separate the two and may fear leakage; better to keep even generic ideation on-device until trust is earned.
