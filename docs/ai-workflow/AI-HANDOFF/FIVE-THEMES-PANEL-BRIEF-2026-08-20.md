---
title: Five front-page themes — hostile-review brief
originating_model: claude-opus-5
date: 2026-08-20
decision: Which theme (or graft) should become the SwanStudios front page?
status: open
supersedes: none
---

# FIVE THEMES — HOSTILE REVIEW BRIEF

**Canvas:** `claude.ai/code/artifact/8d5a44b8-6003-4403-80c1-d6068c98312a`

## 1. What SwanStudios is

A trainer-led B2B2C training platform that is **also** a creative community. Founder is a working
personal trainer, 26+ years, NASM-protocol programming (never "NASM-certified"). The thesis is
anti-extraction: the food industry profits from making you sick, social media profits from your
attention, and SwanStudios exists to not do that — "Built by a trainer. Owned by the community.
Powered by all of us."

Two audiences, deliberately equal doors: a **trainee/community member** arriving to belong, and a
**trainer/creator** arriving for a fair platform.

## 2. The correction that produced this run

The owner's words, 2026-08-20: *"we are emphasizing heavily on the trainer and not enough on the
client. He's trying to come in and the community... it's supposed to be like a meetup, a Nextdoor
kind of thing."* (He explicitly ruled out naming that competitor on the page.)

He also said: *"I feel like we're not labeling everything that we have. We're cutting stuff out."*
He was right. The homepage mounts **13 sections**; the copy pack driving previous designs carried
12 fields covering **4** of them, because the real copy lives in a shared data module nobody had
opened. Every prior design was built against a third of the page.

## 3. What every theme now carries (identical across all five)

- **Beyond the Gym leads** — 8 community categories immediately after the hero: Fitness & Training,
  Dance & Movement, Music & Singing, Gaming & Streaming, Art & Expression, Comedy, **Community
  Meetups** ("Local events, walking clubs, group activities. Digital made real."), YouTube-Style
  Video. The trainer half is kept but demoted to section VI.
- The full **8-item What We Do** list, **3 program tiers** with real badges, **3 testimonials** with
  named results, **6 stats**, **3 About pillars**, **4 trainer features**. 40 blocks, verbatim.
- The founder's real site header, lifted byte-identically (not retyped).
- Hero = a real frame from his own swan footage, badged as a swappable slot.
- 2 movie slots per theme for films he will generate.
- Parallax depth stages; reduced-motion fallback; 44px targets.

## 4. The five themes

| # | Theme | Palette / type | Borrowed from (evidence only, not canon) | Self-declared weakness |
|---|---|---|---|---|
| T1 | **Obsidian & Gold** | black/white/gold; square corners, hairline rules, sans | Shopify Editions — page as a numbered edition | Most severe; authoritative and expensive, least like somewhere you'd casually join |
| T2 | **Ice Wing** | black/white/blue; sapphire surfaces, 10px radii | none — the existing house style, included as the control | Safest and most familiar; wins nothing new |
| T3 | **The Neighbourhood** | LIGHT warm paper, serif display, deep-green accent | Busy Bee Honey — flat colour fields, labelled cards, giant wordmark | Breaks dark-first hardest; the only friendly one, and the only one that doesn't match the product |
| T4 | **The Signal** | near-black fog, warm-cream serif that glows | Shader — glow-bloom type, hero object in fog, institutional chrome | Most atmospheric, least scannable; 8 categories in fog is a lot of low-contrast reading |
| T5 | **The Record** | warm near-black, light serif, zero radii, violet | Shopify Editions masthead + press-plate texture | Most "designed", slowest to the point |

## 5. Constraints a reviewer must respect

- **Dark-first** is the house default (T3 deliberately violates it — argue it, don't assume it's a bug).
- **Gold is an allowlist**, not a palette member: PR numerals, ≤1px filigree, focus rings, one badge
  per scene. Decorative gold is a defect.
- **Retired palette banned**: `#0a0a1a`, `#00FFFF`, `#7851A9`, including inside `var()` fallbacks.
- **No approved client green token exists.** T3's green is a TOKEN_PROPOSAL capped at TRIAL.
  Cyberforest green is operator-only and may not be copied into client UI.
- Never "NASM-certified" — "NASM-protocol". No yoga/meditation language (use stretching/flexibility).
- WCAG AA; 44px targets; `prefers-reduced-motion` honoured.

## 6. Open contradictions — flagged in-artboard, NOT resolved

1. **Trainer fee.** The live page says "Small transparent fee (~10%)". A planning session decided
   **15% with a $1,000/month cap**. Both cannot be public. Every theme marks this on the page.
2. **Credential wording.** The services list says "NCEP-certified experts". The standing rule bans
   "NASM-certified"; NCEP is a different body, so this may be fine — but it has never been checked.
3. **Primary CTA.** An early brief said "book a consultation"; the live page says "Join the
   Community" / "Find a Trainer". All themes use the live pair.
4. **Unconfirmed stats.** Clients transformed, sessions delivered, lbs lost, satisfaction % are
   marked NEEDS-SEAN-NUMBER in source. Each is labelled as such on the page.

## 7. What the panel is asked to do

Be hostile. Specifically:

1. **Which theme wins for a stranger who googled "personal trainer near me"** and lands cold — and
   which wins for a trainer evaluating whether to move their book of business? If those are
   different themes, say so and say which audience should win.
2. **Is community-first actually right**, or has this over-corrected? Argue the strongest case
   against leading with 8 creative categories on a personal-training site.
3. **Name the theme that should be killed outright** and why.
4. **What is still missing** from the page that neither the owner nor the builder has noticed?
   Absence-first: what should exist and doesn't?
5. **Attack the honesty of the design.** Where does it flatter, overclaim, or hide a weakness —
   especially around the unconfirmed stats and the fee contradiction?
6. Flag any accessibility or contrast failure you can infer, particularly T4's fog and T3's light
   ground.

Do not be agreeable. A review that likes everything is worthless.
