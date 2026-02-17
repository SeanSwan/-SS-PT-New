/**
 * FoodIntakeForm Component
 *
 * Allows users to log their food intake which is then sent to both MCP servers for processing.
 * This component supports the integration between nutrition tracking and gamification.
 *
 * UI: styled-components + lucide-react (zero MUI dependencies)
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import { checkMcpServersStatus } from '../../utils/mcp-utils';
import useClientDashboardMcp from '../../hooks/useClientDashboardMcp';

// Icons (lucide-react replacements for MUI icons)
import {
  Plus,
  Trash2,
  UtensilsCrossed,
  Utensils,
  Zap,
  Activity
} from 'lucide-react';

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

// ─── Styled Components ───────────────────────────────────────────────────────

const FormWrapper = styled.div`
  padding: 24px;
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  color: white;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
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
    $active ? 'rgba(0, 200, 83, 0.15)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${({ $active }) =>
    $active ? '#00e676' : 'rgba(255, 255, 255, 0.6)'};
  border: 1px solid ${({ $active }) =>
    $active ? 'rgba(0, 200, 83, 0.3)' : 'rgba(255, 255, 255, 0.1)'};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const ErrorAlert = styled.div`
  background: rgba(211, 47, 47, 0.15);
  border: 1px solid rgba(211, 47, 47, 0.4);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #ff8a80;
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
  color: rgba(255, 255, 255, 0.7);
`;

const StyledSelect = styled.select`
  width: 100%;
  padding: 12px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.95rem;
  outline: none;
  appearance: auto;
  min-height: 44px;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #00FFFF;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  option {
    background: #1d1f2b;
    color: white;
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
  color: rgba(255, 255, 255, 0.9);
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
    $danger ? 'rgba(211, 47, 47, 0.15)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${({ $danger }) => ($danger ? '#ff8a80' : 'rgba(255, 255, 255, 0.7)')};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.35 : 1)};
  transition: background 0.2s ease, color 0.2s ease;

  &:hover:not(:disabled) {
    background: ${({ $danger }) =>
      $danger ? 'rgba(211, 47, 47, 0.3)' : 'rgba(255, 255, 255, 0.15)'};
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
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  pointer-events: none;
`;

const StyledInput = styled.input<{ $hasUnit?: boolean }>`
  width: 100%;
  padding: 12px 14px;
  padding-right: ${({ $hasUnit }) => ($hasUnit ? '48px' : '14px')};
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.95rem;
  outline: none;
  min-height: 44px;
  box-sizing: border-box;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: #00FFFF;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
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
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
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
  border: 1px dashed rgba(0, 255, 255, 0.4);
  background: transparent;
  color: #00FFFF;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: rgba(0, 255, 255, 0.06);
    border-color: #00FFFF;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`;

const SummaryHeading = styled.h3`
  font-size: 1.15rem;
  font-weight: 600;
  color: white;
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
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
`;

const SummaryValue = styled.span`
  display: block;
  font-size: 1.15rem;
  font-weight: 700;
  color: white;
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
  background: linear-gradient(135deg, #7851A9 0%, #00FFFF 100%);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  opacity: ${({ $loading }) => ($loading ? 0.75 : 1)};
  transition: opacity 0.2s ease, transform 0.1s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
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
  border-top-color: white;
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
  background: rgba(0, 200, 83, 0.2);
  border: 1px solid rgba(0, 200, 83, 0.4);
  color: #69f0ae;
  font-size: 0.9rem;
  font-weight: 500;
  backdrop-filter: blur(12px);
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

  // Use the client dashboard MCP hook for integrated functionality
  const { mcpStatus, logFoodIntake } = useClientDashboardMcp({
    showToasts: false // We'll handle toast notifications ourselves
  });

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [toastExiting, setToastExiting] = useState(false);

  // Check MCP server status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await checkMcpServersStatus();
        console.log('Food intake form MCP status:', status);
      } catch (error) {
        console.error('Error checking MCP status:', error);
      }
    };

    checkStatus();
  }, []);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        handleCloseSuccessMessage();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  // Add a new food item
  const handleAddFoodItem = () => {
    setFoodItems([
      ...foodItems,
      {
        id: (foodItems.length + 1).toString(),
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

  // Remove a food item
  const handleRemoveFoodItem = (id: string) => {
    if (foodItems.length <= 1) {
      return; // Keep at least one food item
    }

    setFoodItems(foodItems.filter(item => item.id !== id));
  };

  // Update a food item
  const handleFoodItemChange = (id: string, field: keyof FoodItem, value: any) => {
    setFoodItems(foodItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          [field]: value
        };
      }
      return item;
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    return foodItems.reduce(
      (totals, item) => {
        return {
          calories: totals.calories + (item.calories || 0),
          protein: totals.protein + (item.protein || 0),
          carbs: totals.carbs + (item.carbs || 0),
          fat: totals.fat + (item.fat || 0)
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  // Submit the form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setError('User not found. Please log in again.');
      return;
    }

    // Validate form
    const hasEmptyFields = foodItems.some(item => !item.name.trim() || !item.portion.trim());
    if (hasEmptyFields) {
      setError('Please fill out all food items');
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

      // Use the integrated hook to handle food intake logging
      const success = await logFoodIntake(entry);

      if (success) {
        // Success feedback
        setSuccess(true);
        setShowSuccessMessage(true);
        setToastExiting(false);
        resetForm();

        // Callback to parent
        if (onDataSent) {
          onDataSent(true);
        }
      } else {
        // Handle failure
        console.warn('Food intake logging failed');
        setError('Could not log food intake. Please try again later.');

        // Callback to parent
        if (onDataSent) {
          onDataSent(false);
        }
      }
    } catch (error: any) {
      console.error('Error submitting food intake:', error);
      setError(error.message || 'Error submitting food intake');

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

  // Calculate totals
  const totals = calculateTotals();

  return (
    <FormWrapper>
      <Title>
        <Utensils size={24} />
        Food Intake Tracker
      </Title>

      {/* MCP Status Indicators */}
      <StatusRow>
        <Chip $active={mcpStatus.workout}>
          <Zap />
          Workout MCP: {mcpStatus.workout ? 'Online' : 'Offline'}
        </Chip>
        <Chip $active={mcpStatus.gamification}>
          <Activity />
          Gamification MCP: {mcpStatus.gamification ? 'Online' : 'Offline'}
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
                  />
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
                  />
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
            {mcpStatus.gamification && ' Gamification points awarded.'}
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
