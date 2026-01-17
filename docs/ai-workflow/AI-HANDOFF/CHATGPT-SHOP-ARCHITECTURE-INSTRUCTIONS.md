# CHATGPT: Shop Two-Tier Architecture

**Priority:** P0 - Critical
**Assigned AI:** ChatGPT
**Created:** 2026-01-17
**Status:** Ready for Implementation

---

## Executive Summary

Implement a two-tier package display on /shop page. The shop is the SINGLE SOURCE OF TRUTH for all pricing.

---

## Architecture: Two-Tier Layout

### TIER 1: Front Page Packages (Above the Fold)

Display these 3 packages prominently:

1. Express 30
   - Price: 75/session
   - Sessions: Single sessions
   - Duration: 30 minutes
   - Target: Busy professionals

2. Signature 60
   - Price: 175/session
   - Sessions: Single sessions
   - Duration: 60 minutes
   - Target: Premium clients

3. Jumpstart Pack (renamed from Transformation Pack)
   - Price: 1600 for 10 sessions
   - Sessions: 10-session bundle
   - Duration: 60 minutes each
   - Target: New clients committing to results
   - Badge: Best Value

### TIER 2: Long-Term Excellence Programs (Below the Fold)

Display these 4 monthly packages in a separate section:

1. Silver Monthly
   - Price: 500/month
   - Sessions: 4 sessions/month
   - Features: Basic tracking

2. Gold Monthly
   - Price: 750/month
   - Sessions: 8 sessions/month
   - Features: Progress tracking, nutrition guidance

3. Platinum Monthly
   - Price: 1000/month
   - Sessions: 12 sessions/month
   - Features: Full AI tracking, priority scheduling

4. Diamond Monthly
   - Price: Custom pricing
   - Sessions: Unlimited within reason
   - Features: VIP concierge, 24/7 access

---

## UI Requirements

### Front Tier Section
- Header: Premium Training Packages
- 3 cards in grid layout
- Each card shows: name, price, duration, features
- Add to Cart CTA

### Long-Term Section
- Header: Long-Term Excellence Programs
- Subheader: For clients ready for ongoing transformation
- 4 cards in grid layout
- Contact for Details CTA (for Diamond)

---

## Technical Implementation

### Files to Modify
- frontend/src/pages/shop/OptimizedGalaxyStoreFront.tsx
- frontend/src/pages/shop/components/PackagesGrid.tsx

### Database
- Packages already exist in database
- Filter by packageType or create display categories

---

## Validation Checklist

- [ ] 3 packages visible above the fold
- [ ] 4 monthly packages in separate section
- [ ] All prices displayed correctly
- [ ] Add to Cart works
- [ ] Mobile responsive
- [ ] Galaxy-Swan design theme

---

## Coordination

- Gemini completed homepage (no prices)
- This task makes /shop the single source of truth
- Claude Code will review integration

---

END OF CHATGPT DIRECTIVE
