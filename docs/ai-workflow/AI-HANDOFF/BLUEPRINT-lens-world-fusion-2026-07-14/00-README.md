# BLUEPRINT — LENS × WORLD FUSION ("Swan Skins") — 2026-07-14

> **Architect:** Fable (Final Decider). **Builder target:** Codex worktree agent (has repo access;
> file citations are verified against `origin/main` @ f234197fb — the Lens Finish pack AND the
> World Engine are both on main). **Authorization:** Sean 2026-07-14 — this message IS the explicit
> "Sean's go" that the Lens pack §6 required for Atelier-class (user customization + persistence)
> work, and the successor decision on v2 production rollout.

## What this is

The Smart Lens OS (runtime theming engine, shipped) and the Swan World Engine (creative world
catalog + factory, shipped as doctrine/tooling) become **two organs of one system** — NOT blended
into one codebase:

- **World Engine = the imagination.** 18 worlds, 13 techniques, experience-mode law. It stays the
  marketing/factory lane, untouched.
- **Lens OS = the delivery.** Fail-closed recipes, six slots, per-surface manifests. It stays the
  only thing that touches product DOM.
- **The baby = the DISTILLATION BRIDGE + the user surfaces.** Worlds get distilled into Law-A
  atmosphere recipes (data), users get a Crown Header + Looks Carousel on their dashboard and a
  bounded Style Studio, and their look finally follows them across devices (server persistence).

**The governing law (non-negotiable, from `experience-mode.md` §3):** LIVE M4 NEVER enters product
dashboards. Worlds reach dashboards ONLY as Law-A atmosphere — CSS layers, static posters, at most
M2-grade restrained motion, poster-first, killed under Still/reduced-motion. The fusion imports the
worlds' SOULS (palette ratios, atmosphere recipes, mood, typography leans), never their live
machinery.

## Build order (7 slices, each independently shippable)

| Slice | Name | Product outcome |
|---|---|---|
| F0 | Engine: atmosphere axis + chart-secondary token | Recipes can carry a world's atmosphere safely |
| F1 | Server persistence | Your look follows you across devices |
| F2 | Crown Header + Looks Carousel | Users SEE and WEAR looks from their own dashboard |
| F3 | v2 production rollout | Committed v2 styles restyle the real surfaces, not just the Lab |
| F4 | Style Studio (bounded customization) | Users fine-tune accent/font/pattern/density — tier-gated |
| F5 | Distillation lane + first 6 world-styles | Factory worlds become wearable skins via the A4 pipeline |
| F6 | Fusion gate suite + perf/a11y locks | Nothing ships that lies, flashes, or lags |

Order is binding: F0 → F1 → F2 → F3 → F4 → F5 → F6. F3 and F4 may swap if F3's flag decision is
pending. Every slice: tests-first (RED proven), Rule 61 hostile self-review, Rule 42 backend audit,
checkpoint to Fable before the next slice.

## Package files

- `01-architecture.md` — system diagram, current-state weaknesses this fixes, data flow, ERD.
- `02-wireframes.md` — Crown Header, carousel, Style Studio (desktop + 375), all states, exact copy.
- `03-contracts.md` — API endpoints, model DDL, schema extensions, exact signatures.
- `04-build-order.md` — file-by-file with budgets and in-repo patterns to mimic.
- `05-slices.md` — per-slice scope + executable acceptance criteria + STOP lines.
- `06-bans.md` — the do-NOT list (house rules + fusion-specific firewalls).
- `07-checkpoints.md` — checkpoint protocol + review remit.

## Builder Contract (paste into the builder's first prompt)

> You are the builder, not the architect. Follow the package to the letter. Where the package
> decides, you do not re-decide — even if you'd do it differently. Where the package is silent on
> something that matters, STOP and return the question; do not improvise. Build ONE slice at a
> time; after each slice, output the diff + the acceptance-criteria evidence (test output, curl
> results, screenshots) and WAIT for the checkpoint verdict before continuing. Never claim a
> criterion passed without pasting its output. You have repo access: verify every cited file
> exists before editing it; if a citation has drifted, STOP and report — do not adapt silently.
