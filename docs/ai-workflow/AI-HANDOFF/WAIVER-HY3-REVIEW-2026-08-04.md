# Tencent Hy3 - Design Inspiration

**Reviewer:** `tencent/hy3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/WAIVER-OVERHAUL-CONSULT-PACKET-2026-08-04.md
**Seed:** (none)
**Tokens:** 2706 in / 6804 out | **Cost:** ~$0.0040 | **Wall:** 114.8s | **finish_reason:** stop

---

I'm Tencent HY3 — divergent interaction and systems designer. I don't polish compliance theater; I stress it until the load-bearing walls crack. Below I attack the flow logic first (as commanded), then drop a contrarian signer experience with wiring, copy, and the wiring fixes your primary reviewer left in the blind spot.

---

## C. FLOW LOGIC STRESS-TEST (Ranked by Value, Not Ticket Order)

I re-ranked by `legal exposure × user harm × systemic risk`. The original defect list is decent but mis-sequences the catastrophic.

| # | Finding | Why it outranks the original order |
|---|---------|------------------------------------|
| **1** | **DOB collected but never evaluated → minors self-sign** (orig #4) | A 14‑yo signing the swimming addendum alone makes the waiver *voidable* under CA family code. This isn't a bug; it's an existential liability hole. |
| **2** | **Guardian flow is logically inverted** (orig #4 ext) | Self‑declared checkbox, minor *draws* the binding sig while guardian *types*. The law binds the guardian, not the child. The signature of record must be the guardian's. |
| **3** | **Silent version‑fetch death** (orig #2) | At a QR kiosk, `GET /versions/current` fails → form renders, submit disabled forever, zero error. Invisible unsigned‑client training gap. |
| **4** | **No explicit ordinary‑negligence release in text** (wording gap cascades to logic) | You are collecting e‑signatures on a likely‑unenforceable instrument. Flow produces PDFs that burn in court. |
| **5** | **Re‑consent has no soft‑landing + returnUrl ignored** (orig #5, #plan) | Route gate slams existing clients to `/waiver` with no "what changed", and the page never reads `returnUrl`. Abandonment = lapsed waiver. |
| **6** | **Multi‑activity incremental signing missing** | Client adds "Swimming" 3 months later; old core only, no addendum prompt. Stale coverage. |
| **7** | **No submit idempotency / double‑submit race** | Mobile double‑tap creates duplicate legal records; identity‑match queue floods. |
| **8** | **Version activation invariant broken** (backend #11) | Two concurrent active versions tiebreak on insert order; admin edit is silent no‑op. You lose which text was agreed to. |
| **9** | **Signature canvas has no assistive path** (orig #1) | ADA Title III + WCAG 4.5:1 failure; hard block for keyboard/motor users. |
| **10** | **Success state proves nothing** (orig #8) | No version, no timestamp, no copy delivery → dispute fertilizer. |
| **11** | **Over‑engineering to CUT** | Kill the hero typewriter video on a legal page. Auto‑link high‑confidence (0.9) identity matches instead of queuing all to admin. Remove "Create an Account" on success for logged‑in users. |

**Missing logic the packet didn't name:** trainer‑side visibility of waiver status (if gate fails, trainer may coach an unsigned client), no expiry/retention policy engine, no diff‑view service for re‑consent, no audit row on match approve/reject (orig #11 partial).

---

## CONTRARIAN SIGNER EXPERIENCE

### 1. Reading legal text on a phone — kill the dark glass for the document body
Glassmorphism is gorgeous for cards, but **terrible for 400px legal scroll**. Contrarian move: a "Reading Veil" — when a document tab opens, the card flips to a soft parchment‑light overlay (Gilded Fern rule, Midnight Sapphire text at 7:1 contrast). Premium is preserved by the frame, not the fog. `prefers-reduced-motion` disables the flip; it just swaps.

### 2. Signature capture — unify type + draw as one legal act
Forget "draw‑only with a type fallback buried elsewhere." The premium pattern: user types full name → rendered in "Ice Wing Script" (system cursive fallback). A "or draw" toggle reveals canvas. Both write the same `signature_snapshot`. Clear button lives *outside* the pad and offers undo toast.

### 3. Guardian/minor flow — DOB‑driven, not checkbox‑driven
If DOB < 18, the flow *auto‑forks* before activities: guardian info block appears, minor is labeled "Participant (minor)", guardian signs (draw/type), minor provides typed assent ("I agree to try my best" – age‑appropriate). No self‑declared checkbox ever.

### 4. Re‑consent soft‑landing
When `requiresReconsent` hits, the gate shows a diff card: "We updated Section 2 (Release) for clarity. Here's what changed." Then routes to `/waiver?returnUrl=…&reconsent=v2`. The page reads `returnUrl` and shows "Continue to your dashboard" post‑seal.

---

### ASCII WIREFRAME — MOBILE SIGNER (Crystalline Swan)

```
┌──────────────────────────────────────┐
│ SwanStudios · 26+ yrs   [Step 1/3]   │  <- sticky step rail, Ice Wing progress
├──────────────────────────────────────┤
│  CHOOSE SESSIONS                      │
│  ☐ Studio Home Training               │  <- enum-speak killed
│  ☐ Outdoor & Park Sessions            │
│  ☐ Aquatic Coaching                   │
│                                       │
│  DOCUMENTS (tap to read)              │
│  [ Core Waiver | Swan Coach | Media ] │
│  ┌─────────────────────────────────┐  │
│  │ READING VEIL (light parchment)  │  │  <- contrast 7:1
│  │ "1. Assumption of Risk… death…" │  │
│  └─────────────────────────────────┘  │
│  ☑ I read & accept this document *    │  <- per-doc attestation
│                                       │
│  ABOUT YOU                            │  <- was "3. Your Information"
│  Full Name | DOB (date picker)        │
│  Email / Phone (one req)              │
│                                       │
│  GUARDIAN BLOCK (auto if DOB<18)      │
│  Parent Name | Guardian Signature     │
├──────────────────────────────────────┤
│  SIGN & SEAL                          │
│  [ Type full name: ___________ ]      │  -> renders script
│  [ or draw ] (44px tools) [Undo]      │
│  [ Submit Agreement ]  (gold glow)    │
└──────────────────────────────────────┘

