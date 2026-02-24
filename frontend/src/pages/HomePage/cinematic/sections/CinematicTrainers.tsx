/**
 * CinematicTrainers.tsx — Trainer profiles carousel with certification badges.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Star,
  Linkedin,
  Instagram,
  Award,
} from 'lucide-react';

import type { CinematicTokens } from '../cinematic-tokens';
import type { TrainerProfile } from '../HomepageContent';
import { staggerContainer, staggerItem, fadeUpVariants, defaultViewport } from '../cinematic-animations';
import { SectionShell, SectionBackground, SectionHeading, SectionDescription } from '../cinematic-shared';

interface CinematicTrainersProps {
  sectionTitle: string;
  sectionDescription: string;
  profiles: TrainerProfile[];
  tokens: CinematicTokens;
}

interface TP { $tokens: CinematicTokens }

const TrainerCard = styled(motion.div)<TP>`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ $tokens }) => $tokens.palette.glassBorder};
  border-radius: ${({ $tokens }) => $tokens.surface.cardRadius};
  padding: 2.5rem;
  max-width: 1000px;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 1.5rem;
    gap: 1.5rem;
  }
`;

const TrainerImageArea = styled.div<TP>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const CertBadges = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
`;

const CertBadge = styled.span<TP>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-family: ${({ $tokens }) => $tokens.typography.monoFamily};
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $tokens }) => `${$tokens.palette.gaming}15`};
  color: ${({ $tokens }) => $tokens.palette.gaming};
  border: 1px solid ${({ $tokens }) => `${$tokens.palette.gaming}30`};
`;

const AvatarPlaceholder = styled.div<TP>`
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: ${({ $tokens }) => `linear-gradient(135deg, ${$tokens.palette.accent}20, ${$tokens.palette.gaming}10)`};
  border: 3px solid ${({ $tokens }) => $tokens.palette.accent}40;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-size: 3rem;
  font-weight: 700;
  color: ${({ $tokens }) => $tokens.palette.accent};
`;

const TrainerInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const TrainerName = styled.h3<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.75rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  margin: 0;
`;

const TrainerTitle = styled.h4<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.dramaFamily};
  font-style: italic;
  font-weight: 400;
  font-size: 1.1rem;
  color: ${({ $tokens }) => $tokens.palette.accent};
  margin: 0;
`;

const RatingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Stars = styled.div<TP>`
  display: flex;
  gap: 2px;
  color: ${({ $tokens }) => $tokens.palette.accent};
`;

const ReviewCount = styled.span<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
`;

const TrainerBio = styled.p<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.95rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.7;
  margin: 0;
`;

const SpecialtyTags = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const SpecialtyTag = styled.span<TP>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.375rem 0.875rem;
  border-radius: 1.5rem;
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.8rem;
  font-weight: 500;
  background: ${({ $tokens }) => `${$tokens.palette.accent}10`};
  color: ${({ $tokens }) => $tokens.palette.accent};
  border: 1px solid ${({ $tokens }) => `${$tokens.palette.accent}20`};
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const ScheduleLink = styled(Link)<TP>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: ${({ $tokens }) => $tokens.surface.buttonRadius};
  background: linear-gradient(135deg, ${({ $tokens }) => $tokens.palette.accent}, ${({ $tokens }) => $tokens.palette.gaming});
  color: ${({ $tokens }) => $tokens.palette.textOnAccent};
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.9rem;
  text-decoration: none;
  min-height: 44px;
  transition: transform 0.2s ease;

  &:hover { transform: scale(1.03); }
  @media (prefers-reduced-motion: reduce) { &:hover { transform: none; } }
`;

const SocialIcons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const SocialLink = styled.a<TP>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${({ $tokens }) => `${$tokens.palette.accent}10`};
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: ${({ $tokens }) => $tokens.palette.accent};
    background: ${({ $tokens }) => `${$tokens.palette.accent}20`};
  }
`;

const NavButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
`;

const NavBtn = styled.button<TP>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ $tokens }) => $tokens.palette.border};
  background: transparent;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ $tokens }) => $tokens.palette.accent};
    color: ${({ $tokens }) => $tokens.palette.accent};
  }
`;

const Dots = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 1rem;
`;

const Dot = styled.button<TP & { $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: ${({ $tokens, $active }) =>
    $active ? $tokens.palette.accent : $tokens.palette.border};
  transition: background 0.2s ease;
`;

const SOCIAL_ICONS: Record<string, React.FC<{ size?: number }>> = {
  linkedin: Linkedin,
  instagram: Instagram,
};

const CinematicTrainers: React.FC<CinematicTrainersProps> = ({
  sectionTitle,
  sectionDescription,
  profiles,
  tokens,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const profile = profiles[activeIndex];

  const prev = useCallback(() => {
    setActiveIndex((i) => (i === 0 ? profiles.length - 1 : i - 1));
  }, [profiles.length]);

  const next = useCallback(() => {
    setActiveIndex((i) => (i === profiles.length - 1 ? 0 : i + 1));
  }, [profiles.length]);

  const initials = profile.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2);

  return (
    <SectionBackground $tokens={tokens}>
      <SectionShell $tokens={tokens}>
        <motion.div
          variants={staggerContainer(tokens.motion)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
        >
          <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center' }}>
            <SectionHeading $tokens={tokens} style={{ textAlign: 'center', margin: '0 auto 1rem' }}>
              {sectionTitle}
            </SectionHeading>
          </motion.div>
          <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <SectionDescription $tokens={tokens} style={{ textAlign: 'center' }}>
              {sectionDescription}
            </SectionDescription>
          </motion.div>

          <motion.div variants={staggerItem(tokens.motion)}>
            <AnimatePresence mode="wait">
              <TrainerCard
                key={profile.name}
                $tokens={tokens}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <TrainerImageArea $tokens={tokens}>
                  <AvatarPlaceholder $tokens={tokens}>{initials}</AvatarPlaceholder>
                  <CertBadges>
                    {profile.certifications.map((cert) => (
                      <CertBadge key={cert} $tokens={tokens}>
                        <Award size={12} />
                        {cert}
                      </CertBadge>
                    ))}
                  </CertBadges>
                </TrainerImageArea>

                <TrainerInfo>
                  <TrainerName $tokens={tokens}>{profile.name}</TrainerName>
                  <TrainerTitle $tokens={tokens}>{profile.title}</TrainerTitle>
                  <RatingRow>
                    <Stars $tokens={tokens}>
                      {Array.from({ length: profile.rating }, (_, i) => (
                        <Star key={i} size={14} fill="currentColor" />
                      ))}
                    </Stars>
                    <ReviewCount $tokens={tokens}>({profile.reviewCount} reviews)</ReviewCount>
                  </RatingRow>
                  <TrainerBio $tokens={tokens}>{profile.bio}</TrainerBio>
                  <SpecialtyTags>
                    {profile.specialties.map((s) => (
                      <SpecialtyTag key={s} $tokens={tokens}>
                        <Award size={12} />
                        {s}
                      </SpecialtyTag>
                    ))}
                  </SpecialtyTags>
                  <ActionRow>
                    <ScheduleLink to={profile.ctaPath} $tokens={tokens}>
                      {profile.ctaLabel}
                      <ArrowRight size={16} />
                    </ScheduleLink>
                    <SocialIcons>
                      {profile.social.map((s) => {
                        const Icon = SOCIAL_ICONS[s.platform] || Linkedin;
                        return (
                          <SocialLink
                            key={s.platform}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            $tokens={tokens}
                            aria-label={`${profile.name}'s ${s.platform} profile`}
                          >
                            <Icon size={18} />
                          </SocialLink>
                        );
                      })}
                    </SocialIcons>
                  </ActionRow>
                </TrainerInfo>
              </TrainerCard>
            </AnimatePresence>

            {profiles.length > 1 && (
              <>
                <NavButtons>
                  <NavBtn $tokens={tokens} onClick={prev} aria-label="Previous trainer">
                    <ChevronLeft size={20} />
                  </NavBtn>
                  <NavBtn $tokens={tokens} onClick={next} aria-label="Next trainer">
                    <ChevronRight size={20} />
                  </NavBtn>
                </NavButtons>
                <Dots>
                  {profiles.map((_, i) => (
                    <Dot
                      key={i}
                      $tokens={tokens}
                      $active={i === activeIndex}
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Go to trainer ${i + 1}`}
                    />
                  ))}
                </Dots>
              </>
            )}
          </motion.div>
        </motion.div>
      </SectionShell>
    </SectionBackground>
  );
};

export default CinematicTrainers;
