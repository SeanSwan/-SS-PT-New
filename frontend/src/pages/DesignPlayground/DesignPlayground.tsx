import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Eye, Sparkles, Filter } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { allConcepts, conceptCategories } from './concepts/shared/conceptRegistry';
/* ─── Animations ─── */
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

/* ─── Styled Components ─── */
const PageContainer = styled.div`
  min-height: 100vh;
  background: #0a0a1a;
  color: #e0e0e0;
  padding: 32px 24px 64px;

  @media (min-width: 768px) {
    padding: 48px 40px 80px;
  }
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 32px;
  animation: ${fadeInUp} 0.6s ease-out;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 800;
  margin: 0 0 8px;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;

  @media (min-width: 768px) {
    font-size: 3rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: #8888aa;
  margin: 0 0 8px;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(0, 255, 255, 0.08);
  border: 1px solid rgba(0, 255, 255, 0.2);
  color: #00ffff;
  font-size: 0.8rem;
  font-weight: 500;
  margin-top: 12px;
`;

/* ─── Filter Tabs ─── */
const FilterBar = styled.div.attrs({ role: 'toolbar', 'aria-label': 'Filter by category' })`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  max-width: 1400px;
  margin: 0 auto 32px;
  animation: ${fadeInUp} 0.6s ease-out 0.2s both;
`;

const FilterTab = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid ${({ $active }) => ($active ? 'rgba(0, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)')};
  background: ${({ $active }) => ($active ? 'rgba(0, 255, 255, 0.1)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#00ffff' : '#8888aa')};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 44px;

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    color: #00ffff;
  }
`;

/* ─── Category Section ─── */
const CategorySection = styled.section`
  max-width: 1400px;
  margin: 0 auto 48px;
`;

const CategoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const CategoryTitle = styled.h2`
  font-size: 1.3rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
`;

const CategoryCount = styled.span`
  font-size: 0.8rem;
  color: #6666aa;
  padding: 2px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
`;

const ConceptRow = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

/* ─── Concept Card ─── */
const ConceptCard = styled.div<{ $delay: number }>`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${fadeInUp} 0.6s ease-out ${({ $delay }) => $delay}s both;

  &:hover {
    transform: translateY(-6px);
    border-color: rgba(0, 255, 255, 0.25);
    box-shadow: 0 12px 40px rgba(0, 255, 255, 0.08);
  }
`;

const PreviewArea = styled.div<{ $gradient: string }>`
  height: 180px;
  background: ${({ $gradient }) => $gradient};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
`;

const PreviewTitle = styled.div<{ $font: string; $color: string }>`
  font-family: '${({ $font }) => $font}', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
  text-align: center;
  z-index: 1;
`;

const PreviewTagline = styled.div<{ $font: string; $color: string }>`
  font-family: '${({ $font }) => $font}', sans-serif;
  font-size: 0.9rem;
  color: ${({ $color }) => $color};
  opacity: 0.8;
  text-align: center;
  margin-top: 4px;
  z-index: 1;
`;

const VersionPill = styled.span<{ $version: number }>`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 1px;
  z-index: 2;
  background: ${({ $version }) =>
    $version === 1 ? 'rgba(0, 255, 255, 0.2)' : 'rgba(120, 81, 169, 0.3)'};
  color: ${({ $version }) => ($version === 1 ? '#00ffff' : '#b088f0')};
  border: 1px solid ${({ $version }) =>
    $version === 1 ? 'rgba(0, 255, 255, 0.4)' : 'rgba(120, 81, 169, 0.5)'};
  backdrop-filter: blur(8px);
`;

const CardBody = styled.div`
  padding: 20px;
`;

const ConceptName = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0 0 4px;
  color: #ffffff;
`;

const ConceptTagline = styled.p`
  font-size: 0.85rem;
  color: #8888aa;
  margin: 0 0 16px;
  font-style: italic;
`;

const PaletteRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
`;

const ColorSwatch = styled.span.attrs<{ $color: string }>((props) => ({
  role: 'img',
  'aria-label': props.title || 'color swatch',
}))<{ $color: string }>`
  display: inline-block;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
`;

const FontPair = styled.div`
  font-size: 0.8rem;
  color: #6666aa;
  margin-bottom: 12px;
