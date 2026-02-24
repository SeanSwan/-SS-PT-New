# Homepage Cinematic Overhaul — Baseline Audit

> **Date:** 2026-02-23 | **Source:** Production (`https://sswanstudios.com`) | **Console Errors:** 0

## Screenshots

| Viewport | File | Notes |
|----------|------|-------|
| Desktop 1280x800 | `baseline-homepage-1280w-viewport.png` | Full page, all 9 sections visible |
| Tablet 768x1024 | `baseline-homepage-768w-tablet.png` | Full page, stacked layout |
| Mobile 375x812 | `baseline-homepage-375w-mobile.png` | Full page, single column |

---

## Section Order (Production)

| # | Section | Component | Key Heading |
|---|---------|-----------|-------------|
| 0 | Construction Banner | `ConstructionBannerContainer` | "SwanStudios Platform Enhanced - Nearly Complete" |
| 1 | Header/Navbar | `header.tsx` (fixed, 56px) | Logo + hamburger (mobile) / nav links (desktop) |
| 2 | Hero | `Hero-Section.V2.tsx` | "Forge Your Body, Free Your Spirit" |
| 3 | Programs | `ProgramsOverview.V3.tsx` | "Discover Your Path" |
| 4 | Features | `FeaturesSection.V2.tsx` | "Premium Services" |
| 5 | Creative Expression | `CreativeExpressionSection.tsx` | "FORGE YOUR BODY, FREE YOUR SPIRIT" |
| 6 | Trainer Profiles | `TrainerProfilesSection.tsx` | "Meet Our Expert Coaching Team" |
| 7 | Testimonials | `TestimonialSlider` | "Success Stories" |
| 8 | Fitness Stats | `FitnessStats` | "Our Results in Numbers" |
| 9 | Social Feed | `InstagramFeed` | "Follow Our Journey" |
| 10 | Newsletter | `NewsletterSignup` | "Join Our Fitness Community" |
| 11 | Footer | `Footer.tsx` | SwanStudios brand + 4-col grid |

---

## Content Preservation Map

### SEO Meta Tags (from `<Helmet>` in `HomePage.V2.component.tsx`)
```
title: "SwanStudios - Elite Personal Training & Fitness Coaching"
description: "Transform your body and elevate your life with SwanStudios' elite personal training, performance assessment, nutrition coaching, and comprehensive fitness solutions. Serving Orange County and Los Angeles."
keywords: "personal training, fitness coaching, nutrition coaching, performance assessment, online coaching, Orange County fitness, Los Angeles personal trainer, NASM certified, elite training"
og:title: "SwanStudios - Elite Personal Training"
og:description: "Experience the world's first Fitness Social Ecosystem with expert trainers and AI-powered tracking."
og:type: "website"
canonical: "https://swanstudios.com"
```

### Construction Banner
- Message: "SwanStudios Platform Enhanced - Nearly Complete"
- Sub-message: "We're putting the finishing touches on your upgraded experience"
- CTAs: "Contact Us" → `/contact`, "Schedule Orientation" → `/contact`
- Dismissible (sessionStorage `construction-banner-closed`)
- Hidden on dashboard routes

### Header/Navbar
**Nav links (desktop):** Home `/`, SwanStudios Store `/store`, Login `/login`, Sign Up `/register`, Video Library `/video-library`, Contact `/contact`, About Us `/about`
**Action icons (mobile):** Cart, Theme Switch, Sign In, Hamburger menu
**Behavior:** Fixed position, hide-on-scroll-down/show-on-scroll-up, glassmorphism, z-index 1000
**Auth-aware:** Login/logout toggle, profile icon, role-based dashboard links via `useHeaderState`
**Cart:** `ShoppingCart` component with modal

### Hero Section
- **Badge:** "Elite Personal Training"
- **H1:** "Forge Your Body, Free Your Spirit"
- **Subheading:** "The world's first Fitness Social Ecosystem. Expert coaching refined by 25 years of science, AI-powered tracking, and a community that fuels your transformation."
- **CTA Primary:** "View Packages in Store" → `/shop`
- **CTA Secondary:** "Book Free Movement Screen" → `/contact`
- **Background:** Swans.mp4 video with overlay

### Programs Section
- **H2:** "Discover Your Path"
- **Description:** "Every transformation begins with understanding your body. Our NASM-certified programs assess your movement patterns and craft a strategy that delivers lasting results. Explore packages and pricing in our store."
- **Card 1 — Express Precision:** "Refined for Busy Schedules" / "Ideal for: Professionals who demand maximum efficiency" / 4 bullet points / "View in Store" → `/shop`
- **Card 2 — Signature Performance:** "The Premium Coaching Experience" / "Most Popular" badge / "Ideal for: Serious athletes and goal-driven individuals" / 4 bullet points / "View in Store" → `/shop`
- **Card 3 — Transformation Programs:** "Commit to Lasting Change" / "Best Value" badge / "Ideal for: Clients ready for a meaningful lifestyle investment" / 4 bullet points / "View in Store" → `/shop`
- **Bottom CTA:** "View All Packages & Pricing" → `/shop`

