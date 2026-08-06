/**
 * Waiver Text v2.0 — DRAFT PENDING ATTORNEY REVIEW
 * =================================================
 * SWA-140. Canonical source for the v2.0 document set. This file IS the legal
 * text — it ships through a PR, not an admin WYSIWYG, so binding copy cannot
 * reach production without review and an artifact trail (Opus 5 review, R15).
 *
 * ⚠️  ACTIVATION GATE: these versions are NOT seeded unless
 *     WAIVER_ACTIVATE_V2=true. Until an attorney has reviewed this file, the
 *     flag stays off and v1.0 remains the live document set.
 *     (WAIVER-CONSENT-QR-FLOW-CONTRACT.md §16 — non-code production gate.)
 *
 * What v2.0 fixes vs v1.0 (all three panel reviewers converged on these):
 *   - v1.0 released "any and all liability" without ever saying NEGLIGENCE,
 *     which is the one word California requires a release to say clearly.
 *   - v1.0 had NO minor/guardian clause at all, while the UI ran a guardian
 *     flow and the swim addendum is used for children's lessons.
 *   - The media/photo consent checkbox referenced a document that did not
 *     exist. Scope-less consent is likely no consent.
 *   - No electronic-signature consent, no indemnification, no venue, no
 *     communicable-disease clause, no term/revocation language.
 *   - The Home Gym addendum protected the studio from CLIENT injury only and
 *     ignored the loss most likely to actually happen: the TRAINER hurt at the
 *     client's home.
 *
 * Deliberate omissions (decisions, not oversights):
 *   - NO arbitration clause. For a boutique studio there is no class exposure
 *     to shed, consumer-arbitration fee-shifting cuts against the small
 *     business, and stacking arbitration on a release strengthens an
 *     unconscionability narrative. Venue + pre-suit notice instead.
 *   - No "I am physically fit" representation — it invites a reliance
 *     argument and clients cannot reliably make it. Replaced with a
 *     disclosure duty.
 */

