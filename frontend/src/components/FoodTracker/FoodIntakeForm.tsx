/**
 * FoodIntakeForm Component
 *
 * Allows users to log their food intake through the SwanStudios nutrition API.
 * This component supports the integration between nutrition tracking and gamification.
 *
 * UI: styled-components + lucide-react (zero MUI dependencies)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import useMcpIntegration from '../../hooks/useMcpIntegration';
import { theme } from '../../theme/tokens';

// Icons (lucide-react replacements for MUI icons)
import {
  Plus,
  Trash2,
  UtensilsCrossed,
  Utensils,
  Zap,
  Activity
} from 'lucide-react';
import { logger } from '@/utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FoodItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quality: 'low' | 'medium' | 'high';
}

interface FoodIntakeEntry {
  id: string;
  timestamp: string;
  userId: string;
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: FoodItem[];
}

interface FoodIntakeFormProps {
  onDataSent?: (success: boolean) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' }
];

const FOOD_QUALITY = [
  { value: 'low', label: 'Low Quality (Processed/Ultra-Processed)' },
  { value: 'medium', label: 'Medium Quality (Semi-Processed)' },
  { value: 'high', label: 'High Quality (Whole Foods)' }
];

// ─── Keyframes ───────────────────────────────────────────────────────────────

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const toastSlideIn = keyframes`
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const toastSlideOut = keyframes`
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
`;

const errorShake = keyframes`
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
`;

// ─── Styled Components ───────────────────────────────────────────────────────

const FormWrapper = styled.div`
  padding: 24px;
  border-radius: 12px;
  background: rgba(0, 32, 96, 0.75);
  border: 1px solid rgba(96, 192, 240, 0.12);
  backdrop-filter: blur(16px);
  color: ${theme.colors.text.primary};
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: ${theme.colors.text.frost};
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatusRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
`;

const Chip = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 500;
  background: ${({ $active }) =>
    $active ? `rgba(34, 197, 94, 0.15)` : 'rgba(255, 255, 255, 0.08)'};
  color: ${({ $active }) =>
    $active ? theme.colors.semantic.success : theme.colors.text.disabled};
  border: 1px solid ${({ $active }) =>
    $active ? `rgba(34, 197, 94, 0.3)` : 'rgba(255, 255, 255, 0.1)'};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ErrorAlert = styled.div`
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: ${theme.colors.semantic.error};
  font-size: 0.9rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 500;
  color: ${theme.colors.text.secondary};
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.text.primary};
  font-size: 0.95rem;
  outline: none;
  appearance: auto;
  min-height: 44px;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: ${theme.colors.brand.purple};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  option {
    background: ${theme.colors.surface.abyssalNavy};
    color: ${theme.colors.text.primary};
  }
`;

const FoodCard = styled.div`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
`;

const FoodCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const FoodCardTitle = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${theme.colors.text.frost};
`;

const IconBtn = styled.button<{ $danger?: boolean; $disabled?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 50%;
  border: none;
  background: ${({ $danger }) =>
    $danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${({ $danger }) => ($danger ? theme.colors.semantic.error : theme.colors.text.secondary)};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.35 : 1)};
  transition: background 0.2s ease, color 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ $danger }) =>
      $danger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.15)'};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const FoodFieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const MacroFieldGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
`;

const InputWithUnit = styled.div`
  position: relative;
  width: 100%;
`;

const UnitSuffix = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${theme.colors.text.secondary};
  font-size: 0.85rem;
  pointer-events: none;
`;

const StyledInput = styled.input<{ $hasUnit?: boolean; $hasError?: boolean }>`
  width: 100%;
  padding: 12px 14px;
  padding-right: ${({ $hasUnit }) => ($hasUnit ? '48px' : '14px')};
  border-radius: 8px;
  border: 1px solid ${({ $hasError }) => $hasError ? theme.colors.semantic.error : 'rgba(255, 255, 255, 0.15)'};
  background: rgba(255, 255, 255, 0.05);
  color: ${theme.colors.text.primary};
  font-size: 0.95rem;
  outline: none;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: ${theme.colors.brand.purple};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &::placeholder {
    color: ${theme.colors.text.secondary};
  }

  &[aria-invalid="true"] {
    border-color: ${theme.colors.semantic.error};
    box-shadow: 0 0 8px rgba(239, 68, 68, 0.25);
    animation: ${errorShake} 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
  }

  /* Remove number spinners */
  &[type='number']::-webkit-inner-spin-button,
  &[type='number']::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  &[type='number'] {
    -moz-appearance: textfield;
  }
`;

const HelperText = styled.small`
  font-size: 0.78rem;
  color: ${theme.colors.text.secondary};
  margin-top: 2px;
