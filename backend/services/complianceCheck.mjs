/**
 * ┌─── SERVICE: FTC/FDA Compliance Check ──────────────────────┐
 * │ PURPOSE: Scans AI-generated social media content for:       │
 * │  1. FTC violations (fake testimonials, missing disclosures) │
 * │  2. FDA violations (medical claims in wellness context)     │
 * │ Called before any post is approved for publishing.          │
 * └────────────────────────────────────────────────────────────┘
 */

// Medical/diagnostic terms that cross FDA wellness exemption boundary
const FDA_BLOCKED_TERMS = [
  'treats', 'cures', 'diagnoses', 'prevents disease',
  'clinical', 'prescription', 'medical treatment',
  'heals', 'remedy', 'therapeutic', 'scoliosis',
  'rotator cuff tear', 'herniated disc', 'torn ligament',
];

// Testimonial-like patterns that require FTC disclosure
const FTC_TESTIMONIAL_PATTERNS = [
  /[""].*changed my life.*[""]/i,
  /[""].*lost \d+ (pounds|lbs|kg).*[""]/i,
  /[""].*transformed.*[""]/i,
  /[""].*results.*guaranteed.*[""]/i,
  /client (said|says|reported|mentioned)/i,
  /—\s*[A-Z][a-z]+\s*$/m, // Attribution pattern like "— Sarah"
];

// Promotional patterns requiring #ad or #sponsored
const FTC_PROMO_PATTERNS = [
  /use (code|coupon|promo)/i,
  /affiliate/i,
  /sponsored/i,
  /paid partnership/i,
  /discount link/i,
  /shop (now|here|the link)/i,
  /link in bio/i,
];

/**
 * Check content for FDA and FTC compliance issues
 * @param {string} content - The post content to check
 * @param {boolean} isAIGenerated - Whether the content was AI-generated
 * @returns {{ compliant: boolean, warnings: string[], autoTags: string[] }}
 */
export function checkCompliance(content, isAIGenerated = false) {
  const warnings = [];
  const autoTags = [];
  const lower = content.toLowerCase();

  // FDA: Check for medical claims
  for (const term of FDA_BLOCKED_TERMS) {
    if (lower.includes(term.toLowerCase())) {
      warnings.push(
        `FDA: Content contains "${term}" which may constitute a medical claim. ` +
        `Reframe as general wellness (e.g., "supports mobility" instead of "treats").`
      );
    }
  }

  // FTC: Check for testimonial patterns
  for (const pattern of FTC_TESTIMONIAL_PATTERNS) {
    if (pattern.test(content)) {
      warnings.push(
        'FTC: Content resembles a client testimonial. If this quotes a real client, ' +
        'ensure you have written permission and add appropriate disclosure.'
      );
      if (isAIGenerated) {
        warnings.push(
          'FTC: AI-generated content that mimics testimonials violates FTC Endorsement Guides (Oct 2024). ' +
          'Remove testimonial-style language or clearly label as illustrative.'
        );
      }
      break; // One warning is enough
    }
  }

  // FTC: Check for promotional patterns
  for (const pattern of FTC_PROMO_PATTERNS) {
    if (pattern.test(content)) {
      if (!content.includes('#ad') && !content.includes('#sponsored') && !content.includes('Sponsored')) {
        autoTags.push('#ad');
        warnings.push(
          'FTC: Promotional content detected. Auto-adding #ad tag. ' +
          'Remove if this is organic editorial content.'
        );
      }
      break;
    }
  }

  return {
    compliant: warnings.length === 0,
    warnings,
    autoTags,
  };
}

/**
 * FDA-safe system prompt constraint for AI content generation
 */
export const FDA_WELLNESS_PROMPT = `
You are generating social media content for SwanStudios, a personal training business.
STRICT RULES:
- Only use "general wellness" language: supports, encourages, promotes, helps with
- NEVER use medical/diagnostic terms: treats, cures, diagnoses, prevents disease, heals, remedy
- NEVER claim specific medical outcomes (e.g., "fixes back pain", "cures obesity")
- Frame everything as fitness and lifestyle improvement
- Include "Results vary. Consult a healthcare provider before starting any fitness program." when discussing results
`;

export default { checkCompliance, FDA_WELLNESS_PROMPT };
