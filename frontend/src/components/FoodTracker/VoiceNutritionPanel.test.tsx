/**
 * VoiceNutritionPanel.test — Slice 1.6 "Speak a Meal".
 * Locks: typed/spoken meal -> /api/meal-plans/parse-voice -> the reused
 * MealPlanApproveSavePanel review surface; low-confidence follow-ups surface
 * before saving; nothing-parsed (422) shows safe copy and no review panel.
 * (Speech API is absent in jsdom, so the textarea path is exercised directly.)
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceNutritionPanel from './VoiceNutritionPanel';

const apiMocks = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../services/api.service', () => ({ default: { post: apiMocks.post } }));

describe('VoiceNutritionPanel (Slice 1.6)', () => {
  beforeEach(() => { apiMocks.post.mockReset(); });

  it('drafts a typed meal into the editable review panel via /api/meal-plans/parse-voice', async () => {
    apiMocks.post.mockResolvedValueOnce({ data: { success: true, draft: {
      meals: [{ mealType: 'lunch', description: 'chicken burrito bowl', calories: 650, protein: 45, carbs: 70, fat: 18 }],
      confidence: 0.7, lowConfidence: false, followUpQuestions: [],
    } } });
    const onDataSent = vi.fn();
    const user = userEvent.setup();

    render(<VoiceNutritionPanel onDataSent={onDataSent} />);
    await user.type(screen.getByLabelText(/what did you eat/i), 'I had a chicken burrito bowl');
    await user.click(screen.getByRole('button', { name: /draft my meal/i }));

    await waitFor(() => expect(apiMocks.post).toHaveBeenCalledWith('/api/meal-plans/parse-voice', { transcript: 'I had a chicken burrito bowl' }));
    expect(await screen.findByRole('button', { name: /approve and save meal plan/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('chicken burrito bowl')).toBeInTheDocument();
  });

  it('surfaces low-confidence follow-up questions before saving', async () => {
    apiMocks.post.mockResolvedValueOnce({ data: { success: true, draft: {
      meals: [{ mealType: 'snack', description: 'some chips', calories: 200 }],
      lowConfidence: true, followUpQuestions: ['How big was the bag of chips?'],
    } } });
    const user = userEvent.setup();

    render(<VoiceNutritionPanel />);
    await user.type(screen.getByLabelText(/what did you eat/i), 'I had some chips');
    await user.click(screen.getByRole('button', { name: /draft my meal/i }));

    expect(await screen.findByText(/how big was the bag of chips/i)).toBeInTheDocument();
    expect(screen.getByText(/rough estimate/i)).toBeInTheDocument();
  });

  it('shows a friendly message and no review panel when nothing parses (422)', async () => {
    apiMocks.post.mockRejectedValueOnce({ response: { status: 422, data: { message: 'no_meals_parsed' } } });
    const user = userEvent.setup();

    render(<VoiceNutritionPanel />);
    await user.type(screen.getByLabelText(/what did you eat/i), 'uhhh nothing really');
    await user.click(screen.getByRole('button', { name: /draft my meal/i }));

    expect(await screen.findByText(/could not pick out any foods/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve and save meal plan/i })).not.toBeInTheDocument();
  });

  it('does not surface raw backend or provider messages when voice parsing fails', async () => {
    apiMocks.post.mockRejectedValueOnce({
      response: {
        status: 500,
        data: { message: 'raw provider stack with token lower-layer-secret' },
      },
    });
    const user = userEvent.setup();

    render(<VoiceNutritionPanel />);
    await user.type(screen.getByLabelText(/what did you eat/i), 'I had chicken and rice');
    await user.click(screen.getByRole('button', { name: /draft my meal/i }));

    expect(await screen.findByText('Could not understand that meal. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText(/lower-layer-secret/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve and save meal plan/i })).not.toBeInTheDocument();
  });

  it('does not blame the meal text when the voice endpoint returns an upgrade gate', async () => {
    apiMocks.post.mockRejectedValueOnce({
      response: {
        status: 402,
        data: { message: 'pro_subscription_required raw-billing-code' },
      },
    });
    const user = userEvent.setup();

    render(<VoiceNutritionPanel />);
    await user.type(screen.getByLabelText(/what did you eat/i), 'I had chicken and rice');
    await user.click(screen.getByRole('button', { name: /draft my meal/i }));

    expect(await screen.findByText('Speak a Meal requires Swan Guardian. Upgrade to use voice meal logging.')).toBeInTheDocument();
    expect(screen.queryByText(/raw-billing-code/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Could not understand that meal. Please try again.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve and save meal plan/i })).not.toBeInTheDocument();
  });
});
