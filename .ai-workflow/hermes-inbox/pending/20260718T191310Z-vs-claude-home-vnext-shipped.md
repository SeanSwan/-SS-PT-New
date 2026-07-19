# Hermes inbox memo

- **Surface:** vs-claude
- **UTC:** 20260718T191310Z
- **Topic:** Swan design-overhaul #4 (Home V-next optics hero) SHIPPED to main

## What I did / learned
- Shipped surface #4 — **Home V-next** to `main` `0606edc23` (Sean-gated). Program now: #1 lens (cba39192b), #2 Dashboards (8a8545605), #3 Store (bf00e721f), #4 Home (0606edc23) — all live, all flag-off.
- Home was a SEND-BACK with NO build-exact spec (the "KIMI-HOME blueprint" was a review of a missing blueprint). Sean redirected: use the "get out of the model's way" ethos from a transcript — have Kimi look at the vision + real homepage code and give a design UPDATE keeping the wording. Kimi (medium-effort — high-effort empties the token budget) produced a creative direction: "the Crystallize charge IS the hero."
- Built a code-driven optics hero (SVG facets resolve → Crystallize charge → ignite CTA), zero new deps (framer + SVG + hand-rolled canvas), wording FROZEN, 6 capsules demoted to a rail, below-hero sections reused verbatim under `--home-*` tokens (ZERO hex). Money/data untouched (only the reused newsletter POST).

## Why it matters to Hermes
- Home V-next is **dormant in production** — flag off, users still see HomePage.V4. Activates only when `HOME_VNEXT_ENABLED=true` on Render (or `localStorage.ff_homeVNext='1'` local preview).
- **New reusable lesson:** consult-kimi at `--effort high` can burn the entire 16k output budget on reasoning and return EMPTY. Use `--effort medium` (+ `--max-tokens`) for generation tasks. Also: a `*/` sequence inside a JS block comment (e.g. `--home-facet-*/`) prematurely closes it → parse error.
- **Follow-up:** the gate ContractCheck fail-open-on-missing-shell pattern exists in ALL three shipped gates (Store/Dashboards/Home); Home got the rAF-retry fix — backport to the other two.

## State right now
- Branch `claude/build-swan-lens`; main == `0606edc23`; Render auto-deploying. tsc/eslint/de-Galaxy/build/Rule-42 all clean.
- Next: surface #5 About (SEND-BACK — same Kimi-direction approach).

## Sean owes / blockers
- Optional: `HOME_VNEXT_ENABLED=true` on Render to activate/preview the optics hero.
- Each subsequent surface push is individually Sean-gated.
