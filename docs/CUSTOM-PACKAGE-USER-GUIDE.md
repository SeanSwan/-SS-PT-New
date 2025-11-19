# Custom Package Builder - User Guide 🎯

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Step-by-Step Wizard Guide](#step-by-step-wizard-guide)
4. [Volume Discount Tiers](#volume-discount-tiers)
5. [Mobile Experience](#mobile-experience)
6. [Cart & Checkout](#cart--checkout)
7. [FAQs](#faqs)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The **Custom Package Builder** allows you to create a personalized training package tailored to your specific goals and budget. Instead of choosing pre-configured packages, you can select exactly how many sessions you need and enjoy volume discounts that increase with larger purchases.

### Key Benefits

- **💰 Volume Discounts**: Save up to $15 per session with our tiered discount system
- **🎨 Total Flexibility**: Choose anywhere from 10 to 100 sessions
- **📅 Schedule Your Way**: Select scheduling preferences that match your lifestyle
- **🏆 Best Value**: The more you buy, the more you save!

---

## Getting Started

### Where to Find the Builder

1. Navigate to the **Store/Shop** page
2. Scroll to the **"Build Your Perfect Package"** section (appears after fixed and monthly packages)
3. Click the **"Start Building"** button on the Custom Package Card

### Visual Cues

Look for these indicators:
- **"⚡ Most Flexible"** badge
- **🎯 Target icon** with glow effect
- Tier badges: 🥉 Bronze | 🥈 Silver | 🥇 Gold
- Feature list highlighting volume discounts and flexibility

---

## Step-by-Step Wizard Guide

### Step 1: Choose Your Sessions

**Goal**: Select how many training sessions you need

1. **Use the Slider**:
   - Drag the slider left/right to adjust session count
   - Minimum: 10 sessions (profitability threshold)
   - Maximum: 100 sessions (capacity planning)
   - Increments: 5 sessions

2. **Real-Time Pricing**:
   - Pricing updates automatically as you move the slider (debounced 300ms)
   - See your volume discount tier immediately
   - View total savings vs. single session pricing

3. **Pricing Display Shows**:
   - Sessions count (e.g., "25 sessions")
   - Price per session (e.g., "$162/session")
   - Discount tier badge (Bronze/Silver/Gold)
   - Total package cost
   - Total savings amount
   - Savings percentage

4. **Next Tier Indicator**:
   - Shows how many more sessions needed for next discount level
   - Example: "Add 5 more sessions to unlock Silver tier!"

5. **Click "Next: Schedule"** when satisfied with your selection

---

### Step 2: Schedule Preference

**Goal**: Indicate your preferred training frequency

**Options**:

1. **Flexible Scheduling** ⏰
   - Train on your own schedule
   - Book sessions as needed
   - Best for: Busy professionals, variable schedules

2. **2 Sessions Per Week** 📅
   - Consistent twice-weekly training
   - Structured routine
   - Best for: Steady fitness progress

3. **3 Sessions Per Week** 🏋️
   - Intensive training regimen
   - Maximum commitment
   - Best for: Serious athletes, transformation goals

**Optional Notes**:
- Add specific scheduling preferences (e.g., "Prefer mornings")
- Maximum 200 characters
- Will be included in your cart for trainer visibility

**Actions**:
- Click **"Back"** to return to Step 1
- Click **"Next: Review"** to proceed

---

### Step 3: Review & Confirm

**Goal**: Verify your custom package details before adding to cart

**Review Checklist**:

✅ **Package Summary**:
- Total sessions count
- Price per session
- Total package cost

✅ **Discount Information**:
- Volume discount tier (Bronze/Silver/Gold)
- Discount per session
- Total savings amount

✅ **Schedule Preference**:
- Selected frequency
- Any notes added

**Final Actions**:

1. **Back Button**: Return to Step 2 to modify schedule preference
2. **Add to Cart Button**:
   - Adds custom package to your shopping cart
   - Closes wizard automatically
   - Shows success notification
   - Package visible in cart sidebar

---

## Volume Discount Tiers

### Pricing Breakdown

| Tier | Sessions | Price/Session | Discount | Total Savings (50 sessions) |
|------|----------|---------------|----------|----------------------------|
| 🥉 **Bronze** | 10-19 | $165 | $10 off | $500 |
| 🥈 **Silver** | 20-39 | $162 | $13 off | $650 |
| 🥇 **Gold** | 40-100 | $160 | $15 off | $750 |

**Base Price**: $175/session (single session rate)

### Tier Examples

#### Bronze Tier Example (15 sessions)
- **Base Cost**: 15 × $175 = $2,625
- **Discount**: 15 × $10 = $150
- **Your Price**: **$2,475**
- **Savings**: 5.7%

#### Silver Tier Example (25 sessions)
- **Base Cost**: 25 × $175 = $4,375
- **Discount**: 25 × $13 = $325
- **Your Price**: **$4,050**
- **Savings**: 7.4%

#### Gold Tier Example (50 sessions)
- **Base Cost**: 50 × $175 = $8,750
- **Discount**: 50 × $15 = $750
- **Your Price**: **$8,000**
- **Savings**: 8.6%

### Maximizing Savings

**💡 Pro Tips**:

1. **Tier Boundaries**:
   - Moving from 19→20 sessions jumps from Bronze to Silver (+$3/session discount)
   - Moving from 39→40 sessions jumps from Silver to Gold (+$2/session discount)

2. **Sweet Spot**:
   - 40 sessions (Gold tier minimum) offers best per-session value
   - Balances cost savings with commitment level

3. **Bulk Buying**:
   - Consider purchasing 100 sessions if training long-term
   - Maximum discount: $1,500 total savings!

---

## Mobile Experience

### Mobile-Optimized Features

#### Swipe Gestures
- **Swipe Left**: Next step
- **Swipe Right**: Previous step
- **Minimum Delta**: 50px (prevents accidental swipes)

#### Touch Targets
- All buttons: **Minimum 44px** height (WCAG 2.1 AAA compliant)
- Extra padding on mobile for easy tapping
- No tiny buttons or cramped controls

#### Bottom Sheet Modal
- Wizard opens as bottom sheet on mobile devices
- Swipe down to close (or use X button)
- Smooth slide-up animation
- Maximum height: 85vh (leaves header visible)

#### Responsive Slider
- Large touch area for easy dragging
- Haptic feedback (on supported devices)
- Current value always visible above slider

### Mobile Navigation Tips

1. **Portrait Mode**: Recommended for best experience
2. **One-Handed Use**: All controls within thumb reach
3. **Keyboard**: Auto-hides after number input
4. **Notifications**: Success messages appear at top of wizard

---

## Cart & Checkout

### Cart Display

Custom packages appear in your cart with **enhanced visual treatment**:

#### Special Indicators:
- **🎯 Custom Package** badge
- **Tier badge** (Bronze/Silver/Gold with emoji)
- **Savings highlight box** showing total amount saved
- **Session breakdown** with price per session
- **Schedule preference** indicator
- **Notes** section (if provided)

#### Information Displayed:
1. Package name (e.g., "Custom Training Package (25 Sessions)")
2. Sessions count
3. Price per session
4. Volume discount amount
5. Total cost
6. Quantity controls
7. Remove button

### Checkout Process

1. **Review Cart**:
   - Verify custom package details
   - Check total price
   - Confirm session count

2. **Proceed to Checkout**:
   - Click "Proceed to Checkout" button
   - Standard checkout flow applies
   - Custom package details preserved

3. **Post-Purchase**:
   - Receive confirmation email with package details
   - Sessions added to your account
   - Trainer notified of schedule preference

---

## FAQs

### General Questions

**Q: Why is there a minimum of 10 sessions?**
A: The 10-session minimum ensures profitability while allowing us to provide quality training at discounted rates.

**Q: Why is there a maximum of 100 sessions?**
A: The 100-session cap is for capacity planning. For larger packages, please contact us for enterprise pricing at [support@swanstudios.com](mailto:support@swanstudios.com).

**Q: Can I modify a custom package after adding to cart?**
A: Remove the current package from cart and create a new one with your desired configuration.

**Q: Do custom packages expire?**
A: Custom packages follow standard session expiration policies (typically 6-12 months depending on package size).

### Pricing Questions

**Q: Is the pricing shown final?**
A: Yes, all prices include volume discounts. What you see is what you pay (plus applicable taxes at checkout).

**Q: Can I combine multiple custom packages?**
A: Yes! Add multiple custom packages to cart if needed. Each package maintains its own discount tier.

**Q: Do discounts apply to each package separately?**
A: Yes, each custom package in your cart has its own tier based on session count.

### Technical Questions

**Q: Why does pricing take a moment to load?**
A: Pricing API calls are debounced (300ms) to prevent excessive requests while you adjust the slider.

**Q: What if the pricing fails to load?**
A: Refresh the page and try again. If the issue persists, contact support.

**Q: Can I use keyboard navigation?**
A: Yes! The wizard is fully keyboard accessible:
- **Tab/Shift+Tab**: Navigate between controls
- **Arrow Keys**: Adjust slider
- **Enter/Space**: Select options, click buttons
- **Escape**: Close wizard

---

## Troubleshooting

### Common Issues

#### Issue: "Pricing Unavailable" Error

**Symptoms**: Red error box, unable to proceed to Step 2

**Solutions**:
1. Check internet connection
2. Refresh the page
3. Try a different session count
4. Contact support if persistent

---

#### Issue: Slider Not Responding

**Symptoms**: Can't drag slider or change session count

**Solutions**:
1. **Desktop**: Click directly on slider track (not just handle)
2. **Mobile**: Ensure you're touching the slider handle, not surrounding area
3. **Accessibility**: Use arrow keys instead of mouse/touch
4. Reload page if issue persists

---

#### Issue: "Below Minimum Sessions" Error

**Symptoms**: Cannot proceed, error shows "Minimum 10 sessions required"

**Solutions**:
1. Increase session count to at least 10 using slider
2. For fewer sessions, consider fixed packages instead

**Why This Happens**:
- Business rule enforces 10-session minimum for profitability

---

#### Issue: "Above Maximum Sessions" Error

**Symptoms**: Cannot proceed, error shows "Maximum 100 sessions allowed"

**Solutions**:
1. Reduce session count to 100 or fewer
2. For larger packages, contact enterprise sales: [support@swanstudios.com](mailto:support@swanstudios.com)

**Why This Happens**:
- Capacity planning limits require special arrangements for 100+ session packages

---

#### Issue: Wizard Won't Close

**Symptoms**: X button or click outside doesn't close wizard

**Solutions**:
1. Click X button in top-right corner
2. Press **Escape** key
3. On mobile: Swipe down from top
4. Refresh page if unresponsive

---

#### Issue: Custom Package Not Showing in Cart

**Symptoms**: Clicked "Add to Cart" but package missing

**Solutions**:
1. Open cart sidebar (click cart icon in header)
2. Check cart dropdown/modal
3. Verify cart notification appeared
4. Try adding package again
5. Check browser console for errors

**Prevention**:
- Wait for success notification before closing wizard
- Ensure stable internet connection

---

### Browser Compatibility

**Recommended Browsers**:
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Mobile Browsers**:
- iOS Safari 14+ ✅
- Chrome Mobile 90+ ✅
- Samsung Internet 14+ ✅

**Known Issues**:
- IE 11: Not supported (upgrade to modern browser)
- Very old mobile browsers: Limited touch gesture support

---

### Getting Help

**Support Channels**:

1. **Email**: [support@swanstudios.com](mailto:support@swanstudios.com)
   - Response time: 24-48 hours
   - Include: Browser, device, screenshot of issue

2. **Live Chat**: Available during business hours (9 AM - 5 PM PST)

3. **Phone**: 1-800-SWAN-GYM (1-800-792-6496)

4. **FAQ Page**: [swanstudios.com/faq](https://swanstudios.com/faq)

---

## Developer Documentation

For technical implementation details, see:
- [Backend API Documentation](../backend/routes/storeFrontRoutes.mjs#L116-L245)
- [Frontend Component Documentation](../frontend/src/pages/shop/components/CustomPackageBuilder.tsx)
- [Testing Suite](../frontend/src/pages/shop/components/__tests__/CustomPackageFlow.e2e.test.tsx)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-19 | Initial release with 3-step wizard, volume discounts, mobile optimization |

---

## Credits

**AI Village Collaboration**:
- **Gemini** (Frontend Specialist): UX/UI design, wizard implementation, mobile-first approach
- **Kilo** (Backend Integration): Business logic, volume discount tiers, API endpoint
- **Roo** (Code Quality): TypeScript safety, performance optimization
- **MinMax** (UX Strategy): Mobile optimization, swipe gestures, accessibility
- **ChatGPT-5** (QA Lead): Testing strategy, error handling, edge cases

**Built with**: React, TypeScript, Styled Components, Framer Motion, react-swipeable

---

## Legal

Custom packages are subject to standard [Terms of Service](https://swanstudios.com/terms) and [Refund Policy](https://swanstudios.com/refunds).

All session packages must be used within their expiration period. Unused sessions are non-refundable after 30 days from purchase.

---

**Last Updated**: November 19, 2025
**Document Version**: 1.0.0
**Maintained by**: Swan Studios PT Development Team
