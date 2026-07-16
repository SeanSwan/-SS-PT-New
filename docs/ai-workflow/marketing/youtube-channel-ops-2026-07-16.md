# YouTube Channel Ops — playlists, CTA links, description templates (v1)

> Companion to the locked doctrine (`.ai-workflow/hermes-inbox/youtube-doctrine.md`, v2)
> and the grill record (`docs/ai-workflow/brainstorms/youtube-content-doctrine-2026-07-15.md`).
> This file is the operational kit: exact links, playlist set, and fill-in templates.

## CTA links (live once `claude/contact-cta-type` merges to main)

The public contact page accepts `?type=` (allowlisted: general/assessment/training/app)
plus UTM params — all captured into the CRM Lead pipeline with attribution.

| Pillar | CTA link to paste in descriptions |
|---|---|
| Golf performance | `https://sswanstudios.com/contact?type=assessment&utm_source=youtube&utm_medium=video&utm_campaign=golf` |
| Longevity / pain-free | `https://sswanstudios.com/contact?type=assessment&utm_source=youtube&utm_medium=video&utm_campaign=longevity` |
| Client proof stories | `https://sswanstudios.com/contact?type=assessment&utm_source=youtube&utm_medium=video&utm_campaign=proof` |
| Exercise demos | `https://sswanstudios.com/signup?utm_source=youtube&utm_medium=video&utm_campaign=demos` (app funnel) |

Shorts use the same link as their parent long-form video.

## Playlists (create all four on day one — watch-through coherence)

1. **Golf Performance** — "Add distance and consistency by fixing the body, not the swing."
2. **Move Pain-Free** — "Train around pain and build a body that performs at any age."
3. **Real Client Results** — "Real people, real progress — how we did it."
4. **Exercise Library** — "Perfect form, explained — with the anatomy to prove it."

## Description template (Hermes fills; Sean never hand-writes)

```
<1-2 sentences: the outcome this video delivers, in Sean's voice — no hype.>

🎯 Free movement & performance assessment: <PILLAR CTA LINK>

<3-5 timestamp chapters>
00:00 <hook>
...

Sean Swan — 26+ years experience, NASM-protocol training.
SwanStudios: https://sswanstudios.com
```

Rules: ONE link per description (the pillar CTA — channel/site footer link is fine
below it). No hashtag walls (max 3). No "smash that like button" begging — one calm
"subscribe if this helped" is the ceiling.

## Weekly batch shape (one shoot → four assets)

1. Pick next topic from the pillar rotation (golf → longevity → demo → golf → proof …
   golf leads 2-of-5 as the hero pillar).
2. Hermes drafts: script (voice doctrine) + 2-3 titles with pick + description + Shorts
   cut list — BEFORE the shoot, so filming follows the script.
3. Sean films once. Post: long-form + 2-3 Shorts from the same footage.
4. Publish long-form; stagger Shorts across the week.

## Open items
- [ ] Merge `claude/contact-cta-type` to main (Sean-gated) — CTA links inert until then.
- [ ] Speed-to-lead email on new Leads = Marketing Brain first epic (separate build).
- [ ] Channel banner/art → route through swan-design-router when ready.
- [ ] After 3-4 videos: consider the Hermes weekly content-plan cron (outbox draft for
      morning review) — deliberately deferred until the manual shape proves out.
