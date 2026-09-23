# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/WAIVER-OVERHAUL-CONSULT-PACKET-2026-08-04.md
**Seed:** (none)
**Tokens:** 2767 in / 6264 out | **Cost:** ~$0.1023 | **Wall:** 47.1s | **finish_reason:** stop

---

# Section 6 — Wording & Design Deliverable
**SwanStudios Waiver Overhaul · Kimi K3, wording + product design**

---

## A. WORDING

### A.1 Core waiver — restructured section list (v2.0 DRAFT, attorney gate applies)

1. Assumption of Risk
2. Release of Liability *(now with explicit ordinary-negligence language + statutory carve-out)*
3. Health & Medical Disclosure *(replaces "I affirm I am physically fit" — see A.6)*
4. Emergency Medical Treatment
5. Participants Under 18 *(NEW — see A.2)*
6. Personal Property
7. Photo & Media *(pointer clause to the standalone Media Release — see A.3)*
8. Electronic Signatures *(NEW — E-SIGN/UETA)*
9. Term & Revocation *(NEW)*
10. Governing Law & Venue *(now names a county)*

**Key clause rewrites:**

**§2 Release of Liability** — the current text releases "any and all liability" without the word *negligence*, which is exactly how you get a waiver that fails in California while looking strong. Rewrite:

> "In consideration of being permitted to participate in SwanStudios programs, I release, waive, and discharge SwanStudios, its owners, trainers, employees, and agents from any and all claims, demands, or causes of action arising out of my participation — **including claims based on the ordinary negligence of SwanStudios** — to the fullest extent permitted by law. This release does not apply to gross negligence, reckless conduct, or intentional misconduct, which California law does not allow me to release in advance."

Plain, explicit, and it doesn't overreach — overreach is what voids these.

**§8 Electronic Signatures (new):**

> "I agree that my electronic signature — whether drawn or typed — is legally binding under the federal E-SIGN Act and the California Uniform Electronic Transactions Act, and that an electronic record of this waiver is as valid as a paper original."

**§9 Term & Revocation (new):**

> "This waiver applies to all current and future SwanStudios sessions and remains in effect until I revoke it in writing or sign a newer version. Revocation does not affect sessions that already took place, and SwanStudios may decline future sessions to anyone without an active waiver."

**Effective date:** delete the hardcoded "February 2026." Render `Effective {effectiveAt} · Version {n}` from data, in the document header and again on the success receipt.

### A.2 Minor/Guardian section (new — the biggest legal hole)

> **"Participants Under 18.** A parent or legal guardian must sign this waiver on behalf of any participant under 18. By signing, I confirm that I am the participant's parent or legal guardian, that I agree to every term of this waiver on the participant's behalf and on my own behalf, and that I will ensure the participant follows all trainer instructions and safety rules. I accept responsibility for claims the participant might otherwise bring, to the fullest extent permitted by law."

**Flow logic must match the words:** the guardian is the *signer*; the minor is the *subject*. The current build (minor draws the binding signature, guardian types a courtesy name) produces a signature from the one person who can't be bound. Invert it: DOB < 18 → the signature pad is labeled "Parent/Guardian Signature," the minor's name is collected as "Participant's name," and the guardian attestation checkbox appears. (More in B and C.)

### A.3 Media Release (new standalone document — the checkbox currently references nothing)

> **Photo & Media Release (Optional).** "I give SwanStudios permission to photograph and film me during sessions and to use those images in studio marketing, social media, and the SwanStudios website, without payment. This consent is optional and does not affect my training. I may withdraw it at any time in my account settings or by emailing the studio; withdrawal applies going forward and does not require removal of materials already published. For participants under 18, only a parent or legal guardian may grant this consent."

Checkbox label: *"I agree to the Photo & Media Release (optional — you can withdraw anytime)."* Link the document inline. Never bundle it into the required consent.

### A.4 Swan Coach notice — naming resolution

One name, everywhere: **Swan Coach**. The legal document gets one honest disclosure up front, then uses the brand name — this satisfies the house rule without hiding the ball:

> **Swan Coach — Personalized Training Technology Notice & Consent**
> "Swan Coach is SwanStudios' coaching feature, powered by artificial intelligence. When enabled, Swan Coach uses your workout history, goals, preferences, and progress to generate personalized training plans and recommendations. Your data is never sold. Swan Coach is optional — you can turn it on or off anytime in Settings, and declining it never affects your access to training with your coach. Swan Coach's recommendations support, but never replace, the judgment of your trainer or the advice of your physician."

