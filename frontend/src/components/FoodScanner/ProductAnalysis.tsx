import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface Ingredient {
  name: string;
  healthRating: 'good' | 'bad' | 'okay';
  isGMO: boolean;
  isProcessed: boolean;
}

interface NutritionalInfo {
  calories?: number;
  fat?: number;
  saturatedFat?: number;
  carbohydrates?: number;
  sugars?: number;
  protein?: number;
  salt?: number;
  fiber?: number;
}

export interface FoodProduct {
  id: number;
  barcode: string;
  name: string;
  brand: string | null;
  description: string | null;
  ingredientsList: string | null;
  ingredients: Ingredient[] | null;
  nutritionalInfo: NutritionalInfo | null;
  overallRating: 'good' | 'bad' | 'okay';
  ratingReasons: string[] | null;
  healthConcerns: string[] | null;
  isOrganic: boolean;
  isNonGMO: boolean;
  category: string | null;
  imageUrl: string | null;
  healthierAlternatives: any[] | null;
}

interface ProductAnalysisProps {
  product: FoodProduct;
  onSave?: (isFavorite: boolean) => void;
  isFavorite?: boolean;
}

// Styled components
const AnalysisContainer = styled.div`
  background: rgba(20, 20, 40, 0.7);
  border-radius: 15px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-top: 1.5rem;
`;

const AnalysisHeader = styled.div<{ rating: string }>`
  padding: 1.5rem;
  background: ${({ rating }) => {
    switch (rating) {
      case 'good': return 'linear-gradient(135deg, rgba(0, 200, 83, 0.8), rgba(0, 150, 80, 0.8))';
      case 'bad': return 'linear-gradient(135deg, rgba(255, 70, 70, 0.8), rgba(200, 40, 40, 0.8))';
      case 'okay': return 'linear-gradient(135deg, rgba(255, 193, 7, 0.8), rgba(240, 160, 0, 0.8))';
      default: return 'linear-gradient(135deg, rgba(100, 100, 100, 0.8), rgba(70, 70, 70, 0.8))';
    }
  }};
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ProductImage = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 10px;
  background-size: cover;
  background-position: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  @media (max-width: 600px) {
    width: 60px;
    height: 60px;
  }
`;

const HeaderContent = styled.div`
  flex: 1;
`;

const ProductName = styled.h3`
  margin: 0 0 0.3rem 0;
  font-size: 1.2rem;
  font-weight: 500;
  color: white;
  
  @media (max-width: 600px) {
    font-size: 1.1rem;
  }
`;

const ProductBrand = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
  
  @media (max-width: 600px) {
    font-size: 0.8rem;
  }
`;

const OverallRating = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const RatingLabel = styled.span`
  font-size: 0.9rem;
  font-weight: 500;
  color: white;
`;

const RatingBadge = styled.span<{ rating: string }>`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.2);
  color: white;
