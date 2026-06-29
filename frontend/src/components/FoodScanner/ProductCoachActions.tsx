import React, { useState } from 'react';
import styled from 'styled-components';
import { BookOpenCheck, Plus, Save, Star } from 'lucide-react';
import { ActionButton, ButtonRow } from './ProductAnalysis.styles';

const ActionShell = styled.div`
  display: grid;
  gap: 0.75rem;
  padding: 1rem 1.25rem 1.25rem;
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
`;

const MealPicker = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const MealButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 999px;
  background: rgba(96, 192, 240, 0.08);
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 800;
  padding: 0.55rem 0.9rem;
  text-transform: capitalize;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
`;

interface ProductCoachActionsProps {
  isFavorite: boolean;
  logLoading: boolean;
  onSave?: (isFavorite: boolean) => void;
  onAddToLog?: (mealType: string) => void;
  onOpenLearn: () => void;
}

const ProductCoachActions: React.FC<ProductCoachActionsProps> = ({
  isFavorite,
  logLoading,
  onSave,
  onAddToLog,
  onOpenLearn,
}) => {
  const [favorite, setFavorite] = useState(isFavorite);
  const [mealPickerOpen, setMealPickerOpen] = useState(false);

  const toggleFavorite = () => {
    const next = !favorite;
    setFavorite(next);
    onSave?.(next);
  };

  return (
    <ActionShell>
      <ButtonRow>
        <ActionButton onClick={toggleFavorite} disabled={!onSave}>
          {favorite ? <Star size={15} /> : <Save size={15} />}
          {favorite ? 'Saved' : 'Save product'}
        </ActionButton>
        <ActionButton onClick={onOpenLearn}>
          <BookOpenCheck size={15} />Ask Swan Coach
        </ActionButton>
        {onAddToLog && (
          <ActionButton $primary onClick={() => setMealPickerOpen((open) => !open)} disabled={logLoading}>
            <Plus size={15} />{logLoading ? 'Logging...' : 'Add to log'}
          </ActionButton>
        )}
      </ButtonRow>
      {mealPickerOpen && onAddToLog && (
        <MealPicker aria-label="Choose meal type">
          {['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => (
            <MealButton key={meal} disabled={logLoading} onClick={() => { onAddToLog(meal); setMealPickerOpen(false); }}>
              {meal}
            </MealButton>
          ))}
        </MealPicker>
      )}
    </ActionShell>
  );
};

export default ProductCoachActions;
