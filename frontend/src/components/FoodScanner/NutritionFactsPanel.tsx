import React from 'react';
import styled from 'styled-components';
import type { FoodProduct } from './productAnalysis.types';
import { nutritionRows } from './productAnalysis.logic';
import { InfoMessage, PanelShell, SectionCopy, SectionTitle } from './ProductAnalysis.styles';

const NutritionTable = styled.div`
  display: grid;
  gap: 0.45rem;
  margin-bottom: 1rem;
`;

const NutritionRow = styled.div`
  min-height: 42px;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0;
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
`;

const Label = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.9rem;
`;

const Value = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  font-weight: 800;
`;

const IngredientList = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-size: 0.9rem;
  line-height: 1.6;
`;

interface NutritionFactsPanelProps {
  product: FoodProduct;
}

const NutritionFactsPanel: React.FC<NutritionFactsPanelProps> = ({ product }) => {
  const rows = nutritionRows(product);

  return (
    <PanelShell>
      <SectionTitle>Nutrition Label</SectionTitle>
      {rows.length > 0 ? (
        <NutritionTable>
          {rows.map((row) => (
            <NutritionRow key={row.label}>
              <Label>{row.label}</Label>
              <Value>{row.value}</Value>
            </NutritionRow>
          ))}
        </NutritionTable>
      ) : (
        <InfoMessage>No nutritional information available from this product source.</InfoMessage>
      )}
      <SectionTitle>Raw Ingredients List</SectionTitle>
      {product.ingredientsList ? (
        <IngredientList>{product.ingredientsList}</IngredientList>
      ) : (
        <InfoMessage>No ingredients list available from this product source.</InfoMessage>
      )}
      <SectionCopy>Nutrition values are provider data and may use per-100g label units. Review serving size before saving to your diary.</SectionCopy>
    </PanelShell>
  );
};

export default NutritionFactsPanel;
