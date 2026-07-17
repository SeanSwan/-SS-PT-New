# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/fusion/kimi-coach-cc-packet.md
**Seed:** (none)
**Tokens:** 2207 in / 10855 out · **Cost:** ~$0.1694 · **Wall:** 361.7s

---

# Kimi K3 — Coach Command Center: Hostile Design Review

**(a) VERDICT: SHIP-WITH-CHANGES** — the integrity engineering (honest states, real expiry, scoped drafts) is elite and rare; the visual language is still "2024 AI-chat starter kit," the tab IA is redundant, and the mobile chrome budget is blown. Nothing here is broken. Everything here is unmemorable.

First, genuine credit — because these were the hard, unglamorous right calls: killing fabricated replies is the single best product decision in the brief. Countdown reading server expiry, drafts scoped per staff+client+thread on shared floor devices, one scroll owner, focus restoration on the sheet — that's craftsman work. The problem is everything a user *sees*.

---

## (b) Top 5 weaknesses, most-severe first

**1. No signature moment; generic template feel.**
Every element described — dark panels, cyan/purple glow, chat bubbles, sticky dock, bottom sheet — is the default skin of every AI chat product shipping right now. "Crystalline Swan" promises *facets, refraction, ice, cut glass*. What's delivered is *flat dark rectangles with glow*. Glow is being used as the only depth cue, which means the surfaces are depthless. Worse: "ice-cyan + purple glow" is one variable-rename away from the **retired Galaxy-Swan (#0a0a1a / #00FFFF / #7851A9)**. Audit the token *values*, not just the token names — if the Crystalline fallbacks resolve to those hexes, reject on sight per house rules.

**2. The chrome eats the viewport the transcript was supposed to own.**
Client bar (~56px) + tab bar (~48px) + dock (133px) ≈ **237–250px of persistent chrome**. On a 375×667 phone with Safari chrome, usable viewport is ~590px — transcript gets ~340px, and with the keyboard open it collapses to ~120px. "Transcript owns the viewport (~42%)" is a confession, not a flex. And the CTA hierarchy is muddled: in a floor-first tool, **Talk (Mic) is the hero action**, yet the composer gives More · textarea · Mic · Send equal weight. Four peers, no protagonist.

**3. Redundant IA: three tabs where one mode belongs.**
History duplicates what day dividers + scrollback already do. Review (pending confirmations) should be an ambient state, not a destination. Every tab on a talk-first console is a tax; every tab switch mid-session on the gym floor is a lost set. Talk should own the surface.

**4. Confirmation cards can die in scroll.**
Inline cards are correct for context — but a countdown that expires while scrolled off-screen is a dead end and a trust hit ("I never saw it"). There is no persistent affordance for "you have a pending write." Also: a two-tap arm button living inside a scrollable list of tappable message rows is a nested-interactive and accidental-tap risk.

**5. Gold conflation breaks the token system.**
"Gold as the luxury/caution accent" is two semantics in one hue. If gold means both "celebrate this PR" and "watch out, this expires," users learn it means nothing. Split `--accent-luxury` (reserved exclusively for PRs, milestones, pro tier) from `--semantic-warning` (amber family). And test it: gold on obsidian at 13px frequently fails 4.5:1.

Runner-ups: top bar physically cannot fit selector(44) + New + Ops + 2–3 chips on 320px (chips are a desktop pattern crammed onto mobile); per-message copy/read-aloud icon buttons are either always-visible clutter or long-press-hidden and undiscoverable; the first-run empty transcript is a cold-start with no brand moment.

---

## (c) Implementation-fidelity attacks

**Tokens / styled-components**
- Grep for hex: zero allowed. Every color `var(--token, #crystalline-fallback)`. Verify fallbacks are *current* Crystalline values, not legacy Galaxy-Swan.
- Transient props only (`$active`, `$pending`) — no unknown-prop DOM leakage. No `styled()` created inside render. Keyframes hoisted to module scope. No theme-prop drilling where CSS vars suffice. Zero MUI imports.
- Any progression sparkline in record cards = **Victory**, hand-rolled SVG only for decorative facets.

