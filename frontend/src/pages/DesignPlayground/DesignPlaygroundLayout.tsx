import React, { Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  allConcepts,
  conceptComponents,
  conceptNames,
  conceptCategories,
} from './concepts/shared/conceptRegistry';

/* ─── Category abbreviations for compact nav ─── */
const categoryAbbr: Record<string, string> = {
  'nature-wellness': 'NW',
  'cyberpunk-premium': 'CP',
  'marble-luxury': 'ML',
  'hybrid-nature-tech': 'HNT',
  'fun-and-bold': 'FB',
  'art-deco-glamour': 'ADG',
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
  gap: 8px;
  padding: 8px 16px;
  background: rgba(10, 10, 26, 0.9);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  max-width: calc(100vw - 32px);
`;

const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
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
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

const ArrowButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  background: transparent;
  color: #e0e0e0;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.4);
    color: #00ffff;
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
    &:hover {
      background: transparent;
      border-color: rgba(255, 255, 255, 0.15);
      color: #e0e0e0;
    }
  }
`;

const CategoryGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;

  @media (max-width: 768px) {
    display: none;
  }
`;

const CategoryLabel = styled.span`
  font-size: 0.65rem;
  color: #6666aa;
  letter-spacing: 1px;
  margin-right: 2px;
  min-width: 24px;
  text-align: right;
`;

const NavDot = styled.button<{ $active: boolean; $color: string }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;

  &:hover > div {
    border-color: ${({ $color }) => $color};
    background: ${({ $color }) => $color}33;
  }
`;

const DotInner = styled.div<{ $active: boolean; $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $active, $color }) => ($active ? $color : 'transparent')};
  border: 2px solid ${({ $active, $color }) => ($active ? $color : 'rgba(255, 255, 255, 0.2)')};
  transition: all 0.2s;
`;

const Separator = styled.div`
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
`;

const MobileCounter = styled.span`
  color: #e0e0e0;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  display: none;

  @media (max-width: 768px) {
    display: inline;
  }
`;

const ConceptInfo = styled.span`
  color: #e0e0e0;
  font-size: 0.8rem;
  font-weight: 500;
  white-space: nowrap;

  @media (max-width: 900px) {
    display: none;
  }
`;

const VersionBadge = styled.span<{ $version: number }>`
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 8px;
  font-weight: 600;
  margin-left: 6px;
  background: ${({ $version }) =>
    $version === 1 ? 'rgba(0, 255, 255, 0.15)' : 'rgba(120, 81, 169, 0.25)'};
  color: ${({ $version }) => ($version === 1 ? '#00ffff' : '#b088f0')};
  border: 1px solid ${({ $version }) =>
    $version === 1 ? 'rgba(0, 255, 255, 0.3)' : 'rgba(120, 81, 169, 0.4)'};
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
  const conceptId = id || '';

  const currentIndex = allConcepts.findIndex((c) => c.id === conceptId);
  const currentConcept = currentIndex >= 0 ? allConcepts[currentIndex] : null;

  if (!currentConcept || !conceptComponents[conceptId]) {
    return (
      <ErrorContainer>
        <ErrorTitle>Concept Not Found</ErrorTitle>
        <p>No concept matches "{conceptId}". Please select a valid concept.</p>
        <BackButton onClick={() => navigate('/dashboard/design-playground')}>
          <ArrowLeft size={14} /> Back to Playground
        </BackButton>
      </ErrorContainer>
    );
  }

  const ConceptComponent = conceptComponents[conceptId];
  const prevId = currentIndex > 0 ? allConcepts[currentIndex - 1].id : null;
  const nextId = currentIndex < allConcepts.length - 1 ? allConcepts[currentIndex + 1].id : null;

  return (
    <ViewerContainer>
      <FloatingNav>
        <BackButton onClick={() => navigate('/dashboard/design-playground')}>
          <ArrowLeft size={14} /> Back
        </BackButton>

        <Separator />

        <ArrowButton
          onClick={() => prevId && navigate(`/designs/${prevId}`)}
          disabled={!prevId}
          aria-label="Previous concept"
        >
          <ChevronLeft size={16} />
        </ArrowButton>

        <MobileCounter>{currentIndex + 1} / {allConcepts.length}</MobileCounter>

        {conceptCategories.map((cat) => (
          <CategoryGroup key={cat.category}>
            <CategoryLabel>{categoryAbbr[cat.category]}</CategoryLabel>
            {cat.concepts.map((c) => (
              <NavDot
                key={c.id}
                $active={conceptId === c.id}
                $color={c.colors.primary}
                onClick={() => navigate(`/designs/${c.id}`)}
                aria-label={`${c.name} (v${c.version})`}
                title={`${c.name} (v${c.version})`}
              >
                <DotInner $active={conceptId === c.id} $color={c.colors.primary} />
              </NavDot>
            ))}
          </CategoryGroup>
        ))}

        <ArrowButton
          onClick={() => nextId && navigate(`/designs/${nextId}`)}
          disabled={!nextId}
          aria-label="Next concept"
        >
          <ChevronRight size={16} />
        </ArrowButton>

        <Separator />

        <ConceptInfo>
          {currentConcept.name}
          <VersionBadge $version={currentConcept.version}>v{currentConcept.version}</VersionBadge>
        </ConceptInfo>
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