### Features Section
- **H2:** "Premium Services"
- **Description:** "Comprehensive fitness solutions designed to transform your body, elevate your performance, and optimize your well-being"
- **8 Cards:**
  1. Elite Personal Training — NASM-certified, 25 years experience, science-based
  2. Performance Assessment — movement patterns, strength imbalances, metabolic efficiency
  3. Nutrition Coaching — evidence-based, macro planning, sustainable strategies
  4. Recovery & Mobility — myofascial release, mobility training, regeneration protocols
  5. Online Coaching — remote programs, nutrition plans, regular check-ins
  6. Group Performance — small-group, personalized attention, accessible pricing
  7. Sports-Specific Training — sport-specific skills, movements, energy systems
  8. Corporate Wellness — on-site sessions, workshops, wellness challenges

### Creative Expression Section
- **H2:** "FORGE YOUR BODY, FREE YOUR SPIRIT"
- **Body text:** "At SwanStudios, we build warriors and artists. True power is found when peak physical strength is united with unbridled creative expression. Here, we don't just lift weights; we lift each other. **EVERY POSITIVE ACTION IS REWARDED** - your journey is holistic..."
- **4 Cards:**
  1. Dance — rhythm, core strength, flexibility, group sessions
  2. Art & Visual Expression — canvas, creative problem-solving, victory gallery
  3. Vocal & Sound Work — breathing power, vocal strength, self-expression
  4. Community & Heart — tribe, collective energy, warriors, movement

### Trainer Profiles
- **H2:** "Meet Our Expert Coaching Team"
- **Description:** "Our certified trainers combine decades of experience with cutting-edge methodologies to help you achieve extraordinary results."
- **Carousel (2 trainers):**
  - **Sean Swan:** Head Coach & Founder, 25+ years, NASM-CPT, CSCS, PES. Specialties: Elite Training, NASM Protocols, Performance Science. Social: LinkedIn, Instagram.
  - **Jasmine Hearon (Swan):** Co-Founder & Elite Performance Coach, Since 2012, NASM-CPT, former Gold's Gym manager. Specialties: Leadership Training, Performance Coaching, Program Development. Social: LinkedIn (`linkedin.com/in/jasmineswan`), Instagram (`instagram.com/jasmine_swan_fitness`)
- **CTA per trainer:** "Schedule My Session" → `/contact`

### Testimonials
- **H2:** "Success Stories"
- **Description:** "Hear from real clients who transformed their bodies and lives with our expert coaching at Swanstudios."
- **3 testimonials (carousel):**
  - Carlos Mendez — "Training for 1.5 years, Semi-Pro Soccer Player", Sports Performance, sprint -15%, vertJump +33%, strength +63%
  - David Chen — (not visible in current carousel position)
  - (Third testimonial)
- Each has: name, training duration, category, quote, stat metrics, program link

### Fitness Stats
- **H2:** "Our Results in Numbers"
- **Description:** "Proven success metrics from years of transforming lives through elite fitness coaching"
- **6 Stats (all showing "0" on production):**
  1. Client Transformations — "successful journeys"
  2. Weight Lost — "pounds collectively"
  3. Training Sessions — "hours of coaching"
  4. Calories Burned — "million total"
  5. Average BMI Reduction — "points"
  6. New Swimmers Taught — "confident in the water"
- **3 Charts:**
  1. Average Weight Loss Progress (12-week timeline)
  2. Strength Improvement Metrics (Squat, Shoulder Press)
  3. Client Goal Distribution (pie chart)

### Social Feed
- **H2:** "Follow Our Journey"
- **Description:** "Training insights, client transformations, and behind-the-scenes content across our social channels."
- **3 Platform Cards:**
  1. Facebook — `facebook.com/seanswantech` — post about 500+ transformations
  2. Instagram — `instagram.com/seanswantech` — @sswanstudios — "Every rep counts" post
  3. YouTube — `youtube.com/@swanstudios2018` — "5 Mobility Drills" video (12:34)
- **Social follow buttons:** Facebook, Instagram, YouTube

### Newsletter
- **H2:** "Join Our Fitness Community"
- **Description:** "Subscribe to receive exclusive workouts, nutrition tips, and special offers to accelerate your fitness journey"
- **Form fields:** Name, Email
- **CTA:** "Subscribe Now"
- **Privacy:** "We respect your privacy. Unsubscribe at any time."
- **3 Benefit cards:** Exclusive Workouts, Nutrition Guides, Mindset Coaching