`;

const FieldError = styled.span`
  display: block;
  font-size: 0.78rem;
  color: ${theme.colors.semantic.error};
  margin-top: 2px;
  min-height: 0;
`;

const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px dashed rgba(139, 92, 246, 0.4);
  background: transparent;
  color: ${theme.colors.brand.purple};
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.06);
    border-color: ${theme.colors.brand.purple};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SummaryHeading = styled.h3`
  font-size: 1.15rem;
  font-weight: 600;
  color: ${theme.colors.text.frost};
  margin: 0 0 12px 0;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
`;

const SummaryCard = styled.div`
  text-align: center;
  padding: 12px 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
`;

const SummaryLabel = styled.span`
  display: block;
  font-size: 0.8rem;
  font-weight: 500;
  color: ${theme.colors.text.disabled};
  margin-bottom: 4px;
`;

const SummaryValue = styled.span`
  display: block;
  font-size: 1.15rem;
  font-weight: 700;
  color: ${theme.colors.text.primary};
`;

const SubmitButton = styled.button<{ $loading?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  background: ${theme.colors.brand.purple};
  color: ${theme.colors.text.primary};
  font-size: 1rem;
  font-weight: 600;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  opacity: ${({ $loading }) => ($loading ? 0.75 : 1)};
  pointer-events: ${({ $loading }) => ($loading ? 'none' : 'auto')};
  transition: opacity 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
  box-shadow: 0 0 12px rgba(96, 192, 240, 0.3);

  &:hover:not(:disabled) {
    opacity: 0.9;
    box-shadow: 0 0 20px rgba(96, 192, 240, 0.5);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const Spinner = styled.span`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: ${theme.colors.text.primary};
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const ToastOverlay = styled.div<{ $visible: boolean; $exiting: boolean }>`
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  animation: ${({ $exiting }) => ($exiting ? toastSlideOut : toastSlideIn)} 0.3s ease forwards;
`;

const ToastContent = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  border-radius: 10px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: ${theme.colors.semantic.success};
  font-size: 0.9rem;
  font-weight: 500;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  white-space: nowrap;
`;

const ToastCloseBtn = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  padding: 2px;
  line-height: 1;
  font-size: 1.1rem;

  &:hover {
    color: white;
  }
`;

// ─── Component ───────────────────────────────────────────────────────────────

