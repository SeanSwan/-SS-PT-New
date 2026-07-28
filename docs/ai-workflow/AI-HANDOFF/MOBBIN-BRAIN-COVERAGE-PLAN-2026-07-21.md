# Mobbin Brain — Curated Coverage Plan + Feature Audit (2026-07-21)

**Owner:** Mobbin/brain agent (Fable) · **Purpose:** turn the $45 Mobbin subscription into a durable, versatile
**design + business brain** for Sean's AI agency — fitness first (deep), then the highest-value website types
he'll build for paying clients. Curated by popularity/proven-value, never random. Human gate on canon; the
feature-AUDIT (this doc) is a research artifact and mostly autonomous.

## Operating rules (settled 2026-07-21)
- **Pace, don't probe.** Documented Mobbin limit = **60 requests / 60s per user**. We run hard WITHIN it and
  stop on a 429 cooldown or weekly volume — we do NOT deliberately trip the limit (ToS abuse flag = risks the
  account). Each loop pass = a few searches → append here.
- **Mobbin = app UI/UX + features.** It does NOT hold nature/beauty imagery (nebulas, glaciers, swans) — that
  aesthetic comes from the cinematic design system + Seedance asset pipeline, a SEPARATE brain. Mobbin is
  aimed at features, flows, and UX patterns.
- **Curated, ranked, popular.** We search the proven/most-used patterns per category, not random pulls.

---

## PART A — WHAT SWANSTUDIOS HAS (audit baseline, to compare against)
Workout logging (WorkoutSession/WorkoutLog) · progress charts (Victory) · gamification (XP/levels/achievements/
streaks) · social feed · Swan Coach (AI, gated) · store/packages · nutrition ecosystem (planned) · onboarding ·
trainer/client/admin dashboards · dictation→records (local). **The audit finds what top apps do that this lacks.**

## PART B — FITNESS FEATURE AUDIT (priority 1 — deep first)
Log of features observed on top fitness apps vs SwanStudios. Appended each loop pass.

### Pass 1 (2026-07-21) — AI coaching / feedback
- **Runna "AI Workout Insights"** [Runna]: post-workout, AI writes personalized coaching feedback on the actual
  session ("completed your planned distance… run in cooler temps"), **gated behind an explicit consent modal**
  ("share workout data with our trusted third-party AI provider… not used for AI model training"). → *SwanStudios
  gap: a privacy-forward AI-insight consent gate + per-session AI feedback tied to the logged data. Swan Coach
  exists but this rating→insight→consent pattern is a specific, adoptable feature.*
- **"Rate your workout to unlock AI insights"** [Runna]: thumbs up/down gates the insight — an engagement
  mechanic that also collects a satisfaction signal. → *Gap: rating-gated insight unlock.*
- **Structured feedback chips** [pliability]: "What did you like most?" → Easy to follow / Voice guidance /
  Video length / Types of movement, + motivational quote + Share Activity. → *Gap: a feedback taxonomy that
  feeds routine/plan improvement.*
### Pass 1 cont. (2026-07-21) — nutrition / meal logging
- **AI photo → auto-macro meal ID** [Life Reset "Food Identified"]: snap a plate, AI identifies each food +
  per-item macros (Fettuccine Alfredo 1394 cal P59/C87/F90; parmesan; cilantro; garlic) with edit/swipe →
  "Log This Meal". → *SwanStudios gap: AI photo meal recognition. High-wow, low-friction logging.*
- **Barcode scan → matched food → macros → add** [MyFitnessPal]: scan → "Low Fat Chocolate Milk" matched →
  serving/qty → % daily goals → add to multiple days. → *Gap: barcode nutrition lookup.*
- **FOUR low-friction input methods on one screen** [MyFitnessPal]: Log Food · Barcode Scan · Voice Log ·
  Meal Scan. → *Gap: multi-modal logging (voice + camera + barcode + search), not just manual entry.*
- **Calorie tracker anatomy** [Life Reset/MFP]: macro rings (P/C/F vs goal), "calories remaining", weekly bar,
  Scan Food / Quick Add CTAs. → *Reusable progress-card pattern; ties to accepted claim CLM-f54a.*
### Pass 2 (2026-07-21) — wearables / device sync
- **Unified "Connected Apps & Devices" hub** [Runna]: one screen grouping Applications (Strava, Apple Health) ·
  Calendars · Watches (Apple Watch, Garmin, Coros, Fitbit, Suunto) · Wearable Devices. → *SwanStudios gap: a
  single connected-integrations hub; supports MANY device brands, not one.*
- **Watch companion app + auto-sync** [Runna/Strava]: pair Apple Watch → plan auto-syncs to the watch → workout
  runs ON the watch with pace/audio cues → completed workout syncs BACK + uploads to connected services. →
  *Gap: a wearable companion experience, not just phone logging.*
- **Granular permission toggles at pairing** [Runna "Sync to Apple Watch"]: separate Location / Apple Health /
  Watch / Strava(optional) toggles, each explaining WHY. → *Reusable consent-UX pattern (a11y + trust).*
- **Health-data consent gate** [Strava]: "Allow Access to Health Related Data" + community-standards accept
  before sync. → *Reusable: explicit health-data consent step.*

### Pass 3 (2026-07-21) — social challenges / leaderboards
- **Challenge lifecycle** [Tempo]: Community tab → Challenge invites card ("End of Summer, 18 days left") →
  join → My place _/3698 + Workouts completed + friend rows w/ check-ins → "Compete with friends" (copy code,
  Invite, Share) → Your progress 0/10 + Leaderboard → challenge details (date range) + Leave. → *SwanStudios
  gap: full challenge lifecycle w/ shareable invite codes + friend check-in rows (matches accepted CLM-9d9c).*
- **Create-a-challenge (user-generated)** [Tempo]: users create their own challenges, not just join preset ones.
  → *Gap: UGC challenges.*
- **Persistent leaderboard w/ rank + demographic cohort** [Tonal]: "See how you rank" → JOIN THE LEADERBOARD →
  live rank (69,903 of 79,665) with age/gender cohort (M·50s) + total volume/workouts deltas. → *Gap: a global
  leaderboard with cohort framing + volume deltas.*
- **Referral baked into community** [Tempo "Give 1 month free, get 1 month free"]: referral offer lives in the
  challenge/community surface. → *Gap: referral woven into social, a growth loop.*
### Pass 4 (2026-07-21) — advanced progress analytics + recovery/sleep
- **Muscle Readiness body map** [Tonal]: front/back body silhouette colored FRESH (green) / RECOVERING / FATIGUED
  per muscle group from the last workout, with a recommendation ("ready for a high-volume workout") + chip list
  per state. → *SwanStudios gap: readiness-driven training guidance on a body map. Extends accepted CLM-b7e2
  (body-map proof) into a NEXT-ACTION signal.*
- **Per-body-part score with gradient scale** [pliability]: Shoulder(R) 70/100 on a rainbow scale + "latest
  mobility test" video highlight + program progress (% / weeks left / routines left). → *Gap: measured
  per-joint scoring + retest loop.*
- **Sleep score + hypnogram** [TIDE]: 86% sleep score, efficiency/duration/target-achieved, sleep-stages graph.
  **HRV/recovery multi-line trend** [Breathwrk]: HRV vs deep sleep vs time-to-fall-asleep over 7 days. → *Gap:
  recovery/sleep analytics as first-class (readiness inputs).*
- **Habit-style streak stat grid** [Yazio fasting]: streak / record / total / longest / daily-average tiles +
  daily/weekly/monthly toggle chart. → *Reusable progress-card pattern (any metric).*

### Pass 5 (2026-07-21) — habits / reminders / streak recovery
- **Layered reminders** [Atoms]: a per-habit "Habit reminder" PLUS an "Additional all-in-one daily reminder"
  (Off / Morning 8AM / Evening 5PM) PLUS "App suggestions" progress-based nudges toggle. → *SwanStudios gap:
  layered, schedulable reminders + smart nudges, not one on/off notification.*
- **Streak reminder as its own toggle** [Open]: Day/Week/Best streak grid + "Streak reminders" switch +
  encouragement ("Great job. Practice tomorrow to build your streak"). → *Gap: streak-protection reminders +
  encouragement copy (retention).*
- **Habit-stacking tip at reminder setup** [CapWords]: "An easy way to build a new habit is to stack it onto an
  existing daily habit." → *Reusable behavior-design microcopy pattern.*
- **Identity-based framing** [Atoms "1 active habit · 1 identity"]: habits tied to an identity, not just tasks.
  → *Gap: identity/goal framing around streaks (deeper motivation model).*
### Pass 6 (2026-07-21) — scheduling / booking (⭐ also a Tier-1 website archetype: local-service + professional-services)
- **Coach-call scheduling with an escape hatch** [Future]: pick coach → intro FaceTime call, date chips +
  time slots → **"NONE OF THESE TIMES WORK"** fallback → confirmed w/ Add-to-Calendar + live countdown +
  Reschedule. → *SwanStudios gap: in-app session booking with a no-times-work path + calendar add + countdown.*
- **Availability grid + review + confirm** [Zocdoc — professional-services gold standard]: "I'm a new patient"
  → tomorrow's slot grid (8:15/8:30/8:45…) → Review & book (provider card + rating + insurance + visit reason)
  → "Appointment booked!" + Add to calendar + **cross-sell next booking** ("check another exam off your list").
  → *Gap + REUSABLE booking archetype for Tier-1 local-service/pro-services clients.*
- **Full booking flow w/ availability calendar** [IKEA, 15 screens]: service pick → calendar w/ availability
  dots → time slot → contact info → confirmation w/ Booking ID + email. → *Reusable booking archetype.*
- Design principle (reusable, brand-agnostic): booking = pick service → availability calendar/grid → slot →
  minimal contact → confirmation w/ ID + calendar add + next-step cross-sell. Always give a "no times work" exit.

### Pass 7 (2026-07-21) — payments / subscription management (⭐ reusable for every client site)
- **Rich manage-subscription surface** [Tide Guide]: Settings → "Pro · Active" → sheet shows Plan (Annual) +
  Renewal date + Buy Lifetime (one-time) + Add Family Plan (save by sharing) + Email Support + **"Manage
  Subscription — easily cancel anytime."** → *SwanStudios gap: a self-serve subscription hub (plan, renewal,
  lifetime, family, easy cancel) — reduces churn/support load.*
- **Tiered paywall w/ RECOMMENDED + monthly/yearly toggle + feature checklist** [Yahoo Finance]: Bronze/Silver/
  Gold columns, "Yearly 20% off — save $120", GOLD "RECOMMENDED", long ✓ feature list, per-tier "best for"
  copy, + a "which plan is right for me?" Q&A. → *Reusable pricing-page archetype (SaaS/fintech clients too).*
- **Value-first paywall w/ social proof + free trial** [Alma]: "Get the full experience", 4.9★ / 500+ reviews,
  benefit checklist, Yearly(17% OFF, selected) vs Monthly, "Get started for free · cancel anytime", Restore/
  Terms/Privacy/Redeem row. → *Reusable trial-paywall pattern; note Swan credentials/copy rules still apply.*
- **"Personalize your coaching style" + AI score** [Alma]: onboarding sets feedback style; an "Alma Score 44,
  aim for 100" gamifies the AI-coaching value. → *Gap: personalized AI coaching-style setup + a headline score.*
### Pass 8 (2026-07-21) — video / exercise library
- **Multi-select filters + custom exercises** [Bevel/Hevy]: Library search + "All groups" / "All equipment"
  multi-select (Filter by "3 muscles"), Popular/Recent/All sections, per-exercise info + **progress-chart icon
  (tap → history)**, "Add custom exercise". → *SwanStudios (has 736-exercise DB) gap: multi-select filtering,
  per-exercise progress history from the library, user-created custom exercises.*
- **Movement Library w/ animated muscle-highlight on detail** [Equinox+]: Explore hub (On-Demand Classes /
  Collections / Articles / Workout Sessions / Programs / Movement Library) → exercise detail w/ video +
  Equipment/Target Muscle/Coordination metadata + **glowing muscle-highlight body silhouette**. → *Gap: the
  anatomy-overlay-on-exercise-detail Sean wants for the content studio — a shipped reference for it.*

