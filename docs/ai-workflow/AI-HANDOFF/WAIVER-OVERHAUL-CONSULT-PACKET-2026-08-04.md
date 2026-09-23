# Consult Packet — SwanStudios Waiver System Overhaul (2026-08-04)

You are reviewing the liability-waiver system of SwanStudios, a production personal-training SaaS (React 18 + styled-components frontend, Node/Express/Sequelize/PostgreSQL backend). The public page at `/waiver` lets clients (or guests via QR code) sign a liability waiver + consent set before training. An admin dashboard manages records, identity matching, and revocation. This packet is self-contained; no repo access is assumed. No PII is included — all quoted text is the public legal copy and UI strings.

**Your deliverable:** critique and improve (1) the WORDING — legal copy + all UI microcopy, (2) the UX/UI design, (3) the flow logic and feature set. Concrete rewrites and concrete layouts beat abstract advice. The house design system is "Crystalline Swan": dark-first, glassmorphism cards, Midnight Sapphire `#002060` / Ice Wing `#60C0F0` / Wing Purple `#8B5CF6` / Gilded Fern gold `#C6A84B` accents, Plus Jakarta Sans headings, 44px touch targets, WCAG 4.5:1, prefers-reduced-motion respected. The business voice: premium boutique training studio ("26+ years experience"), trainer-led, trust-first. House rule: the coach AI is branded "Swan Coach"; avoid leading with the bare word "AI" in user-facing surfaces where honesty permits.

---

## 1. Current signer flow (as built)

One long glass-card page: hero video + typewriter title "Activity Waiver & Release" → "1. Select Activities" (checkboxes: "Home Gym PT", "Park Training", "Swimming Lessons") → "2. Read the Waiver" (400px scrollable box, appears only after an activity is picked) → "3. Your Information" (Full Name, DOB, Email, Phone — one of email/phone required) → "4. Guardian (if applicable)" (self-declared checkbox → guardian name + TYPED signature) → "5. Consent" (3 checkboxes) → "6. Signature" (draw-on-canvas) → "Submit Waiver" button → success card: "Waiver Submitted / Thank you! Your waiver has been submitted successfully. / Confirmation ID: {n}" + "Create an Account" link.

Consent checkbox labels (verbatim):
- "**I accept the liability waiver** and acknowledge the risks described above. *" (required)
- "I consent to AI-powered features and personalized workout recommendations." (optional)
- "I consent to photos/videos being taken during sessions for promotional purposes." (optional)

Backend: `GET /api/public/waivers/versions/current` returns the active document set (core + AI notice + one addendum per chosen activity), server-sanitized HTML. `POST /submit` (rate-limited 10/15min, optional auth) validates strictly, stores the record + verbatim text snapshots as legal evidence + consent flags, and runs identity matching (email+DOB conf 0.9 / phone+DOB conf 0.85, never name-only) producing an admin review queue. Logged-in clients link immediately; a route gate redirects unsigned clients from dashboards to `/waiver?returnUrl=…`. Versions have `effectiveAt`/`retiredAt`/`requiresReconsent` and an eligibility service drives forced re-consent.

## 2. Current legal wording v1.0 (complete)

### Core: "General Liability Waiver & Release of Claims" ("Effective Date: February 2026")
1. **Assumption of Risk** — "I understand that physical exercise involves inherent risks, including but not limited to: muscle strains, sprains, fractures, cardiovascular events, and other injuries. I voluntarily assume all risks associated with participation in personal training sessions, group classes, and any other fitness activities offered by SwanStudios."
2. **Release of Liability** — "In consideration of being permitted to participate in SwanStudios fitness programs, I hereby release, waive, and discharge SwanStudios, its owners, trainers, employees, and agents from any and all liability, claims, demands, or causes of action arising out of or related to any loss, damage, or injury sustained during my participation."
3. **Medical Clearance** — "I affirm that I am physically fit and have no medical condition that would prevent my safe participation… I agree to inform my trainer of any changes to my health status… SwanStudios recommends consulting a physician before beginning any exercise program."
4. **Emergency Medical Treatment** — "I authorize SwanStudios staff to seek emergency medical treatment on my behalf if needed… and I accept financial responsibility for any such treatment."
5. **Personal Property** — "…not responsible for the loss or damage of personal property brought to training locations."
6. **Governing Law** — "This waiver shall be governed by the laws of the State of California. If any provision is found to be unenforceable, the remaining provisions shall remain in full force and effect."
Closing: "By signing below, I acknowledge that I have read and understand this waiver and voluntarily agree to its terms."

### "AI-Powered Features Notice & Consent"
About: personalized workout plan generation, long-horizon planning, recommendations, analytics. Data: "your fitness data (workout history, goals, preferences, and progress metrics) may be processed by AI models… never sold to third parties…" Opt-in/out: "optional… enable or disable at any time through account settings. Declining AI features will not affect your access to core training services." Closing: "AI-generated recommendations are supplementary and do not replace professional medical or fitness advice."

