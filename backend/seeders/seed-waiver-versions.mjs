/**
 * Waiver Version Seeder — Phase 5W-G
 * ====================================
 * Ensures the waiver_versions table has initial content so the
 * public waiver form (/waiver) can display waiver text.
 *
 * Idempotent — uses findOrCreate, safe to run on every startup.
 */
import crypto from 'crypto';
import logger from '../utils/logger.mjs';

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// ── Waiver Text Content ────────────────────────────────────────

const CORE_HTML = `<h2>SwanStudios — General Liability Waiver &amp; Release of Claims</h2>
<p><strong>Effective Date:</strong> February 2026</p>

<h3>1. Assumption of Risk</h3>
<p>I understand that physical exercise involves inherent risks, including but not limited to: muscle strains, sprains, fractures, cardiovascular events, and other injuries. I voluntarily assume all risks associated with participation in personal training sessions, group classes, and any other fitness activities offered by SwanStudios.</p>

<h3>2. Release of Liability</h3>
<p>In consideration of being permitted to participate in SwanStudios fitness programs, I hereby release, waive, and discharge SwanStudios, its owners, trainers, employees, and agents from any and all liability, claims, demands, or causes of action arising out of or related to any loss, damage, or injury sustained during my participation.</p>

<h3>3. Medical Clearance</h3>
<p>I affirm that I am physically fit and have no medical condition that would prevent my safe participation in exercise activities. I agree to inform my trainer of any changes to my health status. I understand that SwanStudios recommends consulting a physician before beginning any exercise program.</p>

<h3>4. Emergency Medical Treatment</h3>
<p>I authorize SwanStudios staff to seek emergency medical treatment on my behalf if needed during a training session, and I accept financial responsibility for any such treatment.</p>

<h3>5. Personal Property</h3>
<p>I understand that SwanStudios is not responsible for the loss or damage of personal property brought to training locations.</p>

<h3>6. Governing Law</h3>
<p>This waiver shall be governed by the laws of the State of California. If any provision is found to be unenforceable, the remaining provisions shall remain in full force and effect.</p>

<p><em>By signing below, I acknowledge that I have read and understand this waiver and voluntarily agree to its terms.</em></p>`;

const AI_NOTICE_HTML = `<h2>AI-Powered Features Notice &amp; Consent</h2>
<p><strong>Effective Date:</strong> February 2026</p>

<h3>About AI Features</h3>
<p>SwanStudios uses AI-powered technology to enhance your training experience. These features may include:</p>
<ul>
  <li>Personalized workout plan generation based on your fitness level and goals</li>
  <li>Long-horizon training program planning</li>
  <li>Exercise recommendations tailored to your progress</li>
  <li>Performance analytics and trend insights</li>
</ul>

<h3>Data Usage</h3>
<p>When AI features are enabled, your fitness data (workout history, goals, preferences, and progress metrics) may be processed by AI models to generate personalized recommendations. Your data is never sold to third parties and is used solely to improve your training experience.</p>

<h3>Opt-In / Opt-Out</h3>
<p>AI-powered features are <strong>optional</strong>. You may choose to enable or disable them at any time through your account settings. Declining AI features will not affect your access to core training services.</p>

<p><em>By consenting to AI features, you acknowledge that AI-generated recommendations are supplementary and do not replace professional medical or fitness advice.</em></p>`;

const HOME_GYM_HTML = `<h2>Activity Addendum — Home Gym Personal Training</h2>
<p><strong>Effective Date:</strong> February 2026</p>

<h3>Home Training Environment</h3>
<p>I understand that home gym personal training sessions take place at a private residence or home gym facility. I acknowledge the following additional risks and responsibilities:</p>
<ul>
  <li>I am responsible for ensuring my home training area is safe, clean, and free of hazards</li>
  <li>Equipment in a home gym may differ from commercial-grade equipment; I accept any additional risks</li>
  <li>I will inform my trainer of any pets, household members, or environmental factors that may affect training safety</li>
  <li>I will ensure adequate ventilation, lighting, and space for safe exercise execution</li>
</ul>

<h3>Liability for Home Environment</h3>
<p>SwanStudios and its trainers are not liable for injuries caused by defective home equipment, inadequate facilities, or hazards in the home training environment that are outside the trainer's control.</p>`;

