/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: IngredientDetailModal                            ║
 * ║  PURPOSE: Full-detail view for a flagged ingredient —        ║
 * ║           IARC classification, banned regions, health        ║
 * ║           concerns, healthier alternatives, FDA disclaimer   ║
 * ║  OWNER: Claude Sonnet 4.6                                    ║
 * ║  CREATED: 2026-04-08 | PHASE: 6.5 Phase 3                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WHAT THIS FILE DOES:
 * Slide-up modal opened when a user taps a flagged ingredient in
 * IngredientSafetyPanel. Shows the full IARC classification
 * explanation, list of banned regions, health concern details,
 * healthier swap suggestions, and a prominent FDA disclaimer.
 *
 * HOW IT FITS IN THE APP:
 *   IngredientSafetyPanel → IngredientDetailModal (portal/overlay)
 *
 * LEGAL NOTE:
 *   FDA disclaimer is non-negotiable on every render of this modal.
 *   All IARC text uses approved conservative phrasing.
 */

import React, { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, ShieldAlert, ExternalLink, AlertTriangle, Leaf } from 'lucide-react';
import type { IngredientSafety } from './IngredientSafetyPanel';

interface IngredientDetailModalProps {
  ingredient: IngredientSafety;
  onClose: () => void;
}

// ── IARC explanations (static, not from DB — must be reviewed by legal) ──
const IARC_DESCRIPTIONS: Record<string, { label: string; summary: string; color: string }> = {
  '1':  {
    label: 'Group 1 — Carcinogenic to humans',
    summary: 'Sufficient evidence of carcinogenicity in humans based on epidemiological studies.',
    color: '#C92A54',
  },
  '2A': {
    label: 'Group 2A — Probably carcinogenic to humans',
    summary: 'Limited evidence in humans but sufficient evidence in animals.',
    color: '#C6A84B',
  },
  '2B': {
    label: 'Group 2B — Possibly carcinogenic to humans',
    summary: 'Limited evidence in humans; less than sufficient evidence in animals.',
    color: '#C6A84B',
  },
};

const FDA_DISCLAIMER =
  'This information is provided for general wellness education only and does not constitute ' +
  'medical advice, diagnosis, or treatment. IARC classifications reflect aggregate research ' +
  'at the population level; individual risk is influenced by amount consumed, frequency, and ' +
  'other lifestyle factors. Consult a qualified healthcare professional before making ' +
  'significant dietary changes.';