### Pass 9 (2026-07-21) — programming / periodization
- **Program browse → objectives → typical week → start** [Tempo]: training-plans catalog filtered by goal
  (Lose weight / Get toned / Get stronger) w/ coach avatars + duration/body-part chips → plan objectives →
  "Here's a typical week" preview → weekly target rings → **"Plan progress" w/ muscle-impact body map + Volume/
  Calories/Intensity + Leave plan / Find a new plan**. → *SwanStudios gap: browsable program catalog + typical-
  week preview + plan-progress body map + easy switch. (Trainer indispensability: keep plan-switch trainer-gated.)*
- **Personalized plan builder** [Runna, 13 screens]: goal (Race / specific distance / 5k improvement / general)
  → distance (5k…ultra + custom slider) → start date (Today/Tomorrow/Monday/custom) → **plan LENGTH w/
  recommendations (12wk "longer training" / 8wk "balanced" / 6wk "fast-track" + custom 26-wk slider)** →
  personalized plan w/ badge + welcome. → *Reusable onboarding-to-plan archetype; the "recommended length w/
  rationale" pattern is strong.*
### Pass 10 (2026-07-21) — community / groups / messaging
- **Small "Team" group + activity feed** [Numo]: named team w/ member avatars + CHAT, Activity/Posts tabs,
  "Write post" + Add task, feed posts w/ like/comment. → *SwanStudios gap: small accountability-team model
  (not just one global feed).*
- **Coach DM + topic communities + local meetups** [Ladder]: Chat = Communities (Form Check & Tips 2.1K,
  Healthy Parenting) + **location-based Meetups (Denver/Boston)** + Direct Messages w/ **Coach Chat**; home
  prompt "Check in with your coach and set a 30-day goal → Go to Coach Chat". → *Gap: a dedicated coach DM
  channel + topic communities + local meetups. (Coach DM ties to Swan Coach / trainer indispensability.)*
- **Friend system + welcome inbox** [Nike Run Club]: friend requests (accept/decline), coach welcome messages,
  member benefits, Add Friends. → *Gap: friend graph + onboarding welcome-message sequence.*

### Pass 11 (2026-07-21) — onboarding / personalization  ✅ FITNESS SWEEP COMPLETE (12 domains)
- **Goal multi-select → assessment → personalized program** [Equinox+, 10 screens]: "top goals (select up to
  5)" chips → **physical assessment ("can you sit/stand without hands?" w/ video)** → program match (Endurance/
  Regenerate/Burn/Destress/Tone) + **"Help Me Pick"** → enroll. → *SwanStudios gap: assessment-driven program
  matching + a "help me pick" assist. Strong onboarding archetype.*
- **"Setup checklist" home for new users** [pliability]: "Start your Mobility Journey" w/ Tailor Content →
  first Mobility Test → get content, as a progress-tracked checklist. → *Reusable activation pattern (rule-62
  first-run activation).*
- **Confidence slider + identity/story framing** [Life Reset]: "How confident are you you'll stick with a daily
  routine for 7 days?" 0-10 slider · real-user story cards · a "we see you" personalized results readout from
  the answers. → *Reusable: emotional-commitment onboarding + personalized results summary (high conversion).*
- Design principle (reusable, brand-agnostic): onboarding = goals (multi-select) → light assessment → **show a
  personalized result derived from the answers** → commit. The personalized readout is the conversion moment.

---

## PART C — WEBSITE-TYPE FINDINGS (agency brain; fitness sweep done, now Tier-1 client site archetypes)
_(loop now sweeps local-service → e-commerce → restaurant → professional-services, most-popular-first)_

### C-Tier1 · LOCAL-SERVICE (handyman / repair / salon / contractor) — pass 12
Reusable patterns a service-business client site needs (from Angi, Realtor.com Pros, Shopee Home Service):
- **Service catalog by category** [Shopee]: services grouped (Service AC / Cleaning / Massage) w/ hero image +
  "from $X" price + city/location selector + promo strip. → the landing/services grid.
- **Pro directory w/ TRUST SIGNALS** [Angi, Realtor.com]: each pro card = photo · star rating + review count
  (4.8 (99)) · **"X years in business" · "Hired X times" · license status** · a review quote · **"Get a
  quote"/"Request quote"** CTA. → THE conversion unit for service sites; trust signals drive the hire.
- **Quote-request funnel** [Angi]: "We're matching you with a pro" → project-detail form (task type · timeline
  "within 2 weeks" · scope "single project" · location) → matched pros → request quotes from several at once.
- **Service filter dropdown** [Realtor.com]: General / Home remodel / Handyman / Kitchen / Plumbing / Appliance…
- **Reusable ARCHETYPE:** hero + services grid → pro/service directory w/ trust badges (rating·reviews·years·
  jobs·license) → quote-request form → confirmation. "Get a quote" > "Buy now" for high-consideration services.

