/**
 * HomepageContent.ts — Shared content model for all cinematic homepage variants.
 *
 * All text, routes, SEO meta, and structural data extracted from the production
 * homepage (v2.0). All 3 variants render from this single data source to ensure
 * content parity and fair visual comparison.
 *
 * Minor wording polish is allowed (tighter CTA phrasing, better cadence) but
 * core business meaning is preserved exactly.
 */

// ─── Type Definitions ────────────────────────────────────────────────

export interface NavLink {
  label: string;
  path: string;
}

export interface HeroContent {
  heading: string;
  headingAccent: string;
  subheading: string;
  ctaPrimary: { label: string; path: string };
  ctaSecondary: { label: string; path: string };
  badge: string;
}

export interface ProgramCard {
  title: string;
  subtitle: string;
  idealFor: string;
  badge?: string;
  features: string[];
  ctaLabel: string;
  ctaPath: string;
  image?: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: string; // lucide-react icon name
}

export interface CreativeCard {
  title: string;
  description: string;
  bullets: string[];
  icon: string;
}

export interface TrainerProfile {
  name: string;
  title: string;
  bio: string;
  certifications: string[];
  specialties: string[];
  rating: number;
  reviewCount: number;
  social: { platform: string; url: string }[];
  ctaLabel: string;
  ctaPath: string;
  image?: string;
}

export interface Testimonial {
  name: string;
  duration: string;
  category: string;
  rating: number;
  quote: string;
  metrics: { label: string; before: string; after: string; change: string }[];
  programLink?: { label: string; path: string };
}

export interface StatItem {
  value: string;
  label: string;
  sublabel: string;
  icon: string;
}

export interface SocialPlatform {
  platform: 'facebook' | 'instagram' | 'youtube';
  url: string;
  handle: string;
}