SUCCESS (honest):
┌──────────────────────────────────────┐
│  ✦ AGREEMENT SEALED                   │
│  Confirmation: SW-9F2C                │
│  Version: 2026-08-04 · 19:02 UTC      │
│  Copy sent to you@mail.com            │
│  [ Continue to Dashboard ]            │  <- reads returnUrl
└──────────────────────────────────────┘
```

**The single signature visual moment that makes it premium:** *The Crystalline Seal* — the instant the signature completes (typed or drawn), the card border sweeps a slow Ice Wing gradient and a small Gilded Fern swan glyph locks into the corner. With `prefers-reduced-motion`, it's a static gold border. That's the "we are boutique, not a forms factory" beat.

---

## WORDING FIXES THE PRIMARY REVIEWER MISSED

They caught negligence, minors, media, E‑SIGN. They *missed*:

1. **No "right to consult counsel" acknowledgement** — add to core closing.
2. **No retention/revocation period** — "This waiver snapshot is retained 7 years; media/AI consent may be revoked anytime via account or staff@swanstudios.com."
3. **Hardcoded effective date** — render from `effectiveAt`; also add per‑addendum dates.
4. **Swim addendum omits "death" explicitly** — must list drowning fatality.
5. **Checkbox label mismatch** — optional AI box says "consent to AI‑powered features" but admin flag is "Swan Coach Consent". Resolve voice: lead with **Swan Coach (AI‑assisted)**.
6. **No secondary‑signer PII notice** — guardian data handled per same privacy terms.

### Concrete rewrites (draft pending attorney)

**Core – Release of Liability (fixed):**
> "I hereby release SwanStudios, its owners, trainers, and agents from liability for claims of **ordinary negligence** arising from my participation. This release does **not** apply to gross negligence or willful misconduct, as prohibited by California Civil Code §1668."

**Minor/Guardian (new section 7):**
> "If the participant is under 18, a parent or legal guardian must provide the binding signature below. The minor's name is listed as participant; the guardian affirms legal authority to consent. The minor provides assent by typed name."

**Media Release (new standalone doc):**
> "I grant SwanStudios permission to capture and use my image in session photos/videos for promotional use. This is optional, revocable by email to staff@swanstudios.com, and revocation never affects training access."

**Swan Coach Notice (brand‑honest):**
> "Swan Coach (AI‑Assisted) generates personalized plans from your fitness data. Models process data only within our system; never sold. Declining Swan Coach does not change your core training. Recommendations are supplementary, not medical advice."

**Microcopy set (premium voice):**
- Title: `Your Swan Agreement`
- Step headings: `1. Choose Sessions · 2. Review & Attest · 3. Sign & Seal`
- Required consent: `I have read and accept the Swan Liability Waiver, including assumption of risk and release of ordinary negligence.*`
- Optional: `Enable Swan Coach (AI‑assisted) recommendations.`
- Optional: `Permit session photos/videos (see Media Release).`
- Error (version fetch): `We couldn't load the latest agreement. Tap Retry. If it persists, show staff code S-ERR.`
- Success: `Agreement Sealed. Confirmation {id}. Version {v} signed {ts}. A copy is in your inbox.`

---

## THREE REAL‑WORLD FAILURE MODES

1. **The Drowned Minor Loophole** — A 14‑yo selects Aquatic Coaching, signs alone via draw pad. Injury → family voids waiver (no guardian sig). Studio faces uninsured liability because flow never forked on DOB.
2. **The Shadow Version** — A deploy race leaves two `effectiveAt` versions active; half of Tuesday's signers bind to the old text. Re‑consent machinery later forces all to re‑sign, spamming the admin queue and eroding client trust.
3. **The Silent Kiosk** — QR code at gym opens `/waiver`; `GET /versions/current` 503s. Form shows but Submit stays dead, no error. Client assumes done, trains unsigned. Lawsuit discovers zero record.

## WHAT I'D BUILD FIRST

The **Signed‑State Integrity Triplet** (cheap, high leverage):
1. **DOB‑evaluated guardian fork** (client + server) — kills minor self‑sign.
2. **Keyboard‑accessible signature with type‑to‑sign + undo** — kills ADA block and dead‑end pad.
3. **Explicit version‑load error/retry state** — kills silent kiosk failure.

Without those three, every prettier wireframe is just a nicer coffin for the liability. Build the triplet, then layer the Reading Veil and Crystalline Seal.