// ── Component ──────────────────────────────────────────────────────────────
const IngredientDetailModal: React.FC<IngredientDetailModalProps> = ({ ingredient, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus close button on open for accessibility
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const iarcInfo = ingredient.iarcGroup ? IARC_DESCRIPTIONS[ingredient.iarcGroup] : null;
  const hasSections = iarcInfo || ingredient.isEUBanned || (ingredient.healthConcerns?.length ?? 0) > 0
    || (ingredient.healthierAlternatives?.length ?? 0) > 0 || (ingredient.bannedRegions?.length ?? 0) > 0;

  return (
    <Backdrop onClick={onClose} role="dialog" aria-modal="true" aria-label={`Ingredient detail: ${ingredient.name}`}>
      <Modal onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <HeaderLeft>
            <ShieldAlert size={18} color="#C92A54" />
            <ModalTitle>{ingredient.name}</ModalTitle>
          </HeaderLeft>
          <CloseBtn ref={closeRef} type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </CloseBtn>
        </ModalHeader>

        <ModalBody>
          {ingredient.description && (
            <Description>{ingredient.description}</Description>
          )}

          {/* IARC Classification */}
          {iarcInfo && (
            <Section>
              <SectionTitle $color={iarcInfo.color}>
                <ShieldAlert size={14} /> IARC Classification
              </SectionTitle>
              <IARCBadge $color={iarcInfo.color}>{iarcInfo.label}</IARCBadge>
              <SectionText>{iarcInfo.summary}</SectionText>
            </Section>
          )}

          {/* EU Banned */}
          {ingredient.isEUBanned && (
            <Section>
              <SectionTitle $color="#C92A54">
                <AlertTriangle size={14} /> Regulatory Status
              </SectionTitle>
              <SectionText>
                This ingredient is <strong>banned or restricted</strong> in the European Union and possibly
                other jurisdictions.
              </SectionText>
              {(ingredient.bannedRegions?.length ?? 0) > 0 && (
                <TagRow>
                  {ingredient.bannedRegions!.map(r => (
                    <Tag key={r} $color="#C92A54">{r}</Tag>
                  ))}
                </TagRow>
              )}
            </Section>
          )}

          {/* Health Concerns */}
          {(ingredient.healthConcerns?.length ?? 0) > 0 && (
            <Section>
              <SectionTitle $color="#C6A84B">
                <AlertTriangle size={14} /> Health Concerns
              </SectionTitle>
              <ConcernList>
                {ingredient.healthConcerns!.map((c, i) => (
                  <ConcernItem key={i}>{c}</ConcernItem>
                ))}
              </ConcernList>
            </Section>
          )}

          {/* Healthier Alternatives */}
          {(ingredient.healthierAlternatives?.length ?? 0) > 0 && (
            <Section>
              <SectionTitle $color="#60C0F0">
                <Leaf size={14} /> Healthier Alternatives
              </SectionTitle>
              <TagRow>
                {ingredient.healthierAlternatives!.map((a, i) => (
                  <Tag key={i} $color="#60C0F0">{a}</Tag>
                ))}
              </TagRow>
            </Section>
          )}

          {/* Research links */}
          {(ingredient.researchUrls?.length ?? 0) > 0 && (
            <Section>
              <SectionTitle $color="rgba(224,236,244,0.5)">
                Research Sources
              </SectionTitle>
              {ingredient.researchUrls!.slice(0, 3).map((url, i) => (
                <ResearchLink key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={12} /> Source {i + 1}
                </ResearchLink>
              ))}
            </Section>
          )}

          {!hasSections && (
            <SectionText style={{ color: 'rgba(224,236,244,0.5)', fontStyle: 'italic' }}>
              No detailed safety information available for this ingredient.
            </SectionText>
          )}

          {/* FDA Disclaimer — always visible */}
          <DisclaimerBox>
            <DisclaimerTitle>Wellness Disclaimer</DisclaimerTitle>
            <DisclaimerText>{FDA_DISCLAIMER}</DisclaimerText>
          </DisclaimerBox>
        </ModalBody>
      </Modal>
    </Backdrop>
  );
};

export default IngredientDetailModal;

// ── Animations ─────────────────────────────────────────────────────────────
const slideUp = keyframes`
  from { transform: translateY(40px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;

// ── Styled Components ──────────────────────────────────────────────────────
const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(3, 7, 18, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
`;

const Modal = styled.div`
  background: var(--bg-surface, #141419);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  overflow-y: auto;
  animation: ${slideUp} 0.22s ease-out;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  position: sticky;
  top: 0;
  background: var(--bg-surface, #141419);
  z-index: 1;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ModalTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const CloseBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: var(--text-primary, #E0ECF4);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.12); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

const ModalBody = styled.div`
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Description = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.83rem;
  color: rgba(224, 236, 244, 0.7);
  line-height: 1.5;
  margin: 0;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const SectionTitle = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const IARCBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  background: ${({ $color }) => `${$color}20`};
  border: 1px solid ${({ $color }) => $color};
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
  font-weight: 700;
  color: ${({ $color }) => $color};
  width: fit-content;
`;

const SectionText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  color: rgba(224, 236, 244, 0.75);
  line-height: 1.5;
  margin: 0;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const Tag = styled.span<{ $color: string }>`
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: ${({ $color }) => $color};
  background: ${({ $color }) => `${$color}18`};
  border: 1px solid ${({ $color }) => `${$color}50`};
  border-radius: 6px;
  padding: 3px 8px;
`;

const ConcernList = styled.ul`
  margin: 0;
  padding: 0 0 0 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ConcernItem = styled.li`
  font-family: 'Sora', sans-serif;
  font-size: 0.82rem;
  color: rgba(224, 236, 244, 0.75);
  line-height: 1.4;
`;

const ResearchLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'Fira Code', monospace;
  font-size: 0.73rem;
  color: var(--accent-primary, #60C0F0);
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const DisclaimerBox = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 4px;
`;

const DisclaimerTitle = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(224, 236, 244, 0.4);
  margin: 0 0 4px;
`;

const DisclaimerText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  color: rgba(224, 236, 244, 0.35);
  line-height: 1.5;
  margin: 0;
`;