Fix the admin UI string ("Swan Coach Consent" is already right — make the public page and spec match it). Kill "AI-Assisted Coaching Notice" in the spec draft.

### A.5 Page microcopy set (premium boutique voice)

| Slot | Current | Rewrite |
|---|---|---|
| Page title | "Activity Waiver & Release" | **"Before We Train"** — sub: "A few minutes now keeps every session safe, clear, and covered." |
| Step 1 | "1. Select Activities" | **"Where we'll train"** — labels: "Home Gym Sessions" / "Outdoor & Park Training" / "Swim Lessons" (kill enum-speak "PT") |
| Step 2 | "2. Read the Waiver" | **"Read your documents"** — helper: "One short document per activity. Tap each to read and confirm." |
| Step 3 | "3. Your Information" | **"About you"** |
| Step 4 | "4. Guardian (if applicable)" | **"A parent or guardian signs"** — helper: "Swimmers and athletes under 18 need a parent or guardian's signature." |
| Step 5 | "5. Consent" | **"Your choices"** |
| Step 6 | "6. Signature" | **"Sign"** — helper: "Draw your signature, or type it — both are legally binding." |
| Required consent | "I accept the liability waiver and acknowledge the risks described above. *" | **"I have read and agree to the Liability Waiver & Release, including its assumption of risk and release of negligence claims."** (Never say "described above" — reference the document by name so the label survives any layout.) |
| Swan Coach consent | "I consent to AI-powered features…" | **"Enable Swan Coach — personalized training plans built from my workout data. Optional; changeable anytime in Settings."** |
| Media consent | "I consent to photos/videos…" | **"SwanStudios may use photos or video of me in studio marketing. Optional; withdrawable anytime."** |
| Submit | "Submit Waiver" | **"Sign & Submit"** → loading: "Sealing your waiver…" |
| Success | "Waiver Submitted / Thank you!…" | **"You're all set, {firstName}."** / "Signed {date} · Version {n} · Confirmation {id}. A copy is on its way to {email}." |
| Versions fetch failure | *(silent)* | **"We couldn't load your waiver documents."** / "Check your connection and try again — nothing has been submitted." + [Try again] |
| 429 | *(raw string)* | **"Easy there — too many attempts."** / "Give it a few minutes and try again." |
| Submit failure | *(raw string)* | **"Your signature didn't save. Nothing was submitted — please try again."** |
| Admin empty state | *(blank table)* | **"No pending matches — every signer is accounted for."** |
| Contact | "please contact staff" | **"Questions? Call or text the studio at {studioPhone} — a person answers."** |

### A.6 Legal risks the audit missed