// ── Core liability waiver ────────────────────────────────────────
const CORE_HTML = `<h2>SwanStudios — Liability Waiver, Release &amp; Assumption of Risk</h2>
<p><em>Please read this carefully. It affects your legal rights. You are welcome to ask questions before signing, and to have anyone you choose — including an attorney — review it with you.</em></p>

<h3>1. Who This Agreement Covers</h3>
<p>In this agreement, "I" and "me" mean the person signing, and "SwanStudios" means SwanStudios, its owners, officers, employees, <strong>trainers and independent contractors</strong>, agents, and anyone acting on its behalf. Those trainers and independent contractors are intended beneficiaries of this agreement and may rely on it directly. This agreement covers every training session, class, program, assessment, and activity I take part in with SwanStudios, at any location, now and in the future.</p>

<h3>2. Assumption of Risk</h3>
<p>I understand that exercise and physical training carry real risks that cannot be eliminated no matter how carefully a session is run. These risks include muscle strains and tears, sprains, broken bones, joint and back injuries, heat illness, fainting, heart attack, stroke, permanent disability, and death. Risks can come from my own actions, from equipment, from the training environment, from the conduct of other people present, and from conditions I may not know about. I have had the chance to ask about these risks. <strong>I choose to participate anyway, and I accept these risks knowingly and voluntarily.</strong></p>

<h3>3. Release of Liability — Including Ordinary Negligence</h3>
<p>In exchange for being allowed to participate, I release, waive, and discharge SwanStudios from any and all claims, demands, damages, costs, and causes of action of any kind arising out of or related to my participation — <strong>including claims caused by the ordinary negligence of SwanStudios</strong> — to the fullest extent allowed by law.</p>
<p><strong>This release does not apply to gross negligence, recklessness, or intentional misconduct, and it does not release any liability that California law does not permit to be released in advance.</strong> Nothing in this agreement is intended to reach further than the law allows.</p>

<h3>4. Covenant Not to Sue, Heirs, and Indemnification</h3>
<p>I agree not to bring a lawsuit against SwanStudios for anything I have released above. This agreement binds me and also my spouse, children, heirs, executors, administrators, and anyone who might bring a claim on my behalf or because of my injury.</p>
<p>If someone brings a claim against SwanStudios arising out of my participation, my conduct, my failure to disclose a health condition, or the condition of any premises I provide for training, <strong>I will indemnify and hold SwanStudios harmless</strong> for that claim, including reasonable attorneys' fees, to the fullest extent allowed by law.</p>

<h3>5. Health Disclosure — What I Owe You, What You Owe Me</h3>
<p>I have disclosed to SwanStudios any medical condition, injury, medication, pregnancy, or limitation that could affect my safe participation, and <strong>I will tell my trainer promptly whenever that changes</strong> — before the next session, using any method SwanStudios provides for reporting a health change.</p>
<p>No physician has told me not to exercise. If one has, I have disclosed that. <strong>SwanStudios is not a medical provider, does not give medical advice, and does not clear anyone medically to exercise.</strong> I understand SwanStudios instructs me to consult a physician before beginning or significantly changing an exercise program, and that the decision to train is mine.</p>

<h3>6. Emergency Care</h3>
<p>If I appear to need emergency medical attention and cannot consent for myself, I authorize SwanStudios to call emergency services and to permit emergency treatment on my behalf. I accept financial responsibility for that care. I have provided an emergency contact and will keep it current.</p>

<h3>7. Participants Under 18</h3>
<p>A parent or legal guardian must sign this agreement for any participant under 18. <strong>The parent or guardian is the person entering into this agreement</strong> — the participant is the person training.</p>
<p>By signing for a participant under 18, I confirm that I am that participant's parent or legal guardian and that I have legal authority to sign for them. I agree to every term above on my own behalf and on the participant's behalf. I release my own claims arising from the participant's injury, I agree not to sue, and <strong>I will indemnify and hold SwanStudios harmless against claims brought by or on behalf of the participant</strong>, to the fullest extent allowed by law. I will make sure the participant follows all instructions and safety rules, and I will keep SwanStudios informed of the participant's health.</p>
<p>Consent to photography or video of a participant under 18 may be given only by a parent or legal guardian, and is never a condition of training.</p>

<h3>8. Personal Property</h3>
<p>SwanStudios is not responsible for loss of or damage to personal property brought to any training location.</p>

<h3>9. Communicable Illness</h3>
<p>Training involves close contact with people, shared surfaces, and shared equipment, which carries a risk of transmitting infectious illness. I accept that risk, and <strong>I agree not to attend a session when I have a contagious illness or symptoms of one.</strong></p>

<h3>10. Capacity and Impairment</h3>
<p>I am signing this of my own free will and I understand what it says. I will not train while impaired by alcohol, drugs, or any substance that affects my judgment, balance, or safety, and I understand a session may be ended if I appear impaired.</p>

<h3>11. Electronic Signature and Records</h3>
<p>I agree to sign and receive this agreement electronically. My electronic signature — whether I draw it or type it — is legally binding, and an electronic record of this agreement has the same effect as a paper original, under the federal E-SIGN Act and the California Uniform Electronic Transactions Act.</p>
<ul>
  <li><strong>What you need:</strong> a device with a current web browser and internet access, and the ability to view and save an HTML or PDF document.</li>
  <li><strong>Your copy:</strong> a complete copy of what you signed is shown to you at signing and can be saved or printed at that moment. You may request a paper copy at any time at no charge by contacting SwanStudios.</li>
  <li><strong>Withdrawing consent:</strong> you may withdraw consent to do business electronically at any time by contacting SwanStudios. If you do, we will complete waivers on paper instead; withdrawal does not undo anything already signed.</li>
  <li><strong>Keeping us current:</strong> tell SwanStudios if your email or phone number changes so we can reach you with your records.</li>
</ul>

<h3>12. How Long This Lasts, and How to End It</h3>
<p>This agreement applies to all of my sessions, now and in the future, and stays in effect until I revoke it in writing or sign a newer version that replaces it. <strong>Revoking it applies going forward only</strong> — it does not undo anything for sessions that already happened. SwanStudios may decline to train anyone who does not have a current signed agreement. If SwanStudios updates this document, I may be asked to review and sign the new version before my next session.</p>

<h3>13. Governing Law, Venue, and Talking First</h3>
<p>This agreement is governed by the laws of the State of California. Any dispute must be brought in the state or federal courts serving Los Angeles County, California, and I agree to that jurisdiction and venue.</p>
<p>Before filing anything, I agree to give SwanStudios written notice describing the problem and at least 30 days to try to resolve it. This step is meant to solve problems faster than a lawsuit, not to take away any right.</p>

<h3>14. Severability and Savings</h3>
<p>If any part of this agreement is held unenforceable, the rest stays in full force. <strong>If the release in Section 3 is held to be too broad, it should be enforced to the greatest extent the law allows</strong> rather than thrown out entirely.</p>

<h3>15. Acknowledgment</h3>
<p>I confirm that: I have read this entire agreement and I understand it; <strong>I can read and understand English</strong>, or I have had it explained to me in a language I understand; I had the opportunity to ask questions and to have an attorney review it; no one pressured me or promised me anything outside of what is written here; and I am signing it freely.</p>
<p><em>I understand that by signing I am giving up substantial legal rights, including the right to sue for ordinary negligence.</em></p>`;

