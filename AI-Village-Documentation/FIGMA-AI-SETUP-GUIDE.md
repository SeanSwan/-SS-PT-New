# FIGMA AI WIREFRAMING SETUP GUIDE
## For SwanStudios Rapid Design (30 Minutes)

---

## STEP 1: ACCESS FIGMA (5 minutes)

### Login to Student Account
1. Go to: https://www.figma.com/
2. Log in with daughter's student account credentials
3. Click **"New Design File"** button
4. Name it: **"SwanStudios MVP Designs"**

---

## STEP 2: INSTALL AI PLUGINS (10 minutes)

### Plugin 1: Magician (AI Design Generation) ⭐ MOST IMPORTANT
1. Click **"Plugins"** menu → **"Browse plugins in Community"**
2. Search: **"Magician"**
3. Click **"Install"**
4. **What it does:** Generates designs from text prompts using AI

### Plugin 2: Autoflow (User Flow Generation)
1. Search: **"Autoflow"**
2. Click **"Install"**
3. **What it does:** Automatically creates flowcharts and user journey maps

### Plugin 3: Design Lint (Find Inconsistencies)
1. Search: **"Design Lint"**
2. Click **"Install"**
3. **What it does:** Audits your design for color/spacing inconsistencies

### Plugin 4: Builder.io (Figma → Code)
1. Search: **"Builder.io"**
2. Click **"Install"**
3. **What it does:** Exports Figma designs as React code

### Plugin 5: Unsplash (Stock Photos)
1. Search: **"Unsplash"**
2. Click **"Install"**
3. **What it does:** Insert professional stock photos for mockups

---

## STEP 3: SET UP DESIGN SYSTEM (5 minutes)

### Create Color Palette
1. Create a new frame (press **F** key)
2. Name it: **"Design System - Colors"**
3. Add color swatches:
   - **Primary Blue:** `#2563eb` (for buttons, links)
   - **Success Green:** `#10b981` (for positive actions)
   - **Warning Orange:** `#f59e0b` (for alerts)
   - **Error Red:** `#ef4444` (for errors)
   - **Neutral Gray:** `#6b7280` (for text)
   - **Background:** `#f9fafb` (for page backgrounds)

### Create Typography Styles
1. Create text elements for:
   - **Heading 1:** 48px, Bold, Primary color
   - **Heading 2:** 36px, Semi-bold
   - **Heading 3:** 24px, Semi-bold
   - **Body:** 16px, Regular, Neutral Gray
   - **Button Text:** 16px, Semi-bold, White

### Save as Styles
1. Select each text → Right-click → **"Create Style"**
2. Name them: H1, H2, H3, Body, Button

---

## STEP 4: GENERATE YOUR 5 CORE PAGES (10 minutes)

### Page 1: Landing Page

**Magician Prompt:**
```
Create a modern fitness landing page for personal training platform. Include:
- Hero section with headline "Transform Your Fitness Journey" and CTA button "Start Training"
- 3 benefit cards (Expert Trainers, Personalized Plans, Track Progress)
- Pricing preview section showing 3 tiers
- Testimonials carousel with 3 client reviews
- Footer with links

Design style: Modern, professional, gradient background (#2563eb to #1e40af), clean spacing, accessible contrast
```

**Steps:**
1. Create new frame (Desktop, 1440x900)
2. Plugins → Magician → Paste prompt above
3. Click "Generate"
4. Review 3 variations
5. Pick best one
6. Adjust colors to match your brand

**Export:**
- File → Export → PNG
- Save as: `designs/01-landing-page.png`

---

### Page 2: Sign Up Flow

**Magician Prompt:**
```
Create a 3-step signup wizard for fitness platform:

Step 1: Email & Password
- Email input field
- Password input with strength indicator
- Confirm password field
- "Continue" button

Step 2: Choose Role
- Two large cards: "I'm a Client" and "I'm a Trainer"
- Icons for each role
- Description text below each

Step 3: Profile Setup
- Name input
- Phone number (optional)
- Profile photo upload area
- "Complete Signup" button

Design: Clean, minimal, progress indicator at top (1/3, 2/3, 3/3), centered card layout, mobile-friendly
```

**Export as:** `designs/02-signup-flow.png`

---

### Page 3: Pricing/Packages

