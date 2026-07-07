/**
 * AboutData — Shared data arrays for the About page sections
 */

import { Brain, Target, Shield, Heart } from 'lucide-react';
import React from 'react';
import {
  MARKETING_STATS,
  YEARS_EXPERIENCE_CLAIM,
  EXERCISE_LIBRARY_CLAIM,
} from '../../../../content/marketingStats';

export const certifications = [
  { name: 'NCEP Certified', full: 'National College of Exercise Professionals (2000)' },
  { name: 'NASM Workshop', full: 'National Academy of Sports Medicine — OPT Protocol Trained' },
  { name: 'Pro Results Certified', full: 'LA Fitness Personal Training' },
  { name: 'GGFI Certified', full: "Gold's Gym Fitness Institute" },
  { name: '24 Hour Fitness', full: 'Master Trainer' },
  { name: 'Redwood Code Academy', full: 'Full Stack Development Bootcamp Graduate (2017)' },
  { name: 'MIT CS Courses', full: 'Computer Science — Online Coursework' },
  { name: 'Zero To Mastery', full: 'Complete React Developer + Data Structures & Algorithms (2020–2021)' },
];

export const statsData = [
  { numericValue: MARKETING_STATS.yearsExperience.value, suffix: MARKETING_STATS.yearsExperience.suffix, label: 'Years Experience', delay: 0, color: '#8B5CF6' },
  { numericValue: MARKETING_STATS.clientsTransformed.value, suffix: MARKETING_STATS.clientsTransformed.suffix, label: 'Clients Transformed', delay: 0.2, color: '#8B5CF6' },
  { numericValue: MARKETING_STATS.satisfactionPct.value, suffix: MARKETING_STATS.satisfactionPct.suffix, label: 'Client Satisfaction', delay: 0.4, color: '#60C0F0' },
  { numericValue: MARKETING_STATS.swimmersTaught.value, suffix: MARKETING_STATS.swimmersTaught.suffix, label: 'Swimmers Taught', delay: 0.6, color: '#9B59B6' },
];

export const featureList = [
  'Personalized biomechanical assessments for every client',
  'NASM OPT model-based progressive programming',
  'Swan Coach-enhanced workout optimization and injury prevention',
  'Evidence-based nutrition protocols and macro planning',
];

export const milestones = [
  { year: '2000', text: 'Earned NCEP certification and completed NASM workshops — began personal training career' },
  { year: '2005', text: 'Physical therapy aid at Kerlan Jobe Health South — deepened injury rehab expertise' },
  { year: '2010', text: 'Launched specialized programs for athletes at elite gyms across Los Angeles' },
  { year: '2013', text: 'Founded SwanStudios with wife Jasmine — blending coaching with technology' },
  { year: '2017', text: 'Graduated from Redwood Code Academy coding bootcamp and completed MIT computer science courses online' },
  { year: '2018', text: 'Applied development skills to build the SwanStudios Coach-enhanced health community platform' },
  { year: '2020', text: 'Completed Zero To Mastery Academy — React Developer + Data Structures & Algorithms' },
  { year: '2024', text: 'Leading innovation as Full Stack Engineer at SwanStudios, transitioning into AI development' },
];

export const philosophies = [
  {
    title: 'Science-Backed Training',
    body: 'Every program is grounded in peer-reviewed exercise science and periodization principles, ensuring you get measurable, predictable results.',
    icon: Brain,
  },
  {
    title: 'Personalized Programs',
    body: 'No two bodies are the same. We build your plan around your unique biomechanics, goals, schedule, and recovery capacity.',
    icon: Target,
  },
  {
    title: 'Sustainable Results',
    body: 'Quick fixes fade. We focus on building habits, movement literacy, and progressive overload that keep you strong for decades.',
    icon: Shield,
  },
  {
    title: 'Collective Power',
    body: 'The corporations cutting safety nets are counting on us staying isolated. SwanStudios is what happens when a community decides to take care of itself.',
    icon: Heart,
  },
];

export const promiseCards = [
  {
    title: 'Fair Always',
    body: 'We take a small fair fee from trainer transactions. Nothing hidden. Nothing predatory. If you thrive, we thrive.',
  },
  {
    title: 'Your Data, Your Story',
    body: 'Your workout history, your progress, your community — it lives here permanently and it belongs to you. Not advertisers.',
  },
  {
    title: 'Community Over Profit',
    body: 'We will never sell your attention to the highest bidder. Every decision we make is filtered through one question: is this good for our community?',
  },
];

export const competitiveEdgeCards = [
  {
    title: 'NASM-Protocol Coaching',
    subtitle: 'Not generic ChatGPT advice',
    body: `Every workout follows the NASM Optimum Performance Training model — 5-phase periodization, tempo prescriptions, and correct %1RM calculations built from ${YEARS_EXPERIENCE_CLAIM} years of real coaching.`,
  },
  {
    title: 'Your History, Forever',
    subtitle: 'Not a chatbot that forgets',
    body: 'SwanStudios remembers every rep, every PR, every trend. 50+ Victory charts track your progress across body composition, strength curves, and training volume over time.',
  },
  {
    title: 'Real Trainer Connection',
    subtitle: 'Not a faceless algorithm',
    body: 'Direct messaging with NASM-protocol trainers who review your form, adjust your programming, and know your injury history. Technology amplifies human coaching — it never replaces it.',
  },
  {
    title: `${EXERCISE_LIBRARY_CLAIM} Exercise Library`,
    subtitle: 'Not "try some push-ups"',
    body: 'A curated database with instructions, equipment tags, difficulty ratings, and muscle-group targeting. Every exercise mapped to the NASM OPT protocol phases.',
  },
  {
    title: 'Gamified Progression',
    subtitle: 'Not another boring log',
    body: 'XP, badges, 5-tier rarity system, skill trees, and streaks turn consistency into an adventure. Earn your way from Common to Legendary status.',
  },
  {
    title: 'Community-First Pricing',
    subtitle: 'Not $20/month for a chatbot',
    body: 'Free tier with full workout logging. Guardian tier is donation-based — pay what you can. Your fitness journey should never depend on your wallet.',
  },
];