const PARK_TRAINING_HTML = `<h2>Activity Addendum — Park &amp; Outdoor Training</h2>
<p><strong>Effective Date:</strong> February 2026</p>

<h3>Outdoor Training Environment</h3>
<p>I understand that park and outdoor training sessions take place in public outdoor spaces. I acknowledge the following additional risks:</p>
<ul>
  <li>Uneven terrain, wet grass, and natural obstacles may increase injury risk</li>
  <li>Weather conditions (heat, cold, wind, rain) may affect training safety and comfort</li>
  <li>Exposure to sun, insects, allergens, and other outdoor elements</li>
  <li>Proximity to other park users, cyclists, and animals</li>
</ul>

<h3>Weather &amp; Cancellation Policy</h3>
<p>Sessions may be modified or rescheduled due to extreme weather conditions. Your trainer will communicate any changes as soon as possible. You are encouraged to bring water, sun protection, and appropriate outdoor footwear.</p>

<h3>Public Space Awareness</h3>
<p>Training in public spaces means other people may be present. SwanStudios is not responsible for the actions of third parties in public areas.</p>`;

const SWIMMING_HTML = `<h2>Activity Addendum — Swimming Lessons</h2>
<p><strong>Effective Date:</strong> February 2026</p>

<h3>Aquatic Activity Risks</h3>
<p>I understand that swimming and aquatic activities involve unique risks, including but not limited to:</p>
<ul>
  <li>Drowning or near-drowning incidents</li>
  <li>Slips and falls on wet pool deck surfaces</li>
  <li>Exposure to pool chemicals and chlorine</li>
  <li>Waterborne infections or skin irritation</li>
  <li>Muscle cramps while in water</li>
</ul>

<h3>Swimming Ability Disclosure</h3>
<p>I will honestly disclose my current swimming ability to my instructor before lessons begin. I understand that instruction will be tailored to my skill level and that I should not attempt activities beyond my comfort level without instructor guidance.</p>

<h3>Pool Rules &amp; Safety</h3>
<p>I agree to follow all posted pool rules and safety guidelines. I understand that my instructor may modify or end a session if safety concerns arise. I will notify my instructor immediately of any discomfort, difficulty breathing, or distress while in the water.</p>

<h3>Health Considerations</h3>
<p>I confirm that I do not have any conditions (ear infections, open wounds, severe allergies to pool chemicals) that would make aquatic activities medically inadvisable at this time.</p>`;

const VERSIONS = [
  { waiverType: 'core', activityType: null, version: '1.0', title: 'General Liability Waiver & Release of Claims', htmlText: CORE_HTML },
  { waiverType: 'ai_notice', activityType: null, version: '1.0', title: 'AI-Powered Features Notice & Consent', htmlText: AI_NOTICE_HTML },
  { waiverType: 'activity_addendum', activityType: 'HOME_GYM_PT', version: '1.0', title: 'Home Gym Personal Training Addendum', htmlText: HOME_GYM_HTML },
  { waiverType: 'activity_addendum', activityType: 'PARK_TRAINING', version: '1.0', title: 'Park & Outdoor Training Addendum', htmlText: PARK_TRAINING_HTML },
  { waiverType: 'activity_addendum', activityType: 'SWIMMING_LESSONS', version: '1.0', title: 'Swimming Lessons Addendum', htmlText: SWIMMING_HTML },
];

/**
 * Seed waiver versions if not already present.
 * @param {Function} getModel - Model getter from models/index.mjs
 * @returns {{ seeded: boolean, created: number, existing: number }}
 */
export default async function seedWaiverVersions(getModel) {
  try {
    const WaiverVersion = getModel('WaiverVersion');
    if (!WaiverVersion) {
      logger.warn('⚠️  WaiverVersion model not available — skipping waiver seed');
      return { seeded: false, created: 0, existing: 0, reason: 'model_unavailable' };
    }

    let created = 0;
    let existing = 0;

    for (const v of VERSIONS) {
      const textHash = sha256(v.htmlText);
      const [, wasCreated] = await WaiverVersion.findOrCreate({
        where: { waiverType: v.waiverType, activityType: v.activityType, version: v.version },
        defaults: {
          ...v,
          textHash,
          effectiveAt: new Date('2026-02-01T00:00:00Z'),
          retiredAt: null,
          requiresReconsent: false,
        },
      });

      if (wasCreated) created++;
      else existing++;
    }

    if (created > 0) {
      logger.info(`✅ Waiver versions seeded: ${created} created, ${existing} existing`);
    }

    return { seeded: created > 0, created, existing, reason: created > 0 ? 'seeded' : 'all_exist' };
  } catch (err) {
    logger.error('❌ Waiver version seeding error:', err.message);
    return { seeded: false, created: 0, existing: 0, reason: err.message };
  }
}