**Magician Prompt:**
```
Create a pricing table for personal training packages with 3 tiers:

BASIC TIER ($49/month):
- 4 sessions per month
- Email support
- Progress tracking
- "Get Started" button

PRO TIER ($99/month) - HIGHLIGHTED:
- 8 sessions per month
- Priority support
- Nutrition guidance
- Progress tracking
- Custom workout plans
- "Most Popular" badge
- "Get Started" button (emphasized)

PREMIUM TIER ($199/month):
- Unlimited sessions
- 24/7 support
- Nutrition + meal plans
- Progress tracking
- Custom workouts
- 1-on-1 video coaching
- "Get Started" button

Design: 3 cards side-by-side, Pro tier highlighted with border/shadow, feature lists with checkmarks, clean spacing, professional
```

**Export as:** `designs/03-pricing-page.png`

---

### Page 4: Client Dashboard

**Magician Prompt:**
```
Create a fitness client dashboard with:

LEFT SIDEBAR:
- Logo at top
- Navigation menu (Dashboard, My Sessions, Progress, Workouts, Profile)
- Logout button at bottom

MAIN CONTENT AREA:
Top Section - Stats Cards (4 cards in row):
- Total Sessions (number + icon)
- This Week's Progress (percentage + icon)
- Calories Burned (number + fire icon)
- Active Days (number + calendar icon)

Middle Section - Upcoming Sessions:
- Calendar view showing this week
- Today's session highlighted
- Session cards showing: Time, Trainer name, Session type

Bottom Section:
- Recent Workouts list (3 items)
- Each showing: Exercise name, Sets/Reps, Date

RIGHT SIDEBAR:
- Quick Actions (Book Session, Message Trainer, View Goals)

Design: Modern, card-based layout, lots of white space, subtle shadows, icons from lucide-react style
```

**Export as:** `designs/04-client-dashboard.png`

---

### Page 5: Trainer Dashboard

**Magician Prompt:**
```
Create a personal trainer dashboard with:

TOP BAR:
- "Today's Schedule" heading
- Date selector
- Notifications bell icon
- User avatar dropdown

SIDEBAR:
- Logo
- Navigation (Dashboard, My Clients, Schedule, Revenue, Profile)
- Logout

MAIN CONTENT:
Top Row - KPI Cards (4 cards):
- Active Clients (number + user icon)
- This Week's Sessions (number + calendar)
- Monthly Revenue (dollar amount + trend arrow)
- Client Satisfaction (star rating)

Middle Section - Today's Schedule:
- Timeline view of today's sessions
- Each session showing: Time, Client name, Session type, Status (Upcoming/Completed)
- Quick action buttons (Start Session, Reschedule, Cancel)

Bottom Section - Client List:
- Table with columns: Name, Last Session, Next Session, Progress, Actions
- 5 most recent clients
- "View All Clients" button

Design: Professional, data-focused, clean tables, clear hierarchy, action buttons prominent, charts/graphs where applicable
```

**Export as:** `designs/05-trainer-dashboard.png`

---

## STEP 5: EXTRACT DESIGN TOKENS (5 minutes)

### Run Design Lint
1. Select all your designs
2. Plugins → Design Lint → Run
3. Review report of inconsistencies
4. Fix any color/spacing mismatches

### Document Your Design System
Create a text frame with:

```
SWANSTUDIOS DESIGN TOKENS

COLORS:
Primary: #2563eb
Primary Dark: #1e40af
Success: #10b981
Warning: #f59e0b
Error: #ef4444
Text Primary: #1f2937
Text Secondary: #6b7280
Background: #f9fafb
White: #ffffff

SPACING:
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px

TYPOGRAPHY:
Font: Inter (or system default)
H1: 48px / Bold
H2: 36px / Semi-bold
H3: 24px / Semi-bold
Body: 16px / Regular
Small: 14px / Regular

BORDER RADIUS:
Small: 4px
Medium: 8px
Large: 12px
Full: 9999px (for pills/badges)

SHADOWS:
Card: 0 1px 3px rgba(0,0,0,0.1)
Hover: 0 4px 6px rgba(0,0,0,0.1)
Modal: 0 20px 25px rgba(0,0,0,0.15)
```

**Export this to:** `frontend/src/theme/figma-design-tokens.ts`

---

## STEP 6: GET APPROVAL (Stakeholder Review)

