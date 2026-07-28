# ABOUT upgrade — creative direction (elevate the execution; freeze the wording + credentials)

You are Kimi K3, the SwanStudios design architect. We just shipped a stunning Home V-next (the Crystallize
charge IS the hero — code-driven SVG-facet optics, zero new deps, wording frozen). Now do the SAME for the
**About page** — Sean's story + credentials. Give a **focused, buildable creative direction** (not a giant
spec) that elevates the EXECUTION to that caliber while keeping every word and every credential exact.

## The caliber target + our constraints (identical to the shipped Home — respect them)
- Get out of the model's way; one signature moment that feels alive; taste over framework.
- **Zero new npm deps** — `framer-motion` + SVG + CSS gradients + a hand-rolled `<canvas>` 2D pass only.
  Swan thesis: "optics, not creatures" — refraction, caustics, light. Perf: 60fps mid-Android, DPR≤2,
  IntersectionObserver, transform/opacity only, reduced-motion = designed static frame (framer entrance must
  be disabled when reduced, not just CSS — Home lesson).
- **Reversible + skinnable:** all color/shape via `--about-*` tokens → the REAL shipped lens slots
  (`--world-bg/panel/text/muted/accent/action/title-font`, `--lens-canvas/elev-1..3/panel-radius/z-*/
  fx-glow-primary/ease-standard/ease-crystallize/crystallize-charge-ms/settle-ms`). ONE tokens file, prefer
  ZERO hex (Home shipped zero-hex). Galaxy trio BANNED incl. channel forms.
- **Consume the SHIPPED lens Crystallize** (`useCrystallizeTransition`/`CrystallizeOverlay`, no children).
  `useAnimationTier` (full/balanced/essential). Gate/flag mirror the shipped Home/Store: `useAboutVNextFlag`
  (runtime `/api/config/public-flags.aboutVNext` → env `VITE_ABOUT_VNEXT` → false; kill switch absolute over
  QA `ff_aboutVNext`), `AboutGate` (lazy + ErrorBoundary + world-contract probe → About.V4), backend flag key.

## FREEZE (non-negotiable): wording + credentials
- Credential phrasing is CONTRACT-TESTED. Sean is **NCEP-certified** and **NASM-protocol / NASM workshop
  (OPT) trained** with **26+ years of experience**. The phrase **"NASM-certified" is FORBIDDEN** (false claim,
  a test fails the build if it appears anywhere). Use "NASM-protocol", "NASM OPT", "NASM workshop", "NCEP-
  certified", "26+ years" — verbatim. No yoga/meditation ("stretching"/"flexibility").
- Keep the copy + intent of every section: Hero → FounderQuote → AboutSean → Promise → Stats → Timeline
  (2000 NCEP + NASM workshops → career) → Philosophy (Science-Backed Training, Personalized Programs,
  Sustainable Results, Collective Power, Fair Always, Your Data Your Story, Community Over Profit) →
  CompetitiveEdge → CTA. Elevate the LOOK, not the words.

## Give me (bounded — a brief, not a spec)
1. **The signature hero** — the tracker calls for a **light-caustic swan mark**: a refractive/caustic swan
   silhouette or optical mark done in SVG + canvas caustics (NOT a literal photo of a swan — optics). Concrete
   buildable terms: the SVG mark geometry, the caustic canvas treatment, the Crystallize charge that resolves
   it, how Sean's name/title/credential line reveal, and the reduced-motion static frame.
2. **Visual language** — palette via the lens tokens (which slot = what role), premium font direction (keep
   brand-appropriate), motion vocabulary (timings bound to `--lens-ease-*`).
3. **Section elevation notes** — one sharp upgrade per section that KEEPS the wording (Timeline as a light
   ray? Stats as crystalline count-up? Philosophy cards as facets?). Restraint: hero = THE moment + ONE
   secondary; rest at essential-tier rest.
4. **The ONE highest-impact change.**
Keep it tight and buildable — the builder (Opus) executes with freedom, mirroring the shipped Home V-next.