1. **"I affirm that I am physically fit"** is a trap clause — clients affirm something untrue, then it gets used against both sides. Replace with a disclosure duty: *"I have disclosed, and will keep my trainer informed of, any condition that could affect safe participation."*
2. **No indemnification for third-party claims** — matters most for Home Gym (a guest trips over the client's dog and sues the studio). Add a hold-harmless for claims arising from the signer's premises/conduct.
3. **No communicable-disease clause** — one sentence assumption-of-risk + stay-home-when-sick.
4. **Guardian media consent** must be guardian-only for minors (handled in A.3, but enforce it in UI: media checkbox disabled until guardian attested).
5. **Arbitration is a business decision, not a copy decision** — flag to ownership with a one-line recommendation; don't silently omit or silently add.

---

## B. UX/UI — Crystalline Glass, trust-critical

**Decision: progressive one-page, not a wizard.** A wizard hides the document count and feels like a funnel; a single page with a sticky step rail communicates "short, honest, finite." Steps unlock in order; completed steps get a gold check.

### B.1 Mobile wireframe (the 9pm tired client)

```
┌─────────────────────────────┐
│ ◆ SWANSTUDIOS        [?]    │  ← slim bar, no hero video
│ Before We Train             │     (video moves below the fold
│ 2 min · keeps you covered   │      or dies — see B.6)
├─────────────────────────────┤
│ ●━━○━━○━━○━━○━━○            │  ← step rail, 44px dots,
│ Where we'll train           │    current step labeled
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ ▣ Home Gym Sessions     │ │  ← glass cards, Ice Wing
│ │ ☐ Outdoor & Park        │ │    border when selected,
│ │ ☐ Swim Lessons          │ │    44px+ rows
│ └─────────────────────────┘ │
│                             │
│ Read your documents ─────── │
│ ┌─────────────────────────┐ │
│ │ 📄 Liability Waiver     │ │
│ │    6 sections · 2 min   │ │
│ │    [ Read → ]           │ │
│ ├─────────────────────────┤ │
│ │ 📄 Home Gym Addendum    │ │
│ │    ✓ Read & confirmed   │ │  ← gold check state
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

### B.2 The reading experience

Tapping a document opens a **full-height glass sheet** (not a 400px peephole — the scroll-box is where comprehension goes to die):

```
┌─────────────────────────────┐
│ ← Liability Waiver    2 of 6│  ← section progress, not
│ ────────────░░░░░           │    scrollbar squinting
│                             │
│ 2. Release of Liability     │  ← Jakarta Sans, 19px,
│                             │    1.6 line-height, max 68ch
│ In consideration of being   │
│ permitted to participate…   │
│                             │
│ [sections auto-advance as   │
│  you scroll; no forced      │
│  scroll-to-unlock]          │
│                             │
├─────────────────────────────┤
│ ✓ I've read this document   │  ← sticky footer, 48px,
└─────────────────────────────┘    disabled until last section
                                   viewed (not timed — timing
                                   is a dark pattern)
```

Per-document attestation replaces both the missing scroll-to-accept AND the broken "risks described above" checkbox. Each document carries its own confirmation; the required consent checkbox in Step 5 then references documents by name.

### B.3 Signature interaction

```
┌─────────────────────────────┐
│ Sign                        │
│ Draw your signature, or     │
│ type it — both are binding. │
│ ┌─────────────────────────┐ │
│ │ [ Draw ] [ Type ]       │ │  ← segmented control
│ │ ┌─────────────────────┐ │ │
│ │ │                     │ │ │
│ │ │    ✍ (canvas, Ice   │ │ │
│ │ │    Wing stroke on   │ │ │
│ │ │    deep sapphire)   │ │ │
│ │ │                     │ │ │
│ │ └─────────────────────┘ │ │
│ │ [Undo] [Clear]          │ │  ← Undo first; Clear asks
│ └─────────────────────────┘ │    "Clear signature?" once
│                             │
│ Type tab:                   │
│ ┌─────────────────────────┐ │
│ │ Full name: [__________] │ │
│ │ Preview: 𝒥𝑜𝓇𝒹𝒶𝓃 𝐿𝑒𝑒     │ │  ← script-font preview,
│ │ ✓ This typed signature  │ │    keyboard-native, screen-
│ │   is my legal signature │ │    reader announces preview
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

Type-to-sign is not a "fallback" — it's a first-class tab, which fixes defect #1 (keyboard/motor access) and defect #4's typed-vs-drawn asymmetry in one move. Canvas gets `role="img"` + aria-label + the type tab announced.

### B.4 Consent block — survives the lawyer AND the tired client

Each consent is its own glass card: **plain-language summary line, linked document name, required/optional chip.** Required card has a gold left spine; optional cards are neutral. No pre-checked boxes, ever. The unhappy lawyer gets verbatim document references and per-document attestations; the tired client gets three sentences total.

### B.5 Success state

```
┌─────────────────────────────┐
│         ╭─────╮             │
│         │ 🦢  │  ← THE SEAL │
│         ╰─────╯             │
│   You're all set, Jordan.   │
│                             │
│ ┌─────────────────────────┐ │
│ │ Liability Waiver  v2.0  │ │
│ │ Home Gym Addendum v1.1  │ │
│ │ Signed Aug 4, 2026 ·    │ │
│ │ 8:42 PM · #SWN-48213    │ │
│ │ ✉ Copy sent to j@…      │ │
│ │ [Resend] [Download PDF] │ │
│ └─────────────────────────┘ │
│ [ Continue to your dashboard→]│ ← honors returnUrl;
│ Create an account (guests)  │   account link is secondary,
└─────────────────────────────┘   never the primary CTA
```

### B.6 The one signature visual moment: **The Seal**

On successful submit, the client's drawn stroke lifts off the pad, contracts, and resolves into a **gilded swan seal** — a small gold-foil swan emblem stamped onto the receipt card, with the signature faintly visible inside it, one soft Ice-Wing shimmer across the glass. It converts the most bureaucratic instant (signing away rights) into the most boutique instant (being *admitted* to the studio). Everything else on the page is quiet glass; this is the single moment of gold. `prefers-reduced-motion`: the seal simply fades in, no flight, no shimmer. The hero video at the top of the page dies to pay for this — motion belongs at the moment of commitment, not the moment of arrival.

### B.7 Admin Versions authoring surface

```
┌──────────────────────────────────────────┐
│ Versions                    [+ New draft] │
│ ┌──────────┬────────┬──────────┬───────┐ │
│ │ Document │Version │ Status   │Actions│ │
│ │ Core     │ v2.0   │ ● ACTIVE │ View  │ │ ← one active per
│ │ Core     │ v1.0   │ Retired  │ Diff  │ │   doc type, enforced
│ │ Swim     │ v1.2   │ Scheduled│ Edit  │ │   server-side
│ │ Media    │ v1.0   │ Draft    │ Edit  │ │
│ └──────────┴────────┴──────────┴───────┘ │
│ Draft editor:                             │
│ ┌─ Edit ────────┬─ Preview as signer ──┐ │
│ │ [rich text /  │  (live glass render  │ │
│ │  clause lib]  │   of the mobile      │ │
│ │               │   reading sheet)     │ │
│ └───────────────┴──────────────────────┘ │
│ Effective: [date] ☐ Requires re-consent  │
│ [Save draft] [Schedule] [Publish]        │
│ Publish → modal: "This retires v1.0 and  │
│ triggers re-consent for 214 clients."    │
└──────────────────────────────────────────┘
```

Every action toasts. Every publish/approve/reject writes an audit row. Mobile: the table collapses to cards.

---

## C. LOGIC/FEATURES — ranked by value

1. **DOB-driven guardian forcing + guardian-as-signer.** The only defect producing legally void documents at scale — every kids' swim waiver signed today is signed by the wrong person. Non-negotiable.
2. **Type-to-sign + canvas accessibility.** A required field with no keyboard path is an ADA exposure and a hard blocker for real users.
3. **Versions-fetch failure state + retry.** Silent dead-end on a legal gate page; one glass error card fixes it.
4. **Honest receipt: version, timestamp, emailed PDF copy.** The signature snapshot is *your* evidence; the email is *theirs* — mutuality is what makes waivers feel trustworthy and hold up.
5. **Honor `returnUrl`.** Signed clients bouncing to a hardcoded dashboard (or seeing "Create an Account" while logged in) reads as broken, and broken reads as untrustworthy on a trust page.
6. **Re-consent soft landing.** Existing clients hitting the gate get: "We've updated our waiver — here's what changed" + a 3-bullet plain-language diff, not the raw full flow. Respect earns the re-sign.
7. **Addendum-only signing for new activities.** Adding swim lessons later should require only the swim addendum, not a full re-sign — the version snapshot model already supports this.
8. **Trainer-side "waiver on file" badge** on the session roster. Cheap query, ends front-desk awkwardness.
9. **Admin toasts + audit rows + sanitized list payloads** (drop signature blobs from list responses).
10. **Cut as over-engineering:** waiver expiry policies (version-driven re-consent already covers staleness); forced scroll-to-unlock timers (dark pattern, legally unnecessary given per-document attestation); the hero video.

---

## Three real-world failure modes

1. **The QR-code teen.** A 15-year-old scans the pool-deck QR, enters a fake DOB, signs alone. No UI fixes identity fraud — so the guardian flow must also produce a *trainer-visible flag* ("minor waiver — guardian signature unverified") for first-session confirmation, and the copy should say the guardian must be present. Design for the lie, not just the form.
2. **The 9pm re-consent dead-end.** A long-time client opens the app the night before a session, hits the re-consent gate, the versions fetch fails on bad hotel Wi-Fi — and today that means a silently dead submit button and a client who can't train tomorrow. The error card + retry + a staff override path ("front desk can mark waiver-verified with audit row") is the difference between an annoyance and a lost client.
3. **The typo'd email with no proof.** Signer fat-fingers their email, gets no copy, and six months later disputes ever signing. Confirmation ID + on-screen PDF download + "resend copy" (and ideally SMS as a second channel) closes it.

## What I'd build first

**The minor/guardian correction — wording §5 and the DOB-forced guardian-signs flow, shipped together.** It's the only defect where the system is *currently manufacturing unenforceable documents for the highest-risk activity* (children's swim lessons) every day it's live. Accessibility is a close second, but a waiver a keyboard user can't sign is a lost conversion; a waiver a child signs is a false sense of legal safety — and false safety is the worst thing a trust-first studio can sell.
