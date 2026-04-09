/**
 * ============================================================================
 * FILE: useNutritionCoach.ts
 * PURPOSE: Bridge hook — sends a restaurant/brand food item to Swan Coach
 * AUTHOR: Claude Sonnet 4.6 | CREATED: 2026-04-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Provides an `askCoach(food)` function for food-tracker components.
 * Serialises the FoodDetail into a user-visible message + structured
 * foodContext, stores both in sessionStorage, then navigates to the
 * Coach Assistant page. On mount, the page reads sessionStorage and
 * auto-sends via useCoachAssistant.sendMessageWithFood.
 *
 * HOW IT FITS IN THE APP:
 *   RestaurantTab → useNutritionCoach.askCoach(food)
 *     → sessionStorage['swan:pending-coach-food']
 *       → navigate /dashboard/:role/coach-assistant
 *         → SwanCoachAssistantPage reads + auto-sends
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FoodDetail } from './useRestaurantSearch';

export function useNutritionCoach() {
  const navigate = useNavigate();

  const askCoach = useCallback((food: FoodDetail) => {
    const s = food.primaryServing;
    const displayName = food.brand ? `${food.brand} ${food.name}` : food.name;

    const message = `I'm considering ${displayName} (${s.description}) — ${s.calories} cal, ${s.protein}g protein, ${s.carbs}g carbs, ${s.fat}g fat. Is this a good choice for my goals? Any tips on timing or what to pair it with?`;

    const foodContext: Record<string, unknown> = {
      type: 'restaurant_food',
      foodName: displayName,
      restaurantBrand: food.brand || null,
      serving: s.description,
      calories: s.calories,
      protein: s.protein,
      carbs: s.carbs,
      fat: s.fat,
      fiber: s.fiber,
      sugar: s.sugar,
      sodium: s.sodium,
      saturatedFat: s.saturatedFat,
    };

    try {
      sessionStorage.setItem('swan:pending-coach-food', JSON.stringify({ message, foodContext }));
    } catch { /* storage full — coach will just get the message text */ }

    // Derive role from localStorage (same pattern as SwanCoachAssistantPage)
    let role = 'client';
    try {
      const userData = localStorage.getItem('user');
      if (userData) role = JSON.parse(userData).role || 'client';
    } catch { /* fallback */ }

    navigate(`/dashboard/${role}/coach-assistant`);
  }, [navigate]);

  return { askCoach };
}
