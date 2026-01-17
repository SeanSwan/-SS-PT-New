# SwanStudios UX/UI Design Protocol
**Version:** 1.0
**Last Updated:** 2026-01-16
**Status:** Active Standard for All Development

---

## Executive Vision

SwanStudios combines **premium visual engagement** with **trainer workflow efficiency**. We balance the **"Galaxy-Swan" aesthetic** (client-facing) with **utilitarian precision** (admin/trainer tools) to create a platform that motivates clients while accelerating trainer productivity.

### Core Principles

1. **Trainer Time is Sacred** - Reduce clicks, eliminate scrolling, optimize for mobile/tablet gym floor usage
2. **Client Clarity Over Complexity** - Clear next steps always trump comprehensive dashboards
3. **NASM Compliance is Non-Negotiable** - Industry standards integrated seamlessly into digital workflows
4. **Mobile-First for Admin** - Trainers work on their feet; desktop is secondary
5. **Gamification with Purpose** - Engagement features never obscure utility

---

## Design System Standards

### Visual Hierarchy Rules

#### Color Palette (Dark Theme)
```
Primary Background: rgba(15, 23, 42, 1)      // Deep space blue
Card Background:    rgba(30, 41, 59, 0.6)    // Translucent slate
Border Accent:      rgba(59, 130, 246, 0.2)  // Blue glow (low opacity)
Primary Action:     rgba(59, 130, 246, 0.8)  // Electric blue
Success:            rgba(34, 197, 94, 0.2)   // Green (backgrounds)
Success Text:       #22c55e                   // Green (text/icons)
Warning:            rgba(234, 179, 8, 0.2)   // Yellow (backgrounds)
Warning Text:       #eab308                   // Yellow (text/icons)
Danger:             rgba(239, 68, 68, 0.2)   // Red (backgrounds)
Danger Text:        #ef4444                   // Red (text/icons)
```

#### Typography Hierarchy
```
H1 (Page Title):     2rem (32px), font-weight: 600
H2 (Section):        1.5rem (24px), font-weight: 600
H3 (Card Title):     1.25rem (20px), font-weight: 600
Body:                1rem (16px), font-weight: 400
Small/Meta:          0.875rem (14px), font-weight: 400
Micro/Labels:        0.75rem (12px), font-weight: 600, uppercase
```

#### Spacing System (8px Grid)
```
Micro:    0.25rem (4px)   - Icon padding
XS:       0.5rem (8px)    - Inline spacing
SM:       0.75rem (12px)  - Form input padding
MD:       1rem (16px)     - Card padding
LG:       1.5rem (24px)   - Section spacing
XL:       2rem (32px)     - Page margins
```

---

## Component Standards

### Buttons

**Primary Button (Actions)**
```tsx
background: rgba(59, 130, 246, 0.8)
hover: rgba(59, 130, 246, 1)
padding: 0.75rem 1.5rem
border-radius: 8px
transform: translateY(-2px) on hover
```

**Secondary Button (Cancel/Alternate)**
```tsx
background: rgba(100, 100, 100, 0.5)
hover: rgba(100, 100, 100, 0.7)
padding: 0.75rem 1.5rem
border-radius: 8px
```

**Icon Buttons (Quick Actions)**
```tsx
min-width: 44px (touch target)
min-height: 44px
padding: 0.5rem
```

### Status Badges

**Badge Sizing**
```tsx
padding: 0.375rem 0.75rem
border-radius: 12px
font-size: 0.75rem (12px)
font-weight: 600
display: inline-flex
align-items: center
gap: 0.375rem
```

