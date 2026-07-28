# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** C:\Users\BIGOTS~1\AppData\Local\Temp\claude\c--Users-BigotSmasher-Desktop-quick-pt-SS-PT\fe778a8f-f18a-42e8-9876-fedbce2ec1d7\scratchpad\swanguard-kimi-hostile-packet.md
**Seed:** (none)
**Tokens:** 1641 in / 5002 out · **Cost:** ~$0.0800 · **Wall:** 173.4s

---

# Kimi K3 — Hostile Refactor Review: SwanGuard

**VERDICT: REBUILD-SHELL-KEEP-CORE.**

The backend, the permission/ledger/receipts engine, the Postgres data model, and the test discipline are real and load-bearing. The entire presentation layer — IA, chrome, interaction model, action surface, visual system — is wrong and must be rebuilt. This is not a full rebuild (the trust engine is the product's soul and it's correct), and it is not a refactor-in-place (you cannot polish a skeuomorphic TV cabinet inside a treehouse into a $50k product; the shell itself is the bug). We keep the core, demolish the shell, rebuild the shell around it.

---

## 1. Heart and Soul: what the product actually is

Strip the chrome and SwanGuard is **a family trust engine**: one household, one command view of its world, and a rigorous, auditable model of *who can see and do what with the family's data*. That is genuinely differentiated. Nobody else ships a permission/ledger/receipts spine for a *family*. That's the soul. Everything else is either in service of it or in the way of it.

Sorting the 14 modules:

**THE PRODUCT (keep, invest):**
- **Command** → this is the home screen, the daily family brief. It should be the first thing you see and the reason you open the app. Currently buried under "Load latest brief" buttons. Promote to hero.
- **Family Trust** → the actual product. Grants, access, who-sees-what. This is the moat.
- **Trust Safety** → kill switches and approvals. This is the *same product* as Family Trust seen from the emergency side. Merge.
- **Fair Access** → access policy. Merge into Trust.

**THE PRODUCT'S FUEL (consolidate):**
- **Civic Intel, Comment Intel, Influence Intel, Intel Wiki** → four names for one thing: "what's happening in the world that matters to my family." Merge into a single **Intel** module. Four separate top-level destinations for variants of a feed is developer taxonomy leaking into IA.
- **Readiness** → genuinely family-relevant, but it's a *status*, not a destination. It becomes a living readiness indicator on the home view, with a detail drawer.
- **Hermes** → comms/alerts. Demote from a module to an **inbox/notification surface** reachable from anywhere.

**SCAFFOLDING (kill or icebox):**
- **Owner Console** → developer console wearing a product costume. Dissolve into Settings.
- **Creator Board, Marketplace, Impact** → speculative features that never earned nav real estate. They are not the heart; they're three of the reasons the owner says "so many buttons that don't make sense." Icebox behind feature flags, remove from nav, delete in a later pass once nothing screams.
- **Food/Fuel data domains** → data feeds, not modules. They surface inside the brief, not as destinations.

**Result: the 14-module sprawl was never a 14-module product. It's a 3-product app (Today, Intel, Trust) with 11 open wounds.**

---

## 2. Target IA

**Three destinations + two utilities. That's it.**

| Surface | Contents |
|---|---|
| **Today** | The family brief (auto-loaded), readiness status, approvals awaiting decision, alerts. The default route. |
| **Intel** | One feed with filter chips (Civic / Influence / Commentary / Wiki), auto-loaded, photographic. |
| **Trust** | People & access (grants, permissions), Approvals queue, Safety (kill switches). Tabbed internally. |
| **Inbox** (utility, icon in header) | Hermes messages + system alerts. Badge count. |
| **Settings** (utility, icon in header) | Owner Console contents, connectors, era-skin-free preferences. |

**Navigation model:**
- **Desktop (≥1024px):** slim left rail, 72px wide, icon + label, exactly 3 destinations + inbox + settings + user avatar at bottom. Fixed, no overflow possible by construction.
- **Mobile (<720px):** bottom tab bar, 3 tabs + inbox, thumb-reachable. Settings behind avatar. The current horizontal strip that overflows to x=991 on a 390px phone is dead; nothing scrolls horizontally ever again.

**Where the 152 actions go — the action diet:**

A product with 152 visible actions has zero actions, because the user can't find any of them. Target: **~12 primary user intents** visible as buttons, total, across the app.

- **~60 "Load X" actions: DIE.** Data loads on view mount. Skeleton → content. Auto-refresh where freshness matters. Every "Load grants / Load observability report / Load latest brief" button is an admission that the app won't do its job. These don't get moved; they get deleted and replaced by `useEffect`.
- **~40 consequential actions (approve, grant, revoke, kill switch, compile, route): SURVIVE, promoted.** These are the product. Each gets a proper button with hierarchy, a confirm sheet for destructive ones, and a receipt toast. In Trust, they live contextually on the row/card they affect, not in a wall of gray pills.
- **~30 secondary actions: COLLAPSE** into per-card overflow (⋯) menus and detail views.
- **~20 developer/ops actions (observability reports, raw permission management, registry fiddles): BANISHED** to Settings → Advanced, behind an explicit "Operator mode" disclosure. They exist; they are not the interface.
- **The 10 `actionRegistry*.ts` files: collapse to one.** A registry that exists to catalog 152 buttons is ceremony that scales with the problem. One intent map, ~12 entries, typed.

