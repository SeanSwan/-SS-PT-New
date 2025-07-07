/**
 * NewCheckout/index.ts - Genesis Checkout System Exports
 * =====================================================
 * 
 * Clean, organized exports for the Genesis Checkout System
 * 
 * Components:
 * - CheckoutView: Main orchestrator component
 * - OrderReviewStep: Clean order summary component  
 * - CheckoutButton: GlowButton-powered action button
 * - SuccessPage: Stripe redirect success handler
 * 
 * Master Prompt v35 Compliance:
 * - Simple, clean exports
 * - No complex re-exports
 * - Clear component naming
 * - Easy import paths
 */

// Core Checkout Components
export { default as CheckoutView } from './CheckoutView';
export { default as OrderReviewStep } from './OrderReviewStep';
export { default as CheckoutButton } from './CheckoutButton';
export { default as SuccessPage } from './SuccessPage';

// Default export - Main checkout component
export { default } from './CheckoutView';
