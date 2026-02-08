import React, { lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { ArrowLeft, Circle } from 'lucide-react';

const conceptNames: Record<number, string> = {
  1: 'Nature Wellness',
  2: 'Cyberpunk Premium',
  3: 'Marble Luxury',
  4: 'Hybrid Nature-Tech',
  5: 'Fun & Bold',
};

const concepts: Record<number, React.LazyExoticComponent<React.ComponentType>> = {
  1: lazy(() => import('./concepts/NatureWellness/NatureWellnessHomepage')),
  2: lazy(() => import('./concepts/CyberpunkPremium/CyberpunkPremiumHomepage')),
  3: lazy(() => import('./concepts/MarbleLuxury/MarbleLuxuryHomepage')),
  4: lazy(() => import('./concepts/HybridNatureTech/HybridNatureTechHomepage')),
  5: lazy(() => import('./concepts/FunAndBold/FunAndBoldHomepage')),
};

/* ─── Animations ─── */
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ─── Styled Components ─── */
const ViewerContainer = styled.div`
  min-height: 100vh;
  position: relative;
`;

const FloatingNav = styled.nav`
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: rgba(10, 10, 26, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 20px;
  background: transparent;
  color: #00ffff;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  min-height: 44px;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

const DotContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const NavDot = styled.button<{ $active: boolean }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid ${({ $active }) => ($active ? '#00ffff' : 'rgba(255, 255, 255, 0.3)')};
  background: ${({ $active }) => ($active ? '#00ffff' : 'transparent')};
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: #00ffff;
    background: rgba(0, 255, 255, 0.2);
  }
`;

const DotInner = styled.div<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active }) => ($active ? '#00ffff' : 'transparent')};
  border: 2px solid ${({ $active }) => ($active ? '#00ffff' : 'rgba(255, 255, 255, 0.3)')};
  transition: all 0.2s;
`;

const ConceptLabel = styled.span`
  color: #e0e0e0;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;

  @media (max-width: 600px) {
    display: none;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #0a0a1a;
  color: #e0e0e0;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid #00ffff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  margin-bottom: 16px;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #0a0a1a;
  color: #e0e0e0;
  padding: 24px;
  text-align: center;
`;

const ErrorTitle = styled.h2`
  font-size: 1.5rem;
  color: #ff416c;
  margin: 0 0 12px;
`;

/* ─── Component ─── */
const DesignPlaygroundLayout: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const conceptId = Number(id);

  if (!conceptId || conceptId < 1 || conceptId > 5) {
    return (
      <ErrorContainer>
        <ErrorTitle>Concept Not Found</ErrorTitle>
        <p>Please select a concept between 1 and 5.</p>
        <BackButton onClick={() => navigate('/dashboard/design-playground')}>
          <ArrowLeft size={14} /> Back to Playground
        </BackButton>
      </ErrorContainer>
    );
  }

  const ConceptComponent = concepts[conceptId];

  return (
    <ViewerContainer>
      <FloatingNav>
        <BackButton onClick={() => navigate('/dashboard/design-playground')}>
          <ArrowLeft size={14} /> Back
        </BackButton>
        <DotContainer>
          {[1, 2, 3, 4, 5].map((n) => (
            <NavDot key={n} $active={conceptId === n} onClick={() => navigate(`/designs/${n}`)}>
              <DotInner $active={conceptId === n} />
            </NavDot>
          ))}
        </DotContainer>
        <ConceptLabel>
          {conceptId}. {conceptNames[conceptId]}
        </ConceptLabel>
      </FloatingNav>

      <Suspense
        fallback={
          <LoadingContainer>
            <Spinner />
            <p>Loading {conceptNames[conceptId]}...</p>
          </LoadingContainer>
        }
      >
        <ConceptComponent />
      </Suspense>
    </ViewerContainer>
  );
};

export default DesignPlaygroundLayout;
