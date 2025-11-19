/**
 * CustomPackageFlow.e2e.test.tsx - End-to-End Tests for Custom Package Feature
 * =============================================================================
 * Comprehensive test suite covering the complete custom package user journey
 *
 * Test Coverage:
 * - CustomPackageCard visibility and interactions
 * - CustomPackageBuilder wizard flow (all 3 steps)
 * - Real-time pricing API integration
 * - Cart integration and data transformation
 * - Error handling and edge cases
 * - Accessibility (WCAG 2.1 AAA)
 * - Mobile swipe gestures
 *
 * AI Village: Testing Strategy by ChatGPT-5 (QA Lead)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import PackagesGrid from '../PackagesGrid';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// ===================== MOCK DATA =====================

const mockFixedPackages = [
  {
    id: 1,
    name: 'Starter Package',
    description: '10 sessions for beginners',
    packageType: 'fixed' as const,
    sessions: 10,
    pricePerSession: 175,
    totalCost: 1750,
    displayPrice: 1750,
    price: 1750,
    theme: 'cosmic',
    isActive: true,
    imageUrl: null,
    displayOrder: 1,
    includedFeatures: null
  }
];

const mockMonthlyPackages = [
  {
    id: 2,
    name: '3-Month Program',
    description: '3 months of intensive training',
    packageType: 'monthly' as const,
    months: 3,
    sessionsPerWeek: 2,
    totalSessions: 24,
    pricePerSession: 165,
    totalCost: 3960,
    displayPrice: 3960,
    price: 3960,
    theme: 'cosmic',
    isActive: true,
    imageUrl: null,
    displayOrder: 2,
    includedFeatures: null
  }
];

// Mock pricing responses for different tiers
const mockPricingResponses = {
  bronze: {
    success: true,
    pricing: {
      sessions: 15,
      pricePerSession: 165,
      volumeDiscount: 10,
      discountPercentage: 5.7,
      discountTier: 'bronze',
      subtotal: 2625,
      totalDiscount: 150,
      finalTotal: 2475,
      savingsMessage: 'You save $150 vs. buying single sessions!',
      metadata: {
        nextTierSessions: 20,
        nextTierDiscount: 13,
        nextTierMessage: 'Add 5 more sessions to unlock Silver tier!'
      }
    }
  },
  silver: {
    success: true,
    pricing: {
      sessions: 25,
      pricePerSession: 162,
      volumeDiscount: 13,
      discountPercentage: 7.4,
      discountTier: 'silver',
      subtotal: 4375,
      totalDiscount: 325,
      finalTotal: 4050,
      savingsMessage: 'You save $325 vs. buying single sessions! 🥈 Silver tier discount unlocked!',
      metadata: {
        nextTierSessions: 40,
        nextTierDiscount: 15,
        nextTierMessage: 'Add 15 more sessions to unlock Gold tier!'
      }
    }
  },
  gold: {
    success: true,
    pricing: {
      sessions: 50,
      pricePerSession: 160,
      volumeDiscount: 15,
      discountPercentage: 8.6,
      discountTier: 'gold',
      subtotal: 8750,
      totalDiscount: 750,
      finalTotal: 8000,
      savingsMessage: 'You save $750 vs. buying single sessions! 🥇 Gold tier discount - best value!',
      metadata: {
        nextTierSessions: null,
        nextTierDiscount: null,
        nextTierMessage: 'You\'ve unlocked the best pricing!'
      }
    }
  }
};

// ===================== MSW SERVER SETUP =====================

const server = setupServer(
  // Mock pricing endpoint
  rest.get('/api/storefront/calculate-price', (req, res, ctx) => {
    const sessions = parseInt(req.url.searchParams.get('sessions') || '0', 10);

    // Edge case: missing sessions parameter
    if (!sessions) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          message: 'Sessions parameter is required and must be a number'
        })
      );
    }

    // Edge case: below minimum
    if (sessions < 10) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          message: 'Minimum 10 sessions required for custom packages',
          businessRule: 'Profitability threshold - custom packages must be at least 10 sessions'
        })
      );
    }

    // Edge case: above maximum
    if (sessions > 100) {
      return res(
        ctx.status(400),
        ctx.json({
          success: false,
          message: 'Maximum 100 sessions allowed for custom packages',
          businessRule: 'Capacity planning - contact us for larger packages'
        })
      );
    }

    // Determine tier and return appropriate response
    if (sessions >= 10 && sessions <= 19) {
      return res(ctx.json({
        ...mockPricingResponses.bronze,
        pricing: { ...mockPricingResponses.bronze.pricing, sessions }
      }));
    } else if (sessions >= 20 && sessions <= 39) {
      return res(ctx.json({
        ...mockPricingResponses.silver,
        pricing: { ...mockPricingResponses.silver.pricing, sessions }
      }));
    } else {
      return res(ctx.json({
        ...mockPricingResponses.gold,
        pricing: { ...mockPricingResponses.gold.pricing, sessions }
      }));
    }
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ===================== MOCK PROPS =====================

const defaultProps = {
  packages: [...mockFixedPackages, ...mockMonthlyPackages],
  canViewPrices: true,
  canPurchase: true,
  revealPrices: {},
  isAddingToCart: null,
  onTogglePrice: jest.fn(),
  onAddToCart: jest.fn()
};

// ===================== TEST SUITES =====================

describe('CustomPackageFlow E2E Tests', () => {

  // ===================== VISIBILITY TESTS =====================

  describe('CustomPackageCard Visibility', () => {
    it('should render "Build Your Perfect Package" section', () => {
      render(<PackagesGrid {...defaultProps} />);

      expect(screen.getByText('Build Your Perfect Package')).toBeInTheDocument();
    });

    it('should display CustomPackageCard with all key elements', () => {
      render(<PackagesGrid {...defaultProps} />);

      // Badge
      expect(screen.getByText(/Most Flexible/i)).toBeInTheDocument();

      // Title
      expect(screen.getByText('Build Your Own Package')).toBeInTheDocument();

      // Description
      expect(screen.getByText(/Create a custom training package/i)).toBeInTheDocument();

      // Features
      expect(screen.getByText(/Volume discounts up to \$15\/session/i)).toBeInTheDocument();
      expect(screen.getByText(/Flexible scheduling options/i)).toBeInTheDocument();
      expect(screen.getByText(/10-100 sessions, you decide/i)).toBeInTheDocument();

      // CTA Button
      expect(screen.getByText('Start Building')).toBeInTheDocument();

      // Tier badges
      expect(screen.getByText(/Bronze/i)).toBeInTheDocument();
      expect(screen.getByText(/Silver/i)).toBeInTheDocument();
      expect(screen.getByText(/Gold/i)).toBeInTheDocument();
    });

    it('should appear after fixed and monthly package sections', () => {
      const { container } = render(<PackagesGrid {...defaultProps} />);

      const sections = container.querySelectorAll('section section');
      const sectionTitles = Array.from(sections).map(
        section => section.querySelector('h2')?.textContent
      );

      expect(sectionTitles).toEqual([
        'Premium Training Packages',
        'Long-Term Excellence Programs',
        'Build Your Perfect Package'
      ]);
    });
  });

  // ===================== WIZARD OPENING TESTS =====================

  describe('Wizard Modal Opening', () => {
    it('should open wizard when CustomPackageCard is clicked', async () => {
      render(<PackagesGrid {...defaultProps} />);

      const ctaButton = screen.getByText('Start Building');
      fireEvent.click(ctaButton);

      await waitFor(() => {
        expect(screen.getByText('Build Your Custom Package')).toBeInTheDocument();
      });
    });

    it('should display Step 1 (Session Selection) on wizard open', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        expect(screen.getByText('Step 1: Choose Your Sessions')).toBeInTheDocument();
        expect(screen.getByText('How many training sessions do you need?')).toBeInTheDocument();
      });
    });

    it('should close wizard when X button is clicked', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        expect(screen.getByText('Build Your Custom Package')).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close wizard');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Build Your Custom Package')).not.toBeInTheDocument();
      });
    });
  });

  // ===================== STEP 1: SESSION SELECTION TESTS =====================

  describe('Step 1: Session Selection', () => {
    it('should display session slider with default value of 10', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        expect(slider).toHaveValue('10');
      });
    });

    it('should update session count when slider is moved', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '25' } });
      });

      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('should fetch and display real-time pricing for bronze tier (15 sessions)', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '15' } });
      });

      await waitFor(() => {
        expect(screen.getByText('$2,475')).toBeInTheDocument(); // Final total
        expect(screen.getByText(/\$165\/session/i)).toBeInTheDocument();
        expect(screen.getByText(/bronze/i)).toBeInTheDocument();
      });
    });

    it('should fetch and display real-time pricing for silver tier (25 sessions)', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '25' } });
      });

      await waitFor(() => {
        expect(screen.getByText('$4,050')).toBeInTheDocument();
        expect(screen.getByText(/\$162\/session/i)).toBeInTheDocument();
        expect(screen.getByText(/silver/i)).toBeInTheDocument();
      });
    });

    it('should fetch and display real-time pricing for gold tier (50 sessions)', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '50' } });
      });

      await waitFor(() => {
        expect(screen.getByText('$8,000')).toBeInTheDocument();
        expect(screen.getByText(/\$160\/session/i)).toBeInTheDocument();
        expect(screen.getByText(/gold/i)).toBeInTheDocument();
      });
    });

    it('should display savings message', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '25' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/You save \$325 vs\. buying single sessions!/i)).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching pricing', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '30' } });
      });

      // Should show loading indicator (adjust based on your implementation)
      expect(screen.getByText(/calculating/i) || screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should disable Next button when pricing is loading', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '35' } });
      });

      const nextButton = screen.getByText('Next: Schedule');
      expect(nextButton).toBeDisabled();
    });

    it('should enable Next button when pricing is loaded', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '20' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/\$162\/session/i)).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next: Schedule');
      expect(nextButton).not.toBeDisabled();
    });
  });

  // ===================== STEP 2: SCHEDULE PREFERENCE TESTS =====================

  describe('Step 2: Schedule Preference', () => {
    it('should navigate to Step 2 when Next button is clicked', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        expect(screen.getByText(/\$165\/session/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Next: Schedule'));

      await waitFor(() => {
        expect(screen.getByText('Step 2: Schedule Preference')).toBeInTheDocument();
      });
    });

    it('should display all schedule options', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));

      await waitFor(() => {
        expect(screen.getByText(/Flexible scheduling/i)).toBeInTheDocument();
        expect(screen.getByText(/2 sessions per week/i)).toBeInTheDocument();
        expect(screen.getByText(/3 sessions per week/i)).toBeInTheDocument();
      });
    });

    it('should select schedule option when clicked', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));

      await waitFor(() => {
        const flexibleOption = screen.getByText(/Flexible scheduling/i);
        fireEvent.click(flexibleOption);
      });

      // Check if option is selected (adjust based on your implementation)
      const selectedOption = screen.getByText(/Flexible scheduling/i).closest('div');
      expect(selectedOption).toHaveStyle({ borderColor: '#00ffff' }); // Cyber cyan
    });

    it('should allow optional notes input', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));

      await waitFor(() => {
        const notesInput = screen.getByPlaceholderText(/Any specific scheduling preferences/i);
        fireEvent.change(notesInput, { target: { value: 'Prefer morning sessions' } });
      });

      expect(screen.getByDisplayValue('Prefer morning sessions')).toBeInTheDocument();
    });

    it('should navigate back to Step 1 when Back button is clicked', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('Back'));
      });

      await waitFor(() => {
        expect(screen.getByText('Step 1: Choose Your Sessions')).toBeInTheDocument();
      });
    });
  });

  // ===================== STEP 3: REVIEW & CONFIRM TESTS =====================

  describe('Step 3: Review & Confirm', () => {
    it('should navigate to Step 3 when Next button is clicked', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));

      await waitFor(() => screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText('Next: Review'));

      await waitFor(() => {
        expect(screen.getByText('Step 3: Review & Confirm')).toBeInTheDocument();
      });
    });

    it('should display package summary with all details', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));

      await waitFor(() => screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText('Next: Review'));

      await waitFor(() => {
        expect(screen.getByText(/10 sessions/i)).toBeInTheDocument();
        expect(screen.getByText(/\$165\/session/i)).toBeInTheDocument();
        expect(screen.getByText(/Flexible scheduling/i)).toBeInTheDocument();
      });
    });

    it('should navigate back to Step 2 when Back button is clicked', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));
      await waitFor(() => screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText('Next: Review'));

      await waitFor(() => {
        fireEvent.click(screen.getByText('Back'));
      });

      await waitFor(() => {
        expect(screen.getByText('Step 2: Schedule Preference')).toBeInTheDocument();
      });
    });
  });

  // ===================== CART INTEGRATION TESTS =====================

  describe('Cart Integration', () => {
    it('should call onAddToCart when "Add to Cart" is clicked', async () => {
      const mockOnAddToCart = jest.fn();

      render(<PackagesGrid {...defaultProps} onAddToCart={mockOnAddToCart} />);

      // Complete all 3 steps
      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));
      await waitFor(() => screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText('Next: Review'));
      await waitFor(() => screen.getByText('Add to Cart'));
      fireEvent.click(screen.getByText('Add to Cart'));

      expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
    });

    it('should transform custom package data into correct StoreItem format', async () => {
      const mockOnAddToCart = jest.fn();

      render(<PackagesGrid {...defaultProps} onAddToCart={mockOnAddToCart} />);

      // Complete wizard with 25 sessions (silver tier)
      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '25' } });
      });
      await waitFor(() => screen.getByText(/\$162\/session/i));
      fireEvent.click(screen.getByText('Next: Schedule'));
      await waitFor(() => screen.getByText(/2 sessions per week/i));
      fireEvent.click(screen.getByText(/2 sessions per week/i));
      fireEvent.click(screen.getByText('Next: Review'));
      await waitFor(() => screen.getByText('Add to Cart'));
      fireEvent.click(screen.getByText('Add to Cart'));

      const addedItem = mockOnAddToCart.mock.calls[0][0];

      expect(addedItem).toMatchObject({
        name: 'Custom Training Package (25 Sessions)',
        packageType: 'custom',
        sessions: 25,
        pricePerSession: 162,
        totalCost: 4050,
        displayPrice: 4050,
        customPackageConfig: {
          selectedSessions: 25,
          pricePerSession: 162,
          volumeDiscount: 13,
          discountTier: 'silver',
          calculatedTotal: 4050
        }
      });
    });

    it('should close wizard after adding to cart', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));
      await waitFor(() => screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText('Next: Review'));
      await waitFor(() => screen.getByText('Add to Cart'));
      fireEvent.click(screen.getByText('Add to Cart'));

      await waitFor(() => {
        expect(screen.queryByText('Build Your Custom Package')).not.toBeInTheDocument();
      });
    });

    it('should include notes in cart item if provided', async () => {
      const mockOnAddToCart = jest.fn();

      render(<PackagesGrid {...defaultProps} onAddToCart={mockOnAddToCart} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));
      await waitFor(() => {
        const notesInput = screen.getByPlaceholderText(/Any specific scheduling preferences/i);
        fireEvent.change(notesInput, { target: { value: 'Prefer mornings' } });
      });
      fireEvent.click(screen.getByText(/Flexible scheduling/i));
      fireEvent.click(screen.getByText('Next: Review'));
      await waitFor(() => screen.getByText('Add to Cart'));
      fireEvent.click(screen.getByText('Add to Cart'));

      const addedItem = mockOnAddToCart.mock.calls[0][0];
      expect(addedItem.includedFeatures).toContain('Prefer mornings');
    });
  });

  // ===================== ERROR HANDLING TESTS =====================

  describe('Error Handling', () => {
    it('should display error when API request fails', async () => {
      server.use(
        rest.get('/api/storefront/calculate-price', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ success: false, message: 'Server error' }));
        })
      );

      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '20' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Failed to calculate pricing/i)).toBeInTheDocument();
      });
    });

    it('should display error for sessions below minimum (< 10)', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '5' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Minimum 10 sessions required/i)).toBeInTheDocument();
      });
    });

    it('should display error for sessions above maximum (> 100)', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        fireEvent.change(slider, { target: { value: '105' } });
      });

      await waitFor(() => {
        expect(screen.getByText(/Maximum 100 sessions allowed/i)).toBeInTheDocument();
      });
    });
  });

  // ===================== ACCESSIBILITY TESTS =====================

  describe('Accessibility (WCAG 2.1 AAA)', () => {
    it('should have proper ARIA labels on wizard modal', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByLabelText('Close wizard')).toBeInTheDocument();
      });
    });

    it('should have accessible slider with proper labels', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const slider = screen.getByRole('slider');
        expect(slider).toHaveAttribute('aria-label');
        expect(slider).toHaveAttribute('aria-valuemin', '10');
        expect(slider).toHaveAttribute('aria-valuemax', '100');
      });
    });

    it('should support keyboard navigation for schedule options', async () => {
      const user = userEvent.setup();

      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));

      await waitFor(() => {
        const firstOption = screen.getByText(/Flexible scheduling/i).closest('button');
        expect(firstOption).toBeInTheDocument();
      });

      // Tab to option and press Enter
      await user.tab();
      await user.keyboard('{Enter}');

      // Verify selection
      const selectedOption = screen.getByText(/Flexible scheduling/i).closest('div');
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });

    it('should have minimum 44px touch targets on mobile', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));

      await waitFor(() => {
        const nextButton = screen.getByText('Next: Schedule');
        const styles = window.getComputedStyle(nextButton);
        const height = parseInt(styles.height, 10);

        expect(height).toBeGreaterThanOrEqual(44);
      });
    });
  });

  // ===================== MOBILE SWIPE TESTS =====================

  describe('Mobile Swipe Gestures', () => {
    it('should navigate to next step on swipe left', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));

      const wizardContent = screen.getByText('Step 1: Choose Your Sessions').closest('div');

      // Simulate swipe left gesture
      fireEvent.touchStart(wizardContent!, { touches: [{ clientX: 300, clientY: 200 }] });
      fireEvent.touchMove(wizardContent!, { touches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchEnd(wizardContent!);

      await waitFor(() => {
        expect(screen.getByText('Step 2: Schedule Preference')).toBeInTheDocument();
      });
    });

    it('should navigate to previous step on swipe right', async () => {
      render(<PackagesGrid {...defaultProps} />);

      fireEvent.click(screen.getByText('Start Building'));
      await waitFor(() => screen.getByText('Next: Schedule'));
      fireEvent.click(screen.getByText('Next: Schedule'));
      await waitFor(() => screen.getByText('Step 2: Schedule Preference'));

      const wizardContent = screen.getByText('Step 2: Schedule Preference').closest('div');

      // Simulate swipe right gesture
      fireEvent.touchStart(wizardContent!, { touches: [{ clientX: 100, clientY: 200 }] });
      fireEvent.touchMove(wizardContent!, { touches: [{ clientX: 300, clientY: 200 }] });
      fireEvent.touchEnd(wizardContent!);

      await waitFor(() => {
        expect(screen.getByText('Step 1: Choose Your Sessions')).toBeInTheDocument();
      });
    });
  });
});
