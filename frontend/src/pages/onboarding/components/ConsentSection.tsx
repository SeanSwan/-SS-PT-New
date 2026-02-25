/**
 * ConsentSection.tsx
 * ==================
 * Onboarding step for AI privacy consent.
 * Presents the consent disclosure and allows the user to opt in or skip.
 * Consent is saved as part of form data and processed on final submit.
 *
 * Phase 1 — Privacy Foundation (Smart Workout Logger)
 */

import React from 'react';
import styled from 'styled-components';
import { Shield, ShieldCheck, Eye, Lock, Brain, Info } from 'lucide-react';

// ── Theme tokens (matching wizard) ──────────────────────────────────────────

const SWAN_CYAN = '#00FFFF';

// ── Styled Components ───────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
  margin: 0;
`;

const SectionSubtitle = styled.p`
  font-size: 0.9375rem;
  color: rgba(255, 255, 255, 0.55);
  margin: 0;
  line-height: 1.5;
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.25rem;
`;

const ProtectionsList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
`;

const ProtectionItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
`;

const ProtectionIcon = styled.span<{ $color?: string }>`
  flex-shrink: 0;
  margin-top: 2px;
  color: ${({ $color }) => $color || '#10b981'};
`;

const ConsentDisclosure = styled.div`
  background: rgba(0, 255, 255, 0.04);
  border: 1px solid rgba(0, 255, 255, 0.15);
  border-radius: 12px;
  padding: 1.25rem;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.65;
`;

const ConsentDisclosureTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${SWAN_CYAN};
  margin-bottom: 0.625rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ConsentToggleRow = styled.label`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 56px;

  &:hover {
    background: rgba(0, 255, 255, 0.04);
    border-color: rgba(0, 255, 255, 0.2);
  }
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
`;

const ToggleTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  width: 48px;
  min-width: 48px;
  height: 26px;
  border-radius: 13px;
  background: ${({ $checked }) =>
    $checked
      ? 'linear-gradient(135deg, #00cccc, #00ffff)'
      : 'rgba(255, 255, 255, 0.15)'};
  transition: background 0.25s ease;
  box-shadow: ${({ $checked }) =>
    $checked ? '0 0 8px rgba(0, 255, 255, 0.3)' : 'none'};
`;

const ToggleThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 3px;
  left: ${({ $checked }) => ($checked ? '24px' : '3px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  transition: left 0.25s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const ToggleLabel = styled.div`
  flex: 1;
`;

const TogglePrimary = styled.div`
  font-size: 0.9375rem;
  font-weight: 600;
  color: #ffffff;
`;

const ToggleSecondary = styled.div`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.125rem;
`;

const SkipNote = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: 10px;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
`;

// ── Component ───────────────────────────────────────────────────────────────

interface ConsentSectionProps {
  data: any;
  updateData: (data: any) => void;
}

const ConsentSection: React.FC<ConsentSectionProps> = ({ data, updateData }) => {
  const isConsentGranted = data?.aiConsentGranted === true;

  const handleToggle = () => {
    updateData({ aiConsentGranted: !isConsentGranted });
  };

  return (
    <Container>
      <SectionHeader>
        <Shield size={24} color={SWAN_CYAN} />
        <SectionTitle>AI Privacy & Consent</SectionTitle>
      </SectionHeader>

      <SectionSubtitle>
        SwanStudios uses AI to create personalized workout plans. Before we can use
        these features, we need your consent. Review the details below.
      </SectionSubtitle>

      {/* What AI does */}
      <Card>
        <ProtectionsList>
          <ProtectionItem>
            <ProtectionIcon $color={SWAN_CYAN}><Brain size={16} /></ProtectionIcon>
            <div><strong>AI-powered workout plans</strong> — personalized based on your goals, fitness level, and the NASM Optimum Performance Training model.</div>
          </ProtectionItem>
          <ProtectionItem>
            <ProtectionIcon $color={SWAN_CYAN}><Brain size={16} /></ProtectionIcon>
            <div><strong>Adaptive programming</strong> — accounts for your injury history and current fitness level.</div>
          </ProtectionItem>
        </ProtectionsList>
      </Card>

      {/* Privacy protections */}
      <Card>
        <ProtectionsList>
          <ProtectionItem>
            <ProtectionIcon><ShieldCheck size={16} /></ProtectionIcon>
            <div><strong>De-identified data only.</strong> Your name, email, and personal identifiers are stripped before reaching the AI.</div>
          </ProtectionItem>
          <ProtectionItem>
            <ProtectionIcon><Eye size={16} /></ProtectionIcon>
            <div><strong>Training data only.</strong> Only fitness-relevant information is shared. Medical details like medications are never sent.</div>
          </ProtectionItem>
          <ProtectionItem>
            <ProtectionIcon><Lock size={16} /></ProtectionIcon>
            <div><strong>You stay anonymous.</strong> The AI only knows your SwanStudios spirit name.</div>
          </ProtectionItem>
          <ProtectionItem>
            <ProtectionIcon><ShieldCheck size={16} /></ProtectionIcon>
            <div><strong>Withdraw anytime.</strong> You can disable AI features from your dashboard settings at any time.</div>
          </ProtectionItem>
        </ProtectionsList>
      </Card>

      {/* Legal disclosure */}
      <ConsentDisclosure>
        <ConsentDisclosureTitle>
          <Shield size={16} />
          Consent Disclosure (v1.0)
        </ConsentDisclosureTitle>
        By enabling AI features, you agree that SwanStudios may process your
        de-identified fitness profile through an AI provider (currently OpenAI) to
        generate personalized workout plans. Your personal identifiers are never
        shared with the AI provider. You may withdraw consent at any time from the
        AI Privacy & Consent page in your dashboard.
      </ConsentDisclosure>

      {/* Toggle */}
      <ConsentToggleRow>
        <HiddenCheckbox
          type="checkbox"
          checked={isConsentGranted}
          onChange={handleToggle}
          role="switch"
          aria-checked={isConsentGranted}
          aria-label="Enable AI-powered features"
        />
        <ToggleTrack $checked={isConsentGranted}>
          <ToggleThumb $checked={isConsentGranted} />
        </ToggleTrack>
        <ToggleLabel>
          <TogglePrimary>
            {isConsentGranted ? 'AI Features Enabled' : 'Enable AI-Powered Features'}
          </TogglePrimary>
          <ToggleSecondary>
            {isConsentGranted
              ? 'Your de-identified profile will be used for AI workout generation.'
              : 'Toggle on to opt in to AI-generated workout plans.'}
          </ToggleSecondary>
        </ToggleLabel>
      </ConsentToggleRow>

      {/* Skip note */}
      {!isConsentGranted && (
        <SkipNote>
          <Info size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>This step is optional.</strong> You can skip it and still use all
            manual and trainer-assigned workout features. You can enable AI features
            later from your dashboard.
          </div>
        </SkipNote>
      )}
    </Container>
  );
};

export default ConsentSection;
