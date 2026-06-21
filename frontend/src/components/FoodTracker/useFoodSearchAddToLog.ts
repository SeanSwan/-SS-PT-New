import { useRef, useState } from 'react';
import apiService from '../../services/api.service';
import { buildSearchMacroPayload, type SearchFood } from './mealPhotoLog';

type FoodSearchId = string | number;

export interface FoodSearchLogItem extends SearchFood {
  id: FoodSearchId;
}

export const formatMealLabel = (mealType: string) => mealType.charAt(0).toUpperCase() + mealType.slice(1);

export const useFoodSearchAddToLog = (onDataSent?: (success: boolean) => void) => {
  const [mealType, setMealType] = useState('snack');
  const [addedIds, setAddedIds] = useState<Set<FoodSearchId>>(() => new Set());
  const [savingId, setSavingId] = useState<FoodSearchId | null>(null);
  const [addError, setAddError] = useState('');
  const savingRef = useRef(false);

  const addToLog = async (food: FoodSearchLogItem) => {
    if (savingRef.current || addedIds.has(food.id)) return;
    savingRef.current = true;
    setSavingId(food.id);
    setAddError('');
    try {
      await apiService.post('/api/macros', buildSearchMacroPayload(food, { mealType }));
      setAddedIds((prev) => new Set(prev).add(food.id));
      onDataSent?.(true);
    } catch {
      setAddError('Could not add that food to your log. Please try again.');
    } finally {
      savingRef.current = false;
      setSavingId(null);
    }
  };

  return {
    addError,
    addToLog,
    addedIds,
    mealType,
    savingId,
    setMealType,
  };
};
