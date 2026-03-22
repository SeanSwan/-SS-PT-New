/**
 * ============================================================================
 * FILE: index.ts
 * PURPOSE: Barrel export for the 3-tier error boundary architecture
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Re-exports all three error boundaries for clean imports.
 * Usage: import { RootErrorBoundary, DataErrorBoundary, ComponentErrorBoundary }
 *        from '@/components/ErrorBoundaries';
 */

export { default as RootErrorBoundary } from './RootErrorBoundary';
export { default as DataErrorBoundary } from './DataErrorBoundary';
export { default as ComponentErrorBoundary } from './ComponentErrorBoundary';