### C-Tier1 · E-COMMERCE (product → cart → checkout) — pass 13  [web]
Reusable patterns an online-store client needs (from lululemon, Etsy, Amazon — all web):
- **PDP anatomy** [Amazon/Etsy]: gallery + title + rating/review count + price + **scarcity ("Low in stock, only
  2 left")** + variant/qty + **dual CTA "Buy it now" + "Add to cart/basket"** + wishlist + structured item
  details (brand/attributes) + "similar items" cross-sell + AI Q&A ("Ask about this product").
- **Cart** [lululemon/Etsy]: line items w/ edit/remove/save-for-later · Saved Items · order summary (subtotal/
  shipping/tax) · **BNPL "4 payments of $2.46 with Afterpay/Klarna"** · gift card · PayPal/GPay express ·
  **purchase-protection/refund trust badge** [Etsy] · coupon code.
- **Multi-step checkout w/ progress rail** [lululemon]: Contact → Shipping → Payment → Review numbered stepper,
  order summary persistent right rail, multiple pay methods (Apple Pay/PayPal/Afterpay/Klarna/gift card),
  delivery-date estimate. → the checkout archetype.
- **Reusable ARCHETYPE:** PDP (gallery·price·scarcity·variants·dual-CTA·cross-sell) → cart (summary·BNPL·express·
  trust badge) → stepped checkout (contact/ship/pay/review) → confirmation. Express pay + BNPL lift conversion.
### C-Tier1 · RESTAURANT (menu / reservation / order / pay) — pass 14
Reusable patterns a restaurant client site needs (TheFork, Honest Greens, Zomato):
- **Restaurant detail tabs** [TheFork/Zomato]: For-you / Menu / Reviews / Location (+ Photos / Vibes / **360°
  view**); "132 food photos", cuisine type + avg price / "₹1,700 for two". Photos + reviews are the trust layer.
- **Reservation w/ time-slot chips + offers** [TheFork]: "Book for" 11:30/11:45/12:00 chips w/ **-40% discount
  badges**; primary "Book a table". → reservation archetype w/ promo incentive.
- **Order menu w/ dietary + availability states** [Honest Greens]: Pickup/Delivery toggle + location/distance,
  category tabs, dish cards (photo·desc·price) + **"Plant based" dietary badge** + **"Kitchen closed" state**.
- **Pay bill / offers in-app** [Zomato]: "Pay bill — tap to view offers". → dine-in payment.
- **Reusable ARCHETYPE:** hero+photos/360 → tabbed menu (categorized, photos, dietary badges, price, avail
  states) → reservation (time chips, party size, promo) OR order (pickup/delivery) → pay bill. Photos+reviews sell.

### C-Tier1 · PROFESSIONAL-SERVICES (real-estate / medical / law — credibility + lead capture) — pass 15
Reusable patterns (Realtor.com, Redfin, Karrot — real-estate as the pro-services exemplar; same shape for
medical/law: authority + data + a lead-capture CTA):
- **Listing detail w/ deep data + trust** [Realtor.com/Redfin, 16-17 screens]: photo gallery + price + specs
  (beds/baths/sqft/lot) + **neighborhood risk data (flood/noise)** + **valuation estimates from multiple
  providers + price history chart** + **school ratings w/ reviews** + property history (listed/sold records). →
  authority through DATA is the credibility play for pro-services.
- **Dual lead-capture CTA** [all]: **"Schedule tour / Request showing"** (calendar: in-person vs video-chat,
  date chips, "free, cancel anytime") + **"Contact agent"** → simple Name+Email lead form ("your info goes to
  local agents who can answer"). → the lead-gen unit; low-friction form + a booking option.
- **Map + list toggle + saved search** [Realtor.com/Redfin]: map w/ price pins, filters (price/rooms/type),
  "Save search", "X of Y results". → discovery archetype for any directory/listing pro-services site.
- **Reusable ARCHETYPE:** listing/service detail (gallery + specs + authority DATA + reviews) → dual CTA
  (book/tour appointment + contact/lead form) → discovery (map/list + filters + saved search). Data = credibility.
### C-Tier2 · SaaS (marketing landing + product dashboard) — pass 32  [web]
Reusable patterns a SaaS client needs (Assembly, Sana AI, Basedash, Whop, Mixpanel — all web):
- **Marketing landing archetype** [Assembly/Sana]: **split hero (headline + real product screenshot + dual CTA
  "Start free trial" / "Book a demo")** → **feature grid w/ REAL UI screenshots** (show the product, not icons) →
  **testimonial carousel (quote + person photo + company logo)** → **segmented-audience section** ("Built for
  Growth Teams / Agencies / Founders") → **logo wall (social proof)** + **funding/announcement bar** → footer w/
  a **"Compare (vs competitor X/Y)"** column. → THE SaaS marketing site shape.
- **Pricing + trust surface** [Sana]: **3-tier pricing (Free / Team / Enterprise-custom) w/ annual toggle ("Save
  $X") + per-tier feature checklists + "Schedule a meeting" for enterprise** + **FAQ (security/data/integrations)
  + trust badges (ISO 27001 / SOC 2 / GDPR) + encryption line**. → the conversion + enterprise-trust unit.
- **Product dashboard archetype** [Basedash/Whop/Mixpanel]: **left collapsible nav + top filter/date-range bar
  w/ compare-to-previous-period** → **metric big-number cards w/ delta + sparkline (MRR/ARR/revenue)** →
  **breakdown stacked-bar cards (Payments: Paid/Refunded/Failed · Users: Joined/Paid/Renewing)** → **filter/
  variable panel (date range, category as reusable {{vars}}) + auto-refresh** → chart cards (line + donut w/
  center total). → the analytics-dashboard shape.
- **Activation / empty-state layer** [Mixpanel/Whop]: **"Good Morning" greeting home + setup-progress banner
  ("Finish setup in <20 min → Continue Setup") + empty-state coaching copy ("No data — finish implementing X") +
  to-do card + invite-teammates + trial-status nudge**. → the onboarding-inside-the-product pattern.
- **Reusable ARCHETYPE:** landing (split hero + feature-screenshot grid + testimonial carousel + logo wall +
  compare footer) → pricing (3-tier + annual toggle + FAQ + trust badges) → product (left-nav + date-range +
  metric cards w/ delta/sparkline + breakdown bars + variable panel) → activation (greeting + setup-progress +
  empty-state coaching). *SwanStudios cross-benefit: the metric-card+delta+sparkline, breakdown-bar, date-range/
  compare-period, and setup-progress + next-best-action patterns apply DIRECTLY to Swan's admin/trainer
  dashboards (proof-of-value) — not just agency SaaS clients.*
### C-Tier2 · PORTFOLIO / CREATIVE (agency / designer / photographer / studio) — pass 33  [web]
Reusable patterns a portfolio/creative client site needs (Dribbble agency profiles, Contra, Sana story pages,
Phantom Studio, Peerlist — all web):
- **Immersive editorial hero** [Phantom Studio/Sana]: **oversized display type ("TECHNOLOGY FOCUSED AND CREATIVELY
  DRIVEN®") + full-bleed 3D/video hero ("click to enable sound") + minimal nav (Work / About / Careers / "Let's
  Talk")** + agency manifesto copy. → the creative-brand signature moment; type + motion carry it, not chrome.
- **Featured-work grid / work-wall** [Phantom/Dribbble/Contra]: **thumbnail grid of projects (often angled/
  perspective for drama), filterable**, each tile → a project. Discover/curated grids add **per-project like/view
  counts + role/skill filter tabs**. → the core of any portfolio.
- **Case-study / project-detail (THE proof unit)** [Contra/Sana]: **hero project visual + narrative (challenge →
  approach → outcome, "delivered in a one-week sprint") + scroll-through visuals + services/tools tags + maker/
  agency card ("Get in touch" + Follow) + related projects**. Sana's premium variant = **editorial story page
  (oversized hero + "5 min read" + long-form serif sections + device mockups + pull-quote testimonial carousel +
  lead form at the end)**. → capability proof; the narrative (not just pretty images) sells the hire.
- **Agency/creator profile + trust signals** [Dribbble]: **logo + star rating (5.0) + "X projects completed" +
  "Responds in ~3 hours" + "From $1,000/project" + services count + bio + "Get in touch"** + tabs (Work /
  Services / Reviews / Collections / About) + About = **expertise/skills tags + languages + client-logo wall
  (F1/Coca-Cola/Kia) + social links + member-since + followers**. → the "hire us" credibility surface.
- **Inquiry / lead-capture** [Sana/Contra]: **project-inquiry form (email · name · company · size · "tell us about
  your project" · consent → "Select a time"/book)** + persistent "Get in touch" CTA. → the creative-services
  conversion unit (mirrors the Tier-1 quote-request funnel, higher-touch).
- **Reusable ARCHETYPE:** immersive editorial hero → filterable work-wall → case-study detail (narrative +
  scroll visuals + services tags + maker card) → agency/creator profile (rating + projects-done + pricing signal
  + reviews + client-logo wall) → inquiry/book CTA. Signature type + one full-bleed motion moment + narrative
  case studies = the differentiators; generic template grids read as cheap. *SwanStudios cross-benefit: a
  TRAINER/COACH profile can borrow this shape 1:1 — Work = client transformations/results (case studies), Reviews,
  About = credentials, "Responds in X", pricing signal, "Book / Get in touch". "Hire this trainer" ≈ "hire this
  agency." Also feeds the Marketing Command Center's coach-marketing surfaces.*
### C-Tier2 · FINTECH / STOCK-MARKET (banking / investing / trading / crypto / budgeting) — pass 34  [web]
Reusable patterns a fintech client site needs (Origin, Quicken, Revolut, Coinbase, Perplexity Finance — all web):
- **Balance hero + performance chart w/ time-range + benchmark** [Origin/Quicken]: **big balance number + delta
  + area/line chart w/ 1W/1M/3M/6M/YTD/1Y toggle**, Origin adds a **portfolio-vs-benchmark comparison line
  (Portfolio 5.99% vs S&P −7.91%, hover tooltip)** + benchmark selector. → THE signature fintech view; comparison
  + range toggle is the credibility move.
- **Holdings table + asset-allocation** [Origin/Quicken]: **sortable holdings table (name · return % · return $ ·
  amount) + Top Movers (sparkline + %) + asset-allocation bar/donut (Crypto 100%)**. → the composition view.
- **Ticker / asset detail + order panel** [Revolut/Coinbase]: **big price + %change + Buy/Sell/Convert + interactive
  chart w/ time-range + stats grid (Market Cap / PE / EPS / Dividend / 24h Volume / circulating supply) + analyst-
  ratings horizontal bars (Strong Buy→Strong Sell %) + tabs (Overview/Financials/News/Orders/Transactions)** →
  **order panel (amount input, one-time vs recurring, pay-with source)**. → the trade/detail unit.
- **Transaction ledger + statements** [Quicken/Revolut]: **table (Date · Action Buy/Sell/Dividend · Security ·
  Qty · Amount) searchable/filterable/exportable** + per-trade history. → the records/statements surface.
- **Market overview + watchlist** [Perplexity/Coinbase]: **index cards (S&P/NASDAQ/Dow/VIX) + market-summary
  narrative + Gainers/Losers/Active + Create-Watchlist rail + Equity Sectors**. → discovery/monitoring.
- **Trust / compliance layer (fintech-critical)** [Revolut/Coinbase]: **"Capital at risk" + regulatory disclosure
  ("authorised & regulated by [FCA]") + "Past performance is not indicative" + data-source attribution ("data by
  Polygon.io / TradingView")** + (banking would add FDIC/encryption/2FA). → the mandatory trust/legal chrome that
  makes a fintech surface credible.
- **Reusable ARCHETYPE:** balance hero + benchmark-comparison chart (range toggle) → holdings table + allocation →
  ticker detail (price + chart + stats + analyst bars + tabs) + order panel → transaction ledger/statements →
  market overview + watchlist → trust/compliance chrome (risk disclaimer + regulator + data attribution). Numbers
  must feel precise + live; the compliance chrome is non-optional. *SwanStudios cross-benefit (STRONG for admin):
  the balance-hero + time-range + benchmark-comparison chart, the sortable holdings table, and the searchable
  transaction ledger map DIRECTLY onto the ADMIN financial dashboard — revenue-over-time w/ compare-period,
  package/subscription "holdings" table (which package · MRR · count), and a payments/transactions ledger
  (searchable, exportable statements). Serves the admin proof-of-value + Marketing Command Center revenue views.*
### C-Tier2 · MARKETPLACE (two-sided platform — listings + buyer & seller) — pass 35  [web]
Reusable patterns a marketplace client needs (Airbnb, Turo, Etsy — all web; covers BOTH sides):
- **Buyer discovery** [Airbnb/Etsy]: **search bar (Where / dates / guests) + categorized listing grids ("Stay
  near X", "Popular in Y") + listing cards (photo · "Guest favorite" badge · price · ★rating · wishlist heart ·
  video-preview · discount% · "Free shipping"/"Digital Download" badges)**. → the discovery surface (map/list +
  filters is the sibling from Tier-1 pro-services).
- **Listing detail + booking widget** [Airbnb]: **photo tabs (Photos/Amenities/Reviews/Location) + amenities grid
  + a sticky BOOKING WIDGET (price + date picker + guests + "Reserve" + "You won't be charged yet" + "Rare find!
  usually booked" scarcity) + availability calendar + "Things to know" (house rules / safety / cancellation
  policy)**. → the conversion unit; the sticky price+book card is the money moment.
- **Reviews BOTH directions + category ratings** [Airbnb/Etsy]: **★avg + review count + per-category ratings
  (Item quality / Shipping / Customer service / Buyers-recommend %) + filterable reviews (per-review avatar +
  location + date + "This item" tag + photos-from-reviews)**. → trust through peer proof, rated on multiple axes.
- **Seller/HOST dashboard** [Turo]: **left nav (Calendar/Trips/Inbox/Vehicles/Business) + "Switch to guest"
  role-toggle + listing card w/ status (Pending/Listed) + "unfinished steps"** → **listing-management sub-nav
  (Pricing & discounts · Location & delivery · Trip preferences · Photos · Extras · Earnings plan · Trip history ·
  Safety & inspections)**, incl. **dynamic pricing ("last-minute boost — guests are 2x more likely to book") +
  add-on Extras (toggle) + quality/safety requirements (maintenance rate, annual inspection status)**. → the
  supply-side operating console.
- **Trust & safety** [Etsy/Airbnb]: **Purchase Protection / AirCover guarantee + verified badges + secure-payment
  + cancellation policy + "Report this listing" + "Meet your sellers"**. → the two-sided-trust chrome.
- **Reusable ARCHETYPE:** buyer discovery (search + filter + listing grid w/ trust badges) → listing detail
  (gallery + specs/amenities + sticky book/buy widget + scarcity + reviews-with-category-ratings + policy) →
  seller/host dashboard (role-toggle + listing mgmt + dynamic pricing + earnings + safety reqs) → two-sided
  trust (guarantee + verified + secure pay) → messaging between parties (Inbox). *SwanStudios cross-benefit
  (STRONG): this IS the coach-directory / trainer-client two-sided model — client-side discovery (browse coaches
  w/ filters + trainer listing detail: photos, specialties, ★reviews-with-category-ratings, rate, "Book") +
  trainer-side HOST dashboard (manage availability/packages/pricing, client roster, earnings — mirrors Turo) +
  reviews both ways + trust badges (verified / 26+ yrs / NASM-protocol / background-check). Combines the pass-26
  Zocdoc booking + pass-33 profile patterns into the full marketplace shape.*
- **✅ TIER-2 COMPLETE (SaaS · Portfolio · Fintech · Marketplace all DONE, passes 32-35).**
### C-Tier3 · ONBOARDING / AUTH mechanics (universal) — pass 36  [web]
Reusable auth building blocks used across ALL site types (Google/Gemini, Posh, Sana, Indeed — web). (Fitness
quiz-funnel + paywall onboarding was covered pass 24; THIS is the auth plumbing.)
- **Identifier-first entry + SSO stack** [Sana/Google]: **"Continue with Google/Apple" button(s) above an "or"
  divider, then email/phone input**; email-first ("Enter email → Next → password") vs one-page. → the canonical
  sign-in top.
- **OTP / magic-code verification** [Posh/Sana]: **6-box code input + "Enter your verification code — Sent to
  X@email (Edit)" + Continue + "Resend code in 29s" countdown + human-verification (Cloudflare) captcha**. →
  passwordless / email-verify / 2FA-code UI.
- **Phone-first + country selector** [Posh]: **"What's your phone number?" + country-code dropdown + "Login or
  Sign up" + "Switch to email"** → SMS OTP. → the phone-auth path.
- **Password path states** [Google]: **show-password toggle, "Forgot password?", inline error ("Wrong password.
  Try again or click Forgot password"), "Try another way", guest mode ("Not your computer? Use Guest mode")**. →
  the login error/recovery states (don't ship the happy path only).
- **Security / passkey / device mgmt** [Indeed]: **Security settings + "Create passkey" + active devices/sessions
  management + Change email/phone**. → modern 2FA/passkey + session hygiene.
- **Post-auth context selector** [Posh]: **org/workspace picker ("My Organizations" + New)** for multi-tenant. →
  where multi-role/multi-tenant apps route after login.
- **Consent + privacy surface** [Google/Indeed]: **terms/privacy line under the CTA + a Privacy settings page
  (types of data collected · how used · cookies · access/delete my data)**. → compliance chrome (ties pass-20
  GDPR export).
- **Reusable LIBRARY:** SSO stack → identifier-first (email/phone) → password (w/ error+forgot+show-toggle) OR
  OTP/magic-code (6-box + resend countdown + captcha) → passkey/2FA + device mgmt → post-auth workspace/role
  selector → consent/privacy. *SwanStudios cross-benefit: Swan auth (JWT) exists, but this informs a polished
  login/signup — add SSO buttons + a passwordless/magic-code option + passkey support + real error/forgot states,
  and (Swan-specific, IMPORTANT) a POST-AUTH ROLE ROUTER (client vs trainer vs admin lands on the right surface —
  the multi-tenant selector pattern). The privacy-settings/data-export surface also serves rule-8 + the GDPR
  export already logged pass 20.*
### C-Tier3 · CHECKOUT / PAYMENT mechanics (universal) — pass 37  [web]
Reusable payment building blocks (Greptile/Stripe-Link, Walmart, lululemon, Kajabi, ClickUp, Copy.ai — web).
(E-commerce cart→stepped-checkout was pass 13; THIS is the payment/billing plumbing.)
- **Card form (Stripe-Elements style) + inline validation** [Greptile]: **payment-method tabs (Card / Apple Pay /
  Google Pay / Bank / iDEAL / Link) + Card number w/ live brand-icon + Expiration MM/YY + CVV + Country/ZIP + "Save
  my info for faster checkout"** with **real error states ("Your card number is invalid" / "Your card was declined"
  in red)**. → the canonical card entry; ship the error states, not just the happy path.
- **Express wallets + accepted-methods row + BNPL** [lululemon/Walmart]: **Apple Pay / Google Pay / PayPal one-tap
  accordion + accepted-card icon row + BNPL ("4 payments of $2.46 — Afterpay/Klarna")** + Pay-by-bank/ACH. → cut
  friction at the top; BNPL + express lift conversion (also pass 13).
- **Saved methods + returning-user** [Walmart/ClickUp]: **saved card ("Visa ending 2412") + "Set as default" +
  "Change payment" + Add card**. → the returning-buyer fast path.
- **Subscription plan management (upgrade/downgrade)** [ClickUp/Copy.ai/Kajabi]: **plan-comparison cards +
  Monthly↔Annual toggle ("Save 15%") + POPULAR badge + per-tier feature lists + Upgrade/Downgrade/"Switch to
  Annual" buttons + upgrade success banner**. → the tier-change surface.
- **Usage-vs-limit meters + limit-reached upsell** [Kajabi/Copy.ai]: **plan-usage bars (Contacts 5/250, Funnel
  "limit reached 1/1 → Upgrade plan", Credits 101/10,000)**. → usage-based upsell prompts inline.
- **Billing hub: upcoming bill · invoices · payment · cancel** [Kajabi/Copy.ai/ClickUp]: **"Upcoming bill $69 +
  Autopay on [date] + View invoice" + Invoices table (invoice# / type / amount / date / status Paid / View) +
  Billing info (card + Edit) + Cancellation ("Cancel Plan — keep access through end of month") + proration note
  ("add user = prorated one-time; remove = seat open till next cycle") + trial-change warning ("changing plan
  ends trial + charges now")**. → the account-billing management surface.
- **Reusable LIBRARY:** payment-method tabs → card form (brand-icon + MM/YY + CVV + validation errors) OR express
  wallet OR BNPL → saved-methods/default → [subscriptions:] plan cards + monthly/annual + upgrade/downgrade +
  usage meters → billing hub (upcoming bill + invoices + payment edit + cancel + proration). *SwanStudios
  cross-benefit (STRONG — Swan already runs Stripe): (1) the Stripe-Elements card form + error states = the
  package-purchase checkout; (2) plan cards + monthly/annual + upgrade/downgrade = the Starter/Guardian/Crystalline
  tier-change surface (currently a gap); (3) the billing hub (upcoming bill + invoices table + cancel + proration)
  = the client's self-serve billing page AND the admin billing view; (4) usage-vs-limit meters map to session-
  package consumption ("8 of 12 sessions used → buy more"). Directly serves Marketing/money + admin proof-of-value.
  NOTE: any Stripe/billing BUILD is high-stakes (Rule 50 Tier-C trigger) — research only here.*
### C-Tier3 · COMMUNITY / SOCIAL (universal) — pass 38  [web]
Reusable social building blocks (Binance Square, Peerlist, Reddit, X, TikTok, Braintrust — web). (Fitness feed/
challenges = passes 3/22; THIS is the generic social plumbing.)
- **3-column feed layout** [Binance/Peerlist/X]: **left nav (Home/Notifications/Profile/Bookmarks/Settings + Post
  button + user card) + center feed + right rail (suggested creators/who-to-follow · news/trending · profile-
  completion + analytics widgets)**. → the canonical community shell.
- **Post card + reaction bar** [all]: **author + timestamp + Follow + text/media + reaction bar** — either
  **like/upvote count · comment · repost/share · views · bookmark · ...menu** (Binance/X) or **up/downvote arrows**
  (Reddit) — plus **reshare attribution ("X reshared") + "X & N others upvoted" social proof**.
- **Post composer + post detail + THREADED comments** [Binance/Peerlist/Reddit]: **inline composer ("Share a
  post"/"What's happening?") → post detail (reaction bar + "Post your reply" + Comments/Upvotes tabs (see who
  reacted, Follow) + sort (Most Relevant/Newest/Best) + NESTED replies (like + reply + "Show more replies" +
  "Replied to X" + collapse))**. → the discussion unit.
- **Group / forum structure** [Reddit]: **community sidebar (about + weekly-visitors/contributions stats +
  Community Bookmarks/Wiki + RULES list + Join button)**. → the sub-community container.
- **Notifications inbox** [X]: **All / Mentions tabs + per-item (actor + action + context "Replying to X" +
  timestamp) + empty state + settings + unread badge on nav bell**. → the activity center.
- **DM / messaging** [TikTok/Braintrust]: **conversation list (avatar + name + last-message preview + timestamp +
  unread badge + search-by-name) → thread (contact header w/ presence/location/timezone + message bubbles (sent
  right / received left + timestamps) + system lines ("Message request accepted") + composer (attach/image/emoji +
  Send) + contextual action e.g. "Offer 1:1 help") + message-requests (accept before chatting)**. → 1:1 comms.
- **Reusable LIBRARY:** 3-col shell → feed (post cards + reaction bar + composer) → post detail + threaded
  comments (sort + nested + who-reacted) → group/forum (sidebar + rules + join) → notifications inbox (tabs +
  context + empty state) → DM (list + thread + requests + composer). *SwanStudios cross-benefit (STRONG — Swan
  has a social-platform vision): the feed + post + threaded-comments + reactions = the community core loop
  (already partially built — this is the reference for completeness); the group/forum sidebar = group challenges/
  cohorts; the DM thread w/ "Offer 1:1 help" ≈ TRAINER-CLIENT MESSAGING (contextual coaching action in-thread) +
  message-requests gate (client can't cold-DM any trainer). Notifications inbox = the accountability nudge
  surface (streak/coach-reply/challenge alerts). Keep it coaching-reinforcing, not a noisy generic feed (Rule 62).*
### C-Tier3 · EMPTY / LOADING / ERROR states (universal in-between UI) — pass 39  [web]
Reusable "in-between" states every site needs (Klarna, Tally, Employment Hero, Threads, Google, Squarespace — web).
- **Empty-state anatomy** [Klarna/Tally]: **centered illustration/icon + headline ("No X yet" / "Nothing saved")
  + encouraging subtext ("do Y to get started" / "as simple as 1-2-3") + primary CTA button ("Create form" / "Find
  products")**. Never a blank screen. → the zero-data default.
- **Per-widget empty states** [Employment Hero]: **each dashboard card owns its zero-state ("No pay slips to view
  yet — once available your pay slip will appear here")** + zero-value stat cards that still show structure ("$0.00",
  "None in progress"). → so a new-account dashboard reads as "ready", not "broken".
- **First-run / sample-data bridge** [Employment Hero/Tally]: **onboarding banner ("Finished exploring? Set up now
  to clear the sample data and add your real data") + "get started, it's simple" coaching**. → the new-account
  activation nudge (same family as SaaS setup-progress, pass 32).
- **Transient error** [Threads]: **"Something went wrong, please try again later." + Retry button**. → failed
  load/action fallback.
- **Branded 404** [Google/Squarespace]: **big "404 / Not Found" + friendly explanation ("URL error OR page moved/
  deleted") + illustration + recovery links (return home / search / sitemap) + KEEP nav+footer** so the user isn't
  stranded. Errors stay on-brand (Gemini "That's all we know"; Squarespace editorial type). → the dead-end
  recovery surface.
- **Loading** [pattern — spinners seen in TikTok DM, skeletons standard]: **skeleton placeholders (content-shaped
  shimmer) > spinner > progress bar**; skeletons preserve layout so there's no reflow jump. → the wait state
  (log as known-pattern; no dedicated hero screen surfaced this pass).
- **Form validation** [cross-ref auth pass 36 / payment pass 37]: **inline field errors in red ("Wrong password",
  "Your card number is invalid/declined")** at the field, not a top alert. → the input error state.
- **Reusable LIBRARY:** empty (illustration + headline + subtext + CTA) · per-widget zero-states · first-run/
  sample-data bridge · loading (skeleton>spinner>progress) · transient error (msg + Retry) · branded 404 (explain
  + recovery links + keep chrome) · inline field validation. *SwanStudios cross-benefit (STRONG — ties the
  data-truth rule + Rule 62 activation): a BRAND-NEW CLIENT has NO workout/progress data yet — every Swan dashboard
  (user/trainer/admin) needs great empty states that COACH the first action ("Log your first workout to see your
  progress chart") instead of showing a broken/blank chart or fake mock data (data-truth rule: mock = a gap to
  replace, and an empty state is the honest placeholder). Per-widget zero-states + a first-workout activation
  nudge + a branded 404 + inline form validation are direct, high-value Swan polish items. Skeletons on chart/
  list loads prevent the layout-jump that reads as janky.*
### C-Tier3 · NAVIGATION / SEARCH / SETTINGS (universal chrome) — pass 40  [web]
Reusable app/site chrome (lululemon, Ferndesk, Grok/xAI, Fabric, Uvodo — web).
- **Global header + mega-menu** [lululemon]: **sticky top header (logo + primary nav + Search + region + account +
  wishlist + cart cluster) → hover MEGA-MENU (multi-column: category list + subcategory columns + right promo
  image "Shop X" + a secondary filter row + "Shop All")**. → the marketing-site nav; mobile = hamburger drawer.
- **Footer + nav management** [Uvodo/Ferndesk]: **footer link columns (Market/About/Customer/Business/Follow +
  legal row) + newsletter capture**; editable **Main-menu + Footer-menu managers (label + URL, reorder)**. → the
  site-wide nav/footer surface.
- **Global search + ⌘K command palette** [Grok/Fabric]: **prominent global search ("What are you looking for?")
  + a top-bar "Open Command Menu ⌘K" trigger → command modal (type-to-search, GROUPED results Navigation/Account/
  Security/Actions, keyboard-nav + Enter-to-Go)**. → power-user speed (least-clicks).
- **Settings / account structure** [Grok/Fabric/Indeed-pass36]: **left sidebar of GROUPED sections (Account ·
  Security · Sessions/Devices · Notifications · Billing · Privacy/Data · Preferences · Labs · Logout) + right pane
  of account cards w/ inline Edit/Update/Manage (name/email/subscription)** + **sign-in-methods management
  (connect/disable Google/Apple/email SSO) + MFA device management + keyboard-shortcuts page + data export/delete
  + feature-flag (Labs) toggles**. → the account console.
- **Appearance / theme toggle** [Ferndesk]: **sun/moon theme switch + device-preview toggle + "Changes saved
  successfully" toast**. → the theme/customize control.
- **Reusable LIBRARY:** sticky header + mega-menu (+ mobile hamburger) · footer link-columns + newsletter ·
  global search + ⌘K command palette (grouped, keyboard-first) · grouped settings sidebar + account cards +
  SSO/MFA/sessions mgmt + data export · appearance/theme toggle + save-toast. *SwanStudios cross-benefit (STRONG):
  (1) a ⌘K COMMAND PALETTE + global search across the admin/trainer dashboard = jump-to-client / jump-to-workout /
  jump-to-setting in one keystroke (Sean's least-clicks mandate — highest-value nav item); (2) the grouped
  settings sidebar = Swan account settings (profile/security/notifications/billing/privacy + data-export, ties
  rule-8 + pass-20 GDPR); (3) the appearance/theme toggle = Swan's existing THEME/LENS CHANGER (this is the
  reference pattern — sun/moon + save-toast + it should recolor via tokens per the site-overhaul handoff); (4)
  mega-menu + sticky header for the marketing site. All four are direct Swan surfaces.*
- **✅ ALL TIER-3 UNIVERSAL PATTERNS DONE (Auth · Checkout/Payment · Community/Social · Empty/Loading/Error ·
  Navigation/Search/Settings — passes 36-40). PART C IS COMPLETE.**

---
## ✅ PART C COMPLETE (2026-07-21) — website-archetype sweep done (the agency brain)
The full curated website-type taxonomy has been swept, most-popular-first, on Mobbin's WEB platform.

**Tier-1 archetypes (highest SMB demand — passes 12-15):** local-service · e-commerce · restaurant ·
professional-services.
**Tier-2 archetypes (higher-ticket — passes 32-35):** SaaS · portfolio/creative · fintech/stock-market ·
marketplace (two-sided).
**Tier-3 universal cross-cutting libraries (passes 36-40):** onboarding/auth · checkout/payment · community/
social · empty-loading-error states · navigation-search-settings.

**Top cross-archetype reusable BUILDING BLOCKS (used across many site types):**
1. **Hero + dual-CTA + feature-screenshot grid + testimonial carousel + logo wall** (SaaS/portfolio marketing).
2. **Metric card w/ delta + sparkline · breakdown stacked-bar · date-range + compare-period** (SaaS/fintech dashboards).
3. **Listing/PDP → sticky book/buy widget (price + date/variant + scarcity) → reviews-with-category-ratings** (e-comm/marketplace/pro-services).
4. **Trust chrome** (ratings · verified badges · guarantees · risk/compliance disclaimers · secure-pay).
5. **Auth kit** (SSO stack · identifier-first · OTP/magic-code · passkey/MFA · post-auth role/workspace router).
6. **Payment kit** (Stripe card form + validation errors · express wallets/BNPL · saved-methods · plan up/downgrade · billing hub w/ invoices/cancel/proration).
7. **Social kit** (3-col feed · post + reaction bar · threaded comments · notifications inbox · DM w/ message-requests).
8. **In-between states** (illustrated empty + CTA · per-widget zero-states · skeleton loading · branded 404 · inline validation).
9. **Chrome** (sticky header + mega-menu · footer columns + newsletter · ⌘K command palette + global search · grouped settings sidebar · theme toggle).

**Strongest SwanStudios cross-benefits harvested from Part C (direct Swan surfaces, not just agency clients):**
- **⌘K command palette + global search** across admin/trainer dashboards — jump-to-client/workout/setting in one keystroke (least-clicks mandate). *(pass 40)*
- **Admin financial dashboard** = fintech balance-hero + compare-period chart + package "holdings" table + payments ledger. *(pass 34)*
- **Coach directory = marketplace** two-sided model (client discovery + trainer host-dashboard + reviews both ways + trust badges). *(pass 35)*
- **Subscription tier up/downgrade + billing hub** for Starter/Guardian/Crystalline (current gap) + session-package usage meters. *(pass 37)*
- **Post-auth role router** (client vs trainer vs admin → right surface) + SSO/passkey polish. *(pass 36)*
- **Empty-state coaching** for new-client no-data dashboards (data-truth rule: honest empty > mock chart) + branded 404 + inline validation. *(pass 39)*
- **Trainer/coach profile** = portfolio case-study shape (Work = transformations, Reviews, credentials, "Book"). *(pass 33)*
- **Theme/lens changer** reference = appearance toggle + save-toast + token-driven recolor. *(pass 40)*

**NEXT:** both **Section A (fitness, all 12 domains)** and **Part C (all website archetypes)** are now COMPLETE.
The coverage doc is exhausted per Sean's directive. Loop paused for Sean's decision on what to do with the
findings (prioritize into a build plan · distill into the design-brain vault · pause · go deeper). Do NOT
auto-continue — this is a milestone gate.

---

## PART C — THE CURATED WEBSITE-TYPE TAXONOMY (priority 2 — the agency brain)
After fitness, train the brain on the website types with the highest paid-client demand and money-making power.
Ranked. (Draws on `design-brain/website-archetypes.md` — 20 archetypes already documented.) These are the
"options" — Sean approves/re-ranks.

**Tier 1 — highest SMB demand / fastest money (build these for clients most):**
1. **Local service business** (handyman, HVAC, plumber, electrician, computer repair, salon, contractor) —
   biggest SMB web-dev market; booking + trust + local SEO patterns.
2. **E-commerce / online store** (flower shop, product brands) — cart/checkout/PDP/collection patterns.
3. **Restaurant / food / hospitality** — menu, reservation, ordering.
4. **Professional services** (law, accounting, medical/dental, real estate) — credibility + lead capture.

**Tier 2 — high-value / higher-ticket:**
5. **SaaS / app** — landing + pricing + dashboard (recurring-revenue clients).
6. **Creative / portfolio / agency** — visual-forward, the "beautiful sites" showcase tier.
7. **Finance / fintech** (stock-market, crypto, banking, investing) — data-dense, trust-critical.
8. **Booking / appointment / marketplace** — two-sided, scheduling.

**Tier 3 — universal building blocks (cut across all of the above):**
9. **Marketing / landing / conversion** (hero, value prop, social proof, CTA) — every site needs it.
10. **Onboarding / auth / account** · **community / membership / education** · **checkout / payments**.

Each category → search the most popular/proven flows + sections, audit the reusable feature & UX patterns,
promote the strongest into the brain as portable, brand-agnostic principles.

---

## ⚠ COURSE CORRECTION (Sean, 2026-07-21): EXHAUST FITNESS FIRST — do NOT advance to Part C until dry
The first sweep did ~1 search per domain — that is NOT "all the fitness ideas." Top apps have many more
patterns per domain, and whole sub-domains were never touched. **New rule: stay in fitness, run 3-5 angles per
domain, and only mark a domain DONE when a fresh search returns mostly apps/patterns already logged (novelty
dry). Part C is PAUSED until this backlog is exhausted.**

### FITNESS DEEP-DIVE BACKLOG (exhaustive — work top to bottom, multiple searches each)

**A. Go DEEPER on the 12 domains already skimmed (more angles each):**
- AI coaching: real-time form feedback · adaptive plan adjustment · AI chat Q&A · voice coaching mid-workout
- Nutrition: recipe/meal-plan generation · water/hydration · macro goal setup · restaurant/eating-out · fasting
- Wearables: live HR zones mid-workout · ring/whoop-style recovery · GPS route map · Apple Fitness rings
- Social/challenges: challenge creation detail · leaderboard filters · clubs/teams · activity feed w/ kudos
- Analytics: 1RM/strength standards · volume/tonnage trends · body measurements · progress photos · e1RM charts
- Habits: streak-freeze/recovery · reminder scheduling depth · calendar heatmap · goal setting
- Scheduling: class booking + waitlist · recurring sessions · trainer availability · cancellation policy
- Payments: package/credits · family/team plans · gifting · win-back/discount offers · manage/cancel
- Exercise library: exercise detail + video + tips · alternatives/swaps · custom exercise builder · filters
- Programming: workout builder (sets/supersets) · periodization/mesocycle · plan calendar · deload
- Community/messaging: coach DM depth · group feed · comments/reactions · direct messaging · notifications
- Onboarding: goal quiz depth · equipment/experience · body stats · plan preview · paywall placement

**B. Fitness sub-domains NEVER swept (each needs its own passes):**
- Live / streaming classes + on-demand video class player (controls, leaderboard overlay, cast)
- Form analysis / AI camera / rep counting / movement/pose analysis
- Injury / rehab / physical therapy / mobility protocols / pain tracking
- Women's health: cycle tracking · pregnancy/postnatal fitness · symptom logging
- Running / cardio: GPS tracking · pace/splits · intervals · race training plans · route discovery
- Group / studio classes: class schedule · book/waitlist · check-in · spot selection
- Coach/trainer marketplace: find-a-trainer · trainer profile · reviews · match/hire
- Gamification DEPTH: badges/achievements gallery · XP/levels economy · quests · rewards store · avatars
- In-workout execution UI: rest timer · interval/EMOM/AMRAP timer · set logging mid-set · superset flow · plate calc
- Body: progress photos + before/after · body measurements · body-fat/composition · weight trend
- Warm-up / cooldown / stretching / recovery routines · foam rolling
- Meditation / breathwork / mindfulness · sleep coaching
- Steps / daily activity / move rings · standing/breaks
- Music / Spotify integration during workout
- Referral / invite growth loops · share-to-social
- Notifications / re-engagement / win-back / streak-at-risk
- Settings / profile / account / privacy / data export
- Equipment & environment: home vs gym · equipment selection · gym check-in

Mark each line DONE in the doc as swept. Only when A + B are dry does the loop advance to Part C.

### Deep-dive: in-workout execution UI + form/camera + live class + running/GPS (pass 16) ✅ 4 backlog-B lines DONE
- **In-workout player** [Tempo]: **phone-positioning setup** (portrait, ✓/✗ examples — for camera-based rep
  tracking via their Core) → TV/AirPlay cast prompt → player w/ **"Up next: DB Chest Press" + timer ring (1:17)
  + "Change weight 7.5 lbs · Adjust weight" slider mid-set**. → *SwanStudios gap: a real guided in-workout
  execution screen (up-next, timer, mid-set weight adjust, cast), not just a static log form.*
- **Live metrics overlay + broadcast-on-camera** [WHOOP Live / Fitbit]: live Activity Strain ring + HR + zone
  bar + calories DURING activity; **selfie-camera overlay w/ HR/strain/calories floating on video** (WHOOP);
  class player w/ cast/airplay + scrubber + **"Real Time Metrics" toggle** overlaying live HR on the class
  video (Fitbit). → *Gap: live in-session metrics + a shareable metrics-on-camera mode.*
- **Live/upcoming classes** [Peloton]: "Live and Upcoming" card ("2:00 PM ENCORE · 30 min Low Impact Ride ·
  Ben Alldis · 27:05 elapsed · JOIN CLASS"). → *Gap: scheduled/live class discovery + join.*
- **Running/GPS tracking** [Peloton/Fitbit/Runbuds]: live route map + Running timer + **Audio Cues** toggle;
  post-run pace/speed/elevation charts; **pace-colored route map (Low/High/Avg pace legend)** [Fitbit]; run
  history w/ route thumbnails + pace/distance; **"race a track" social running** [Runbuds]. → *Gap: outdoor
  GPS cardio tracking w/ audio cues + pace-map + run history (SwanStudios is strength-first; cardio is a hole).*
- Backlog-B DONE: form-analysis/in-workout-UI · live/streaming class player · running/cardio GPS. (rep-counting
  AI-vision: only Tempo's camera-device context surfaced — flagged, not a standalone pattern yet.)

### Deep-dive: studio class booking + coach marketplace + gamification depth (pass 17) ✅ 3 backlog-B lines DONE
- **Studio class booking w/ policies** [Open]: daily schedule (time · MOVE/BREATHE type · duration · instructor
  photo) → class detail (about · location+map · **CANCELLATION POLICY · WAITLIST POLICY · safety note**) → add
  phone + **waiver checkbox** → party size (self + Guest $32) → Checkout → **Confirmed + Add to cal + Manage**.
  → *SwanStudios gap: in-person/group class scheduling w/ waitlist + cancellation policy + waiver + guest booking.*
- **Coach marketplace / find-a-trainer** [Future/Tonal]: recommended coaches carousel w/ **"TOP RECOMMENDATION"
  + credential bio ("Master Trainer, 15,000+ sessions")** → coach profile (**Specialties · About · personality
  descriptor "High-Energy and Engaging"** · their programs/workouts) → **"Train with X"** → checkout ("$50 first
  month, $199/mo, 30-day risk-free"). → *Gap: browsable trainer marketplace w/ profiles, specialties, credentials,
  hire/subscribe. Reusable for ANY provider-marketplace client site.*
- **Gamification DEPTH** [Duolingo/Withings/Alan]: overview (Day streak · Total XP · League · Top-3 finishes) →
  **Achievements gallery** = Personal Records + Awards w/ **tiered progress ("Word Collector 2 of 10", "XP
  Olympian 4 of 10")** + **locked/greyed future badges w/ target ("Nice day 6,000 steps 🔒")** + **badge unlock
  celebration w/ confetti + Share** + **rewards SHOP ("A Fire Look · won 1 time · Explore the shop")**. → *Gap:
  a full achievements gallery (earned + locked-with-target), tiered multi-level badges, unlock celebration+share,
  and a cosmetic rewards shop — extends SwanStudios' existing XP/levels into a real progression economy.*
- Backlog-B DONE: group/studio class booking · coach/trainer marketplace · gamification depth. (Withings/Alan
  step-badges overlap steps/activity — that line partially covered too.)

### Deep-dive: women's health + progress photos/measurements + injury/rehab (pass 18) ✅ 3 backlog-B lines DONE
- **Cycle/women's-health tracking** [Clue/Fitbit/Apple Health]: **period-prediction calendar** ("likely to start
  ~Oct 13", next cycle too) + cycle history + **fertile window** + rich day log (flow intensity Spotting/Light/
  Medium/Heavy · symptoms Cramps/Headache/Bloated/Acne/Hot-flashes · mood · **pain + cramps intensity** · sleep
  quality · collection method · daily note · custom tags) + Trends. → *SwanStudios gap: entire women's-health
  domain — could feed training readiness (train-around-cycle is a real coaching edge). Note Swan rule 9 language.*
- **Progress photos + body measurements** [Hevy/MacroFactor]: Log Measurements (date · **progress picture** ·
  body weight · waist · body-fat% · neck · shoulder · chest · bicep…) → Measurements chart w/ metric-toggle +
  progress-picture thumbnails + weight history w/ photo icons; **MacroFactor gallery = Front/Side dated
  side-by-side comparison + trend vs scale weight + measurements + visual body-fat %**. → *SwanStudios has
  BodyMeasurement backing; gap is progress-PHOTO capture + front/side before/after comparison gallery + visual
  body-fat estimate. High-motivation "proof" feature (ties to accepted CLM-43f6 proof + CLM-f54a trends).*
- **Injury/rehab/mobility** [Alan/pliability]: guided pain-relief **programs** ("Relieve your back pain, guided
  by a physio", Day 3/14, session exercises) + condition-filtered exercise library (Upper/Lower back/Neck,
  Stretching/Strengthening/Mobility, difficulty) + **diagnosis questionnaire** (describe pain · rate pain slider
  "ow/oww/owww" · when it worsens · injury/pregnancy context → physio follow-up) + **Mobility Score /100 on a
  BODY MAP** (per-region scores 55-85 on a silhouette) w/ retest snapshots. → *SwanStudios gap: injury/mobility
  assessment + guided rehab programs + a mobility-score body map (extends the readiness body-map idea; also a
  liability-aware coaching feature — keep programming trainer-gated).*
- Backlog-B DONE: women's health · progress photos/body measurements · injury/rehab/mobility.

### Deep-dive: stretching + breathwork + music (pass 19) ✅ 3 backlog-B lines DONE
- **Guided stretching/mobility routine** [pliability]: daily session (Upper Body 23m) → **pose list** (Reverse
  Wrist Stretch / Thread Flat Needle / Cross Body Twist / Puppy Dog) → **pose detail w/ step instructions** →
  **video player w/ "Mark as Complete"** + cast/scrub + captions; journey checklist. → *SwanStudios gap: guided
  timed stretching/mobility routines w/ a video player + per-pose instructions (rule-9-safe: "flexibility").*
- **Breathwork/recovery** [Headspace/WHOOP/Breathwrk]: **animated breath-pacer ring** (expanding/contracting
  w/ "sharp inhale through the nose" cues) + stress monitor → guided breathing (Increase Relaxation/Alertness) +
  **Breath Score /100 + streak + level + calendar**. → *SwanStudios: meditation is rule-9-limited; but BREATHWORK/
  recovery framing is in-bounds. Gap: a breath-pacer + recovery-session feature tied to readiness. Reusable
  calming-motion pattern (the pacer ring).*
- **Music integration** [Spotify-native]: mostly Spotify's own connect/playlist flows, not a fitness-app pattern —
  fitness apps just deep-link/connect Spotify. **One reusable signal:** Spotify shows **BPM per track** in
  recommendations (173/95/113 BPM) → useful for **workout-tempo playlists**. → *Low-priority for SwanStudios:
  "connect Spotify" + optional BPM-matched workout playlists; not a core build.* [domain ~dry]
- Backlog-B DONE: stretching/mobility · breathwork (meditation rule-9-scoped) · music integration.
  Section-B REMAINING: referral/invite loops · re-engagement/win-back notifications · settings/profile/privacy/
  data-export · (steps/activity rings — mostly covered via Withings/Fitbit badges). Then → Section-A deep angles.

### Deep-dive: referral + re-engagement + settings/privacy (pass 20) ✅ SECTION-B COMPLETE
- **Referral / invite growth loop** [Numo/WHOOP/NordVPN]: **tiered milestone rewards** (1 friend=free month, 3=6
  months, 10=lifetime) + **shareable codes/links w/ Copy + gift-free-trial codes** + "How it works" + **friends-
  joined progress list**. → *SwanStudios gap: a real referral growth engine (tiered rewards + gift codes +
  progress). Reusable for ANY client site. (Note: ties to the Marketing Command Center money-focus.)*
- **Re-engagement / retention** [Alma/Finch/Deepstash]: **vacation/pause mode** (pause streak w/o losing it) +
  **streak freezes** (earn/buy, auto-restore, up to 5) + **streak repair w/ forgiveness copy** ("It's okay to
  miss a day… Repair for 2,000 — 1st time FREE") + welcome-back. → *SwanStudios has streaks but not the
  forgiveness/freeze/vacation retention LAYER — this is the churn-reducer. Reusable retention pattern.*
- **Settings / privacy / data-export** [MacroFactor/Zalando/IMDb]: Account hub (Profile · Data&Privacy ·
  Subscription · Password · Integrations) + **Data & Privacy: "Delete Your Account and Data" + "Export Data →
  Generate Spreadsheet"** + **GDPR "Request your data" / "Delete your account" tabs** ("downloadable file… up to
  30 days"). → *SwanStudios gap (rule-8/PII relevant): self-serve data export + account deletion + privacy
  center. Compliance + trust surface. Reusable + required for client sites in the EU.*
- Backlog-B DONE: referral · re-engagement/win-back · settings/privacy/data-export. **✅ ALL SECTION-B DONE.**

---
## SECTION-A DEEP ANGLES (revisit the 12 original domains for sub-patterns; Part C still PAUSED)
_(loop now re-sweeps each original domain's deeper sub-angles, several searches each, skipping already-logged)_

### Deep-dive A: AI coaching (+ nutrition meal-plan gen) — pass 21
- **Data-grounded AI coaching chat** [Bevel]: "Ask Bevel anything" from a quick-action grid → chat "How do I
  improve my VO2 Max?" → **AI response that REFERENCES the user's actual metrics** ("Since your Cardio Load is
  Overtraining after yesterday's workout, focus on recovery…", cites Strain/Recovery/Sleep). → *SwanStudios
  Swan Coach gap: ground AI answers in the user's real logged data/readiness, not generic advice — the single
  biggest AI-coaching upgrade.*
- **Quick-prompt chips + rating + follow-up + disclaimer** [Alma]: Track/Ask toggle → tappable prompt ("What
  should I focus on tomorrow?") → personalized answer (references stated food preferences) → **"Was Alma
  helpful?" 👍/👎 + "Ask a follow-up" + "not a medical professional, may make mistakes" disclaimer**. → *Gap:
  quick-prompt starters + helpfulness rating (trains quality) + honest AI disclaimer (Swan Coach branding rules
  apply — never call it "AI" user-facing per Swan feedback).*
- **AI meal-plan generation** [DeepSeek]: "Create a 7-day healthy meal plan" → structured day-by-day plan
  (Breakfast/Lunch/Dinner/Snack) w/ voice input. → *Covers nutrition sub-angle: AI recipe/meal-plan generation.
  Gap: generate a plan on request.*
- DEEP-DRY note: AI-coaching chat is well-covered (Alma/Bevel/DeepSeek). Nutrition meal-plan-gen partially
  covered here (revisit only for macro-goal-setup / eating-out if a later pass wants it).

### Deep-dive A: analytics (per-exercise 1RM/strength standards) + challenge creation — pass 22
- **Per-exercise strength analytics** [Hevy/Tonal]: Exercise detail → **Summary tab** w/ a metric chart that
  toggles **Heaviest Weight / One Rep Max / Best Set** over Week/Year, plus **Best 1RM (e1RM) + Strength Level
  bar (Beginner→Intermediate→Advanced→Elite) + "you are stronger than 48% of male lifters your age and
  bodyweight"** + **Set Records table (Personal Best per rep count: 3→100kg, 5→95kg, 8→75kg, 10→20kg)** + Best
  Session Volume. History tab marks each set with a **🏆 1RM / Weight PR badge**. Tonal splits it further into
  **Strength / Power / Volume tabs** per movement (Volume PR since date, per-set lbs·reps·total). → *SwanStudios
  analytics gap: per-exercise progress charts w/ selectable metric (heaviest / e1RM / best set), an estimated-1RM
  + strength-level percentile vs population, and per-rep-range PR records with inline PR badges on logged sets.
  This is the "progress proof" core-loop payoff — currently Swan charts are coarser than this per-exercise depth.*
- **Population strength-percentile** [Hevy]: the "stronger than X% of lifters your age & bodyweight" line is a
  motivation + benchmarking hook. → *Gap: normative benchmarking (needs a standards table; can seed from
  published strength-standard datasets — no PII, aggregate only). Reusable "you vs the field" pattern.*
- **Create-a-challenge flow** [Tempo/Strava]: Community tab → **"Create a challenge"** → pick **competition
  duration (7/14/30/45-day chips) + start-date calendar** → Create → **challenge detail w/ leaderboard (My place
  /3698 · Workouts completed), "Invite friends", View leaderboard, Delete challenge**. Strava adds **"Design Your
  Own Challenge — your game, your rules"** (paid) + a catalog of joinable challenges (10K, 180-min sweat, 100K
  steps, elevation) each w/ a **hex badge + date window + goal metric + sponsor/prize** ("earn your badge, unlock
  2 weeks, enter to win"). → *SwanStudios has group challenges but not the self-serve CREATE flow (duration +
  start-date + goal metric + invite + leaderboard) nor sponsor/prize framing. Gap: let trainers/admins spin up a
  branded challenge in ~4 taps; badge + date-window + goal-metric + prize. Reusable community-engagement engine.*
- DEEP-DRY note: analytics per-exercise depth now well-mapped (Hevy/Tonal). Challenge domain: creation flow +
  prize/badge framing captured; social feed/kudos already logged earlier — social/challenges domain ~dry.

### Deep-dive A: wearables (live HR zones · GPS route/splits · session summary) — pass 23
- **Live/aggregate HR-zone bars + customizable zones** [Strava/Gentler Streak/adidas]: "Training Zones" progress
  card → **per-zone horizontal bars w/ % time-in-zone (Z1–Z6) + bpm ranges + 7D/1M/3M/6M/YTD/1Y toggle + edit
  your zones**, plus HR-zone education (Zone 0 Easy → Zone 5 Performance, each w/ bpm threshold derived from max
  HR + a plain-English purpose) and a **drag-to-set anaerobic-threshold zone editor** (Red Line/Anaerobic/
  Aerobic/Fat Burning/Easy). → *SwanStudios gap: for conditioning/HIIT/cardio sessions, a zone-time breakdown +
  editable personal HR zones + zone education. Reusable "time-in-zone bars" pattern for any intensity metric.*
- **GPS activity summary (route + stats grid + segment PRs on map)** [Strava/Runna]: run/ride detail =
  **route map w/ inline PR markers ("Fastest 1K — Lifetime" pinned on the path)** → stat grid (Distance · Avg
  Pace · Moving Time · Elevation Gain · Calories · Max Elevation) → **weather at activity time** (temp/humidity/
  wind) → **Best Efforts / Segments / Achievements counts w/ 🏅 "New best of all-time" PR badges** → **Pace
  Analysis + Grade-Adjusted-Pace + Cadence (avg/max spm) + Elevation profile chart + Pace-Zones %**. → *Mostly
  cardio/GPS-specific = LOWER priority for a strength-first app; not a core Swan build. Keep as optional if Swan
  adds run/walk cardio logging.*
- **Per-interval splits table w/ delta coloring** [Runna/Strava]: **Splits list (per km/mile: pace + ± delta vs
  average, green=faster / red=slower) + a laps bar-chart**. → *REUSABLE beyond cardio: the same per-interval /
  per-set delta-vs-target coloring applies to strength (e.g. each set vs last session, green=PR/red=regression).
  Gap: color-coded per-set delta feedback in the workout log = fast "am I improving?" read.*
- DEEP-DRY note: wearables mapped. High-value reusable takeaways = **time-in-zone bars** + **per-interval delta
  coloring** + **PR/best-effort badges on logged efforts**. Pure GPS/route/elevation = deprioritized (Swan is
  strength/trainer-led, not a running tracker). Sleep-stage/HRV readiness cards already covered under recovery.
  **Wearables domain → DEEP-DRY.**

### Deep-dive A: onboarding (quiz funnel · physical assessment · plan reveal · paywall) — pass 24
- **In-onboarding PHYSICAL self-assessment** [Equinox+]: "1/4 Physical Assessment — Let's see if you can sit/
  stand without using your hands" (video demo → "I used both hands / one hand / no hands" → core-strength
  baseline). → *SwanStudios gap + brand fit: a trainer-led movement/strength self-assessment DURING onboarding
  (assess before prescribing) — turns a generic quiz into a real baseline. Rule-9-safe, liability-aware (keep
  prescription trainer-gated). Reusable "assess → prescribe" pattern; strongest onboarding takeaway.*
- **Personalized-plan-preview reveal + "Help Me Pick"** [Equinox+/Centr]: multi-select goals (up to 5, "1/7"
  progress) → **program recommendation list w/ "Help Me Pick" fallback** → **"Your Program: Equinox Destress —
  complete all 3 required sessions every week for 4 weeks… Enroll now"** reveal. Centr: "You're steps away from
  your personal plan" (Step 4/8) → plan reveal on Home ("Power Shred at Home: Intermediate, 0/84"). → *Gap: end
  onboarding with a concrete "we built THIS plan for you → start" reveal, not a bare dashboard drop. Trainer can
  be the curator ("your coach picked this"). Ties to Product Core Loop next-best-action.*
- **Commitment/confidence pre-commit + insight reveal** [Life Reset]: **1–10 confidence slider** ("How confident
  are you that you can stick with a daily routine for 7 days? Be honest — no wrong answer") + **mid-onboarding
  social proof** ("Real story from our users — Zac, 19") + **"We see you" synthesized-insight screen** ("You're
  carrying more mental weight than you let on… Based on your answers…"). → *Gap: behavioral pre-commitment
  (confidence slider) + a synthesized "here's what your answers tell us" reveal makes onboarding feel personal &
  raises follow-through. Reusable engagement pattern for ANY client site funnel.*
- **Trial-timeline-transparent paywall + free-vs-pro table** [Centr/Any Distance/Equinox+]: **Centr plan-select
  w/ Today → Day 5 (reminder trial ends) → Day 7 (subscription starts, cancel anytime) timeline** + annual-vs-
  monthly w/ **"15% discount applied"** + **pay with FSA/HSA**. Any Distance: **Free vs Pro feature-comparison
  table** (checkmark grid: Activity Tracking / Detailed Stats / Integration / Unlimited Goals / Live Activity /
  3D Routes). Equinox+: "Our first 7 days are free" → $39.99/mo w/ full T&C + password-strength checklist. →
  *SwanStudios gap (Marketing/money): a transparent trial-timeline paywall (no-surprise-charge = fewer refund
  disputes + trust) + a Free-vs-Guardian-vs-Crystalline comparison table at the tier-select surface + FSA/HSA
  eligibility (legit for a health/training business). Directly serves the Marketing Command Center focus.*
- DEEP-DRY note: onboarding funnels well-mapped (Equinox+/Centr/Life Reset/Any Distance/pliability). Highest-
  value takeaways = **in-onboarding physical assessment** (brand-fit), **plan-preview reveal**, **transparent
  trial-timeline paywall + comparison table**. **Onboarding domain → DEEP-DRY.**

### Deep-dive A: programs / plan-builder (multi-week structure + trainer authoring) — pass 25
- **Multi-week program structure + progress** [Equinox+/pliability]: program detail w/ **Start→End dates + "Week
  1 of 4" + a Breakdown modal (per-week sessions-complete + achievement ring per week)** → **Required Sessions
  list each "Recommended for Fri Jun 13" + "Add to Cal"** → program-overview progress bar (Weeks Completed 1/2,
  days/week, focus areas, "pose preference") + **"Proceed to Next Week" / "Skip to Week X"**. → *SwanStudios gap:
  a real multi-week program spine (week grid + per-week completion rings + dated "next session" + add-to-calendar)
  on the CLIENT side — client reads progress & does the session; the WEEK STRUCTURE itself is trainer-authored.
  Ties Product Core Loop next-best-action ("your next session is Resistance Day A, recommended Friday").*
- **Structured plan-builder / set-scheme authoring** [MyFitnessPal/Bevel]: **"My Routines" library** (Core Plus,
  Kettlebell 30 — each w/ Total Volume · Est Duration · Est Calories) → **Build Routine**: per-exercise "Add
  Instructions" + **set rows (weight kg × reps, OR hh:mm:ss for timed holds) + "Add Set" + "Add Exercise"** w/ a
  **live Planned-Volume / Est-Duration / Est-Calories rollup**. Bevel adds **Superset linking + drag-reorder
  handle + remove(−)** per exercise. → *SwanStudios trainer-indispensability gap: the TRAINER's authoring surface
  — structured sets (reps/weight/time), supersets, reorder, reusable template library (build once → assign many),
  live volume/duration estimate. Clients read+do; the trainer builds/edits planData & decides. This is the coach-
  workflow depth that makes Swan a trainer OS, not a generic logger.*
- **Equipment/goal-aware template GENERATION (AI-drafts, human-curates)** [Bevel]: "Generate template" → **equipment
  available (barbell/bodyweight/cable/dumbbell, each w/ plate config "Edit") → training goal (get stronger/build
  muscle/body comp/lose weight) → muscle-group focus (full-body or per-group checkboxes) → generated workout w/
  sets/reps + superset + "report an issue"**. → *Gap (must respect trainer-indispensability): Swan Coach can
  DRAFT an equipment/goal-aware plan, but the TRAINER curates/approves before it becomes a client's active plan —
  never client-auto-prescribe. Reusable "AI drafts → coach approves" pattern. Also: equipment-availability +
  goal + muscle-focus as the plan-gen inputs.*
- DEEP-DRY note: plan-builder well-mapped (MyFitnessPal/Bevel authoring + Equinox+/pliability multi-week spine).
  Highest-value = **trainer set-scheme builder w/ supersets + reusable template library** (trainer OS depth) and
  **multi-week program spine w/ dated next-session** (client core-loop). **Programs/plan-builder domain → DEEP-DRY.**

### Deep-dive A: scheduling / booking (session booking · reschedule · waitlist) — pass 26
- **Provider-booking flow = the trainer-session-booking blueprint** [Zocdoc]: provider profile w/ **multi-
  dimension ratings (Overall / Bedside manner / Wait time — for a trainer: Coaching / Punctuality / Results) +
  reviews + locations + in-network badge** → "Book an appointment" (I'm-a-new-client toggle + location select) →
  **available time-slot grid per day (Tomorrow: 8:15/8:30/8:45/9:00… + "View more availability")** w/ week nav
  and **explicit "No availability" days** → Review & book (client select self/someone-else, visit reason, notes)
  → **booked confirmation → Add to calendar + "Prepare for appointment" + cross-sell "book another"** → upcoming-
  visit detail w/ **Call / Get Directions / Modify Visit + Appointment Checklist**. → *SwanStudios gap: a real
  "book your trainer/session" surface — trainer profile + multi-dim rating + a true available-slot grid (not just
  a bare calendar) + confirmation w/ prep + add-to-cal. This is the acquisition/booking money-path the current
  basic calendar doesn't cover.*
- **Reschedule + waitlist** [Zocdoc]: dedicated **"Changing an appointment date"** reschedule flow (re-pick slot,
  confirm) + **"No upcoming availability → Notify me"** (waitlist-lite). → *SwanStudios gap: reschedule/cancel
  WITH A POLICY WINDOW tied to session credits (late-cancel forfeits a credit; inside-window refunds it) + a
  "notify me when a slot opens" waitlist. Policy-window logic is Swan-specific (protects trainer time + revenue).*
- **Self-schedule / add-to-calendar** [Peloton/Equinox+/Tonal — already largely covered]: schedule a class →
  **"You are counted in" + INVITE + "Starting in 5 days" + Add to Calendar (Google/iCal picker)** + "Start class
  now"; weekly schedule strip w/ per-day classes + swap(⇄) affordance. → *Already-logged pattern (calendar strip
  + add-to-cal); the NEW value above is real provider-style booking + reschedule policy, not self-scheduling.*
- DEEP-DRY note: scheduling mapped. Highest-value NEW takeaways = **Zocdoc-style trainer-session booking (slot
  grid + multi-dim rating + confirmation/prep)** and **reschedule/cancel w/ a credit-aware policy window +
  waitlist**. Self-schedule/add-to-cal was already covered. **Scheduling/booking domain → DEEP-DRY.**

### Deep-dive A: gamification / XP (quests · leagues · loot · companion) — pass 27 · RPG-V2 goldmine
- **Companion/avatar-evolution RPG loop** [Finch]: a **pet that evolves via consistency** ("Evolve Lee to a
  Toddler — Go on 7 adventures 0/7") powered by an **energy bar earned from completing goals** ("1st Adventure
  0/15") → **daily goals each grant XP (5⚡) w/ checkmarks** → **Special Quests w/ progress bars + "Hint"**
  ("Obtain your first clothing", "Become Play Palz — reach 2 Friendship Points"). → *SwanStudios gamification-V2
  RPG gap: an EVOLVING companion/avatar (ties to the Avatar Mirror vision) whose growth is driven by REAL
  training consistency — energy/XP earned from logged workouts feeds avatar evolution + unlockable milestones.
  Strongest reusable RPG spine seen.*
- **Daily-quest engine w/ refresh timer** [Finch/Duolingo]: **"Daily Quests" w/ a countdown (20h 11m) + refresh**
  — completed (strikethrough ✓), in-progress (0/1), plus **Friends Quest ("Complete 15 lessons")** and **Friends
  Clash ("Win 3 clashes 0/3" → chest reward)** weekly PvP. → *Gap: a daily-mission layer beyond flat streaks
  (refreshing quests worth XP) + friendly weekly PvP w/ a reward chest. Reusable engagement engine.*
- **Weekly-reset LEAGUE ladder + promotion celebration** [Duolingo/Brilliant]: tiered leagues (Bronze→Silver→
  Sapphire→…) w/ a **ranked weekly leaderboard (XP, 1-DAY timer), promotion/demotion zones (top ranks get
  medals), "+720 XP" boost tiles** → **"You moved up to the Silver League!" trophy-burst celebration**; Brilliant
  "Leagues unlocked! qualified for Hydrogen League — 4 days left". → *SwanStudios V2 gap: a weekly-reset
  competitive league keyed to training volume/XP, with a promotion celebration as a signature reward beat.
  Directly serves the RPG-progression vision; the celebration moment is a reusable "level-up" pattern.*
- **Loot-box / surprise-reward + skill-tree journey** [Ahead/Duolingo]: **"Unlock a treasure! Tap a box to make
  it yours" (3 chests → pick one → reward reveal)** = variable-reward dopamine; **skill-tree "Journey" path
  (numbered nodes → chest → egg/reward node → level, mascot guide, % progress)** as a visual journey vs a flat
  list; **"Lesson complete! Lifetime XP 70" burst** on finish. → *Gap: a pick-a-chest surprise-reward moment
  (could gate cosmetics/content unlocks) + a visual TRAINING-JOURNEY PATH (node map) instead of a flat program
  list + a lifetime-XP number. All reusable RPG patterns for V2.*
- DEEP-DRY note: gamification is a V2 goldmine — mapped companion-evolution, daily-quest engine, weekly leagues +
  promotion celebration, loot-box, skill-tree journey, lifetime XP. Basic streaks/badge-grid/level-up-fireworks
  already shipped. Highest V2 value = **consistency-driven avatar evolution** + **weekly league ladder** +
  **daily-quest engine**. **Gamification/XP domain → DEEP-DRY.** (Cross-ref: gamification-V2 RPG vision memory.)

### Deep-dive A: recovery / readiness (contributor breakdown · muscle-readiness map · train-today) — pass 28
- **Readiness score w/ CONTRIBUTOR BREAKDOWN + plain-English interpretation** [Oura/Ultrahuman/Fitbit]: Oura
  "Readiness 90 Optimal — Rise and shine" → **per-factor contributor list w/ status (Recovery index: Pay
  attention · Sleep: Fair · Sleep balance: Fair · Sleep regularity: Good · Previous-day activity: Good · Activity
  balance: Good)** + lowest HR / avg HRV. Ultrahuman "Dynamic Recovery 87" → **Contributors (Stress Rhythm Score
  78 Good, Reference Optimal Range) + HRV Interpretation ("Improving recovery trend… adaptation to training is
  improving, keep pushing")**. Fitbit "Daily Readiness 1–100 = how ready to work out". → *SwanStudios gap: Swan
  has a basic readiness score; the gap is the ITEMIZED "what raised/lowered it" contributor breakdown + a plain-
  English coach-voice interpretation. Higher-trust than a bare number. (Wearable-fed = enrichment, not source of
  truth; keep trainer-gated.)*
- **Muscle-group READINESS BODY MAP (strength-native!)** [Tonal]: **front/back body silhouette w/ per-muscle-group
  color coding from recent training volume** → **FRESH (green — "ready for high-volume workout": chest/shoulders/
  triceps/abs/quads/glutes/hamstrings/calves) · RECOVERING (amber — "ready for moderate volume": biceps) ·
  FATIGUED (red — "ready for active-recovery only")** → "Explore Workouts"; paired w/ a Strength Score dashboard
  (Upper/Core/Lower). → *STRONGEST recovery gap for a strength-first app: a muscle-readiness body map driven by
  REAL logged volume tells client + trainer which muscles are ready for high vs moderate load vs rest. Better fit
  than pure HRV; complements the mobility-score body map already logged. Excellent trainer-coaching surface —
  trainer still decides the session.*
- **Strain-vs-recovery gauge → rest / active-recovery recommendation** [Gentler Streak]: **a load gauge (green
  safe zone → red overreaching w/ ⚠) → "Today calls for a rest day" w/ Rest / Active-Recovery recommendation
  chips** (Rest = "full permission to rest"; Active Recovery = light walk / easy bike / light activity to aid
  recovery) → "Today I Choose Rest". → *Gap: a strain/recovery balance gauge that surfaces a "should I train
  hard today?" recommendation (Rest vs Active Recovery vs Go). Feeds Swan Coach — but TRAINER-GATED (it informs,
  the coach decides load) and RULE-9-SAFE (frame as "light activity / stretching / walk", never yoga/meditation).*
- DEEP-DRY note: recovery/readiness mapped. Highest-value = **muscle-readiness body map** (strength-native, from
  logged volume) + **readiness contributor breakdown w/ interpretation** + **train-today rest/active-recovery
  recommendation**. Basic score / breath-pacer / sleep-stage cards already logged. All recovery guidance stays
  trainer-gated + rule-9-safe. **Recovery/readiness domain → DEEP-DRY.**

### Deep-dive A: video / classes (multi-tab detail · filters · collections · live layer) — pass 29
- **Multi-tab class detail (Music-with-save · Class Plan · Member Activity)** [Peloton]: class detail w/ tabs
  **Overview / Equipment / Music / Class Plan / Body Activity / Member Activity / More Info** → **Music tab = full
  track list w/ per-song ❤️ save**, **Member Activity = total-taken count (5,000+) + Difficulty (6.2/10) +
  "Popular With" hashtag tags (#hardCORE, #WorkingMomsOfPeloton)**, Overview = "You've taken this class ✓" +
  Subtitles + **Target Metrics** + Equipment + action row (add-to-stack / schedule / scenic / download /
  bookmark), **Class Plan = segment-by-segment breakdown**. → *SwanStudios video-library gap: richer on-demand
  class detail — a segment/Class-Plan breakdown, target metrics, difficulty + times-taken, and a music list. Ties
  the free-YouTube-funnel → member-playlist strategy (give the on-demand class real depth).*
- **Rich multi-facet class FILTER + result count** [Peloton/Apple Fitness+/Tempo]: **Filter Classes = type tabs +
  Bookmarked-only toggle + LENGTH grid (5/10/15/20/30/45/60/75/90 min) + MUSIC + DIFFICULTY (Beginner/Inter/
  Advanced multi-select) + Subtitles + Sort**, w/ a **live "SHOW N CLASSES" count** updating as filters apply.
  Apple Fitness+ adds **Trainer multi-select (avatars) + Music-genre + Equipment**, then shows **applied-filter
  chips w/ removable ×**. → *Gap: real multi-facet filtering (length + difficulty + trainer + equipment + saved-
  only) so the video library stays navigable as it grows; removable applied-filter chips + live result count are
  reusable filter UX for ANY catalog (also useful for the exercise-DB-736 + store).*
- **Collections / saved-playlists tab + bookmarks** [Peloton nav: Classes / Gym / **Collections** / Programs;
  Tempo per-result bookmark]: a **Collections tab** (curated playlists) + per-class **bookmark**. → *SwanStudios
  gap = the literal "member playlists" in the video strategy: trainer-curated Collections + user bookmarks turn
  the free funnel into a members-only library. Directly implements the video-library strategy memory.*
- **Live-class social layer** [Peloton]: in-class overlay w/ **live participant count (80 👤) + real-time member
  leaderboard (location + hashtags) + wave (✋) + now-playing track** + cast/chat/connect-devices + kcal. → *LOWER
  priority — Swan has no live studio; but if group/live sessions ever ship, this is the pattern. On-demand pieces
  (class plan, target metrics, music-with-save) are the reusable parts.*
- DEEP-DRY note: video/classes mapped. Highest-value = **multi-facet filter + result count**, **Collections/
  member-playlist tab + bookmarks** (the video-library strategy), and **multi-tab class detail (Class Plan +
  music + target metrics)**. Basic class detail + mark-complete already logged; global cohort leaderboard logged
  pass 3; live-studio layer deprioritized. **Video/classes domain → DEEP-DRY.**

### Deep-dive A: workout-logging (active-session UI — THE core loop) — pass 30
- **"PREVIOUS" column = inline last-time values while logging** [Hevy]: the Log-Workout screen shows **SET /
  PREVIOUS / KG / REPS columns**, where PREVIOUS surfaces what you did last time for THIS exercise, right beside
  today's entry. → *SwanStudios core-loop gap (workout-progress-first): showing last-session values inline is the
  single biggest progressive-overload UX — the client/trainer logs AGAINST last time without leaving the screen.
  Swan should surface previous set values in the logger. Highest-value finding of this domain.*
- **Live active-session mechanics** [Hevy/Ladder]: **per-exercise Rest Timer (OFF / "2min 30s") that auto-starts
  on set-complete → countdown overlay (02:29 w/ −15 / +15 / Skip)**; **warmup-set "W" row** distinct from working
  sets; **set-complete checkmark → row turns GREEN** + live header rollup (Duration / Volume / Sets); **inline
  per-set note** ("Knees felt a little wobbly on the way up"). Ladder adds an **Effort/%-RPE column w/ a dropdown
  (50/60/70/80/90/100/AMRAP)** + **per-exercise Notes + "View History"** + a live rep-counter. → *Gaps: auto-rest-
  timer w/ ±15/skip, warmup-set flag, RPE/%-effort + AMRAP autoregulation entry, inline session notes, green
  set-complete micro-feedback, live volume rollup. These are the table stakes Swan's logger should match.*
- **Finish → workout summary + save** [Hevy/Tonal]: Save Workout (Duration / Volume / Sets + **Add photo/video +
  "How did your workout go?" description + Visibility**) → optional feed post. Tonal summary = **per-set volume
  breakdown (Set 1 20lbs×23=460 · Set 2 30×21=706 · Total 1,939 lbs) + PEAKS/LIFETIME stats (max volume in a
  workout 4,299 · per week 6,613 · avg per workout 1,102) + Completed-Movements library (7 of 304, searchable)**.
  PR badges on sets already logged pass 22. → *Gap: a proper finish-summary (volume/duration/PRs hit) + save-with-
  photo/notes/visibility → feed. Ties directly to the completion-proof-card blueprint (the DORMANT
  PostWorkoutCelebration integration question) and the social core-loop.*
- **Dictation-first angle (Swan differentiator)** [none of these do it]: Hevy/Ladder require tapping each cell.
  Swan's edge = **dictate "squat 3×12 at 135, felt wobbly" → parse into these exact set rows + the inline note**.
  The Hevy/Ladder set-row structure (set · previous · weight · reps · RPE · note) IS the target data shape the
  dictation parser fills. → *Reaffirms the dictation-first logging bet: match this structured logger, but let
  voice populate it in one pass instead of many taps (least-clicks mandate).*
- **Known minor gap:** **plate calculator** (barbell plate math per side) — common in Hevy/strength apps, didn't
  surface strongly here; log as a small nice-to-have, not core.
- DEEP-DRY note: workout-logging (the core loop) mapped. Highest-value = **PREVIOUS/last-time column**, **auto-
  rest-timer + RPE/AMRAP + warmup-flag + inline notes**, **finish-summary + save-to-feed**, and the **dictation-
  first fill** of that structured row. Basic set-row logging + plan authoring already logged (pass 25).
  **Workout-logging domain → DEEP-DRY.**

### Deep-dive A: nutrition macro-setup (goal calc · macro split · hydration · adherence) — pass 31 · LAST section-A domain
- **Macro-GOAL setup: TDEE + goal-weight/rate → daily calorie & macro targets** [Bevel/Alma/MyFitnessPal]: Bevel
  **"Custom goal — TDEE 1,892 kcal (editable) → Calorie Goal + Macronutrient Goal (g/% toggle) + 'Balance macros
  to meet calorie goal'"**; Alma goal "Lose Weight −7kg by [date]" → macro bubbles (Protein/Carbs/Fat g) → "Hold
  to commit"; MFP rate-based plans ("High protein — gain 0.5kg/week, 3000 cal, 45/30/25"). → *SwanStudios
  nutrition-ecosystem gap (planned): the goal-SETUP spine — body data + goal + rate → computed daily calorie &
  macro targets. Keep prescriptions COACH-GATED (Swan Coach drafts, trainer approves; rule-9-safe "nutrition
  support / flexibility", never medical advice).*
- **Custom macro split (%/grams toggle + auto-balance) + preset diets + target/limit nutrients** [Alma/Bevel/MFP]:
  **Percentage↔Grams toggle** (Protein 30%/161g · Carbs 40%/214g · Fat 30%/71g) w/ −/+ steppers + "Total 100%" +
  "Use defaults"; **preset diet templates (Balanced / High-protein) w/ macro bubbles + coaching tips** ("include
  protein in all meals, prioritize lean protein"); Bevel **Target Nutrients (meet-or-exceed) vs Limit Nutrients
  (stay-near-or-below)** beyond the big-3. → *Gap: flexible macro-split editor + quick-start diet presets +
  target/limit micro-nutrient goals. The daily macro rings ("X left") were already logged (pass 1); the NEW value
  is the SETUP/calculation + preset + target/limit layer.*
- **Hydration tracking (body-data goal + tap-a-glass) + adherence report** [Me+/Yazio]: **"Hydration goal based
  on body data — 33oz" computed from gender/weight/activity/weather** (or custom) → animated water-level screen
  (500/3260ml) + tap-a-glass grid + "water from food" credit + streak → **History w/ Avg Daily Drinking, goal-vs-
  intake week chart, Key Indicators (Compliance days · glasses · weekly intake)**. → *Gap: body-data hydration
  goal + fast glass-tap logging + a COMPLIANCE-DAYS adherence report — the compliance metric is the coaching
  signal (trainer sees who's hitting targets). Reusable "goal → daily log → weekly adherence" pattern for any
  nutrition/habit metric.*
- DEEP-DRY note: nutrition macro-setup mapped. Highest-value = **TDEE/goal→macro-target calculation**, **%/grams
  macro-split editor + preset diets + target/limit nutrients**, **hydration goal + compliance-days adherence
  report**. AI photo meal-ID / barcode / multi-modal logging / meal-plan-gen already logged (pass 1 + pass 21).
  All dietary guidance stays coach-gated + rule-9-safe. **Nutrition macro-setup domain → DEEP-DRY.**

---
## ✅ SECTION A COMPLETE (2026-07-21) — all 12 fitness domains DEEP-DRY
The 12 original fitness domains have each been deep-swept for sub-patterns beyond the first-pass audit:
AI-coaching · analytics+challenges · wearables · onboarding · programs/plan-builder · scheduling/booking ·
gamification/XP · recovery/readiness · video/classes · workout-logging · nutrition-macro-setup (+ the earlier
section-B never-swept sub-domains). **Fitness (Parts B + section-A/B deep dives) is now exhausted per Sean's
"get ALL the fitness ideas first" directive.**

**Top cross-domain SwanStudios build candidates surfaced (for a later prioritization pass):**
1. **Workout logger: PREVIOUS/last-time column + auto-rest-timer + RPE/AMRAP + inline notes** — core-loop table stakes (pass 30).
2. **Muscle-readiness body map from logged volume** (strength-native readiness) (pass 28).
3. **Trainer plan-builder: set-scheme + supersets + reusable template library** (trainer-OS depth) (pass 25).
4. **Per-exercise analytics: e1RM + strength-level percentile + per-rep PR records** (progress proof) (pass 22).
5. **Gamification-V2: consistency-driven avatar evolution + weekly league ladder + daily-quest engine** (pass 27).
6. **Data-grounded Swan Coach** (answers cite the user's real logged data/readiness) (pass 21).
7. **Zocdoc-style trainer-session booking + reschedule-with-credit-policy** (money/acquisition path) (pass 26).
8. **Transparent trial-timeline paywall + Free-vs-tier comparison table + FSA/HSA** (Marketing money) (pass 24).
9. **Video Collections/member-playlists + multi-facet filter** (video-library strategy) (pass 29).
10. **Onboarding physical self-assessment → plan-preview reveal** (assess-before-prescribe) (pass 24).

**NEXT — Part C APPROVED by Sean (2026-07-21): "Start Part C — website archetypes."** Local-service / e-commerce
/ restaurant / professional-services covered (Tier-1). Tier-2: **SaaS DONE (pass 32)**; queued = portfolio ·
fintech · marketplace. Tier-3 = universal patterns. Loop resumed into Part C Tier-2.

## LOOP PROTOCOL
1. Pick the next uncovered cell (fitness feature domain first, then Tier 1→3 website types).
2. 3–5 Mobbin searches, most-popular-first, within 60/min; inspect real screens.
3. Append findings here (feature gaps) + log design-principle receipts to the design-brain engine where a
   pattern is reusable doctrine.
4. Stop the pass on a 429 (cooldown) or when the cell saturates (novelty dial). Check-in point for Sean.
5. Repeat until weekly volume or Sean pauses. Canon promotion (letters) stays human-gated; the audit doc does not.
