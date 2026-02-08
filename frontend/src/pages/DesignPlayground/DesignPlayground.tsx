import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { Palette, ExternalLink, Eye, Sparkles } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import type { ConceptTheme } from './concepts/shared/ConceptTypes';
import { natureWellnessTheme } from './concepts/NatureWellness/NatureWellnessTheme';
import { cyberpunkPremiumTheme } from './concepts/CyberpunkPremium/CyberpunkPremiumTheme';
import { marbleLuxuryTheme } from './concepts/MarbleLuxury/MarbleLuxuryTheme';
import { hybridNatureTechTheme } from './concepts/HybridNatureTech/HybridNatureTechTheme';
import { funAndBoldTheme } from './concepts/FunAndBold/FunAndBoldTheme';

const allConcepts: ConceptTheme[] = [
  natureWellnessTheme,
  cyberpunkPremiumTheme,
  marbleLuxuryTheme,
  hybridNatureTechTheme,
  funAndBoldTheme,
];

/* ─── Animations ─── */
const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

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
  margin-bottom: 48px;
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

const ConceptGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto 64px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

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

const ColorSwatch = styled.div<{ $color: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: 2px solid rgba(255, 255, 255, 0.15);
  flex-shrink: 0;
  cursor: help;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.2);
  }
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

/* ─── Comparison Section ─── */
const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 24px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ComparisonSection = styled.section`
  max-width: 1400px;
  margin: 0 auto 64px;
  animation: ${fadeInUp} 0.6s ease-out 0.8s both;
`;

const ComparisonTable = styled.div`
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);

  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 700px;
  }

  th {
    background: rgba(0, 255, 255, 0.06);
    padding: 12px 16px;
    text-align: left;
    font-size: 0.85rem;
    color: #00ffff;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  td {
    padding: 10px 16px;
    font-size: 0.85rem;
    color: #aaaacc;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  tr:hover td {
    background: rgba(255, 255, 255, 0.02);
  }
`;

/* ─── Inspiration Section ─── */
const InspirationSection = styled.section`
  max-width: 1400px;
  margin: 0 auto;
  animation: ${fadeInUp} 0.6s ease-out 1s both;
`;

const InspirationGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const InspirationCard = styled.div`
  padding: 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const InspirationTitle = styled.h4`
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 8px;
`;

const InspirationText = styled.p`
  font-size: 0.85rem;
  color: #8888aa;
  line-height: 1.5;
  margin: 0;
`;

const InspirationLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #00ffff;
  font-size: 0.8rem;
  text-decoration: none;
  margin-top: 8px;

  &:hover {
    text-decoration: underline;
  }
`;

/* ─── Component ─── */
const DesignPlayground: React.FC = () => {
  const navigate = useNavigate();

  return (
    <PageContainer>
      <Helmet>
        {allConcepts.map((c) => (
          <link key={c.id} href={c.fonts.googleImportUrl} rel="stylesheet" />
        ))}
      </Helmet>

      <Header>
        <Title>Design Playground</Title>
        <Subtitle>5 Homepage Redesign Concepts — Choose Your Direction</Subtitle>
        <Badge>
          <Sparkles size={14} />
          Phase 1: Design Exploration
        </Badge>
      </Header>

      <ConceptGrid>
        {allConcepts.map((concept, i) => (
          <ConceptCard key={concept.id} $delay={i * 0.1}>
            <PreviewArea $gradient={concept.gradients.hero}>
              <PreviewTitle $font={concept.fonts.display} $color={concept.colors.text}>
                SwanStudios
              </PreviewTitle>
              <PreviewTagline $font={concept.fonts.body} $color={concept.colors.textSecondary}>
                {concept.tagline}
              </PreviewTagline>
            </PreviewArea>
            <CardBody>
              <ConceptName>
                {concept.id}. {concept.name}
              </ConceptName>
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
        ))}
      </ConceptGrid>

      <ComparisonSection>
        <SectionTitle>
          <Palette size={20} />
          Quick Comparison
        </SectionTitle>
        <ComparisonTable>
          <table>
            <thead>
              <tr>
                <th>Attribute</th>
                <th>Nature</th>
                <th>Cyberpunk</th>
                <th>Marble</th>
                <th>Hybrid</th>
                <th>Fun</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Mood</td>
                <td>Serene</td>
                <td>Intense</td>
                <td>Refined</td>
                <td>Organic-tech</td>
                <td>Energetic</td>
              </tr>
              <tr>
                <td>Background</td>
                <td>Light</td>
                <td>Dark</td>
                <td>Light</td>
                <td>Dark</td>
                <td>Light</td>
              </tr>
              <tr>
                <td>Fonts</td>
                <td>Serif + Sans</td>
                <td>Geometric</td>
                <td>Serif + Sans</td>
                <td>Geometric</td>
                <td>Bold + Round</td>
              </tr>
              <tr>
                <td>CTA Color</td>
                <td>Green</td>
                <td>Cyan</td>
                <td>Black</td>
                <td>Green-Blue</td>
                <td>Orange</td>
              </tr>
              <tr>
                <td>Target</td>
                <td>Wellness</td>
                <td>Tech-savvy</td>
                <td>Premium</td>
                <td>Data-driven</td>
                <td>Younger</td>
              </tr>
              <tr>
                <td>Risk Level</td>
                <td>Low</td>
                <td>Medium</td>
                <td>Low</td>
                <td>Medium</td>
                <td>Medium</td>
              </tr>
            </tbody>
          </table>
        </ComparisonTable>
      </ComparisonSection>

      <InspirationSection>
        <SectionTitle>
          <Sparkles size={20} />
          Design Inspiration Sources
        </SectionTitle>
        <InspirationGrid>
          <InspirationCard>
            <InspirationTitle>Phive Clubs</InspirationTitle>
            <InspirationText>
              Awwwards SOTD winner. Portuguese fitness site using Inter Tight, bold orange/blue/green accents on dark base. Demonstrates that fitness sites can be award-winning.
            </InspirationText>
            <InspirationLink href="https://www.awwwards.com/sites/phive-clubs" target="_blank" rel="noopener noreferrer">
              View on Awwwards <ExternalLink size={12} />
            </InspirationLink>
          </InspirationCard>
          <InspirationCard>
            <InspirationTitle>Dark Dashboard Trends 2026</InspirationTitle>
            <InspirationText>
              Soft gradients + bold typography. Neon accents against minimal type. Card-based layouts with glowing elements. Dark elegance with lavender or cyan accents.
            </InspirationText>
            <InspirationLink href="https://muz.li/blog/best-dashboard-design-examples-inspirations-for-2026/" target="_blank" rel="noopener noreferrer">
              View on Muzli <ExternalLink size={12} />
            </InspirationLink>
          </InspirationCard>
          <InspirationCard>
            <InspirationTitle>2026 UI/UX Trends</InspirationTitle>
            <InspirationText>
              Glassmorphism returning. Digital textures — buttons that look like jelly or chrome. 3D depth-centric design. Dark mode with desaturated grays, not pure black.
            </InspirationText>
            <InspirationLink href="https://muz.li/inspiration/dark-mode/" target="_blank" rel="noopener noreferrer">
              View Dark Mode Gallery <ExternalLink size={12} />
            </InspirationLink>
          </InspirationCard>
        </InspirationGrid>
      </InspirationSection>
    </PageContainer>
  );
};

export default DesignPlayground;