// ── Swan Coach (AI-assisted) notice + consent ────────────────────
const SWAN_COACH_HTML = `<h2>Swan Coach (AI-Assisted Coaching) — Notice &amp; Consent</h2>
<p><em>This is optional. Declining changes nothing about the training you receive.</em></p>

<h3>What Swan Coach Is</h3>
<p>Swan Coach is SwanStudios' coaching technology, <strong>powered in part by artificial intelligence</strong>. When you enable it, it helps your trainer by drafting training plans, suggesting exercises and progressions, organizing your training history, and highlighting trends in your progress.</p>

<h3>What It Uses</h3>
<p>With your consent, Swan Coach processes your training information — workout history, goals, preferences, measurements, and progress — to generate suggestions. Where we can, your information is de-identified before it is processed.</p>

<h3>What It Does Not Do</h3>
<ul>
  <li><strong>Your data is never sold.</strong></li>
  <li><strong>Your data is not used to train outside AI models.</strong> It is used to serve you.</li>
  <li>Swan Coach does not replace your trainer. A person reviews and decides what you actually do.</li>
  <li>Swan Coach does not give medical advice and does not replace your physician.</li>
</ul>

<h3>Your Choice, Any Time</h3>
<p>Swan Coach is off unless you turn it on, and you can turn it off whenever you like in your account settings. Turning it off does not affect your access to training, your trainer, your plans, or your history. <strong>Declining Swan Coach is never a condition of service.</strong></p>
<p>No system is completely without risk. We use privacy safeguards and de-identification, and we tell you plainly what happens with your information so you can decide for yourself.</p>`;

// ── Photo & media release (NEW — the checkbox finally has a document) ──
const MEDIA_RELEASE_HTML = `<h2>Photo &amp; Media Release — Optional</h2>
<p><em>This is entirely optional and is never a condition of training. You can say no and nothing changes.</em></p>

<h3>What You're Agreeing To</h3>
<p>If you consent, SwanStudios may photograph or record video of you during sessions and use those images to show its work. You can choose how far that goes:</p>
<ul>
  <li><strong>Internal and progress use</strong> — coaching review, form analysis, and your own progress records.</li>
  <li><strong>Public marketing use</strong> — the SwanStudios website, social media, and advertising.</li>
</ul>
<p>SwanStudios is not required to use any image, and you are not entitled to payment for its use.</p>

<h3>Changing Your Mind</h3>
<p>You may withdraw this consent at any time in your account settings or by contacting SwanStudios. <strong>Withdrawal applies going forward.</strong> SwanStudios will stop using your image in new material and will remove it from channels it controls within 30 days where removal is possible; material already printed, published by third parties, or shared beyond our control may not be retrievable.</p>

<h3>Participants Under 18</h3>
<p>Only a parent or legal guardian may consent to photography or video of a participant under 18. Please consider carefully: publishing a child's image together with a recognizable location is a safety consideration as well as a privacy one. <strong>SwanStudios will not publish a minor's image publicly without guardian consent, and never as a condition of training.</strong></p>`;

