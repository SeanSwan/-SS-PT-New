import React, { useState } from 'react';
import axios from 'axios';
import ProductHeroCard from './ProductHeroCard';
import IngredientFlagsPanel from './IngredientFlagsPanel';
import NutritionFactsPanel from './NutritionFactsPanel';
import ProductCertificationsPanel from './ProductCertificationsPanel';
import CleanerAlternativesPanel from './CleanerAlternativesPanel';
import HowItsMadePanel from './HowItsMadePanel';
import ProductCoachActions from './ProductCoachActions';
import type { FoodProduct, Ingredient, ProductExplanation, ProductVideoBrief } from './productAnalysis.types';
import { AnalysisContainer, InfoMessage, TabButton, TabList } from './ProductAnalysis.styles';

export { foodScannerRatingLabel } from './productAnalysis.logic';
export type { FoodProduct } from './productAnalysis.types';

interface ProductAnalysisProps {
  product: FoodProduct;
  onSave?: (isFavorite: boolean) => void;
  onAddToLog?: (mealType: string) => void;
  isFavorite?: boolean;
  logLoading?: boolean;
}

type ProductTab = 'ingredients' | 'nutrition' | 'learn' | 'alternatives';
type LoadingAction = 'explain' | 'video' | string | null;

const ACTION_ERROR_COPY = 'Product intelligence is temporarily unavailable. Please try again.';

const ProductAnalysis: React.FC<ProductAnalysisProps> = ({
  product,
  onSave,
  onAddToLog,
  isFavorite = false,
  logLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<ProductTab>('ingredients');
  const [explanation, setExplanation] = useState<ProductExplanation | null>(null);
  const [videoBrief, setVideoBrief] = useState<ProductVideoBrief | null>(null);
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const requestProductExplanation = async () => {
    try {
      setLoadingAction('explain');
      setActionError(null);
      const response = await axios.post('/api/food-scanner/explain-product', { product });
      setExplanation(response.data?.explanation || null);
      setActiveTab('learn');
    } catch (error) {
      setActionError(ACTION_ERROR_COPY);
    } finally {
      setLoadingAction(null);
    }
  };

  const requestIngredientExplanation = async (ingredient: Ingredient) => {
    try {
      setLoadingAction(ingredient.name);
      setActionError(null);
      setActiveTab('learn');
      const response = await axios.post('/api/food-scanner/explain-ingredient', { product, ingredient });
      setExplanation(response.data?.explanation || null);
    } catch (error) {
      setActionError(ACTION_ERROR_COPY);
    } finally {
      setLoadingAction(null);
    }
  };

  const requestVideoBrief = async () => {
    try {
      setLoadingAction('video');
      setActionError(null);
      const response = await axios.post('/api/food-scanner/video-brief', { product });
      setVideoBrief(response.data?.videoBrief || null);
      setActiveTab('learn');
    } catch (error) {
      setActionError(ACTION_ERROR_COPY);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <AnalysisContainer>
      <ProductHeroCard product={product} />
      <TabList aria-label="Product intelligence views">
        {[
          ['ingredients', 'Ingredients'],
          ['nutrition', 'Nutrition'],
          ['learn', 'How made'],
          ['alternatives', 'Swaps'],
        ].map(([id, label]) => (
          <TabButton key={id} $active={activeTab === id} onClick={() => setActiveTab(id as ProductTab)}>
            {label}
          </TabButton>
        ))}
      </TabList>
      {activeTab === 'ingredients' && (
        <IngredientFlagsPanel
          product={product}
          onExplainIngredient={requestIngredientExplanation}
          loadingIngredient={typeof loadingAction === 'string' && !['explain', 'video'].includes(loadingAction) ? loadingAction : null}
        />
      )}
      {activeTab === 'nutrition' && (
        <>
          <NutritionFactsPanel product={product} />
          <ProductCertificationsPanel product={product} />
        </>
      )}
      {activeTab === 'learn' && (
        <HowItsMadePanel
          product={product}
          explanation={explanation}
          videoBrief={videoBrief}
          loadingAction={loadingAction}
          error={actionError}
          onExplainProduct={requestProductExplanation}
          onCreateVideoBrief={requestVideoBrief}
        />
      )}
      {activeTab === 'alternatives' && <CleanerAlternativesPanel product={product} />}
      {actionError && activeTab !== 'learn' && <InfoMessage>{actionError}</InfoMessage>}
      <ProductCoachActions
        isFavorite={isFavorite}
        logLoading={logLoading}
        onSave={onSave}
        onAddToLog={onAddToLog}
        onOpenLearn={() => setActiveTab('learn')}
      />
    </AnalysisContainer>
  );
};

export default ProductAnalysis;
