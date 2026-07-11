/**
 * FoodIntakeForm Component
 *
 * Allows users to log, edit, and remove manual macro entries through /api/macros.
 * UI is split into line-cap-safe sections and styled-components modules.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Utensils } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import useMcpIntegration from '../../hooks/useMcpIntegration';
import apiService from '../../services/api.service';
import { logger } from '@/utils/logger';
import {
  FoodFormGrid,
  FoodItemsEditor,
  NutritionSummary,
  SavedMealNotice,
  StatusChips,
  SubmitRow,
  SuccessToast,
} from './FoodIntakeForm.sections';
import {
  ErrorAlert,
  FieldGroup,
  FormWrapper,
  Label,
  StyledSelect,
  Title,
} from './FoodIntakeForm.styles';
import {
  DELETE_ERROR_COPY,
  MEAL_TYPES,
  SAVE_ERROR_COPY,
  UPDATE_ERROR_COPY,
  buildFoodIntakeEntry,
  buildMacroPayload,
  calculateFoodTotals,
  createEmptyFoodItem,
  createFoodItemId,
  editableItemsFromSavedEntry,
  savedMacroEntryFromResponse,
  validateFoodItems,
  type FoodItem,
  type MealType,
  type SavedMacroEntry,
} from './FoodIntakeForm.logic';
import { manualFoodItemsToNutritionDraft } from './nutritionDraft.adapters';
import type { NutritionEntryDraft } from './nutritionDraft.types';

interface FoodIntakeFormProps {
  onDataSent?: (success: boolean) => void;
  onReviewDraft?: (draft: NutritionEntryDraft) => void;
}

const readResponseEntry = (response: any) => response?.data?.entry ?? response?.entry ?? null;

const FoodIntakeForm: React.FC<FoodIntakeFormProps> = ({ onDataSent, onReviewDraft }) => {
  const { user } = useAuth();
  const { logFoodIntake } = useMcpIntegration();
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [foodItems, setFoodItems] = useState<FoodItem[]>([createEmptyFoodItem()]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedEntry, setSavedEntry] = useState<SavedMacroEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastExiting(false);
    setToastVisible(true);
  }, []);

  const handleCloseToast = useCallback(() => {
    setToastExiting(true);
    window.setTimeout(() => {
      setToastVisible(false);
      setToastExiting(false);
    }, 300);
  }, []);

  useEffect(() => {
    if (!toastVisible) return undefined;
    const timer = window.setTimeout(handleCloseToast, 5000);
    return () => window.clearTimeout(timer);
  }, [handleCloseToast, toastVisible]);

  const resetForm = useCallback(() => {
    setMealType('breakfast');
    setFoodItems([createEmptyFoodItem()]);
    setFieldErrors({});
    setEditing(false);
  }, []);

  const handleAddFoodItem = useCallback(() => {
    setFoodItems((prev) => [...prev, createEmptyFoodItem(createFoodItemId())]);
  }, []);

  const handleRemoveFoodItem = useCallback((id: string) => {
    setFoodItems((prev) => prev.length <= 1 ? prev : prev.filter((item) => item.id !== id));
  }, []);

  const handleFoodItemChange = useCallback(<K extends keyof FoodItem>(
    id: string,
    field: K,
    value: FoodItem[K],
  ) => {
    setFoodItems((prev) => prev.map((item) => item.id === id ? { ...item, [field]: value } : item));
    setFieldErrors((prev) => {
      const fieldKey = `food-${field}-${id}`;
      if (!prev[fieldKey]) return prev;
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }, []);

  const startEditSavedMeal = useCallback(() => {
    if (!savedEntry) return;
    setMealType(savedEntry.mealType);
    setFoodItems(editableItemsFromSavedEntry(savedEntry));
    setError(null);
    setEditing(true);
  }, [savedEntry]);

  const handleDeleteSavedMeal = useCallback(async () => {
    if (!savedEntry?.id) return;
    setDeleting(true);
    setError(null);
    try {
      await apiService.delete(`/api/macros/${savedEntry.id}`);
      setSavedEntry(null);
      resetForm();
      setStatusMessage('Meal removed. My Macros is current.');
      showToast('Saved meal removed from My Macros.');
      onDataSent?.(true);
    } catch {
      setError(DELETE_ERROR_COPY);
      onDataSent?.(false);
    } finally {
      setDeleting(false);
    }
  }, [onDataSent, resetForm, savedEntry, showToast]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.id) {
      setError('Please log in again before logging food intake.');
      onDataSent?.(false);
      return;
    }

    const errors = validateFoodItems(foodItems);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please fill out all required fields.');
      return;
    }

    if (onReviewDraft && !editing) {
      const numericUserId = Number(user.id);
      const userId = Number.isInteger(numericUserId) && numericUserId > 0 ? numericUserId : null;
      setError(null);
      onReviewDraft(manualFoodItemsToNutritionDraft(mealType, foodItems, {
        userId,
        loggedByUserId: userId,
      }));
      setStatusMessage('Meal ready for review. Confirm serving and nutrients before saving.');
      return;
    }

    const payload = buildMacroPayload(mealType, foodItems, editing && savedEntry?.date ? savedEntry.date : undefined);
    setLoading(true);
    setError(null);
    try {
      const response = editing && savedEntry?.id
        ? await apiService.patch(`/api/macros/${savedEntry.id}`, payload)
        : await apiService.post('/api/macros', payload);
      const nextEntry = savedMacroEntryFromResponse(readResponseEntry(response), payload);
      setSavedEntry(nextEntry);
      setStatusMessage(editing ? 'Meal updated. My Macros is current.' : 'Meal saved. You can edit this row before leaving.');
      showToast(editing ? 'Saved meal updated in My Macros.' : 'Food intake logged successfully.');
      setEditing(false);

      if (!editing) {
        try {
          await logFoodIntake(buildFoodIntakeEntry(String(user.id), mealType, foodItems));
        } catch (integrationErr) {
          logger.warn('Food intake side-effect logging failed (non-blocking):', integrationErr);
        }
      }

      resetForm();
      onDataSent?.(true);
    } catch {
      setError(editing ? UPDATE_ERROR_COPY : SAVE_ERROR_COPY);
      onDataSent?.(false);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => calculateFoodTotals(foodItems), [foodItems]);

  return (
    <FormWrapper>
      <Title><Utensils size={24} />Food Intake Tracker</Title>
      <StatusChips statusMessage={statusMessage} />
      {error && <ErrorAlert role="alert">{error}</ErrorAlert>}
      <SavedMealNotice
        entry={savedEntry}
        deleting={deleting}
        onEdit={startEditSavedMeal}
        onDelete={handleDeleteSavedMeal}
      />
      <form onSubmit={handleSubmit}>
        <FoodFormGrid>
          <FieldGroup>
            <Label htmlFor="food-intake-meal-type">Meal Type</Label>
            <StyledSelect
              id="food-intake-meal-type"
              value={mealType}
              onChange={(event) => setMealType(event.target.value as MealType)}
              required
            >
              {MEAL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </StyledSelect>
          </FieldGroup>
          <FoodItemsEditor
            foodItems={foodItems}
            fieldErrors={fieldErrors}
            onAdd={handleAddFoodItem}
            onRemove={handleRemoveFoodItem}
            onChange={handleFoodItemChange}
          />
          <NutritionSummary totals={totals} />
          <SubmitRow loading={loading} editing={editing} reviewMode={Boolean(onReviewDraft && !editing)} />
        </FoodFormGrid>
      </form>
      <SuccessToast
        visible={toastVisible}
        exiting={toastExiting}
        message={toastMessage}
        onClose={handleCloseToast}
      />
    </FormWrapper>
  );
};

export default FoodIntakeForm;