---

## 3. Interaction model

**Kill the HoldActionCompass. On every breakpoint. Not hidden on desktop — deleted.** A gesture compass that needs on-screen arrows to explain itself ("Up: brief / Right: next / Left: acknowledge / Down: open / Hold") is a tutorial that never ends. It's a game controller for an app that isn't a game.

What replaces its four intents, natively per breakpoint:

| Compass intent | Desktop (pointer + keyboard) | Mobile (touch) |
|---|---|---|
| "Up: brief" | Nothing — the brief is the home view, already on screen | Nothing — same |
| "Right: next" | Click rail / `→` key / `⌘K` palette | Bottom tabs; optional edge-swipe between tabs |
| "Left: acknowledge" | Click the check; `E` key on focused card | Swipe-to-dismiss on alert/approval cards |
| "Down: open" | Click, Enter | Tap |
| "Hold" (destructive confirm) | Confirm dialog / hold-to-confirm button *inside the dialog only* | Hold-to-confirm on the destructive button itself — the one place hold gestures are legible on touch |

Desktop gets a **`⌘K` command palette** — this is the grown-up version of the compass. It subsumes navigation and the ~12 primary intents, it's discoverable, it's fast, and it costs zero pixels. Mobile gets **bottom tabs, pull-to-refresh, swipe-to-dismiss on cards, long-press for context menus**. Each platform gets idioms its users already know, and no gesture UI ever renders on a pointer device: gate on `(hover: hover) and (pointer: fine)`, not on width alone.

---

## 4. Visual direction

**Dark-first, cinematic, photographic — but SwanGuard is the observatory, not the gym.** SwanStudios-the-gym is crystalline ice and athletic energy. SwanGuard should be **the family watchtower at night**: warmer, quieter, more protective. Distinct tokens, same production values.

