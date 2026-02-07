/**
 * PremiumServicesSection.test.tsx
 * Tests for the PremiumServicesSection component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PremiumServicesSection from './PremiumServicesSection';

describe('PremiumServicesSection', () => {
  it('renders the section heading', () => {
    render(<PremiumServicesSection />);
    expect(screen.getByText('Elite Training Services')).toBeInTheDocument();
  });

  it('renders all service cards', () => {
    render(<PremiumServicesSection />);
    expect(screen.getByText('Personal Training')).toBeInTheDocument();
    expect(screen.getByText('Online Coaching')).toBeInTheDocument();
    expect(screen.getByText('Nutrition Planning')).toBeInTheDocument();
  });

  it('renders buttons with correct aria-labels', () => {
    render(<PremiumServicesSection />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Learn more about Personal Training');
  });

  it('has accessible section landmark', () => {
    render(<PremiumServicesSection />);
    const section = screen.getByRole('region', { name: 'Premium Services' });
    expect(section).toBeInTheDocument();
  });

  it('renders service descriptions', () => {
    render(<PremiumServicesSection />);
    expect(screen.getByText(/One-on-one coaching/)).toBeInTheDocument();
    expect(screen.getByText(/personalized workout plan/)).toBeInTheDocument();
    expect(screen.getByText(/custom meal plans/)).toBeInTheDocument();
  });
});
