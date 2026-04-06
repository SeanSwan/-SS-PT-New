/**
 * HomeData — Static data arrays for homepage sections
 */

import {
  Dumbbell, Activity, Apple, Heart, Monitor, Users,
  Target, Building2, Star, Crosshair, Shield, Brain, Zap,
  Sparkles, Mic2, Gamepad2, Paintbrush, Laugh, MapPin,
  Award, TrendingUp, Flame,
} from 'lucide-react';

export const FEATURES = [
  { icon: Dumbbell, title: 'Elite Personal Training', desc: 'Personalized coaching from NCEP-certified experts with 26 years experience. Science-based programming tailored to your goals.' },
  { icon: Activity, title: 'Performance Assessment', desc: 'Comprehensive evaluation using NASM OPT model to analyze movement patterns and build your optimal program.' },
  { icon: Apple, title: 'Nutrition Coaching', desc: 'Evidence-based nutrition protocols, personalized macro planning, and sustainable eating strategies.' },
  { icon: Heart, title: 'Recovery & Mobility', desc: 'Corrective exercise strategies, mobility training, and myofascial release guided by NASM CES principles.' },
  { icon: Monitor, title: 'Online Coaching', desc: 'Expert guidance anywhere with customized programs and regular check-ins through our AI-enhanced platform.' },
  { icon: Users, title: 'Group Performance', desc: 'Exclusive small-group sessions combining group energy with personalized attention for maximum results.' },
  { icon: Target, title: 'Sports-Specific Training', desc: 'Specialized programs for golfers, athletes, and weekend warriors. Rotational power and sport-specific conditioning.' },
  { icon: Building2, title: 'Corporate Wellness', desc: 'Comprehensive corporate wellness programs including on-site sessions, workshops, and team challenges.' },
];

export const PROGRAMS = [
  {
    name: 'Express Precision',
    meta: '30-Minute Sessions',
    badge: null as string | null,
    features: ['Targeted time-optimized training', 'Customized workout plans', 'Progress tracking', 'Flexible scheduling'],
  },
  {
    name: 'Signature Performance',
    meta: '60-Minute Sessions',
    badge: 'Most Popular',
    features: ['Full biomechanical coaching', 'NASM OHSA movement analysis', 'Nutrition guidance included', 'Priority scheduling', 'Monthly progress reports'],
  },
  {
    name: 'Transformation Programs',
    meta: 'Multi-Session Packages',
    badge: 'Best Value',
    features: ['Comprehensive NASM assessment', 'Periodized programming', 'Priority scheduling', 'Weekly check-ins', 'Full nutrition plan'],
  },
];

export const GOLF_FEATURES = [
  { icon: Crosshair, title: 'Rotational Power Training', desc: 'Generate explosive hip and torso rotation for longer drives and more consistent ball striking.' },
  { icon: Shield, title: 'Core Stability & Balance', desc: 'Build a rock-solid foundation that keeps your swing consistent from the first tee to the 18th green.' },
  { icon: Activity, title: 'Flexibility & Mobility', desc: 'Increase your range of motion for a fuller backswing and smoother follow-through without strain.' },
  { icon: Heart, title: 'Injury Prevention', desc: 'Corrective exercise protocols targeting common golf injuries: lower back, shoulders, elbows, and wrists.' },
  { icon: Brain, title: 'Movement Analysis', desc: 'NASM-guided assessment of your movement patterns to identify limitations affecting your swing mechanics.' },
];

export const TESTIMONIALS = [
  {
    quote: "Thanks to SwanStudios personal training, I achieved an incredible transformation. The tailored workouts and nutrition plan helped me lose 42 lbs, and I feel more energetic and confident than ever.",
    author: 'Sarah J.',
    descriptor: 'Corporate Executive',
    result: 'Lost 42 lbs in 7 months',
  },
  {
    quote: "Sean Swan completely transformed my golf game. Through targeted core stability work, rotational power training, and flexibility protocols, I added serious distance off the tee.",
    author: 'Robert T.',
    descriptor: 'Avid Golfer',
    result: 'Added 35 yards to drive',
  },
  {
    quote: "Training with Sean Swan got me in the best shape of my life. My department fitness test running time improved dramatically, and I feel stronger, faster, and more capable on the job.",
    author: 'Officer Martinez',
    descriptor: 'Law Enforcement',
    result: 'Run improved by 2:30',
  },
];

export const STATS = [
  { target: 26, suffix: '+', label: 'Years Experience', icon: Award },
  { target: 500, suffix: '+', label: 'Clients Transformed', icon: Users },
  { target: 10000, suffix: '+', label: 'Sessions Delivered', icon: TrendingUp, display: '10k' },
  { target: 312, suffix: '', label: 'Swimmers Taught', icon: Activity },
  { target: 12450, suffix: '+', label: 'Lbs Lost Together', icon: Flame, display: '12.4k' },
  { target: 98, suffix: '%', label: 'Client Satisfaction', icon: Star },
];

export const SOCIAL_CATEGORIES = [
  { title: 'Fitness & Training', desc: 'Log workouts, track progress, earn XP, challenge your community.', icon: Dumbbell },
  { title: 'Dance & Movement', desc: 'Share choreography, freestyle sessions, and movement art.', icon: Sparkles },
  { title: 'Music & Singing', desc: 'Produce beats, perform covers, share your creative process.', icon: Mic2 },
  { title: 'Gaming & Streaming', desc: 'Stream games, find your crew, support independent developers.', icon: Gamepad2 },
  { title: 'Art & Expression', desc: 'Showcase artwork, photography, and digital creations.', icon: Paintbrush },
  { title: 'Comedy', desc: 'Skits, memes, stand-up. Make the community laugh.', icon: Laugh },
  { title: 'Community Meetups', desc: 'Local events, walking clubs, group activities. Digital made real.', icon: MapPin },
  { title: 'YouTube-Style Video', desc: 'Long-form content, tutorials, vlogs. Your channel, your audience.', icon: Monitor },
];

export const TRAINER_FEATURES = [
  { icon: Dumbbell, title: '840+ Exercises', desc: 'Full NASM OPT 5-phase periodization library with Swan Coach workout builder.' },
  { icon: Mic2, title: 'Voice-First Swan Coach', desc: 'Log workouts hands-free, get real-time client insights, and manage sessions by voice.' },
  { icon: Shield, title: 'Fair Fees, Always', desc: 'Small transparent fee (~10%). No surprises. Your clients stay yours forever.' },
  { icon: MapPin, title: 'Works Anywhere', desc: 'Run your sessions, collect payments, and build your brand from any city, any country.' },
];