### Footer
- **Brand:** SwanStudios — "Excellence in Performance Training"
- **Description:** "Transforming fitness through personalized training programs and expert guidance to help you achieve your health and wellness goals. Our elite coaching team combines proven science with personalized attention."
- **Social Links:**
  - Facebook → `https://facebook.com/seanswantech`
  - Bluesky → `https://bsky.app/profile/swanstudios.bsky.social`
  - Instagram → `https://www.instagram.com/seanswantech`
  - LinkedIn → `https://linkedin.com`
  - YouTube → `https://www.youtube.com/@swanstudios2018`
- **Quick Links:** Home `/`, About Us `/about`, Store `/store`, Contact `/contact`, Video Library `/video-library`
- **Programs:** Personal Training `/programs/personal-training`, Group Classes `/programs/group-classes`, Nutrition Coaching `/programs/nutrition`, Online Training `/programs/online-training`, Recovery & Wellness `/programs/recovery`
- **Contact:** Anaheim Hills, (714) 947-3221, loveswanstudios@protonmail.com
- **Hours:** Monday-Sunday: By Appointment Only
- **Copyright:** "2026 Swan Studios. All Rights Reserved. Made with ❤️ in California"
- **Legal:** Privacy Policy `/privacy`, Terms of Service `/terms`, Sitemap `/sitemap`

---

## Route Map (All CTAs and Links)

| Element | Label | Route/URL |
|---------|-------|-----------|
| Hero CTA Primary | View Packages in Store | `/shop` |
| Hero CTA Secondary | Book Free Movement Screen | `/contact` |
| Program Card CTA (x3) | View in Store | `/shop` |
| Programs Bottom CTA | View All Packages & Pricing | `/shop` |
| Trainer CTA | Schedule My Session | `/contact` |
| Banner CTA | Contact Us | `/contact` |
| Banner CTA | Schedule Orientation | `/contact` |
| Testimonial link | Learn about the program... | `/store#program-athlete-rehab-program` |
| Footer Quick Link | Home | `/` |
| Footer Quick Link | About Us | `/about` |
| Footer Quick Link | Store | `/store` |
| Footer Quick Link | Contact | `/contact` |
| Footer Quick Link | Video Library | `/video-library` |
| Footer Program | Personal Training | `/programs/personal-training` |
| Footer Program | Group Classes | `/programs/group-classes` |
| Footer Program | Nutrition Coaching | `/programs/nutrition` |
| Footer Program | Online Training | `/programs/online-training` |
| Footer Program | Recovery & Wellness | `/programs/recovery` |
| Footer Legal | Privacy Policy | `/privacy` |
| Footer Legal | Terms of Service | `/terms` |
| Footer Legal | Sitemap | `/sitemap` |
| Footer Social | Facebook | `https://facebook.com/seanswantech` |
| Footer Social | Bluesky | `https://bsky.app/profile/swanstudios.bsky.social` |
| Footer Social | Instagram | `https://www.instagram.com/seanswantech` |
| Footer Social | LinkedIn | `https://linkedin.com` |
| Footer Social | YouTube | `https://www.youtube.com/@swanstudios2018` |
| Social Feed | Facebook | `https://facebook.com/seanswantech` |
| Social Feed | Instagram | `https://www.instagram.com/seanswantech` |
| Social Feed | YouTube | `https://www.youtube.com/@swanstudios2018` |
| Trainer Social | Jasmine LinkedIn | `https://linkedin.com/in/jasmineswan` |
| Trainer Social | Jasmine Instagram | `https://instagram.com/jasmine_swan_fitness` |

---

## Issues / Risks Observed

| # | Severity | Issue | Impact on Cinematic Overhaul |
|---|----------|-------|------------------------------|
| 1 | INFO | All 6 fitness stats show "0" | Cinematic Stats section will also show 0; this is a backend data issue, not a design issue |
| 2 | INFO | Construction banner present | Cinematic variants do NOT include construction banner (admin-only preview); Phase 5 layout suppression will hide it on homepage |
| 3 | LOW | LinkedIn footer link is generic (`https://linkedin.com`) | Preserve as-is; fixing is out of scope |
| 4 | INFO | 27 console warnings (all benign resource reload + health checks) | No errors; warnings are safe to ignore |
| 5 | INFO | Header z-index is 1000 | Cinematic portal preview uses z-index 2000 to render above |
| 6 | INFO | ContentWrapper has 56px margin-top for fixed header | Phase 5 layout suppression must remove this when cinematic navbar is page-owned |

---

## Verification Baseline

This document serves as the "before" state for the cinematic overhaul. After implementation:
1. Current homepage at `/` must remain visually identical to these screenshots (only benign font preload addition is acceptable)
2. All routes in the Route Map must continue working
3. All text strings in the Content Preservation Map must be preserved in cinematic variants (minor polish allowed, core meaning preserved)
4. Console error count must remain 0
