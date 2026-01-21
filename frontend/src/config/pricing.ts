export type PricingPackage = {
  id: string;
  name: string;
  duration?: number;
  sessions?: number;
  price: number;
  perSession?: number;
  savings?: number;
  description: string;
  features: string[];
  recommended?: boolean;
  bestValue?: boolean;
};

export const PACKAGES: PricingPackage[] = [
  {
    id: 'express-30',
    name: 'Express 30',
    duration: 30,
    price: 110,
    description: '30-minute high-intensity session',
    features: [
      'Focused workout',
      'Quick results',
      'Flexible scheduling'
    ]
  },
  {
    id: 'signature-60',
    name: 'Signature 60',
    duration: 60,
    price: 175,
    description: '60-minute comprehensive training',
    features: [
      'Full workout',
      'Technique coaching',
      'Progress tracking'
    ]
  },
  {
    id: 'signature-60-ai',
    name: 'Signature 60 + AI Data',
    duration: 60,
    price: 200,
    description: '60-minute session with AI-powered tracking',
    features: [
      'Everything in Signature 60',
      '85-question assessment',
      'NASM movement screen',
      'AI workout generation',
      'Comprehensive progress analytics'
    ],
    recommended: true
  },
  {
    id: 'transformation-pack',
    name: 'Transformation Pack',
    sessions: 10,
    price: 1600,
    perSession: 160,
    savings: 200,
    description: '10-session commitment package',
    features: [
      'Best per-session rate',
      '$200 savings vs individual',
      'Priority scheduling',
      'Nutrition guidance included'
    ],
    bestValue: true
  }
];
