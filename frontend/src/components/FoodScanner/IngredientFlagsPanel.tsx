import React, { useState } from 'react';
import styled from 'styled-components';
import { ChevronDown, ChevronUp, Info, Microscope } from 'lucide-react';
import type { FoodProduct, Ingredient, RatingTone } from './productAnalysis.types';
import { ingredientCounts, ingredientFlags, ratingTone } from './productAnalysis.logic';
import { ActionButton, Chip, DetailLabel, DetailRow, InfoMessage, PanelShell, SectionTitle, toneColor, toneSurface } from './ProductAnalysis.styles';

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1rem;
`;

const IngredientCard = styled.div<{ $tone: RatingTone }>`
  margin-bottom: 0.65rem;
  border: 1px solid ${({ $tone }) => toneColor($tone)};
  border-radius: 8px;
  background: ${({ $tone }) => toneSurface($tone)};
`;

const IngredientTop = styled.button`
  width: 100%;
  min-height: 48px;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.6rem;
  align-items: center;
  border: 0;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  padding: 0.75rem;
  text-align: left;
`;

const IngredientName = styled.span`
  font-size: 0.9rem;
  font-weight: 800;
`;

const TagWrap = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  justify-content: flex-end;
`;

const DetailPanel = styled.div`
  padding: 0 0.75rem 0.8rem;
`;

const Summary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-bottom: 1rem;
`;

interface IngredientFlagsPanelProps {
  product: FoodProduct;
  onExplainIngredient: (ingredient: Ingredient) => void;
  loadingIngredient?: string | null;
}

const hasDetailData = (ingredient: Ingredient) =>
  ingredient.description || ingredient.iarcGroup || ingredient.isEUBanned || ingredient.isGMO ||
  ingredient.isProcessed || (ingredient.healthConcerns?.length || 0) > 0 ||
  (ingredient.healthierAlternatives?.length || 0) > 0;

const IngredientFlagsPanel: React.FC<IngredientFlagsPanelProps> = ({ product, onExplainIngredient, loadingIngredient }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  const ingredients = product.ingredients || [];
  const counts = ingredientCounts(ingredients);

  return (
    <PanelShell>
      <SectionTitle>Ingredients Analysis</SectionTitle>
      <Legend>
        <Chip $tone="good">Lower concern - whole food or lower-signal ingredient</Chip>
        <Chip $tone="okay">Review - processing or provider signal</Chip>
        <Chip $tone="bad">Higher concern - regulatory or stronger source signal</Chip>
      </Legend>
      {counts.total > 0 && (
        <Summary>
          <Chip $tone="good">{counts.good} lower concern</Chip>
          <Chip $tone="okay">{counts.okay} review</Chip>
          <Chip $tone="bad">{counts.bad} higher concern</Chip>
        </Summary>
      )}
      {ingredients.length === 0 ? (
        <InfoMessage>No ingredient information available from this product source.</InfoMessage>
      ) : ingredients.map((ingredient, index) => {
        const tone = ratingTone(ingredient.healthRating);
        const flags = ingredientFlags(ingredient);
        const isOpen = expanded === index;
        return (
          <IngredientCard key={`${ingredient.name}-${index}`} $tone={tone}>
            <IngredientTop onClick={() => setExpanded(isOpen ? null : index)} aria-expanded={isOpen}>
              <IngredientName>{ingredient.name}</IngredientName>
              <TagWrap>
                {flags.slice(0, 3).map((flag) => <Chip key={`${ingredient.name}-${flag.label}`}>{flag.label}</Chip>)}
              </TagWrap>
              {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </IngredientTop>
            {isOpen && (
              <DetailPanel>
                {ingredient.description && <DetailRow><DetailLabel>Info</DetailLabel><span>{ingredient.description}</span></DetailRow>}
                {ingredient.iarcGroup && <DetailRow><DetailLabel>IARC</DetailLabel><span>IARC category {ingredient.iarcGroup}</span></DetailRow>}
                {ingredient.isEUBanned && <DetailRow><DetailLabel>Status</DetailLabel><span>EU-banned additive signal</span></DetailRow>}
                {ingredient.bannedRegions && ingredient.bannedRegions.length > 0 && <DetailRow><DetailLabel>Regions</DetailLabel><span>{ingredient.bannedRegions.join(', ')}</span></DetailRow>}
                {ingredient.healthConcerns && ingredient.healthConcerns.length > 0 && <DetailRow><DetailLabel>Notes</DetailLabel><span>{ingredient.healthConcerns.join('; ')}</span></DetailRow>}
                {ingredient.healthierAlternatives && ingredient.healthierAlternatives.length > 0 && <DetailRow><DetailLabel>Try</DetailLabel><span>{ingredient.healthierAlternatives.join(', ')}</span></DetailRow>}
                {!hasDetailData(ingredient) && <DetailRow><DetailLabel>Notes</DetailLabel><span>No source-backed flags are available for this ingredient.</span></DetailRow>}
                <ActionButton onClick={() => onExplainIngredient(ingredient)} disabled={loadingIngredient === ingredient.name}>
                  {loadingIngredient === ingredient.name ? <Info size={15} /> : <Microscope size={15} />}
                  {loadingIngredient === ingredient.name ? 'Explaining...' : 'Learn ingredient'}
                </ActionButton>
              </DetailPanel>
            )}
          </IngredientCard>
        );
      })}
      {product.healthConcerns && product.healthConcerns.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <SectionTitle>Ingredient Notes</SectionTitle>
          {product.healthConcerns.map((concern) => <InfoMessage key={concern}>{concern}</InfoMessage>)}
        </div>
      )}
    </PanelShell>
  );
};

export default IngredientFlagsPanel;
