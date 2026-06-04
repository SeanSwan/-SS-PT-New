/**
 * Typography Components
 * ====================
 * Semantic, accessible text components to replace MUI Typography
 */

import styled, { css } from 'styled-components';

const SCHEDULE_TYPOGRAPHY_THEME = {
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textSecondary: 'var(--text-secondary, rgba(224, 236, 244, 0.82))',
  textMuted: 'var(--text-muted, rgba(224, 236, 244, 0.65))',
  accent: 'var(--accent-primary, #60C0F0)',
  danger: 'var(--danger, #EF4444)',
} as const;

const secondaryTextStyleProps = new Set(['secondary']);

const requiredMarkerStyles = css`
  &::after {
    content: ' *';
    color: ${SCHEDULE_TYPOGRAPHY_THEME.danger};
  }
`;

const scheduleTextColor = (secondary?: boolean) => (
  secondary ? SCHEDULE_TYPOGRAPHY_THEME.textMuted : SCHEDULE_TYPOGRAPHY_THEME.textPrimary
);

// Page-level heading (h1)
export const PageTitle = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 400;
  color: ${SCHEDULE_TYPOGRAPHY_THEME.textPrimary};
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }

  @media (min-width: 2560px) {
    font-size: 2.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 3rem;
  }
`;

// Section heading (h2)
export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
  color: ${SCHEDULE_TYPOGRAPHY_THEME.textPrimary};
  line-height: 1.3;

  @media (max-width: 768px) {
    font-size: 1.25rem;
  }

  @media (min-width: 2560px) {
    font-size: 1.75rem;
  }

  @media (min-width: 3840px) {
    font-size: 2.25rem;
  }
`;

// Subsection heading (h3)
export const SubsectionTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: ${SCHEDULE_TYPOGRAPHY_THEME.textPrimary};
  line-height: 1.4;
`;

// Heading variant with primary color
export const PrimaryHeading = styled.h2`
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  color: ${SCHEDULE_TYPOGRAPHY_THEME.accent};
  line-height: 1.2;

  @media (min-width: 2560px) {
    font-size: 2.5rem;
  }

  @media (min-width: 3840px) {
    font-size: 3rem;
  }
`;

// Body text (regular paragraphs)
export const BodyText = styled.p.withConfig({
  shouldForwardProp: (prop) => !secondaryTextStyleProps.has(prop)
})<{ secondary?: boolean }>`
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  color: ${props => scheduleTextColor(props.secondary)};
  line-height: 1.5;

  @media (min-width: 2560px) {
    font-size: 1.125rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.25rem;
  }
`;

// Small body text
export const SmallText = styled.p.withConfig({
  shouldForwardProp: (prop) => !secondaryTextStyleProps.has(prop)
})<{ secondary?: boolean }>`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 400;
  color: ${props => scheduleTextColor(props.secondary)};
  line-height: 1.4;

  @media (min-width: 2560px) {
    font-size: 1rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.125rem;
  }
`;

// Caption text (smallest)
export const Caption = styled.span.withConfig({
  shouldForwardProp: (prop) => !secondaryTextStyleProps.has(prop)
})<{ secondary?: boolean }>`
  font-size: 0.75rem;
  font-weight: 400;
  color: ${props => scheduleTextColor(props.secondary)};
  line-height: 1.3;
  display: inline-block;

  @media (min-width: 2560px) {
    font-size: 0.875rem;
  }

  @media (min-width: 3840px) {
    font-size: 1rem;
  }
`;

// Label text (for forms)
export const Label = styled.label.withConfig({
  shouldForwardProp: (prop) => prop !== 'required'
})<{ required?: boolean }>`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${SCHEDULE_TYPOGRAPHY_THEME.textSecondary};
  margin-bottom: 0.5rem;
  
  ${props => props.required && requiredMarkerStyles}
`;

// Error text
export const ErrorText = styled.span`
  display: block;
  font-size: 0.75rem;
  color: ${SCHEDULE_TYPOGRAPHY_THEME.danger};
  margin-top: 0.25rem;
  font-weight: 500;
`;

// Helper text
export const HelperText = styled.span`
  display: block;
  font-size: 0.75rem;
  color: ${SCHEDULE_TYPOGRAPHY_THEME.textMuted};
  margin-top: 0.25rem;
`;
