<!-- GENERATED from website-archetypes.md @ 4fb0805d87dd — do not hand-edit; edit the monolith and re-run build-archetype-index.mjs -->

## 22. Construction / trades business website

- **Use when:** a construction company, contractor, or skilled-trades business (builder, electrician, plumbing, roofing, landscaping, remodels) needs its front door. The wedge: licensed credibility + visible finished work + a quote path that does not leak leads.
- **Feel:** engineered solidity inside the dark luxury vault — steel, timber, blueprint precision; the site itself must feel BUILT, with nothing flimsy. Real project photography over stock; machinery and material textures shot close.
- **Arc:** Mkt 4-act. **Hero:** C1 with a finished-project money shot or timelapse loop (owned footage; never stock hardhats). **Motion:** M1-M2 — heavy motion reads as unserious in this vertical.
- **Sections in order:** C1 hero (the promise: what gets built, for whom) -> Act 2: trust band FIRST (license number, bonded/insured, years operating, association badges) + C6 service cards (3-6 services max, each with a real project photo) -> Act 3: project gallery as proof (before/during/after where consented; C9 impact numbers: projects completed, on-time rate, service area) + one C2 case story with the client's problem-to-handover arc -> Act 4: quote-request flow (short form: scope, timeline, budget band, photos upload) + service-area map + emergency/phone path.
- **Conversion goal:** quote request submitted or phone call placed. **Trust is the entire sale:** license/registration numbers rendered verbatim near the fold; insurance and bonding stated plainly; no unverifiable superlatives ("#1 in the county" is banned unless cited).
- **Mobile:** phone CTA sticky and thumb-reachable at every depth (this vertical converts by CALL more than form); quote form completable one-handed on a jobsite; gallery swipes without hijacking scroll; 44px everywhere (work gloves, not sweaty thumbs).
- **A11y:** gallery images carry real alt text (what was built, where); the quote form labels and errors survive screen readers; map has a text service-area list fallback.
- **Components:** `GlowButton` (call + quote), `SheenCard` LOW-MOTION variant for service cards (client/data card discipline, not showcase), `NarrativeDivider`, gallery on cursor-paginated media grid; forms follow the existing intake-form patterns.
- **Anti-patterns:** stock hardhat-and-clipboard photography; testimonial walls without names/projects; burying the phone number; quote forms demanding full contact detail before stating service area; drone-shot hero loops with no relation to actual projects; equal 4-up "Our Values" grids (S-B ban).
- **Fable brief:** "Construction/trades site for [trade + service area]. Promise: [X]. Directions must include: money-shot hero concept from real project assets, trust-band composition around license [N], gallery-as-proof strategy, and the quote-vs-call conversion split for this audience."
- **Builder brief:** "Direction [n]. Trust band strings verbatim from client-supplied license/insurance docs; gallery from consented project photos only, labeled placeholders where missing; quote form posts to the verified intake path (rule 26); phone link tested on real mobile."
- **Harness QA:**
  - [ ] phone CTA <=1 tap from any scroll depth on mobile
  - [ ] license/insurance strings render verbatim and are not paraphrased
  - [ ] quote form: loading/error/success + file-upload failure states
  - [ ] gallery images all carry project-specific alt text
- **Village questions:**
  - Would a homeowner with a six-figure remodel trust this page with their number?
  - Is every proof element (badge, number, photo) real and verifiable?
  - Does the quote path ask for the minimum before giving value back?
