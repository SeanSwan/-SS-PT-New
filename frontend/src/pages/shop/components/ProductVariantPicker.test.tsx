import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProductVariantPicker from './ProductVariantPicker';
import type { ProductVariant } from './storeCatalog.types';

const variants: ProductVariant[] = [
  { id: 1, storefrontItemId: 10, label: 'Single', price: null, stockQuantity: null, isActive: true, displayOrder: 1, sku: null, attributes: null },
  { id: 2, storefrontItemId: 10, label: 'Sold out', price: 20, stockQuantity: 0, isActive: true, displayOrder: 2, sku: null, attributes: null },
  { id: 3, storefrontItemId: 10, label: 'Pair', price: 29.75, stockQuantity: 5, isActive: true, displayOrder: 3, sku: null, attributes: null },
];
const Fixture = () => {
  const [selected, setSelected] = useState<number | null>(1);
  return <ProductVariantPicker variants={variants} selectedVariantId={selected} parentPrice={null} canViewPrices onSelect={variant => setSelected(variant.id)} />;
};
describe('variant selector accessible and truthful behavior', () => {
  it('uses one tab stop and arrow/Home/End navigation while skipping sold-out options', () => {
    render(<Fixture />);
    const first = screen.getByRole('radio', { name: /Single/ });
    const last = screen.getByRole('radio', { name: /Pair/ });
    expect(screen.getAllByRole('radio').filter(node => node.tabIndex === 0)).toEqual([first]);
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(last).toHaveFocus();
    expect(last).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(last, { key: 'ArrowRight' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'End' });
    expect(last).toHaveFocus();
    fireEvent.keyDown(last, { key: 'Home' });
    expect(first).toHaveFocus();
  });
  it('keeps unavailable money unavailable and unknown stock neutral', () => {
    render(<Fixture />);
    expect(screen.getByRole('radio', { name: /Single/ })).toHaveTextContent('Price unavailable');
    expect(screen.queryByText(/Made fresh/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$0(?:\.00)?\b/)).not.toBeInTheDocument();
  });
  it('disables invalid identities and exposes no selection when all variants are unavailable', () => {
    const onSelect = vi.fn();
    render(<ProductVariantPicker variants={[{ ...variants[0], id: 0 }, variants[1]]} selectedVariantId={null} parentPrice={null} canViewPrices onSelect={onSelect} />);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
      fireEvent.click(radio);
    }
    expect(onSelect).not.toHaveBeenCalled();
  });
});
