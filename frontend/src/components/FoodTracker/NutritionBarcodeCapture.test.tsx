import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NutritionBarcodeCapture from './NutritionBarcodeCapture';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock('../../services/api.service', () => ({
  default: { get: mocks.get },
}));

vi.mock('../FoodScanner/BarcodeScanner', () => ({
  default: ({ onDetected, disabled }: { onDetected: (barcode: string) => void; disabled?: boolean }) => (
    <button type="button" disabled={disabled} onClick={() => onDetected('049000042566')}>
      Detect test barcode
    </button>
  ),
}));

describe('NutritionBarcodeCapture', () => {
  beforeEach(() => {
    mocks.get.mockReset();
  });

  it('turns a found barcode into a label-serving review draft', async () => {
    mocks.get.mockResolvedValue({
      data: {
        success: true,
        product: {
          id: 22,
          barcode: '049000042566',
          name: 'Protein Bites',
          brand: 'Swan Foods',
          dataSource: 'Open Food Facts',
          nutritionalInfo: {
            serving_size_g: 30,
            energy_kcal_100g: 400,
            proteins_100g: 10,
            carbohydrates_100g: 50,
            fat_100g: 20,
          },
        },
      },
    });
    const onReviewDraft = vi.fn();
    const user = userEvent.setup();

    render(<NutritionBarcodeCapture onReviewDraft={onReviewDraft} />);
    await user.click(screen.getByRole('button', { name: /detect test barcode/i }));

    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith('/api/food-scanner/scan/049000042566'));
    expect(onReviewDraft).toHaveBeenCalledWith(expect.objectContaining({
      source: 'barcode',
      rawPayloadRef: expect.objectContaining({ barcode: '049000042566' }),
      foods: [expect.objectContaining({ serving: expect.objectContaining({ basis: 'label', quantity: 30 }) })],
    }));
  });

  it('morphs an unmatched barcode into a manual draft without losing the barcode', async () => {
    mocks.get.mockRejectedValue({ response: { status: 404 } });
    const onReviewDraft = vi.fn();
    const user = userEvent.setup();

    render(<NutritionBarcodeCapture onReviewDraft={onReviewDraft} />);
    await user.click(screen.getByRole('button', { name: /detect test barcode/i }));

    expect(await screen.findByText(/not in the provider catalog/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/food name/i), 'Local protein bar');
    await user.type(screen.getByLabelText(/^calories$/i), '220');
    await user.click(screen.getByRole('button', { name: /review manual barcode entry/i }));

    expect(onReviewDraft).toHaveBeenCalledWith(expect.objectContaining({
      source: 'barcode',
      reviewReason: 'barcode_unmatched',
      rawPayloadRef: expect.objectContaining({ barcode: '049000042566' }),
      foods: [expect.objectContaining({ description: 'Local protein bar' })],
    }));
  });

  it('offers retry and manual recovery for provider downtime without exposing raw errors', async () => {
    mocks.get.mockRejectedValue(new Error('raw upstream token'));
    const user = userEvent.setup();

    render(<NutritionBarcodeCapture onReviewDraft={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /detect test barcode/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/barcode lookup is temporarily unavailable/i);
    expect(screen.getByRole('button', { name: /retry barcode lookup/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/food name/i)).toBeInTheDocument();
    expect(screen.queryByText(/raw upstream token/i)).not.toBeInTheDocument();
  });
});
