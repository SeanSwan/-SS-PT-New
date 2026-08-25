/**
 * Canonical pricing for the printable client-handoff sheet.
 *
 * SwanStudios pricing is FLAT: $175 per 60-minute session, $110 per 30-minute
 * session, with NO volume discounts. The multi-month programs are the same $175
 * rate multiplied by the session count - they buy commitment and scheduling
 * priority, not a lower unit price.
 *
 * This file previously advertised a $200 tier that does not exist and a
 * 10-session pack at $160/session marked "Save $200" - a volume discount the
 * business does not offer. Because the only consumer is the sheet a trainer
 * hands a prospective client, that drift was a live mis-quote risk.
 *
 * If pricing changes, it changes here AND in the storefront seeder. Do not
 * introduce a per-session rate below $175 for 60-minute training without an
 * explicit decision from Sean.
 */
export type PricingPackage = {
  id: string;
  name: string;
  duration?: number;
  sessions?: number;
  price: number;
  perSession?: number;
  description: string;
  features: string[];
  recommended?: boolean;
  bestValue?: boolean;
};

export const SESSION_RATE_60_MIN = 175;
export const SESSION_RATE_30_MIN = 110;

export const PACKAGES: PricingPackage[] = [
  {
    id: 'express-30',
    name: 'Express 30',
    duration: 30,
    price: SESSION_RATE_30_MIN,
    description: '30-minute focused training session',
    features: [
      'Targeted workout',
      'Technique coaching',
      'Progress logged to your record'
    ]
  },
  {
    id: 'signature-60',
    name: 'Signature 60',
    duration: 60,
    price: SESSION_RATE_60_MIN,
    description: '60-minute comprehensive training session',
    features: [
      'Full programmed workout',
      'Movement and technique coaching',
      'Progress tracking and charts'
    ],
    recommended: true
  },
  {
    id: 'program-3-month',
    name: '3-Month Program',
    sessions: 48,
    price: 8400,
    perSession: SESSION_RATE_60_MIN,
    description: 'Four sessions per week for three months',
    features: [
      '48 sessions at the standard $175 rate',
      'Structured progression block',
      'Priority scheduling',
      'Full progress reporting'
    ]
  },
  {
    id: 'program-6-month',
    name: '6-Month Program',
    sessions: 96,
    price: 16800,
    perSession: SESSION_RATE_60_MIN,
    description: 'Four sessions per week for six months',
    features: [
      '96 sessions at the standard $175 rate',
      'Multi-block periodized programming',
      'Priority scheduling',
      'Full progress reporting'
    ],
    bestValue: true
  },
  {
    id: 'program-12-month',
    name: '12-Month Program',
    sessions: 192,
    price: 33600,
    perSession: SESSION_RATE_60_MIN,
    description: 'Four sessions per week for a full year',
    features: [
      '192 sessions at the standard $175 rate',
      'Year-long periodized plan',
      'Priority scheduling',
      'Full progress reporting'
    ]
  }
];
