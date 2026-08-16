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