// ── Activity addendum — home gym ─────────────────────────────────
const HOME_GYM_HTML = `<h2>Activity Addendum — In-Home &amp; Home Gym Training</h2>
<p>This addendum adds to the Liability Waiver &amp; Release for sessions at a private residence or home gym.</p>

<h3>The Training Space</h3>
<p>I am responsible for the space where training happens. I agree to:</p>
<ul>
  <li>keep the training area clean, clear, and free of tripping and slipping hazards;</li>
  <li>tell my trainer about hazards in advance — stairs, uneven or slick flooring, low ceilings, pets, firearms, pool access, and anyone else who will be present;</li>
  <li>secure pets during sessions;</li>
  <li>provide adequate light, ventilation, and space to move safely;</li>
  <li>maintain my own equipment and tell my trainer if anything is damaged, worn, or improperly assembled.</li>
</ul>
<p>I understand home equipment often differs from commercial equipment, and I accept the additional risk that comes with it.</p>

<h3>If Something Goes Wrong With the Space</h3>
<p>SwanStudios is not responsible for injury caused by defective home equipment, unsafe conditions, or hazards at my premises that are outside my trainer's control.</p>

<h3>Injury to the Trainer at My Premises</h3>
<p><strong>This section protects the person coming to my home.</strong> I warrant that the premises are reasonably safe for a trainer to work in. If my trainer is injured at my premises because of a condition of the property, my conduct, or my animals, <strong>I will indemnify and hold SwanStudios and the trainer harmless</strong> for claims arising from that injury, to the fullest extent allowed by law. I understand my homeowner's or renter's insurance may apply, and I will cooperate with any resulting claim.</p>

<h3>Access</h3>
<p>I will provide safe entry and exit and a way for emergency responders to reach the training area if they are ever needed.</p>`;

// ── Activity addendum — park / outdoor ───────────────────────────
const PARK_TRAINING_HTML = `<h2>Activity Addendum — Park &amp; Outdoor Training</h2>
<p>This addendum adds to the Liability Waiver &amp; Release for sessions in parks and other outdoor spaces.</p>

<h3>Outdoor Conditions</h3>
<p>I understand outdoor training adds risks that no one controls:</p>
<ul>
  <li>uneven ground, tree roots, wet grass, gravel, and natural obstacles;</li>
  <li>heat, cold, wind, rain, poor air quality, and sun exposure;</li>
  <li>insects, allergens, plants, and wildlife;</li>
  <li>other park users, cyclists, vehicles, and animals off leash.</li>
</ul>
<p>I will dress appropriately, bring water and sun protection, and tell my trainer about heat sensitivity, asthma, or allergies.</p>

<h3>Weather and Rescheduling</h3>
<p>Sessions may be shortened, modified, moved, or rescheduled when conditions are unsafe. My trainer will let me know as early as possible. This judgment is made for safety and is not a reduction in service.</p>

<h3>Public Spaces</h3>
<p>Training in public means other people are present, and SwanStudios is not responsible for the conduct of third parties. I will not leave valuables unattended.</p>

<h3>Park Rules and Permits</h3>
<p>I will follow posted park rules. <strong>Where a permit is required for training in a public space, SwanStudios is responsible for obtaining it for sessions it schedules.</strong> If I choose a location and a permit or fee is required there, I will tell my trainer before the session so it can be arranged or the location changed.</p>`;