### Export All Designs
1. Select each page frame
2. File → Export → PNG (2x resolution for clarity)
3. Save all to `/designs` folder

### Create Presentation
Option A: In Figma
1. Create new "Presentation" frame
2. Add all 5 designs in sequence
3. Add notes/annotations
4. Share Figma link with stakeholder
5. Use "Present" mode (press Shift + Spacebar)

Option B: External
1. Upload PNGs to Google Slides or Notion
2. Add context for each page
3. Share link for review

### Approval Questions to Ask:
- ✅ Does this look professional enough to charge money?
- ✅ Is the user flow clear and intuitive?
- ✅ Are the CTAs (Call-to-Actions) obvious?
- ✅ Does the pricing feel right?
- ✅ Any must-have changes before going live?

---

## STEP 7: CONVERT FIGMA → CODE (2 Options)

### Option A: Use v0.dev (FASTEST) ⭐ RECOMMENDED

**For Each Page:**
1. Take screenshot of Figma design
2. Go to: https://v0.dev
3. Prompt:
   ```
   Convert this Figma design to a React component using:
   - TypeScript
   - Styled-components for styling
   - lucide-react for icons
   - Mobile responsive
   - Accessible (ARIA labels, semantic HTML)

   [Upload screenshot]
   ```
4. v0.dev generates working React code
5. Copy code into your project
6. Test and adjust

**Time per page:** 10-15 minutes
**Total time for 5 pages:** 1-1.5 hours

---

### Option B: Use Builder.io Plugin (More Control)

**For Each Page:**
1. In Figma, select entire page frame
2. Plugins → Builder.io → "Export to Code"
3. Choose: React + styled-components
4. Copy generated code
5. Paste into your project at:
   ```
   frontend/src/pages/LandingPage.tsx
   frontend/src/pages/SignupFlow.tsx
   frontend/src/pages/PricingPage.tsx
   frontend/src/pages/ClientDashboard.tsx
   frontend/src/pages/TrainerDashboard.tsx
   ```
6. Adjust imports and fix any errors

**Time per page:** 20-30 minutes
**Total time for 5 pages:** 2-2.5 hours

---

## TIPS FOR SUCCESS

### Use AI Iterations
- If Magician's first result isn't perfect, click "Regenerate"
- Adjust your prompt to be more specific
- Combine elements from multiple variations

### Keep It Simple
- Don't overthink the design in week 1
- Focus on clarity and usability over fancy animations
- You can always polish later with revenue

### Mobile-First Mindset
- After generating desktop designs, create mobile versions
- Use Figma's device frames (iPhone 14, Pixel 7)
- Test responsive breakpoints

### Color Accessibility
- Use Figma plugin: "Contrast" to check WCAG compliance
- Ensure text has at least 4.5:1 contrast ratio
- Don't rely on color alone (use icons + text)

---

## TROUBLESHOOTING

### Magician Plugin Not Working?
- **Issue:** Plugin says "Rate limit exceeded"
- **Solution:** Wait 1 hour (free tier has limits) or upgrade to paid

### Designs Look Generic?
- **Issue:** AI-generated designs lack personality
- **Solution:**
  1. Use Unsplash plugin to add real fitness photos
  2. Adjust colors to match your brand
  3. Add your logo
  4. Customize copy/headlines

### Can't Export Code?
- **Issue:** Builder.io export is broken or incomplete
- **Solution:** Use v0.dev instead (more reliable)

---

## NEXT STEPS AFTER FIGMA

1. ✅ Get all 5 designs approved by stakeholder
2. ✅ Export design tokens to `frontend/src/theme/`
3. ✅ Use v0.dev to convert designs to React code
4. ✅ Integrate generated code into existing SwanStudios codebase
5. ✅ Test on mobile and desktop
6. ✅ Continue to Day 3 of WEEK-1-LAUNCH-CHECKLIST.md

---

## RESOURCES

- **Figma Tutorial:** https://www.youtube.com/watch?v=FTFaQWZBqQ8 (15min crash course)
- **Magician Plugin Docs:** https://magician.design/
- **v0.dev Examples:** https://v0.dev/showcase
- **Design Inspiration:** https://dribbble.com/tags/fitness-app

---

**You've got this! Professional designs in 2-3 hours, not 2-3 days.** 🎨✨