**Responsive matrix (the brief describes a phone layout; desktop is asserted, not shown)**
- **320:** chips off the client bar — they cannot fit at 44px. Collapse New/Ops into More.
- **375/414:** dock ≤133px, transcript ≥50% of viewport. This is currently failing.
- **768:** decide sheet behavior — bottom sheet reads phone; at 768 the catalog should be a side panel.
- **1024/1440:** three-pane console (roster rail · transcript max-measure ~760px · context rail). A stretched phone chat at 1440 is not a "strong desktop console."
- **2560/3840:** hard cap the console (~1600px) with an intentional backdrop; type via `clamp()`. A 3840px-wide chat bubble is malpractice.

**Touch targets:** chips (almost certainly 28–32px) → 44px or gone; copy/read-aloud icon buttons → 44px or move to a long-press action sheet; jump-to-newest pill ≥44px; arm/cancel ≥44px; catalog rows ≥48px.

**Keyboard / focus / SR / reduced-motion**
- Sheet: verify focus restores to the **More button**, not `body`. Esc closes + restores.
- Transcript: `role="log"` with `aria-live="polite"`, messages `aria-atomic`. 
- **Countdown must not be `aria-live` per-second** — that's screen-reader spam. Visually ticking text gets `aria-hidden`; a visually-hidden status announces at thresholds (60s / 10s / expired).
- Focus rings: cyan glow ring must hit 3:1 non-text contrast against adjacent surface (1.4.11).
- Waveform: canvas or `scaleY`-transform bars on the compositor — if it's animating `height`/`width`/`box-shadow`, it's paint thrash, send it back. Under `prefers-reduced-motion`: static level bar, instant state changes, all transitions wrapped in `@media (prefers-reduced-motion: no-preference)`.

**DOM / nesting:** confirmation card buttons inside a clickable message row → make message rows non-interactive containers. No `<button>` in `<button>`. One `<h1>` per view.

**File size:** Transcript (day dividers + pending row + pill + 5 message states) and ConsoleDock (composer + waveform + dictation + draft persistence) are both >300-line candidates → automatic send-back per house rules. Split: `MessageRow`, `ConfirmationCard`, `DayDivider`, `EmptyState`, `PaywallCard`, `JumpPill`, `useScopedDraft` hook, `WaveformStrip`, `MicButton`.

---

## (d) THE ONE highest-impact change: **The Crystallize**

When a command executes (server-confirmed write), the outgoing message doesn't get a text reply — it **transforms into a faceted crystalline artifact**. FLIP-morph (transform + opacity only, ~400ms, one pass): "log bench 5×5 225" → a crystal-cut record chip with a conic-gradient iridescent facet hairline, big tabular numerals **225 × 5×5**, a single refraction light-sweep across the facet — then it goes still. On a PR: the reserved luxury-gold filigree and "+10 lb PR."

Why this is the one: it's brand-specific (crystal *is* the name — nobody can mistake it for a template), it visually proves "operating console, not chatbot" (competitors print text; we crystallize executed truth), it's GPU-cheap and reduced-motion-degrades to an instant state change, and it seeds the revenue slice below. Spacing rhythm and hierarchy are hygiene. This is identity.

---

## (e) What a design-savvy competitor out-builds here

1. **Proactive beats reactive.** The winning coach tool tells the trainer the next action before they ask: *"Jordan — knee note from Tuesday, missed top set last session → adjusted opener: [Approve] [Edit]."* A polished-but-reactive console loses to one proactive card.
2. **Offline-first command queue.** Gym basements have no signal. Queued sets with an honest visible sync state wins the floor; a spinner loses it.
3. **A real desktop console** — roster rail, context rail, density — instead of a stretched phone.
Secondary: numeral-first typography with Victory micro-sparklines in every record card, haptic-confirmed gestures, trainer-branded share artifacts. If they ship the brief + offline queue first, our chat-truth advantage becomes table stakes within two releases.

---

## Refactor plan (full scope)

**Visual direction.** Actually commit to crystalline: faceted hairline borders (conic-gradient ice iridescence, 1px) instead of uniform glow; depth from layered translucency + one `backdrop-filter` layer; consistent top-left key light; glow reserved for the primary action and the Crystallize — nowhere else. Typography as the premium signal: tabular-figure numerals set large — fitness data is numbers, and great numeral typesetting is the cheapest luxury cue that exists.

**IA / layout.** Collapse client bar + tab bar into one 56px contextual header on mobile: client identity (initials + name + next session) is context; New/Ops/chips live behind More. **Kill the History tab** (day dividers already do it). **Review becomes an ambient pending-action pill** pinned above the dock — "1 action awaiting confirmation · 0:42" — that scrolls you to the card; the inline card remains the detail view. Desktop ≥1024: three panes as above. Mobile budget: 56 header + flexible transcript + ≤120 dock = transcript finally owns ≥60% of the screen.