// ── Activity addendum — swimming ─────────────────────────────────
const SWIMMING_HTML = `<h2>Activity Addendum — Swim Lessons &amp; Aquatic Training</h2>
<p>This addendum adds to the Liability Waiver &amp; Release for lessons and training in water. <strong>Please read the section on participants under 18 even if the swimmer is an adult.</strong></p>

<h3>Water Risks</h3>
<p>Water activity carries risks that are different in kind from land training, including:</p>
<ul>
  <li><strong>drowning, near-drowning, and death;</strong></li>
  <li>secondary drowning and water aspiration;</li>
  <li>slips and falls on wet decks and ladders;</li>
  <li>exposure to pool chemicals, and waterborne infection or skin irritation;</li>
  <li>cramps, disorientation, and sudden fatigue in water;</li>
  <li>cold-water shock and, in open water, currents and limited visibility.</li>
</ul>
<p>I accept these risks knowingly and voluntarily.</p>

<h3>Honest Ability Disclosure</h3>
<p>I will accurately describe the swimmer's current ability and comfort in water before lessons begin, and I understand that overstating ability is dangerous. Instruction is matched to actual ability. The swimmer should not attempt anything beyond their comfort without the instructor's direction, and must tell the instructor immediately about any discomfort, difficulty breathing, or distress.</p>

<h3>Health Conditions in Water</h3>
<p>I have disclosed any condition that makes water activity riskier or medically inadvisable — including seizure disorders, asthma, cardiac conditions, ear infections, open wounds, and chemical sensitivities — and I will report any change before the next lesson.</p>

<h3>Supervision — What Is and Isn't Provided</h3>
<p>The instructor supervises the lesson and the swimmer they are teaching. <strong>The instructor is not a lifeguard for the facility</strong> and is not responsible for other swimmers or for areas outside the lesson. Where a facility provides lifeguards, they remain responsible for general water safety. SwanStudios will tell you who is present and what certifications they hold if you ask.</p>

<h3>Participants Under 18</h3>
<p><strong>A parent or legal guardian must remain at the pool, within sight and sound of the lesson, for the entire lesson for any participant under 18</strong>, unless SwanStudios has agreed otherwise in writing. The guardian is the person entering into this agreement and is responsible for the participant outside of the instruction itself — including changing areas, deck movement, and before and after the lesson.</p>

<h3>Private and Residential Pools</h3>
<p>If lessons take place at a private residence, the pool owner is responsible for the safety and legal compliance of the pool and its surroundings, including fencing, gates, covers, drain safety, and chemical balance. Lessons at a private pool are subject to the In-Home &amp; Home Gym addendum as well.</p>

<h3>Pool Rules</h3>
<p>I will follow all posted pool and facility rules. The instructor may modify or end a lesson at any time for safety, and doing so is not a failure to deliver the lesson.</p>`;

/**
 * v2.0 document set. `changeSummary` is shown verbatim in the re-consent flow
 * as "what changed since you signed" — write it for a client, not a lawyer.
 */
export const WAIVER_TEXT_V2 = [
  {
    waiverType: 'core',
    activityType: null,
    version: '2.0',
    title: 'Liability Waiver, Release & Assumption of Risk',
    htmlText: CORE_HTML,
    changeSummary:
      'Clearer language throughout. New sections covering participants under 18, electronic signatures, illness, and how to end the agreement. The release now says plainly what it does and does not cover.',
  },
  {
    waiverType: 'ai_notice',
    activityType: null,
    version: '2.0',
    title: 'Swan Coach (AI-Assisted Coaching) — Notice & Consent',
    htmlText: SWAN_COACH_HTML,
    changeSummary:
      'Renamed to Swan Coach and rewritten to say exactly what it uses, what it never does (your data is not sold and is not used to train outside AI models), and how to turn it off.',
  },
  {
    waiverType: 'media_release',
    activityType: null,
    version: '1.0',
    title: 'Photo & Media Release (Optional)',
    htmlText: MEDIA_RELEASE_HTML,
    changeSummary:
      'New document. The photo and video consent now has actual terms behind it, including how to withdraw it and how it works for participants under 18.',
  },
  {
    waiverType: 'activity_addendum',
    activityType: 'HOME_GYM_PT',
    version: '2.0',
    title: 'In-Home & Home Gym Training Addendum',
    htmlText: HOME_GYM_HTML,
    changeSummary:
      'Adds what each side is responsible for in your home, including hazards to disclose and what happens if your trainer is injured at your property.',
  },
  {
    waiverType: 'activity_addendum',
    activityType: 'PARK_TRAINING',
    version: '2.0',
    title: 'Park & Outdoor Training Addendum',
    htmlText: PARK_TRAINING_HTML,
    changeSummary:
      'Clearer weather and rescheduling terms, and states who handles permits for training in public parks.',
  },
  {
    waiverType: 'activity_addendum',
    activityType: 'SWIMMING_LESSONS',
    version: '2.0',
    title: 'Swim Lessons & Aquatic Training Addendum',
    htmlText: SWIMMING_HTML,
    changeSummary:
      'States the water risks plainly, including drowning. Explains what the instructor supervises and what they do not, and requires a parent or guardian to stay within sight and sound for swimmers under 18.',
  },
];

export default WAIVER_TEXT_V2;