const FoodIntakeForm: React.FC<FoodIntakeFormProps> = ({ onDataSent }) => {
  const { user } = useAuth();

  // Form state
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [foodItems, setFoodItems] = useState<FoodItem[]>([
    {
      id: '1',
      name: '',
      portion: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      quality: 'medium'
    }
  ]);

  // Legacy hook name, REST-backed at runtime.
  const { logFoodIntake } = useMcpIntegration();

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        handleCloseSuccessMessage();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  // Add a new food item (functional update to avoid stale closures)
  const handleAddFoodItem = useCallback(() => {
    setFoodItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        portion: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        quality: 'medium' as const,
      }
    ]);
  }, []);

  // Remove a food item (functional update)
  const handleRemoveFoodItem = useCallback((id: string) => {
    setFoodItems(prev => {
      if (prev.length <= 1) return prev;
      return prev.filter(item => item.id !== id);
    });
  }, []);

  // Update a food item (generic type constraint + functional update)
  const handleFoodItemChange = useCallback(<K extends keyof FoodItem>(
    id: string, field: K, value: FoodItem[K]
  ) => {
    setFoodItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
    // Clear field error on change
    const fieldKey = `food-${field}-${id}`;
    setFieldErrors(prev => {
      if (prev[fieldKey]) {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      }
      return prev;
    });
  }, []);

  // Calculate totals (memoized)
  const calculateTotals = useCallback(() => {
    return foodItems.reduce(
      (totals, item) => ({
        calories: totals.calories + (item.calories || 0),
        protein: totals.protein + (item.protein || 0),
        carbs: totals.carbs + (item.carbs || 0),
        fat: totals.fat + (item.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [foodItems]);

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setError('User not found. Please log in again.');
      return;
    }

    // Field-level validation
    const errors: Record<string, string> = {};
    foodItems.forEach(item => {
      if (import.meta.env.DEV) {
        if (typeof item.name !== 'string' || typeof item.portion !== 'string') {
          console.error('Type violation in FoodItem:', item);
        }
      }
      if (!(item.name?.trim())) {
        errors[`food-name-${item.id}`] = 'Food name is required';
      }
      if (!(item.portion?.trim())) {
        errors[`food-portion-${item.id}`] = 'Portion size is required';
      }
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please fill out all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create the food intake entry
      const entry: FoodIntakeEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        userId: user.id,
        meal: mealType,
        items: foodItems
      };

      const totals = calculateTotals();
      const description = foodItems.map(i => `${i.name} (${i.portion})`).join(', ');

      // Persist to backend database via /api/macros
      const API_BASE = import.meta.env.VITE_API_BASE
        || (import.meta.env.PROD ? '' : 'http://localhost:10000');
      const token = localStorage.getItem('token');
      const apiRes = await fetch(`${API_BASE}/api/macros`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          date: new Date().toISOString().split('T')[0],
          mealType: mealType,
          description,
          calories: totals.calories,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          items: foodItems,
          source: 'manual',
        }),
      });
      if (!apiRes.ok) {
        const errBody = await apiRes.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errBody.message || `Failed to save nutrition data (${apiRes.status})`);
      }

      // Keep the legacy integration hook non-blocking. The nutrition API above is
      // the source of truth; this lets older gamification hooks observe the event.
      try {
        await logFoodIntake(entry);
      } catch (integrationErr) {
        logger.warn('Food intake side-effect logging failed (non-blocking):', integrationErr);
      }

      // Success feedback
      setSuccess(true);
      setShowSuccessMessage(true);
      setToastExiting(false);
      resetForm();

      // Callback to parent
      if (onDataSent) {
        onDataSent(true);
      }
    } catch (error: unknown) {
      console.error('Error submitting food intake:', error);
      setError(error instanceof Error ? error.message : 'Error submitting food intake');

      // Callback to parent
      if (onDataSent) {
        onDataSent(false);
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setMealType('breakfast');
    setFoodItems([
      {
        id: '1',
        name: '',
        portion: '',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        quality: 'medium'
      }
    ]);
  };

  // Handle close toast
  const handleCloseSuccessMessage = () => {
    setToastExiting(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
      setToastExiting(false);
    }, 300);
  };

  // Memoized totals (avoids recalc on every render)
  const totals = useMemo(() => calculateTotals(), [calculateTotals]);

  return (
    <FormWrapper>
      <Title>
        <Utensils size={24} />
        Food Intake Tracker
      </Title>

      {/* API Status Indicators */}
      <StatusRow>
        <Chip $active>
          <Zap />
          Nutrition API: Active
        </Chip>
        <Chip $active>
          <Activity />
          Gamification API: Connected
        </Chip>
      </StatusRow>

      {error && (
        <ErrorAlert>{error}</ErrorAlert>
      )}

      <form onSubmit={handleSubmit}>
        <FormGrid>
          {/* Meal Type */}
          <FieldGroup>
            <Label>Meal Type</Label>
            <StyledSelect
              value={mealType}
              onChange={(e) => setMealType(e.target.value as any)}
              required
            >
              {MEAL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </StyledSelect>
          </FieldGroup>

          {/* Food Items */}
          {foodItems.map((item, index) => (
            <FoodCard key={item.id}>
              <FoodCardHeader>
                <FoodCardTitle>Food Item #{index + 1}</FoodCardTitle>
                <IconBtn
                  type="button"
                  $danger
                  $disabled={foodItems.length <= 1}
                  disabled={foodItems.length <= 1}
                  onClick={() => handleRemoveFoodItem(item.id)}
                  aria-label={`Remove food item ${index + 1}`}
                >
                  <Trash2 />
                </IconBtn>
              </FoodCardHeader>

              {/* Food Name & Portion */}
              <FoodFieldGrid>
                <FieldGroup>
                  <Label htmlFor={`food-name-${item.id}`}>Food Name</Label>
                  <StyledInput
                    id={`food-name-${item.id}`}
                    type="text"
                    value={item.name}
                    onChange={(e) => handleFoodItemChange(item.id, 'name', e.target.value)}
                    required
                    placeholder="e.g., Grilled Chicken"
                    aria-invalid={!!fieldErrors[`food-name-${item.id}`]}
                    aria-describedby={fieldErrors[`food-name-${item.id}`] ? `food-name-${item.id}-error` : undefined}
                    $hasError={!!fieldErrors[`food-name-${item.id}`]}
                  />
                  {fieldErrors[`food-name-${item.id}`] && (
                    <FieldError id={`food-name-${item.id}-error`} role="alert">
                      {fieldErrors[`food-name-${item.id}`]}
                    </FieldError>
                  )}
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor={`food-portion-${item.id}`}>Portion/Serving Size</Label>
                  <StyledInput
                    id={`food-portion-${item.id}`}
                    type="text"
                    value={item.portion}
                    onChange={(e) => handleFoodItemChange(item.id, 'portion', e.target.value)}
                    required
                    placeholder="e.g., 1 cup, 100g"
                    aria-invalid={!!fieldErrors[`food-portion-${item.id}`]}
                    aria-describedby={fieldErrors[`food-portion-${item.id}`] ? `food-portion-${item.id}-error` : undefined}
                    $hasError={!!fieldErrors[`food-portion-${item.id}`]}
                  />
                  {fieldErrors[`food-portion-${item.id}`] && (
                    <FieldError id={`food-portion-${item.id}-error`} role="alert">
                      {fieldErrors[`food-portion-${item.id}`]}
                    </FieldError>
                  )}
                </FieldGroup>
              </FoodFieldGrid>

              {/* Macro Fields */}
              <MacroFieldGrid style={{ marginTop: 12 }}>
                <FieldGroup>
                  <Label htmlFor={`food-cal-${item.id}`}>Calories</Label>
                  <InputWithUnit>
                    <StyledInput
                      id={`food-cal-${item.id}`}
                      type="number"
                      value={item.calories}
                      onChange={(e) => handleFoodItemChange(item.id, 'calories', Number(e.target.value))}
                      min={0}
                      $hasUnit
                    />
                    <UnitSuffix>kcal</UnitSuffix>
                  </InputWithUnit>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor={`food-protein-${item.id}`}>Protein</Label>
                  <InputWithUnit>
                    <StyledInput
                      id={`food-protein-${item.id}`}
                      type="number"
                      value={item.protein}
                      onChange={(e) => handleFoodItemChange(item.id, 'protein', Number(e.target.value))}
                      min={0}
                      $hasUnit
                    />
                    <UnitSuffix>g</UnitSuffix>
                  </InputWithUnit>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor={`food-carbs-${item.id}`}>Carbs</Label>
                  <InputWithUnit>
                    <StyledInput
                      id={`food-carbs-${item.id}`}
                      type="number"
                      value={item.carbs}
                      onChange={(e) => handleFoodItemChange(item.id, 'carbs', Number(e.target.value))}
                      min={0}
                      $hasUnit
                    />
                    <UnitSuffix>g</UnitSuffix>
                  </InputWithUnit>
                </FieldGroup>
                <FieldGroup>
                  <Label htmlFor={`food-fat-${item.id}`}>Fat</Label>
                  <InputWithUnit>
                    <StyledInput
                      id={`food-fat-${item.id}`}
                      type="number"
                      value={item.fat}
                      onChange={(e) => handleFoodItemChange(item.id, 'fat', Number(e.target.value))}
                      min={0}
                      $hasUnit
                    />
                    <UnitSuffix>g</UnitSuffix>
                  </InputWithUnit>
                </FieldGroup>
              </MacroFieldGrid>

              {/* Food Quality */}
              <FieldGroup style={{ marginTop: 12 }}>
                <Label>Food Quality</Label>
                <StyledSelect
                  value={item.quality}
                  onChange={(e) => handleFoodItemChange(item.id, 'quality', e.target.value)}
                >
                  {FOOD_QUALITY.map((quality) => (
                    <option key={quality.value} value={quality.value}>
                      {quality.label}
                    </option>
                  ))}
                </StyledSelect>
                <HelperText>Higher quality foods earn more gamification points</HelperText>
              </FieldGroup>
            </FoodCard>
          ))}

          {/* Add Food Item Button */}
          <AddButton type="button" onClick={handleAddFoodItem}>
            <Plus />
            Add Another Food Item
          </AddButton>

          {/* Nutrition Summary */}
          <div>
            <SummaryHeading>Nutrition Summary</SummaryHeading>
            <SummaryGrid>
              <SummaryCard>
                <SummaryLabel>Calories</SummaryLabel>
                <SummaryValue>{totals.calories} kcal</SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Protein</SummaryLabel>
                <SummaryValue>{totals.protein} g</SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Carbs</SummaryLabel>
                <SummaryValue>{totals.carbs} g</SummaryValue>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Fat</SummaryLabel>
                <SummaryValue>{totals.fat} g</SummaryValue>
              </SummaryCard>
            </SummaryGrid>
          </div>

          {/* Submit Button */}
          <SubmitButton
            type="submit"
            disabled={loading}
            $loading={loading}
          >
            {loading ? <Spinner /> : <UtensilsCrossed />}
            {loading ? 'Submitting...' : 'Log Food Intake'}
          </SubmitButton>
        </FormGrid>
      </form>

      {/* Success Toast */}
      {showSuccessMessage && (
        <ToastOverlay $visible={showSuccessMessage} $exiting={toastExiting}>
          <ToastContent>
            Food intake logged successfully!
            <ToastCloseBtn
              type="button"
              onClick={handleCloseSuccessMessage}
              aria-label="Close notification"
            >
              &times;
            </ToastCloseBtn>
          </ToastContent>
        </ToastOverlay>
      )}
    </FormWrapper>
  );
};

export default FoodIntakeForm;