**Motion language.** 150–250ms micro, 350–500ms sheet, spring-eased cubic-bezier, transform/opacity only, nothing pulses forever. Send = rise-and-settle. Success = Crystallize, once, then stillness. Motion as punctuation, not ambiance.

**Roles — one skeleton, three densities, not three codebases.** Admin: ops density, quick rebind, system states. Trainer: floor-first minimalism — hero Mic, near-zero chrome. Client: warmth and progress — milestone artifacts front-and-center, read-aloud always available, ops actions hidden. Copy compliance everywhere: "26+ years / NASM-protocol," never "NASM-certified"; catalog examples say "log a stretching session" / "flexibility work," never yoga/meditation.

---

## The Mic decision — resolved

**Keep it on both. Make it the hero on mobile.** The founder's "desktop-only" instinct reasons from a cost that doesn't exist: input is free, gating it saves $0 and directly violates the fewest-clicks mandate. The redundancy argument fails on the floor: the OS keyboard mic is three deliberate taps with the keyboard open; our Mic is one tap mid-set with chalky hands.

Concrete treatment: on coarse pointers, Mic is the primary — 48–56px, Dual-Button Glow primary (**blue bg → purple glow**), Send demoted to secondary (**purple bg → cyan glow**) and morphs into focus only when a draft exists. Tap-to-toggle with silence auto-stop, live waveform as the confirmation channel, dictated text lands in the scoped draft (already fixed — keep it), never auto-sends. Desktop: Mic stays visible as a secondary (no OS dictation exists in a text field there), keyboard-first composer, `/` to focus. Feature-detect SpeechRecognition — Firefox and patchy iOS Safari get **no dead button**, just the keyboard path and a capability note in the catalog. The cost lever is TTS + the brain. Gate those. Never gate the microphone.

---

## The monetization line, drawn honestly

**One principle: gate the compute, gift the record.** If a capability costs ~$0 at the margin, it's free and generous. If it burns real compute per use, it's paid.

**FREE (trust-building, near-zero cost):** Mic/dictation; command catalog; deterministic structured commands (log, view slots/schedule); full transcript + history + **export of your own data — never gated, ever, this is the mission**; confirmations, honest states, retries; search; milestone Crystallize cards with the SwanStudios mark; and **baseline read-aloud via on-device SpeechSynthesis** — free for everyone, because read-aloud is also an accessibility feature and *you never gate accessibility*.

**PAID (real per-use cost):** the free-form conversational brain (already pro — correct); **premium neural TTS voices** (the upgrade over the free on-device baseline — this resolves the monetization/a11y conflict cleanly); proactive insights and next-best-action generation; long-horizon progress narratives; **trainer-branded / unbranded HD share exports** — trainers will pay to put *their* logo on proof.

**Per role:** Client — everything free except premium voices and deep AI insight; a client paywalled on their own data churns the trainer. Trainer — pro = brain + premium voice + insights + branded shares. Admin — team oversight and seat analytics, priced per seat, never per-use on ops.

---

## The NEXT SLICE: **Shareable Milestone Artifacts**

One narrow unit: the Crystallize card → an exportable, story-format share image (Victory-rendered mini progression + facet design system), watermarked free, trainer-branded on pro.

Why it beats the alternatives: it closes the loop's weakest link (proof → **shareable**); it's acquisition that costs ~$0 per use — mission-aligned generosity; it creates the pro upsell (trainer branding) without gating anything human; and it *forces the signature moment into existence* — brand identity and revenue in one slice. It's genuinely narrow: one card component, one export path, one share target.

**Runner-up: the proactive pre-session brief** — higher willingness-to-pay (pure brain, clean pro gate) but a much bigger build (program state + inference UX + trust calibration) and zero acquisition effect. Ship it second, immediately, as the pro tier's headline feature. Desktop console third (retention, not growth). Tie-break rule: when acquisition and revenue tie at this stage, ship acquisition — the pro tier's value scales with trainer count.

**The one-line summary for the founder:** you built an honest machine that looks like everybody else's chatbot. Crystallize the truth you're already telling, give the proof away, and charge for the brain and the voice.
