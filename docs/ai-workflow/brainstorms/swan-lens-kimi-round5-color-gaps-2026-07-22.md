# Swan Lens — Kimi ROUND 5: Design 8 Primaries into the MEASURED Gaps

**To:** Kimi K3. Your "LLM proposes, script disposes" loop is now LIVE. I built the color-science test (dependency-free WCAG contrast + OKLab-Euclidean ΔE + numeric cyan gate). It measured the REAL color space. Your job: **design 8 beautiful, on-brand primary hexes that land in the measured gaps.** Numbers below are COMPUTED, not vibes — design to them.

## CRITICAL — the metric (why "15 ΔE" was wrong)
The test uses **OKLab-Euclidean ΔE ×100**, NOT CIEDE2000. On THIS metric, measured over the existing 20 colorways, nearest-neighbor primary ΔE runs `[2.0, 2.0, 2.0, 2.0, 4.8, 5.3, 5.7, 7.0, 7.4, 9.2, 9.4, 11.3, 14.1...]`. The **2.0s are the actual existing duplicates**. So: **~2 = duplicate, 5–9 = distinct, >10 = strongly distinct.** GATE: each new primary must be **ΔE ≥ 7** from every existing primary AND ≥ 6 from every other new primary. (Not 15 — that's the wrong scale and is unsatisfiable here.)

## The OCCUPIED hue map (OKLCH h°, primary hex, C=chroma, L=lightness) — sorted by hue
```
h6  burgundy-noir #C2637A C.12 L.62      h163 emerald-vault #34D399 C.15 L.77
h13 ruby-forge    #FB7185 C.17 L.72      h165 deep-jade     #4FD1A1 C.13 L.78
h56 sunset-mirage #FB923C C.16 L.76      h212 aqua-abyss    #22D3EE C.13 L.80  ← cyan (retired-suspect)
h58 copper-patina #D97706 C.16 L.67      h215 tron-grid     #5CE1FF C.12 L.85  ← cyan (retired-suspect)
h77 pearl-noir    #F5E7D3 C.03 L.93      h233 crystalline-dark #60C0F0 C.11 L.77 (Ice Wing — brand)
h85 solar-gold    #F6C453 C.14 L.84      h242 steel-tempest #7DA7C7 C.07 L.71
h85 midnight-mango#FFC94D C.15 L.86      h258 graphite-luxe #D1D5DB C.01 L.87
h129 circuit-lime #A3E635 C.21 L.85      h277 indigo-pulse  #818CF8 C.16 L.68
                                          h306 amethyst-night#C084FC C.18 L.72
                                          h318 orchid-veil  #D8A7E8 C.10 L.79
                                          h321 vapor-dream  #F0ABFC C.13 L.83
                                          h355 sakura-midnight #F9A8C7 C.10 L.82
```

## The measured GAPS (open lanes to design into)
1. **h13→h56 (43° gap): coral / scarlet / vermilion** — wide open, high-value.
2. **h85→h129 (44° gap): lime / chartreuse / yellow-green.**
3. **h165→h212 (47° gap): teal / sea-green** — BUT retired-cyan gate bans hue 175–200° at chroma≥0.10 & L≥0.35, or ΔE<12 to #00FFFF. Stay ≤172° or go very deep/desaturated.
4. **h277→h306 (29° gap): blue-violet / periwinkle.**
5. **Depth lane:** at ANY occupied hue you can still be distinct by going markedly DEEPER (lower L, e.g. L.50–.60) and/or more saturated than the incumbent — e.g. a deep true-red at h13 sits far from ruby-forge's L.72 pink.

## What I need — 8 primaries (one line each, NO full specs, just the primary hex + rationale)
For EACH of your 8: `id (two-word material name) | primary hex | target hue lane | why it's distinct + on-brand`. Constraints:
- Dark-first brand: primaries are the ACCENT/button color on a near-black bg, so L roughly .55–.85, chroma healthy (≥.10) so they read vivid — but distinct per the gate.
- Span 4 families (apex-darks / jewel-gradients / frost-glass / heritage) and 3 varieties (gradient-forward / clean-flat / light-glass).
- NO retired cyan (respect the numeric gate). NO names with yoga/meditation/zen/cyberpunk/tron/vapor.
- Each primary must satisfy: onPrimary label (#0A0A0F or #FFFFFF) hits ≥4.5 contrast — so pick primaries bright enough that near-black text works, OR note "onPrimary: white".

I will run each hex through the test immediately and report back any that fail ΔE≥7 with their nearest neighbor, so you can nudge only those. Give me 8 strong candidates now. Primary hex + rationale only — I build the full 24-field specs around your chosen primaries.