**Status Colors**
- Complete: Green (rgba(34, 197, 94, 0.2) bg, #22c55e text)
- In Progress/Draft: Yellow (rgba(234, 179, 8, 0.2) bg, #eab308 text)
- Pending/Not Started: Red (rgba(239, 68, 68, 0.2) bg, #ef4444 text)

### Tables

**Desktop (>768px)**
- Full table layout with sticky header
- Row hover: rgba(59, 130, 246, 0.05)
- Max 10-20 rows per page (pagination required)

**Mobile (<768px)**
- **MUST** convert to card-based layout
- Each row becomes a card with vertical key-value pairs
- Action buttons at bottom of each card

### Forms

#### Input Fields
```tsx
padding: 0.75rem
background: rgba(0, 0, 0, 0.2)
border: 1px solid rgba(255, 255, 255, 0.2)
border-radius: 8px
focus: border-color: rgba(59, 130, 246, 0.6)
```

#### Radio Buttons / Segmented Controls (Preferred for 2-4 Options)
**Use Instead of Dropdowns** for:
- NASM checkpoints (None/Minor/Significant)
- Binary choices (Yes/No)
- Small option sets (< 5 choices)

**Reasoning**: Reduces clicks from 2 (dropdown open + select) to 1 (direct click)

#### Dropdowns (Only for >5 Options)
Use for client selection, package selection, etc.

---

## Admin Dashboard Protocols

### P0 (Critical) - Must Follow

#### 1. Mobile-First Input Design
- **Minimum Touch Target**: 44px × 44px (Apple HIG standard)
- **Form Layout**: Single-column on mobile, max 2-column on desktop
- **Scrolling**: Never require horizontal scroll on any device

#### 2. Input Efficiency for Repetitive Tasks
- **NASM OHSA Form**: Use segmented controls (3 buttons: None/Minor/Significant) NOT dropdowns
- **Saves**: 18 clicks per assessment (9 checkpoints × 2 clicks saved per dropdown)
- **Visual Example**:
```
┌─────────────────────────────────────────────┐
│ Feet Turnout                                │
│ ┌───────┐ ┌───────┐ ┌─────────────┐        │
│ │ None  │ │ Minor │ │ Significant │        │
│ └───────┘ └───────┘ └─────────────┘        │
└─────────────────────────────────────────────┘
```

#### 3. Table Responsiveness
**OnboardingManagement.tsx** must have:
- Desktop: Full table
- Tablet (768-1024px): Hide less critical columns (e.g., "Primary Goal")
- Mobile (<768px): Card-based layout

**Card Layout Example (Mobile)**:
```
┌─────────────────────────────────────┐
│ John Smith                          │
│ test-client@swanstudios.com         │
├─────────────────────────────────────┤
│ Package: Signature 60 AI            │
│ Questionnaire: 100% Complete ✓      │
│ Movement Screen: 73/100             │
│ [View Details →]                    │
└─────────────────────────────────────┘
```

### P1 (High Priority) - Workflow Optimization

#### 4. Unified Client Profile View
**Current Problem**: Admin navigates between 3 separate pages:
- Onboarding Management → Movement Screen → Baseline Measurements

**Solution**: Create `/admin/clients/:userId` with tabbed interface:
```
┌───────────────────────────────────────────┐
│ John Smith - Client Profile              │
├───────────────────────────────────────────┤
│ [Overview] [Onboarding] [Movement] [Vitals] [Workouts] [Nutrition] │
│                                           │
│ [Tab Content Here]                        │
└───────────────────────────────────────────┘
```

#### 5. Bulk Actions
**OnboardingManagement.tsx** needs:
- Checkboxes on each row
- Bulk action bar (appears when >1 selected):
  - Send Reminder Email
  - Mark as Reviewed
  - Export to CSV

#### 6. Smart Data Entry Defaults
**BaselineMeasurementsEntry.tsx**:
- Pre-fill fields with previous session's data (ghosted/placeholder style)
- Allow "quick confirm" if no changes
- Example: "Last HR: 72 BPM" as placeholder text

---

## Client Dashboard Protocols

### P0 (Critical) - User Clarity

#### 7. Actionable Status Cards
**OnboardingStatusCard.tsx** must have clickable pending items:

**Current**:
```
Onboarding Questionnaire
❌ Pending
```

**Required**:
```
Onboarding Questionnaire
❌ Pending - [Complete Now →]
```

Clicking takes user directly to questionnaire form.

#### 8. Primary Focal Point
**EnhancedOverviewGalaxy.tsx** hierarchy:
1. **Hero Section (Top)**: Next Workout / Today's Goal (largest, most prominent)
2. **Status Section**: Onboarding progress, upcoming sessions
3. **Gamification**: XP, badges, streaks (below the fold or collapsible)

**Current Issue**: Gamification competes with utility for attention

### P1 (High Priority) - Visual Optimization

#### 9. Progress Visualizations
Replace text percentages with visual progress bars:

**Current**: "75% Complete"
**Better**:
```
Questionnaire Progress
██████████████░░░░░ 75%
```

#### 10. Collapsible Completed Sections
**OnboardingStatusCard.tsx**:
- Once onboarding is 100% complete, card should collapse to a single line:
```
✓ Onboarding Complete (Jan 15, 2026) [View Details ▼]
```
- Frees up prime dashboard real estate for active tasks

### P2 (Medium Priority) - Visual Trends

#### 11. Sparkline Charts
**BaselineMeasurementsEntry.tsx** should show mini trend charts:
```
Body Weight: [185 lbs] ▁▂▃▅▆▇ (↑ 2 lbs this week)
```

#### 12. Historical Context
Always show "last measured" date next to current values:
```
Resting HR: 72 BPM (Last: Jan 10, 2026 - 74 BPM)
```

---

## NASM Protocol UI Requirements

### Movement Screen Manager Specific Rules

#### 1. Form Structure (3-Step Wizard)
**Step 1: PAR-Q+ Screening**
- 7 Yes/No questions
- Clear medical flag if any "Yes"
- Progress: 1/3

**Step 2: NASM OHSA**
- 9 checkpoints with segmented controls
- Auto-calculate score as user inputs
- Live preview of corrective strategy
- Progress: 2/3

**Step 3: Review & Submit**
- Summary of all inputs
- Final NASM score visualization
- Corrective exercise strategy breakdown
- Progress: 3/3

#### 2. Visual Body Map (Future Enhancement - P3)
Replace text checkpoints with clickable skeleton diagram:
- Click anterior view to mark "Knee Valgus"
- Click lateral view to mark "Forward Lean"
- Touch-friendly for tablets

#### 3. Auto-Save Drafts
Forms should auto-save every 30 seconds to prevent data loss

---

## Performance Standards

### Animation Guidelines

#### Client-Facing (EnhancedOverviewGalaxy.tsx)
- **Desktop**: Full particle effects, smooth transitions
- **Mobile**: Reduce particle count by 70%, disable complex animations
- **Low-End Devices**: Provide "Reduce Motion" toggle in settings

#### Admin Tools
- **Transitions**: Keep under 200ms
- **Page Loads**: Skeleton screens for loading states
- **No Heavy Animations**: Admin prioritizes speed over flair

### Mobile Performance
- **Target**: 60fps on iPhone 12 / Galaxy S21 equivalent
- **Lazy Load**: Images and charts below the fold
- **Code Splitting**: Separate client vs admin bundles

---

## Accessibility Standards (WCAG 2.1 AA)

### Color Contrast
- **Minimum Ratio**: 4.5:1 for normal text
- **Large Text**: 3:1 for 18px+ or bold 14px+
- **Test Tool**: Use WebAIM Contrast Checker

### Keyboard Navigation
- **Tab Order**: Logical, follows visual flow
- **Focus Indicators**: 2px solid rgba(59, 130, 246, 1) outline
- **Skip Links**: "Skip to main content" on all pages

### Screen Readers
- **ARIA Labels**: All icon-only buttons must have `aria-label`
- **Form Fields**: Associate labels with `htmlFor` or wrap inputs
- **Status Messages**: Use `role="status"` for dynamic updates

---

## Testing Checklist (Pre-Deploy)

### Desktop (1920×1080)
- [ ] All tables render without horizontal scroll
- [ ] Forms fit within viewport without page scroll (unless >10 fields)
- [ ] Buttons have hover states

### Tablet (iPad - 1024×768)
- [ ] Tables either hide columns or switch to cards
- [ ] Touch targets are 44px minimum
- [ ] Forms are single-column

### Mobile (iPhone 14 - 390×844)
- [ ] All content visible without horizontal scroll
- [ ] Text is readable (minimum 14px)
- [ ] Navigation is thumb-friendly (bottom of screen)

### Accessibility
- [ ] Color contrast passes WCAG AA
- [ ] All interactive elements keyboard-accessible
- [ ] Screen reader announces page changes

---

## Implementation Priorities (Phase 1.3+)

### Immediate (This Sprint)
1. ✅ Convert NASM OHSA dropdowns to segmented controls (MovementScreenManager.tsx)
2. ✅ Add mobile card layout to OnboardingManagement.tsx table
3. ✅ Make OnboardingStatusCard pending items clickable

### Next Sprint
4. Create unified `/admin/clients/:userId` profile view
5. Add bulk actions to OnboardingManagement.tsx
6. Implement smart defaults in BaselineMeasurementsEntry.tsx

### Future Enhancements
7. Add sparkline charts to measurement history
8. Implement visual body map for OHSA
9. Create "Reduce Motion" accessibility toggle

---

## Competitive Benchmarking

### What We Do Better Than Competitors

**vs. Trainerize**
- ✅ Superior visual engagement (Galaxy theme)
- ✅ Integrated NASM auto-calculation (they require manual scoring)
- ❌ Lacking: Bulk actions, workout templates

**vs. TrueCoach**
- ✅ More premium aesthetic (they're minimalist/text-heavy)
- ✅ Client gamification (they have none)
- ❌ Lacking: Faster data entry (we have more clicks)

**vs. MyFitnessPal**
- ❌ Lacking: Quick-add food logging, barcode scanning
- ✅ Better: Professional trainer oversight
- 🎯 Goal: Match MFP's input speed for measurements

---

## Design Debt Log

Track deviations from this protocol:

| Component | Issue | Priority | Assigned |
|-----------|-------|----------|----------|
| MovementScreenManager.tsx | Dropdowns instead of segmented controls | P0 | Phase 1.3 |
| OnboardingManagement.tsx | No mobile card layout | P0 | Phase 1.3 |
| BaselineMeasurementsEntry.tsx | No smart defaults | P1 | Phase 1.4 |
| EnhancedOverviewGalaxy.tsx | Information overload | P1 | Phase 2.0 |

---

## Approval & Sign-Off

**Document Owner**: Claude Code AI Assistant
**Last Reviewed**: 2026-01-16
**Next Review**: When new major features are designed

**This protocol is ACTIVE and must be followed for all UI/UX work.**