`;

const AnalysisTabs = styled.div`
  display: flex;
  background: rgba(30, 30, 60, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const TabButton = styled.button<{ active: boolean }>`
  padding: 1rem;
  background: ${({ active }) => active ? 'rgba(60, 60, 100, 0.7)' : 'transparent'};
  color: ${({ active }) => active ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  border: none;
  border-bottom: 2px solid ${({ active }) => active ? '#00ffff' : 'transparent'};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  flex: 1;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(60, 60, 100, 0.5);
    color: white;
  }
`;

const TabContent = styled(motion.div)`
  padding: 1.5rem;
`;

const SectionTitle = styled.h4`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: white;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
`;

const IngredientsList = styled.div`
  margin-bottom: 1.5rem;
`;

const Ingredient = styled.div<{ rating: string }>`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  background: ${({ rating }) => {
    switch (rating) {
      case 'good': return 'rgba(0, 200, 83, 0.1)';
      case 'bad': return 'rgba(255, 70, 70, 0.1)';
      case 'okay': return 'rgba(255, 193, 7, 0.1)';
      default: return 'rgba(100, 100, 100, 0.1)';
    }
  }};
  border: 1px solid ${({ rating }) => {
    switch (rating) {
      case 'good': return 'rgba(0, 200, 83, 0.2)';
      case 'bad': return 'rgba(255, 70, 70, 0.2)';
      case 'okay': return 'rgba(255, 193, 7, 0.2)';
      default: return 'rgba(100, 100, 100, 0.2)';
    }
  }};
`;

const IngredientIcon = styled.div<{ rating: string }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  margin-right: 1rem;
  background: ${({ rating }) => {
    switch (rating) {
      case 'good': return '#00c853';
      case 'bad': return '#ff4646';
      case 'okay': return '#ffc107';
      default: return '#888';
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.8rem;
  font-weight: bold;
`;

const IngredientName = styled.div`
  flex: 1;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
`;

const IngredientTags = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const IngredientTag = styled.span`
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
`;

const ConcernsList = styled.div`
  margin-bottom: 1.5rem;
`;

const ConcernItem = styled.div`
  background: rgba(255, 70, 70, 0.1);
  border: 1px solid rgba(255, 70, 70, 0.2);
  padding: 0.8rem 1rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  
  &:before {
    content: "⚠️";
    margin-right: 0.5rem;
  }
`;

const CertificationList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const Certification = styled.div<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: ${({ active }) => active ? 'rgba(0, 200, 83, 0.1)' : 'rgba(100, 100, 100, 0.1)'};
  border: 1px solid ${({ active }) => active ? 'rgba(0, 200, 83, 0.2)' : 'rgba(100, 100, 100, 0.2)'};
  color: ${({ active }) => active ? 'rgba(0, 200, 83, 0.9)' : 'rgba(255, 255, 255, 0.4)'};
  font-size: 0.9rem;
  
  span {
    font-weight: 500;
  }
`;

const NutritionTable = styled.div`
  margin-bottom: 1.5rem;
`;

const NutritionRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const NutritionLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
`;

const NutritionValue = styled.div`
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
`;

const AlternativesList = styled.div`
  margin-bottom: 1.5rem;
`;

const AlternativeItem = styled.div`
  padding: 0.8rem;
  background: rgba(0, 200, 83, 0.1);
  border: 1px solid rgba(0, 200, 83, 0.2);
  border-radius: 8px;
  margin-bottom: 0.5rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  
  &:before {
    content: "✓";
    margin-right: 0.5rem;
    color: #00c853;
  }
`;

const InfoMessage = styled.div`
  text-align: center;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  font-size: 0.9rem;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
`;

const ActionButton = styled.button<{ primary?: boolean }>`
  background: ${({ primary }) => primary ? 
    'linear-gradient(135deg, #7851a9, #00ffff)' : 
    'rgba(60, 60, 100, 0.5)'
  };
  color: white;
  border: ${({ primary }) => primary ? 
    'none' : 
    '1px solid rgba(255, 255, 255, 0.2)'
  };
  border-radius: 8px;
  padding: 0.8rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

// Main component
const ProductAnalysis: React.FC<ProductAnalysisProps> = ({ 
  product, 
  onSave,
  isFavorite = false
}) => {
  const [activeTab, setActiveTab] = useState('ingredients');
  const [favorite, setFavorite] = useState(isFavorite);
  
  // Get ingredient counts
  const goodIngredients = product.ingredients?.filter(i => i.healthRating === 'good').length || 0;
  const badIngredients = product.ingredients?.filter(i => i.healthRating === 'bad').length || 0;
  const totalIngredients = product.ingredients?.length || 0;
  
  // Toggle favorite status
  const handleToggleFavorite = () => {
    const newStatus = !favorite;
    setFavorite(newStatus);
    if (onSave) {
      onSave(newStatus);
    }
  };

  return (
    <AnalysisContainer>
      <AnalysisHeader rating={product.overallRating}>
        <ProductImage 
          style={{ 
            backgroundImage: `url(${product.imageUrl || '/placeholder-product.jpg'})` 
          }}
        />
        <HeaderContent>
          <ProductName>{product.name}</ProductName>
          {product.brand && <ProductBrand>{product.brand}</ProductBrand>}
          <OverallRating>
            <RatingLabel>Rating:</RatingLabel>
            <RatingBadge rating={product.overallRating}>
              {product.overallRating.charAt(0).toUpperCase() + product.overallRating.slice(1)}
            </RatingBadge>
          </OverallRating>
        </HeaderContent>
      </AnalysisHeader>
      
      <AnalysisTabs>
        <TabButton 
          active={activeTab === 'ingredients'} 
          onClick={() => setActiveTab('ingredients')}
        >
          Ingredients
        </TabButton>
        <TabButton 
          active={activeTab === 'nutrition'} 
          onClick={() => setActiveTab('nutrition')}
        >
          Nutrition
        </TabButton>
        <TabButton 
          active={activeTab === 'alternatives'} 
          onClick={() => setActiveTab('alternatives')}
        >
          Alternatives
        </TabButton>
      </AnalysisTabs>
      
      <AnimatePresence mode="wait">
        {activeTab === 'ingredients' && (
          <TabContent
            key="ingredients"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SectionTitle>Ingredients Analysis</SectionTitle>
            {product.ingredients && product.ingredients.length > 0 ? (
              <IngredientsList>
                {product.ingredients.map((ingredient, index) => (
                  <Ingredient key={index} rating={ingredient.healthRating}>
                    <IngredientIcon rating={ingredient.healthRating}>
                      {ingredient.healthRating === 'good' ? '✓' : 
                        ingredient.healthRating === 'bad' ? '✗' : '?'}
                    </IngredientIcon>
                    <IngredientName>{ingredient.name}</IngredientName>
                    <IngredientTags>
                      {ingredient.isGMO && <IngredientTag>GMO</IngredientTag>}
                      {ingredient.isProcessed && <IngredientTag>Processed</IngredientTag>}
                    </IngredientTags>
                  </Ingredient>
                ))}
              </IngredientsList>
            ) : (
              <InfoMessage>No ingredient information available</InfoMessage>
            )}
            
            {totalIngredients > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <SectionTitle>Summary</SectionTitle>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem' }}>
                  This product contains {goodIngredients} good, {badIngredients} concerning, 
                  and {totalIngredients - goodIngredients - badIngredients} neutral ingredients.
                </div>
              </div>
            )}
            
            {product.healthConcerns && product.healthConcerns.length > 0 && (
              <div>
                <SectionTitle>Health Concerns</SectionTitle>
                <ConcernsList>
                  {product.healthConcerns.map((concern, index) => (
                    <ConcernItem key={index}>{concern}</ConcernItem>
                  ))}
                </ConcernsList>
              </div>
            )}
            
            <SectionTitle>Certifications</SectionTitle>
            <CertificationList>
              <Certification active={product.isOrganic}>
                <span>Organic</span>
              </Certification>
              <Certification active={product.isNonGMO}>
                <span>Non-GMO</span>
              </Certification>
            </CertificationList>
          </TabContent>
        )}
        
        {activeTab === 'nutrition' && (
          <TabContent
            key="nutrition"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SectionTitle>Nutritional Information</SectionTitle>
            {product.nutritionalInfo ? (
              <NutritionTable>
                {product.nutritionalInfo.calories !== undefined && (
                  <NutritionRow>
                    <NutritionLabel>Calories</NutritionLabel>
                    <NutritionValue>{product.nutritionalInfo.calories} kcal</NutritionValue>
                  </NutritionRow>
                )}
                {product.nutritionalInfo.fat !== undefined && (
                  <NutritionRow>
                    <NutritionLabel>Fat</NutritionLabel>
                    <NutritionValue>{product.nutritionalInfo.fat} g</NutritionValue>
                  </NutritionRow>
                )}
                {product.nutritionalInfo.saturatedFat !== undefined && (
                  <NutritionRow>
                    <NutritionLabel>Saturated Fat</NutritionLabel>
                    <NutritionValue>{product.nutritionalInfo.saturatedFat} g</NutritionValue>
                  </NutritionRow>
                )}
                {product.nutritionalInfo.carbohydrates !== undefined && (
                  <NutritionRow>
                    <NutritionLabel>Carbohydrates</NutritionLabel>
                    <NutritionValue>{product.nutritionalInfo.carbohydrates} g</NutritionValue>
                  </NutritionRow>
                )}
                {product.nutritionalInfo.sugars !== undefined && (
                  <NutritionRow>
                    <NutritionLabel>Sugars</NutritionLabel>
                    <NutritionValue>{product.nutritionalInfo.sugars} g</NutritionValue>
                  </NutritionRow>
                )}
                {product.nutritionalInfo.protein !== undefined && (
                  <NutritionRow>
                    <NutritionLabel>Protein</NutritionLabel>
                    <NutritionValue>{product.nutritionalInfo.protein} g</NutritionValue>
                  </NutritionRow>
                )}
                {product.nutritionalInfo.fiber !== undefined && (
                  <NutritionRow>
                    <NutritionLabel>Fiber</NutritionLabel>
                    <NutritionValue>{product.nutritionalInfo.fiber} g</NutritionValue>
                  </NutritionRow>
                )}
                {product.nutritionalInfo.salt !== undefined && (
                  <NutritionRow>
                    <NutritionLabel>Salt</NutritionLabel>
                    <NutritionValue>{product.nutritionalInfo.salt} g</NutritionValue>
                  </NutritionRow>
                )}
              </NutritionTable>
            ) : (
              <InfoMessage>No nutritional information available</InfoMessage>
            )}
            
            <SectionTitle>Raw Ingredients List</SectionTitle>
            {product.ingredientsList ? (
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.8)', 
                fontSize: '0.9rem',
                lineHeight: '1.6'
              }}>
                {product.ingredientsList}
              </div>
            ) : (
              <InfoMessage>No ingredients list available</InfoMessage>
            )}
          </TabContent>
        )}
        
        {activeTab === 'alternatives' && (
          <TabContent
            key="alternatives"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <SectionTitle>Healthier Alternatives</SectionTitle>
            {product.healthierAlternatives && product.healthierAlternatives.length > 0 ? (
              <AlternativesList>
                {product.healthierAlternatives.map((alternative, index) => (
                  <AlternativeItem key={index}>
                    {typeof alternative === 'string' ? alternative : alternative.name}
                  </AlternativeItem>
                ))}
              </AlternativesList>
            ) : (
              <InfoMessage>
                No specific alternatives provided for this product.
                {product.overallRating === 'good' && " This product is already rated as good for health."}
              </InfoMessage>
            )}
            
            <SectionTitle>General Recommendations</SectionTitle>
            {product.overallRating === 'bad' ? (
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p>Look for products that are:</p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>Certified organic</li>
                  <li>Non-GMO verified</li>
                  <li>Free from artificial additives</li>
                  <li>Contain fewer processed ingredients</li>
                  <li>Have a shorter ingredients list</li>
                </ul>
              </div>
            ) : product.overallRating === 'okay' ? (
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p>This product is acceptable but could be improved. Consider alternatives that have:</p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>More organic ingredients</li>
                  <li>Fewer additives</li>
                  <li>No GMO ingredients</li>
                </ul>
              </div>
            ) : (
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p>This product appears to be a healthy choice! Here are some general tips:</p>
                <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem' }}>
                  <li>Continue choosing products with clean, simple ingredients</li>
                  <li>Look for organic certification when possible</li>
                  <li>Vary your diet to get a wide range of nutrients</li>
                </ul>
              </div>
            )}
          </TabContent>
        )}
      </AnimatePresence>
      
      <ActionButtons>
        <ActionButton onClick={handleToggleFavorite}>
          {favorite ? '★ Saved' : '☆ Save'}
        </ActionButton>
        <ActionButton primary>
          Share
        </ActionButton>
      </ActionButtons>
    </AnalysisContainer>
  );
};

export default ProductAnalysis;