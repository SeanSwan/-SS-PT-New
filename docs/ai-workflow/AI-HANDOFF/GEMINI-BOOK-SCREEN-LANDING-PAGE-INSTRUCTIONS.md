# GEMINI: Book Free Movement Screen Landing Page

**Priority:** P1 - High
**Assigned AI:** Gemini
**Created:** 2026-01-17
**Status:** Ready for Implementation

---

## Executive Summary

Build /book-screen landing page for free NASM movement screen lead capture. This is the local lead generation funnel for Fairmont parents.

---

## Page Purpose

Capture leads by offering a FREE 15-minute NASM movement screen.
Target: Fairmont parents (35-55 years, 50K-00K income)

---

## Route Configuration

Path: /book-screen
Component: BookMovementScreen.tsx
Location: frontend/src/pages/BookMovementScreen/

---

## Page Structure

### Hero Section
- Headline: Discover Your Movement Potential
- Subheadline: Free 15-Minute NASM Movement Screen
- Description: Brief explanation of OHSA protocol benefits

### Value Proposition Section
- What You Get:
  - Professional movement analysis
  - Personalized corrective strategy
  - No obligation consultation
  - Takes just 15 minutes

### Lead Capture Form
Required Fields:
- First Name
- Last Name
- Email
- Phone (optional)
- Preferred Contact Method (Email/Phone/Text)
- Best Time to Contact

### CTA Button
Text: Book My Free Movement Screen
Theme: cosmic (GlowButton)

### Trust Signals
- NASM Certified
- Local to Fairmont (mention San Jose area)
- Testimonials if available

---

## Technical Requirements

### Form Submission
- POST to /api/leads or /api/contact
- Store in database for follow-up
- Send confirmation email

### Design
- Galaxy-Swan theme (match homepage)
- Mobile-first responsive
- Fast loading (no heavy animations)

### Integration
- Link from Hero-Section.V2.tsx (already added)
- Add to main navigation (optional)

---

## Validation Checklist

- [ ] Form captures required fields
- [ ] Submission creates database record
- [ ] Confirmation message shown
- [ ] Mobile responsive
- [ ] Matches Galaxy-Swan design
- [ ] CTA is prominent

---

## Coordination

- Homepage hero already has Book Free Movement Screen CTA
- Backend may need /api/leads endpoint (ChatGPT task)
- Claude Code will review integration

---

END OF GEMINI DIRECTIVE