export interface FooterLinkGroup {
  title: string;
  links: { label: string; path: string }[];
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface LegalLink {
  label: string;
  path: string;
}

export interface HomepageContent {
  seo: {
    title: string;
    description: string;
    keywords: string;
    ogTitle: string;
    ogDescription: string;
    ogType: string;
    canonicalUrl: string;
  };
  nav: {
    marketingLinks: NavLink[];
    ctaLabel: string;
    ctaPath: string;
  };
  hero: HeroContent;
  programs: {
    sectionTitle: string;
    sectionDescription: string;
    cards: ProgramCard[];
    bottomCta: { label: string; path: string };
  };
  features: {
    sectionTitle: string;
    sectionDescription: string;
    items: FeatureItem[];
  };
  creativeExpression: {
    sectionTitle: string;
    sectionBody: string;
    sectionBodyBold: string;
    sectionBodyContinued: string;
    cards: CreativeCard[];
  };
  trainers: {
    sectionTitle: string;
    sectionDescription: string;
    profiles: TrainerProfile[];
  };
  testimonials: {
    sectionTitle: string;
    sectionDescription: string;
    items: Testimonial[];
  };
  fitnessStats: {
    sectionTitle: string;
    sectionDescription: string;
    stats: StatItem[];
  };
  socialFeed: {
    sectionTitle: string;
    sectionDescription: string;
    platforms: SocialPlatform[];
  };
  newsletter: {
    heading: string;
    subheading: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    buttonText: string;
    privacyNote: string;
    benefits: { title: string; description: string; icon: string }[];
  };
  footer: {
    brandName: string;
    brandTagline: string;
    brandDescription: string;
    linkGroups: FooterLinkGroup[];
    contactInfo: {
      location: string;
      phone: string;
      email: string;
      hours: string;
    };
    social: SocialLink[];
    legal: LegalLink[];
    copyright: string;
    madeWith: string;
  };
}

// ─── Content Data ────────────────────────────────────────────────────

export const homepageContent: HomepageContent = {
  seo: {
    title: 'SwanStudios - Elite Personal Training & Fitness Coaching',
    description:
      'Transform your body and elevate your life with SwanStudios\' elite personal training, performance assessment, nutrition coaching, and comprehensive fitness solutions. Serving Orange County and Los Angeles.',
    keywords:
      'personal training, fitness coaching, nutrition coaching, performance assessment, online coaching, Orange County fitness, Los Angeles personal trainer, NASM certified, elite training',
    ogTitle: 'SwanStudios - Elite Personal Training',
    ogDescription:
      'Experience the world\'s first Fitness Social Ecosystem with expert trainers and AI-powered tracking.',
    ogType: 'website',
    canonicalUrl: 'https://swanstudios.com',
  },

  nav: {
    marketingLinks: [
      { label: 'Home', path: '/' },
      { label: 'Store', path: '/store' },
      { label: 'Video Library', path: '/video-library' },
      { label: 'Contact', path: '/contact' },
      { label: 'About', path: '/about' },
    ],
    ctaLabel: 'View Packages',
    ctaPath: '/shop',
  },

  hero: {
    badge: 'Elite Personal Training',
    heading: 'Forge Your Body,',
    headingAccent: 'Free Your Spirit',
    subheading:
      'The world\'s first Fitness Social Ecosystem. Expert coaching refined by 25 years of science, AI-powered tracking, and a community that fuels your transformation.',
    ctaPrimary: { label: 'View Packages in Store', path: '/shop' },
    ctaSecondary: { label: 'Book Free Movement Screen', path: '/contact' },
  },

  programs: {
    sectionTitle: 'Discover Your Path',
    sectionDescription:
      'Every transformation begins with understanding your body. Our NASM-certified programs assess your movement patterns and craft a strategy that delivers lasting results. Explore packages and pricing in our store.',
    cards: [
      {
        title: 'Express Precision',
        subtitle: 'Refined for Busy Schedules',
        idealFor: 'Professionals who demand maximum efficiency',
        features: [
          '30-minute high-intensity precision sessions',
          'Metabolic conditioning for rapid results',
          'Mobility + key compound lifts focus',
          'Flexible scheduling that fits your life',
        ],
        ctaLabel: 'View in Store',
        ctaPath: '/shop',
      },
      {
        title: 'Signature Performance',
        subtitle: 'The Premium Coaching Experience',
        idealFor: 'Serious athletes and goal-driven individuals',
        badge: 'Most Popular',
        features: [
          '60-minute expert biomechanical coaching',
          'Full NASM movement analysis (OHSA protocol)',
          'Strength + hypertrophy programming',
          'Optional AI performance tracking upgrade',
        ],
        ctaLabel: 'View in Store',
        ctaPath: '/shop',
      },
      {
        title: 'Transformation Programs',
        subtitle: 'Commit to Lasting Change',
        idealFor: 'Clients ready for a meaningful lifestyle investment',
        badge: 'Best Value',
        features: [
          'Multi-session commitment packages available',
          'Comprehensive NASM assessment included',
          'Priority scheduling + progress tracking',
          'Best value for serious transformation goals',
        ],
        ctaLabel: 'View in Store',
        ctaPath: '/shop',
      },
    ],
    bottomCta: { label: 'View All Packages & Pricing', path: '/shop' },
  },

  features: {
    sectionTitle: 'Premium Services',
    sectionDescription:
      'Comprehensive fitness solutions designed to transform your body, elevate your performance, and optimize your well-being',
    items: [
      {
        title: 'Elite Personal Training',
        description:
          'Experience personalized coaching from NASM-certified experts with over 25 years of experience. Our science-based approach is tailored to your unique goals and needs.',
        icon: 'Dumbbell',
      },
      {
        title: 'Performance Assessment',
        description:
          'Our comprehensive evaluation uses cutting-edge technology to analyze your movement patterns, strength imbalances, and metabolic efficiency to create your optimal program.',
        icon: 'Activity',
      },
      {
        title: 'Nutrition Coaching',
        description:
          'Transform your relationship with food through our evidence-based nutrition protocols, personalized macro planning, and sustainable eating strategies.',
        icon: 'Apple',
      },
      {
        title: 'Recovery & Mobility',
        description:
          'Optimize your body\'s repair process with cutting-edge recovery techniques including mobility training, myofascial release, and specialized regeneration protocols.',
        icon: 'Heart',
      },
      {
        title: 'Online Coaching',
        description:
          'Get expert guidance anywhere with customized training programs, nutrition plans, and regular check-ins through our premium coaching platform.',
        icon: 'Monitor',
      },
      {
        title: 'Group Performance',
        description:
          'Join our exclusive small-group sessions combining the energy of group workouts with personalized attention for maximum results at a more accessible price point.',
        icon: 'Users',
      },
      {
        title: 'Sports-Specific Training',
        description:
          'Elevate your athletic performance with specialized programs designed for your sport, focusing on the specific skills, movements, and energy systems you need to excel.',
        icon: 'Trophy',
      },
      {
        title: 'Corporate Wellness',
        description:
          'Boost team productivity and morale with our comprehensive corporate wellness programs including on-site fitness sessions, workshops, and wellness challenges.',
        icon: 'Building',
      },
    ],
  },

  creativeExpression: {
    sectionTitle: 'FORGE YOUR BODY, FREE YOUR SPIRIT',
    sectionBody:
      'At SwanStudios, we build warriors and artists. True power is found when peak physical strength is united with unbridled creative expression. Here, we don\'t just lift weights; we lift each other.',
    sectionBodyBold: 'EVERY POSITIVE ACTION IS REWARDED',
    sectionBodyContinued:
      '- your journey is holistic. You earn points for everything: crushing a workout, creating art, motivating a teammate. In this ecosystem, your growth in body, mind, and spirit is our most valued currency.',
    cards: [
      {
        title: 'Dance',
        description:
          'Unleash your power through rhythm. Express your warrior spirit through movement that connects your body to your soul.',
        bullets: [
          'Build explosive core strength and flexibility',
          'Master coordination and balance like a fighter',
          'Channel stress into pure energy and euphoria',
          'Unite with your tribe through powerful group sessions',
        ],
        icon: 'Music',
      },
      {
        title: 'Art & Visual Expression',
        description:
          'Channel your intensity onto the canvas. Transform your inner fire into visual masterpieces that tell your transformation story.',
        bullets: [
          'Develop precision and control in every stroke',
          'Unlock creative problem-solving superpowers',
          'Transform emotions into powerful visual statements',
          'Create your personal victory gallery',
        ],
        icon: 'Palette',
      },
      {
        title: 'Vocal & Sound Work',
        description:
          'Find the strength in your own voice. Unleash the power within through vocal techniques that amplify your inner warrior.',
        bullets: [
          'Build breathing power and explosive lung capacity',
          'Transform anxiety into vocal strength and confidence',
          'Command attention with unshakeable self-expression',
          'Connect with the primal power of sound and rhythm',
        ],
        icon: 'Mic',
      },
      {
        title: 'Community & Heart',
        description:
          'Connect with a tribe that shares your fire. Plug into a global family that grinds together, grows together, and celebrates every single victory. No more training alone!',
        bullets: [
          'Feel the power of collective energy fueling your journey',
          'Unite with warriors who share your relentless drive',
          'Experience the adrenaline of being part of a movement',
          'Unleash your ultimate potential in a team that believes in greatness',
        ],
        icon: 'Heart',
      },
    ],
  },

  trainers: {
    sectionTitle: 'Meet Our Expert Coaching Team',
    sectionDescription:
      'Our certified trainers combine decades of experience with cutting-edge methodologies to help you achieve extraordinary results.',
    profiles: [
      {
        name: 'Sean Swan',
        title: 'Head Coach & Founder',
        bio: 'With over 25 years of elite coaching experience, Sean brings unmatched expertise in biomechanics, performance science, and transformative training methodologies. His evidence-based approach has helped hundreds of clients achieve extraordinary results.',
        certifications: ['NASM-CPT', 'CSCS', 'PES'],
        specialties: ['Elite Training', 'NASM Protocols', 'Performance Science'],
        rating: 5,
        reviewCount: 234,
        social: [
          { platform: 'linkedin', url: 'https://linkedin.com/in/seanswan' },
          { platform: 'instagram', url: 'https://instagram.com/seanswan_fitness' },
        ],
        ctaLabel: 'Schedule My Session',
        ctaPath: '/contact',
      },
      {
        name: 'Jasmine Hearon (Swan)',
        title: 'Co-Founder & Elite Performance Coach',
        bio: 'Since 2012, Jasmine has been the cornerstone of SwanStudios\' success. Her extensive background as a former Gold\'s Gym manager brings unparalleled leadership and training expertise to our elite coaching team.',
        certifications: ['NASM-CPT'],
        specialties: ['Leadership Training', 'Performance Coaching', 'Program Development'],
        rating: 5,
        reviewCount: 147,
        social: [
          { platform: 'linkedin', url: 'https://linkedin.com/in/jasmineswan' },
          { platform: 'instagram', url: 'https://instagram.com/jasmine_swan_fitness' },
        ],
        ctaLabel: 'Schedule My Session',
        ctaPath: '/contact',
      },
    ],
  },

  testimonials: {
    sectionTitle: 'Success Stories',
    sectionDescription:
      'Hear from real clients who transformed their bodies and lives with our expert coaching at Swanstudios.',
    items: [
      {
        name: 'David Chen',
        duration: 'Training for 8 months',
        category: 'Body Transformation',
        rating: 5,
        quote:
          '"SwanStudios completely changed my approach to fitness. The personalized coaching and science-based methodology helped me lose 35 pounds while gaining significant muscle mass. The results speak for themselves."',
        metrics: [
          { label: 'weight', before: '215 lbs', after: '180 lbs', change: '-16%' },
          { label: 'bodyFat', before: '28%', after: '15%', change: '-46%' },
          { label: 'strength', before: '135 lbs', after: '225 lbs', change: '+67%' },
        ],
        programLink: { label: 'Learn about the program David used', path: '/store#program-body-transformation' },
      },
      {
        name: 'Carlos Mendez',
        duration: 'Training for 1.5 years',
        category: 'Sports Performance',
        rating: 5,
        quote:
          '"Swanstudios coaching not only accelerated my recovery but also boosted my performance on the field. Their expert guidance and personalized approach made all the difference."',
        metrics: [
          { label: 'sprint', before: '7.2s', after: '6.1s', change: '-15%' },
          { label: 'vertJump', before: '24 in', after: '32 in', change: '+33%' },
          { label: 'strength', before: '150 lbs', after: '245 lbs', change: '+63%' },
        ],
        programLink: { label: 'Learn about the program Carlos used', path: '/store#program-athlete-rehab-program' },
      },
      {
        name: 'Sarah Thompson',
        duration: 'Training for 6 months',
        category: 'Wellness & Recovery',
        rating: 5,
        quote:
          '"After years of chronic back pain, the mobility and recovery program at SwanStudios gave me my life back. I\'m stronger, more flexible, and pain-free for the first time in a decade."',
        metrics: [
          { label: 'painLevel', before: '8/10', after: '1/10', change: '-87%' },
          { label: 'flexibility', before: 'Limited', after: 'Full ROM', change: '+100%' },
          { label: 'strength', before: '65 lbs', after: '135 lbs', change: '+108%' },
        ],
        programLink: { label: 'Learn about the program Sarah used', path: '/store#program-recovery-wellness' },
      },
    ],
  },

  fitnessStats: {
    sectionTitle: 'Our Results in Numbers',
    sectionDescription:
      'Proven success metrics from years of transforming lives through elite fitness coaching',
    stats: [
      { value: '500+', label: 'Client Transformations', sublabel: 'successful journeys', icon: 'Users' },
      { value: '12,000+', label: 'Weight Lost', sublabel: 'pounds collectively', icon: 'TrendingDown' },
      { value: '25,000+', label: 'Training Sessions', sublabel: 'hours of coaching', icon: 'Clock' },
      { value: '8.5M', label: 'Calories Burned', sublabel: 'million total', icon: 'Flame' },
      { value: '4.2', label: 'Average BMI Reduction', sublabel: 'points', icon: 'BarChart' },
      { value: '150+', label: 'New Swimmers Taught', sublabel: 'confident in the water', icon: 'Waves' },
    ],
  },

  socialFeed: {
    sectionTitle: 'Follow Our Journey',
    sectionDescription:
      'Training insights, client transformations, and behind-the-scenes content across our social channels.',
    platforms: [
      { platform: 'facebook', url: 'https://facebook.com/seanswantech', handle: 'SwanStudios' },
      { platform: 'instagram', url: 'https://www.instagram.com/seanswantech', handle: '@sswanstudios' },
      { platform: 'youtube', url: 'https://www.youtube.com/@swanstudios2018', handle: 'SwanStudios' },
    ],
  },

  newsletter: {
    heading: 'Join Our Fitness Community',
    subheading:
      'Subscribe to receive exclusive workouts, nutrition tips, and special offers to accelerate your fitness journey',
    namePlaceholder: 'Your Name',
    emailPlaceholder: 'Your Email Address',
    buttonText: 'Subscribe Now',
    privacyNote: 'We respect your privacy. Unsubscribe at any time.',
    benefits: [
      {
        title: 'Exclusive Workouts',
        description: 'Get access to exclusive workouts and training tips from our elite coaching team.',
        icon: 'Dumbbell',
      },
      {
        title: 'Nutrition Guides',
        description: 'Receive monthly nutrition guides with meal plans and recipes to fuel your transformation.',
        icon: 'Apple',
      },
      {
        title: 'Mindset Coaching',
        description: 'Learn the mental strategies used by elite athletes to stay motivated and overcome obstacles.',
        icon: 'Brain',
      },
    ],
  },

  footer: {
    brandName: 'SwanStudios',
    brandTagline: 'Excellence in Performance Training',
    brandDescription:
      'Transforming fitness through personalized training programs and expert guidance to help you achieve your health and wellness goals. Our elite coaching team combines proven science with personalized attention.',
    linkGroups: [
      {
        title: 'Quick Links',
        links: [
          { label: 'Home', path: '/' },
          { label: 'About Us', path: '/about' },
          { label: 'Store', path: '/store' },
          { label: 'Contact', path: '/contact' },
          { label: 'Video Library', path: '/video-library' },
        ],
      },
      {
        title: 'Programs',
        links: [
          { label: 'Personal Training', path: '/programs/personal-training' },
          { label: 'Group Classes', path: '/programs/group-classes' },
          { label: 'Nutrition Coaching', path: '/programs/nutrition' },
          { label: 'Online Training', path: '/programs/online-training' },
          { label: 'Recovery & Wellness', path: '/programs/recovery' },
        ],
      },
    ],
    contactInfo: {
      location: 'Anaheim Hills',
      phone: '(714) 947-3221',
      email: 'loveswanstudios@protonmail.com',
      hours: 'Monday-Sunday: By Appointment Only',
    },
    social: [
      { platform: 'Facebook', url: 'https://facebook.com/seanswantech' },
      { platform: 'Bluesky', url: 'https://bsky.app/profile/swanstudios.bsky.social' },
      { platform: 'Instagram', url: 'https://www.instagram.com/seanswantech' },
      { platform: 'LinkedIn', url: 'https://linkedin.com' },
      { platform: 'YouTube', url: 'https://www.youtube.com/@swanstudios2018' },
    ],
    legal: [
      { label: 'Privacy Policy', path: '/privacy' },
      { label: 'Terms of Service', path: '/terms' },
      { label: 'Sitemap', path: '/sitemap' },
    ],
    copyright: '2026 Swan Studios. All Rights Reserved.',
    madeWith: 'Made with love in California',
  },
};

export default homepageContent;
