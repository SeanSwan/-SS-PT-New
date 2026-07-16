/**
 * GalleryInfoCard.tsx
 * ===================
 * Collapsible glassmorphic info card for the public gallery.
 * Contains photography info, premium upsell, and action buttons.
 * Design: Gemini 3.1 Pro directive — Crystalline Swan glassmorphism.
 */
import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Camera, Sparkles, Mail, Heart, ChevronDown, Info } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────
export interface GalleryInfoCardProps {
  onOpenMessage: () => void;
  onOpenDonation: () => void;
  onOpenVip: () => void;
  freeCredits?: number;
}

// ── Animations ────────────────────────────────────────────────────────────
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// ── Styled Components ─────────────────────────────────────────────────────
const CardWrapper = styled.div`
  animation: ${fadeInUp} 0.5s ease-out both;
  width: 100%;
`;

const CardContainer = styled.div`
  background: linear-gradient(145deg, rgba(0, 32, 96, 0.3), rgba(10, 10, 26, 0.6));
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 24px;
  overflow: hidden;

  @media (max-width: 767px) {
    border-radius: 16px;
  }
`;

const CardHeader = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 20px 24px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  min-height: 44px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  @media (max-width: 767px) {
    padding: 16px 20px;
  }
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const HeaderIcon = styled.span`
  color: #60C0F0;
  display: flex;
  align-items: center;
`;

const HeaderTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: rgba(255, 255, 255, 0.9);
`;

const ChevronIcon = styled.span<{ $expanded: boolean }>`
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;
  transform: rotate(${p => (p.$expanded ? '180deg' : '0deg')});
`;

const CollapsibleBody = styled.div<{ $expanded: boolean }>`
  max-height: ${p => (p.$expanded ? '1200px' : '0')};
  opacity: ${p => (p.$expanded ? 1 : 0)};
  overflow: hidden;
  transition: max-height 0.4s ease, opacity 0.3s ease;
`;

const BodyContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  padding: 0 24px 24px;

  @media (max-width: 1023px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 0 20px 20px;
  }
`;

const Module = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const UpsellModule = styled(Module)`
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 16px;
  padding: 20px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(139, 92, 246, 0.06) 0%,
      rgba(139, 92, 246, 0.02) 100%
    );
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(139, 92, 246, 0.5) 50%,
      transparent 100%
    );
    background-size: 200% 100%;
    animation: ${shimmer} 3s linear infinite;
  }
`;

const ModuleTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #60C0F0;
`;

const ModuleTitleIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const UpsellTitle = styled(ModuleTitle)`
  color: #8B5CF6;
`;

const ModuleText = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.65);
  margin: 0;
`;

const UpsellHighlight = styled.div`
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 4px;
`;

const UpsellHighlightTitle = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #8B5CF6;
  margin: 0 0 6px;
`;

const UpsellHighlightText = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
`;

const PremiumButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 0 20px;
  background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
  margin-top: auto;
  position: relative;
  z-index: 1;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ActionsHeading = styled.h5`
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin: 4px 0;
`;

const GhostButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #60C0F0;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(96, 192, 240, 0.3);
  }
`;

const PrimaryActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  padding: 0 20px;
  background: linear-gradient(135deg, #60C0F0 0%, #50A0F0 100%);
  border: none;
  border-radius: 12px;
  color: #002060;
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const SupportText = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
`;

const CreditsNote = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: #60C0F0;
  background: rgba(96, 192, 240, 0.08);
  padding: 2px 8px;
  border-radius: 6px;
  margin-left: 4px;
`;

// ── Component ─────────────────────────────────────────────────────────────
const GalleryInfoCard: React.FC<GalleryInfoCardProps> = ({
  onOpenMessage,
  onOpenDonation,
  onOpenVip,
  freeCredits = 3,
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <CardWrapper>
      <CardContainer>
        <CardHeader
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="gallery-info-body"
        >
          <HeaderLeft>
            <HeaderIcon>
              <Info size={18} />
            </HeaderIcon>
            <HeaderTitle>Gallery Info &amp; Actions</HeaderTitle>
          </HeaderLeft>
          <ChevronIcon $expanded={expanded}>
            <ChevronDown size={20} />
          </ChevronIcon>
        </CardHeader>

        <CollapsibleBody $expanded={expanded} id="gallery-info-body">
          <BodyContent>
            {/* Column 1: Photography Info */}
            <Module>
              <ModuleTitle>
                <ModuleTitleIcon>
                  <Camera size={16} />
                </ModuleTitleIcon>
                Your Photos
              </ModuleTitle>
              <ModuleText>
                Every photo has been professionally captured in RAW format and
                converted to high-quality JPEG for easy viewing and downloading.
              </ModuleText>
              <ModuleText>
                Want the original RAW files? Just send us a note — they&apos;re yours,
                absolutely free.
              </ModuleText>
              <ModuleText>
                Download as many photos as you&apos;d like — they&apos;re all complimentary.
              </ModuleText>
            </Module>

            {/* Column 2: Premium Upsell */}
            <UpsellModule>
              <UpsellTitle>
                <ModuleTitleIcon>
                  <Sparkles size={16} />
                </ModuleTitleIcon>
                Professional Enhancements
              </UpsellTitle>
              <ModuleText>
                Each visitor receives{' '}
                <CreditsNote>{freeCredits} free</CreditsNote>{' '}
                complimentary professional edits per event — color correction,
                retouching, and artistic finishing by our team.
              </ModuleText>
              <UpsellHighlight>
                <UpsellHighlightTitle>
                  Unlock Unlimited Enhancements
                </UpsellHighlightTitle>
                <UpsellHighlightText>
                  First 5 clients unlock unlimited enhancements — $175 Personal
                  Training Introduction Package includes unlimited gallery
                  enhancements for all your events, plus a complimentary
                  orientation session on your first visit.
                </UpsellHighlightText>
              </UpsellHighlight>
              <PremiumButton onClick={onOpenVip}>
                <Sparkles size={14} />
                Explore PT Package
              </PremiumButton>
            </UpsellModule>

            {/* Column 3: Actions */}
            <Module>
              <ActionsHeading>About the Photographer</ActionsHeading>
              <SupportText>
                I&apos;m a professional trainer with 26+ years of experience.
                If you&apos;d like to support my work, you can leave a donation
                of any amount. Know someone who&apos;d benefit from a free
                training orientation for home training? Send me a note!
              </SupportText>

              <Divider />

              <GhostButton onClick={onOpenMessage}>
                <Mail size={16} />
                Send a Note
              </GhostButton>
              <PrimaryActionButton onClick={onOpenDonation}>
                <Heart size={16} />
                Leave a Donation
              </PrimaryActionButton>
            </Module>
          </BodyContent>
        </CollapsibleBody>
      </CardContainer>
    </CardWrapper>
  );
};

export default GalleryInfoCard;
