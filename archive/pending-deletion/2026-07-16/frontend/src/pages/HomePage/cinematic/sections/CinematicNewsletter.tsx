/**
 * CinematicNewsletter.tsx — Newsletter signup CTA with benefit cards.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Send, Shield, Dumbbell, Apple, Brain } from 'lucide-react';

import type { CinematicTokens } from '../cinematic-tokens';
import { staggerContainer, staggerItem, defaultViewport } from '../cinematic-animations';
import { SectionShell, SectionBackground, SectionHeading, SectionDescription, GlassCard, Grid3, IconContainer } from '../cinematic-shared';

interface Props {
  heading: string;
  subheading: string;
  namePlaceholder: string;
  emailPlaceholder: string;
  buttonText: string;
  privacyNote: string;
  benefits: { title: string; description: string; icon: string }[];
  tokens: CinematicTokens;
}

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  Dumbbell, Apple, Brain,
};

interface TP { $tokens: CinematicTokens }

const FormContainer = styled.div<TP>`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 600px;
  margin: 0 auto 1rem;
`;

const Input = styled.input<TP>`
  flex: 1;
  min-width: 200px;
  padding: 0.875rem 1.25rem;
  border-radius: ${({ $tokens }) => $tokens.surface.buttonRadius};
  border: 1px solid ${({ $tokens }) => $tokens.palette.border};
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.95rem;
  outline: none;
  min-height: 44px;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: ${({ $tokens }) => $tokens.palette.textSecondary};
  }

  &:focus {
    border-color: ${({ $tokens }) => $tokens.palette.accent};
  }
`;

const SubmitButton = styled.button<TP>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  border-radius: ${({ $tokens }) => $tokens.surface.buttonRadius};
  border: none;
  background: linear-gradient(135deg, ${({ $tokens }) => $tokens.palette.accent}, ${({ $tokens }) => $tokens.palette.gaming});
  color: ${({ $tokens }) => $tokens.palette.textOnAccent};
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  min-height: 44px;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.03);
  }

  &:active {
    transform: scale(0.97);
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover { transform: none; }
  }
`;

const PrivacyNote = styled.p<TP>`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  justify-content: center;
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.8rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  margin: 0 0 3rem;
`;

const BenefitCard = styled(motion.div)<TP>`
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${({ $tokens }) => $tokens.palette.glassBorder};
  border-radius: ${({ $tokens }) => $tokens.surface.cardRadius};
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
`;

const BenefitTitle = styled.h3<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 1.1rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  margin: 0;
`;

const BenefitDesc = styled.p<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  line-height: 1.6;
  margin: 0;
`;

const CinematicNewsletter: React.FC<Props> = ({
  heading,
  subheading,
  namePlaceholder,
  emailPlaceholder,
  buttonText,
  privacyNote,
  benefits,
  tokens,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      // Newsletter submission would go here
      // For now, just clear the form
      setName('');
      setEmail('');
    },
    []
  );

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
              {heading}
            </SectionHeading>
          </motion.div>
          <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <SectionDescription $tokens={tokens} style={{ textAlign: 'center' }}>
              {subheading}
            </SectionDescription>
          </motion.div>

          <motion.form onSubmit={handleSubmit} variants={staggerItem(tokens.motion)}>
            <FormContainer $tokens={tokens}>
              <Input
                $tokens={tokens}
                type="text"
                placeholder={namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Your name"
              />
              <Input
                $tokens={tokens}
                type="email"
                placeholder={emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Your email address"
                required
              />
              <SubmitButton $tokens={tokens} type="submit">
                {buttonText}
                <Send size={16} />
              </SubmitButton>
            </FormContainer>
            <PrivacyNote $tokens={tokens}>
              <Shield size={14} />
              {privacyNote}
            </PrivacyNote>
          </motion.form>

          <Grid3>
            {benefits.map((benefit) => {
              const Icon = ICON_MAP[benefit.icon] || Dumbbell;
              return (
                <BenefitCard key={benefit.title} $tokens={tokens} variants={staggerItem(tokens.motion)}>
                  <IconContainer $tokens={tokens}>
                    <Icon size={24} />
                  </IconContainer>
                  <BenefitTitle $tokens={tokens}>{benefit.title}</BenefitTitle>
                  <BenefitDesc $tokens={tokens}>{benefit.description}</BenefitDesc>
                </BenefitCard>
              );
            })}
          </Grid3>
        </motion.div>
      </SectionShell>
    </SectionBackground>
  );
};

export default CinematicNewsletter;