- **Base:** near-black ink/obsidian (`#0B0E11` range), layered with true glass (blur + 1px inner highlight), not flat dark-green cards. The current green was an accident; the new dark is a decision.
- **Accent:** one — a warm guardian amber/gold for trust states and primary actions, with a cool signal-teal reserved for intel/informational. Status colors (safe/attention/critical) are semantic and disciplined. Two accent families max; the current gray-pill monotony dies.
- **Photography:** full-bleed, National-Geographic-grade imagery as *atmosphere* — the Intel feed leads with editorial photography; Today opens on a photographic hero (dawn, landscape, weather of the family's place) with the brief set over it in glass. Film grain, vignette, generous negative space. No stocky illustration, no emoji-icon panels.
- **Typography:** editorial serif display for headlines and the brief (this is what makes it feel like a $50k magazine, not a console) + a clean grotesk for UI. Size contrast does the hierarchy that 152 buttons used to fake.
- **Hierarchy law:** **one primary action per view.** Critical (kill switch, approvals) gets size, color, and position; trivial gets nothing because it's automated. Panels earn elevation; nothing is the same flat card as everything else.
- **Motion:** slow, cinematic — 400–600ms ease-out reveals, parallax on hero imagery, cross-fades between tabs. Nothing bounces.

**The signature moment: the Morning Brief.** Open the app → full-bleed photographic hero of the day, the family's brief typeset over glass like a magazine cover — readiness ring glowing its status, approvals waiting rendered as elegant cards, one primary action. If a screenshot of that one screen doesn't make Sean say "oh," the refactor failed. Everything else is supporting cast.

---

## 5. The TV Treehouse frame

**Kill it. Not easter-egg, not evolved — killed, and I'd push back on anyone who flinches.**

Here's the hostile truth: the frame is the single most expensive piece of UI in the app — it wraps *every screen*, consumes layout, ships era-skin state and tuning knobs through the component tree — and its user value is zero. It's not whimsy; it's a developer's darling confusing *itself* with the brand. "Keep it as an easter egg" is how it survives, rots, breaks a layout in slice 4, and ships a bug to production. The kindest thing is a clean death: delete `TvTreehouseFrame`, `TuningKnob`, the era skins, and every prop drilled for them. The `glass-2026` skin's glass material may be mined for design tokens before deletion — that's the only salvage. If anyone needs nostalgia, take one screenshot for the README's history section. Products get easter eggs when the core experience is so good users forgive the indulgence. SwanGuard is not there.

---

## 6. Sequenced refactor plan

**Slice 0 — Hygiene (day 0, not a feature):** stash/branch the uncommitted in-flight work in the tree; refactor starts from a clean, claimed commit. Run the full test suite green as the baseline. No slices start dirty.

**Slice 1 — The Purge (highest visible impact, lowest risk). Ship immediately.**
Delete TvTreehouseFrame + era skins + tuning knobs. Delete HoldActionCompass from all 8 decks (code deletion, not a CSS hide). Convert every "Load X" panel to auto-load with skeletons. No IA change yet, no visual redesign yet — just remove the insults. The app instantly stops looking like a joke, and every existing test that survives is proof of safety.

**Slice 2 — IA Collapse.**
Nav becomes config-driven (`nav.config.ts`): 3 destinations + inbox + settings. Desktop rail + mobile bottom tabs. Readiness demoted to a Today status card; Hermes to inbox; Owner Console to Settings; Creator Board / Marketplace / Impact / Fair Access removed from nav behind flags (routes 410 → redirect). Fix the mobile nav overflow by construction.

**Slice 3 — The Action Diet.**
Implement the ~12-intent action model; collapse the 10 registry files to one; overflow menus on cards; confirm sheets for destructive actions; auto-refresh replaces manual refresh; banish operator actions to Settings → Advanced. Introduce `⌘K` palette. Institute an **action budget** from this slice forward (see Q7).

**Slice 4 — The Visual System.**
SwanGuard design tokens (obsidian base, amber/teal accents, serif display + grotesk, glass surfaces, elevation scale, one-primary-action rule). Restyle Today and Trust first — the two screens that carry the product. Dark-first; light theme deferred or never.

**Slice 5 — The Signature Brief.**
The photographic Morning Brief hero, editorial layout, readiness ring, approvals-as-cards. This is the screen Sean shows people.

**Slice 6 — Trust Redesign + Copy Rewrite.**
Purge developer language from user-facing copy: `influence:evidence_intake:create` → "Allow Maya to save evidence to the family archive." Raw strings, boundary badges, and receipt jargon move to an "advanced details" disclosure per item — the security model stays exact underneath; the words get human on top. Approvals UX with hold-to-confirm on destructive actions.

**Slice 7 — Intel Consolidation.**
Four intel modules → one photographic feed with filter chips; Intel Wiki becomes saved/pinned intel. Delete the three now-empty module shells and their static MVP data files.

**Slice 8 — Polish.**
Motion pass, PWA install experience, a11y audit (focus order now matters with the palette), performance budget, dead-code sweep (flags from Slice 2 resolve to deletions).

Every slice is independently shippable, every slice runs the full existing test suite plus updated smokes, and the app is never in a worse state than the previous slice.

---

## 7. Three hostile failure predictions

**Failure 1: Deletion breaks hidden consumers.** With 1,285 phases of Codex output and *another agent's uncommitted work in the tree right now*, some "dead" module or action will have a secret consumer — a test fixture, an API contract, an in-flight branch — and Slice 1 or 2 will ship a runtime hole that the suite doesn't catch.
**Guardrail:** clean-tree claim before Slice 0 (non-negotiable); two-pass deletion for everything — flag-hide first, full delete one slice later; grep-or-die: every removed module/action gets a repo-wide reference scan documented in the PR; full suite + a real-device smoke per slice, not just CI.

**Failure 2: We make it beautiful and break the power.** The aesthetic pass buries the consequential actions — kill switches, approvals, revocations — under menus in the name of minimalism, and the one moment a parent needs the kill switch, it's three taps deep. We will have traded an ugly tool for a pretty toy, and the trust engine (the actual product) is degraded.
**Guardrail:** a written **Critical Action SLA**: any safety/approval action reachable in ≤2 interactions from any screen, on both breakpoints, verified by a scripted task test ("grant access," "revoke access," "approve request," "kill switch") run before and after every slice. If a slice slows a critical task, the slice doesn't ship. Pretty is subordinate to fast-when-it-matters.

**Failure 3: Scope creep resprouts the sprawl.** The refactor works, and then the same gravitational force that produced 14 modules and 152 buttons returns: every new idea demands a nav item and every panel demands a button, and within six months we're back to walls of pills — now in nicer colors.
**Guardrail:** structural, not willpower. Nav is config-driven with a hard cap of 3 destinations — adding one requires removing one, in the same PR. An **action budget**: total top-level buttons capped at the ~12-intent model; a new action ships only by displacing or demoting an existing one, enforced by a lint rule on `data-action-id` count. And a feature freeze for the duration of Slices 1–8: nothing new enters the product until the shell is rebuilt.

---

**Bottom line:** SwanGuard's problem was never capability — it's that a genuinely rare product (a family trust engine with a real security spine) is wearing a developer console inside a toy television. Keep the spine, keep the brief, keep the ledger. Demolish the cabinet, the compass, the 14-rail sprawl, and the 152 buttons, and rebuild the shell as three destinations, twelve intents, one signature screen, and zero apologies.
