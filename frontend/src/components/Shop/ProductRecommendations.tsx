// ProductRecommendations Component
import React from 'react';
import styled from 'styled-components';

interface ProductRecommendationsProps {
  type: 'personalized' | 'popular' | 'cart';
  title: string;
  limit: number;
}

const RecommendationsContainer = styled.section`
  padding: 2rem 0;
  margin-top: 2rem;
`;

const RecommendationsTitle = styled.h2`
  color: white;
  text-align: center;
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
  font-weight: 300;
`;

const RecommendationsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const RecommendationCard = styled.div`
  background: rgba(30, 30, 60, 0.4);
  border-radius: 8px;
  padding: 1rem;
  color: white;
  text-align: center;
`;

const ProductRecommendations: React.FC<ProductRecommendationsProps> = ({ type, title, limit }) => {
  // Placeholder implementation - would normally fetch recommendations based on type
  const recommendations = Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
    id: i + 1,
    name: `Recommended Item ${i + 1}`,
    price: `$${(50 + i * 25).toFixed(2)}`,
  }));

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <RecommendationsContainer>
      <RecommendationsTitle>{title}</RecommendationsTitle>
      <RecommendationsGrid>
        {recommendations.map((item) => (
          <RecommendationCard key={item.id}>
            <h3>{item.name}</h3>
            <p>{item.price}</p>
            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              {type === 'personalized' ? 'Based on your preferences' :
               type === 'popular' ? 'Popular choice' :
               'Frequently bought together'}
            </p>
          </RecommendationCard>
        ))}
      </RecommendationsGrid>
    </RecommendationsContainer>
  );
};

export default ProductRecommendations;