### Activity addenda (summaries; full text similar in tone)
- **Home Gym PT:** signer responsible for safe/clean home area; home equipment differs from commercial; disclose pets/household factors; ventilation/lighting/space; studio not liable for defective home equipment or hazards outside trainer's control.
- **Park & Outdoor:** terrain/weather/sun/insects/third-party risks; weather rescheduling policy; public-space awareness.
- **Swimming Lessons:** drowning risk, wet-deck slips, chemicals, waterborne infection, cramps; honest ability disclosure; pool rules; health conditions disclosure (ear infections, open wounds, chlorine allergy).

## 3. Known wording weaknesses (our audit — challenge or extend)

- No express release of **negligence** claims (California enforceability requires clear, explicit negligence language; §1668 bars releasing gross negligence — the text should release ordinary negligence explicitly and not overreach).
- **No minor/guardian clause in any document** — yet the UI has a guardian flow, and the swimming addendum is used for children's lessons.
- The media/photo consent **checkbox references no document at all** — there is no media-release text anywhere.
- No indemnification/hold-harmless, no venue/county, no arbitration decision, no e-signature (E-SIGN/UETA) consent clause, no communicable-disease clause, no term/revocation language.
- Hardcoded "Effective Date: February 2026" inside the text (versions carry `effectiveAt` — the date should render from data).
- Brand drift: page says "AI-powered features", admin UI calls the same flag "Swan Coach Consent", spec draft says "AI-Assisted Coaching Notice." One voice needed.
- Microcopy is form-spec generic: bare-ordinal headings ("3. Your Information"), default success string, "please contact staff" with no contact info, "+1 (555) 123-4567" placeholder, enum-speak activity labels ("Home Gym PT").
- All new legal text ships DRAFT pending attorney review (non-negotiable gate); your job is the best possible draft + UX, not final legal advice.

## 4. Known UX/logic defects (ranked; challenge or extend)

1. Signature canvas has **no keyboard/assistive path** (bare `<canvas>`, no type-to-sign) — required field, so the page is unusable for keyboard/motor-impaired users.
2. If the versions fetch fails: form renders, submit is disabled forever, **no error shown anywhere** (silent dead-end).
3. No scroll-to-accept or read attestation; the required checkbox says "risks described above" even when the text section isn't rendered.
4. DOB is collected but **never evaluated** — a 14-year-old can sign alone; guardian is a self-declared checkbox; when used, the guardian TYPES while the minor DRAWS the binding signature.
5. The dashboard gate redirects with `returnUrl` — the page never reads it; logged-in signers get hardcoded `/user-dashboard` or even a "Create an Account" button.
6. Six admin actions (approve/reject match, attach, etc.) fail silently (console only).
7. Raw server error strings render directly to users; no 429 handling; no submit idempotency; no unsaved-work guard; accidental "Clear" wipes the signature with no undo (button sits inside the pad).
8. Success screen shows nothing about WHAT was signed (no version, no timestamp, no copy delivery — no email/print).
9. `dangerouslySetInnerHTML` on the public page guarded only by a regex tag-sniff (server sanitizes, but defense-in-depth missing client-side).
10. Theme-blind hardcoded colors: signature pad (`#0a0a2e` bg) and the entire admin waiver surface; amber-on-amber warning contrast; 8-column admin table with no mobile layout.
11. Backend: no admin path to publish new wording (requires code deploy; editing existing version text is a silent no-op); public versions endpoint has no rate limit; admin list responses ship signature blobs + unsanitized snapshots; match approve/reject writes no audit row; two concurrently-active versions tiebreak on insert order.

## 5. Planned direction (critique this)

Backend first (correctness/safety/version-activation invariant/admin authoring endpoints), then wording v2.0 as NEW version rows (never edit v1.0; existing re-consent machinery can force re-sign), then page UX: progressive one-page flow with step rail, DOB-driven guardian forcing, per-document read attestation, accessible type-to-sign fallback, honest success screen (what/when signed + copy delivery), returnUrl honored, explicit error/retry states, admin toast feedback + mobile cards + a Versions authoring tab.

## 6. What we want from YOU

**A. Wording (highest priority).** Rewrite candidates for: the core waiver structure (section list + key clauses in plain-but-protective English), the minor/guardian section, a media-release section, the Swan Coach / AI notice (brand-honest naming resolution), and the page microcopy set (title, section headings, consent labels, success/error strings, empty states) in a premium boutique-studio voice. Flag anything legally risky we missed. Respect: plain language ≠ weak language.

**B. UX/UI.** The strongest possible layout for a trust-critical legal page in a dark glassmorphism system: information order, progressive disclosure vs wizard, the reading experience for legal text on mobile, signature interaction (draw + type fallback), consent-block design that survives an unhappy lawyer AND a tired client on a phone at 9pm, success-state design, and the admin Versions authoring surface. ASCII wireframes welcome. Name the single signature visual moment that makes this page feel premium rather than bureaucratic.

**C. Logic/features.** Stress-test the flow: what breaks, what's missing (e.g., re-consent soft-landing for existing clients, expiry policies, multi-activity re-signing when adding a new activity later, trainer-side visibility), what you would cut as over-engineering. Rank your findings by value.

Return: (1) ranked findings, (2) concrete rewrites/wireframes, (3) three ways this design fails in the real world, (4) what you'd build first.