`;

const MomentQuote = styled.div`
  font-size: 0.85rem;
  color: #aaaacc;
  margin-bottom: 12px;
  padding-left: 12px;
  border-left: 2px solid rgba(0, 255, 255, 0.3);
  line-height: 1.5;
`;

const Rationale = styled.p`
  font-size: 0.8rem;
  color: #777799;
  line-height: 1.6;
  margin: 0 0 16px;
`;

const ViewButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #00ffff, #00a0e3);
  color: #0a0a1a;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
  min-height: 44px;
  width: 100%;
  justify-content: center;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 255, 255, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

/* ─── Component ─── */
const DesignPlayground: React.FC = () => {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filterOptions = [
    { key: 'all', label: 'All' },
    ...conceptCategories.map((c) => ({ key: c.category, label: c.label })),
  ];

  const filteredCategories =
    activeFilter === 'all'
      ? conceptCategories
      : conceptCategories.filter((c) => c.category === activeFilter);

  let cardDelay = 0;

  return (
    <PageContainer>
      <Helmet>
        {allConcepts.map((c) => (
          <link key={c.id} href={c.fonts.googleImportUrl} rel="stylesheet" media="print" onLoad={(e) => { (e.target as HTMLLinkElement).media = 'all'; }} />
        ))}
      </Helmet>

      <Header>
        <Title>Design Playground</Title>
        <Subtitle>11 Homepage Redesign Concepts — Compare Directions & Versions</Subtitle>
        <Badge>
          <Sparkles size={14} />
          Phase 1: Design Exploration
        </Badge>
      </Header>

      <FilterBar>
        <Filter size={16} style={{ color: '#6666aa', marginTop: 2 }} aria-hidden="true" />
        {filterOptions.map((opt) => (
          <FilterTab
            key={opt.key}
            $active={activeFilter === opt.key}
            onClick={() => setActiveFilter(opt.key)}
            aria-pressed={activeFilter === opt.key}
          >
            {opt.label}
          </FilterTab>
        ))}
      </FilterBar>

      {filteredCategories.map((category) => {
        return (
          <CategorySection key={category.category}>
            <CategoryHeader>
              <CategoryTitle>{category.label}</CategoryTitle>
              <CategoryCount>
                {category.concepts.length} version{category.concepts.length > 1 ? 's' : ''}
              </CategoryCount>
            </CategoryHeader>
            <ConceptRow>
              {category.concepts.map((concept) => {
                const delay = cardDelay * 0.1;
                cardDelay++;
                return (
                  <ConceptCard key={concept.id} $delay={delay}>
                    <PreviewArea $gradient={concept.gradients.hero}>
                      <VersionPill $version={concept.version}>
                        V{concept.version}
                      </VersionPill>
                      <PreviewTitle $font={concept.fonts.display} $color={concept.colors.text}>
                        SwanStudios
                      </PreviewTitle>
                      <PreviewTagline $font={concept.fonts.body} $color={concept.colors.textSecondary}>
                        {concept.tagline}
                      </PreviewTagline>
                    </PreviewArea>
                    <CardBody>
                      <ConceptName>{concept.name}</ConceptName>
                      <ConceptTagline>"{concept.tagline}"</ConceptTagline>

                      <PaletteRow>
                        <ColorSwatch $color={concept.colors.primary} title="Primary" />
                        <ColorSwatch $color={concept.colors.secondary} title="Secondary" />
                        <ColorSwatch $color={concept.colors.accent} title="Accent" />
                        <ColorSwatch $color={concept.colors.background} title="Background" />
                        <ColorSwatch $color={concept.colors.text} title="Text" />
                      </PaletteRow>

                      <FontPair>
                        {concept.fonts.display} + {concept.fonts.body}
                      </FontPair>

                      <MomentQuote>{concept.memorableMoment}</MomentQuote>

                      <Rationale>{concept.rationale}</Rationale>

                      <ViewButton onClick={() => navigate(`/designs/${concept.id}`)}>
                        <Eye size={16} />
                        View Full Concept
                      </ViewButton>
                    </CardBody>
                  </ConceptCard>
                );
              })}
            </ConceptRow>
          </CategorySection>
        );
      })}
    </PageContainer>
  );
};

export default DesignPlayground;
