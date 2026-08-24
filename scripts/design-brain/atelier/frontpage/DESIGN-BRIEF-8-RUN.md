# SwanStudios Front Page — DESIGN BRIEF for the eight-design run

You are a **design peer**, not a reviewer. Your creative input is wanted. Authorship stays with the
requesting agent; ideas are ~50/50. Do not hedge, do not produce a menu of safe options.

## 1 · WHAT SWANSTUDIOS IS (established by direct interview with the owner, 2026-08-19)

A **two-sided marketplace** and **social platform** for personal training, built and owned by a trainer
(Sean Swan, 26+ years, NASM-protocol — never write "NASM-certified").

- **Trainees** find a trainer, get programs built for their goals, log workouts, see real progress charts,
  and share milestones on their own page/feed.
- **Trainers** join to run their business on the platform: client management, program building, charts,
  payments. **SwanStudios takes 15% (capped monthly) and the trainer keeps the rest.** No monthly fee,
  no setup fee — "we only make money when you do."
- **Swan Coach** analyses a client's data and **co-builds workouts WITH the trainer** — never replacing them.
  Goal-specific programs (strength, power, weight loss, …) → charts from real logged data → saved to the
  member's feed. Never call it "AI" in user-facing copy. It is Swan Coach.

**The swan is not a logo choice.** The owner's surname is Swan; it also connects to his Chickasaw heritage.
Treat the motif as authentic identity — never a mascot, never decoration, never a gimmick. Restraint.

## 2 · THE NORTH STAR (owner's words)

> "I wanted to originally develop a macro world — a living city of people, kind of like The Sims but not
> The Sims — a living world that you look into and see people doing the different things this app talks
> about… more parallax backgrounds, more animated sections with video as you scroll, more animations, but
> subtle, not too much that breaks the system… beautiful and polished… let's make it look digital and
> animated. I was kind of thinking of a Las Vegas theme where things are kind of the living lights type deal."

Luxury, but for everybody. Warm, not corporate. He used the word **"homey"** alongside "marvelous" and
"professional."

## 3 · SETTLED — DO NOT RE-LITIGATE, DO NOT VARY THESE

| # | Decision |
|---|---|
| D3 | **One story, two EQUAL doors.** The manifesto argues to trainee AND trainer at once. Page forks LATE into `Find a Trainer` and a trainer-recruitment door at equal visual weight. Never bury the trainer door. |
| D6 | **N = 8 designs.** Primary axis = VOLUME of the swans moment (quiet-and-warm ↔ people-first ↔ product-forward ↔ full-cinematic scroll-bound). Secondary lever = LIGHTING RANGE (warm amber-in-blue, cold crystalline, dawn, dusk, deep night…). |
| D8 | **Living world at distance, real people IN it.** Deep parallax, real light/weather/depth; people small and impressionistic in far/mid layers; scrolling travels INWARD and resolves to a human moment. NOT a rendered Sims city. NOT people-free atmosphere. |
| D9 | **Every media position is a named, swappable SLOT** — generated default always present, optional real-footage override. |
| D10 | **~6 chapters:** THE WORLD · THE MANIFESTO · THE LOOP · THE PROOF · THE FORK · FOOTER. Everything else moves off-page. |
| — | Motion scales to device: full desktop, reduced elsewhere, honor `prefers-reduced-motion`. |
| — | `Swans.mp4` is KEPT, always. It is the hero asset. |

**The diagnosed sin to cure:** the live page is 14 sections of equal weight with an identical divider between
every one. Nothing peaks, nothing rests. Six chapters must have violently different sizes and rhythms.

## 4 · COPY IS MATERIAL — VERBATIM, NEVER INVENT

Use these strings exactly. Any line you add with no real-source equivalent must be tagged
`[new copy - needs Sean approval]`. A previous run invented copy and was rejected outright.

- H1: **Health First. Community Always.**
- Sub: *Where world-class personal training meets a supportive community built around clean living, real connection, and lifelong wellness.*
- CTAs: **Join the Community** · **Find a Trainer**
- Manifesto ¶1: *The food industry profits from making you sick. Social media profits from your attention. Gaming companies fire the people who made their best games. Healthcare safety nets are disappearing.*
- Manifesto ¶2: *SwanStudios exists because we believe you deserve better. A platform that puts your health first, remembers your journey, supports your trainer, celebrates your creativity, and never sells you out.*
- Manifesto ¶3: *We're not here to extract value from you. We're here to help you build it — for yourself, and for the people around you.*
- Manifesto close: **Built by a trainer. Owned by the community. Powered by all of us.**
- CTA title: **Ready to Be Part of Something Real?**
- CTA body: *Your health journey deserves a permanent home. Your trainer deserves a fair platform. Your community deserves to own itself. SwanStudios is where all of it lives.*

## 5 · PALETTE / TYPE (fixed)

Midnight Sapphire `#002060` · Royal Depth `#003080` · Ice Wing `#60C0F0` · Arctic Cyan `#50A0F0` (charts only)
· Gilded Fern `#C6A84B` · Frost White `#E0ECF4` · Wing Purple `#8B5CF6` · Obsidian `#0A0A0F` · Carbon `#141419`.
Dual-Button Glow: blue background → purple glow; purple background → cyan glow.
Type: Plus Jakarta Sans (headings), Cormorant Garamond Italic (drama), Fira Code (data), Sora (UI).
Dark-first. No Material-UI. No hardcoded colors — `var(--token, #fallback)`.

## 6 · TASTE LOG — ALREADY KILLED, DO NOT PROPOSE

- **Editorial-magazine layout** — killed by the owner in a prior run.
- **Invented marketing copy** — rejected outright.
- Generic SaaS screenshot-hero; stock-icon rows; equal-weight section stacks.

## 7 · WHAT TO RETURN

### 7a — THREE TO FOUR CONCEPT DIRECTIONS, each as a strict skeleton contract

```json
{
  "id": "kebab-name",
  "nav_model": "e.g. side-rail-left | no-nav-until-scroll | floating-dock",
  "hero_mechanics": "one precise sentence — what the swans DO",
  "chapter_count": 6,
  "grid": "e.g. 12col-asymmetric-7-5",
  "volume": "quiet | people-first | product-forward | full-cinematic",
  "lighting": "e.g. warm-amber-in-blue | cold-crystalline | dawn | dusk | deep-night",
  "anti_specs": ["3 things this design refuses to do"],
  "phenomenon": "one line — the impossible optical moment that makes this world feel alive",
  "tradeoff": "one line — what this design is WORSE at than the others"
}
```

Every direction must be structurally distinct from the others on **at least 3 axes**.

### 7b — HOSTILE REVIEW (explicitly requested by the owner)

Attack this brief. Where will these eight designs fail? What is being assumed that isn't true? What will
look great as an artboard and collapse as a real, responsive, performant page? Be specific and unkind.
Name anything that fights the 15%/marketplace goal or the community-first promise.

### 7c — BLUEPRINTS (explicitly requested)

For your strongest direction: a **wireframe** (ASCII is fine, desktop AND mobile), a **flowchart** of the
visitor's path for BOTH audiences (trainee and trainer), and a **mermaid diagram** of the page's
component/data structure.

Return markdown. Be concrete. No preamble.
