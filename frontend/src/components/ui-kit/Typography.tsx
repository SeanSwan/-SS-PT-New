/**
 * Typography Components
 * ====================
 * Semantic, accessible text components to replace MUI Typography
 */

import styled from 'styled-components';

// Page-level heading (h1)
export const PageTitle = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 400;
  color: #ffffff;
  line-height: 1.2;
  
  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

// Section heading (h2)
export const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.3;
  
  @media (max-width: 768px) {
    font-size: 1.25rem;
  }
`;

// Subsection heading (h3)
export const SubsectionTitle = styled.h3`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.4;
`;

// Heading variant with primary color
export const PrimaryHeading = styled.h4`
  margin: 0;
  font-size: 2rem;
  font-weight: 600;
  color: #3b82f6;
  line-height: 1.2;
`;

// Body text (regular paragraphs)
export const BodyText = styled.p<{ secondary?: boolean }>`
  margin: 0;
  font-size: 1rem;
  font-weight: 400;
  color: ${props => props.secondary ? '#94a3b8' : '#ffffff'};
  line-height: 1.5;
`;

// Small body text
export const SmallText = styled.p<{ secondary?: boolean }>`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 400;
  color: ${props => props.secondary ? '#94a3b8' : '#ffffff'};
  line-height: 1.4;
`;

// Caption text (smallest)
export const Caption = styled.span<{ secondary?: boolean }>`
  font-size: 0.75rem;
  font-weight: 400;
  color: ${props => props.secondary ? '#94a3b8' : '#ffffff'};
  line-height: 1.3;
  display: inline-block;
`;

// Label text (for forms)
export const Label = styled.label<{ required?: boolean }>`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #e2e8f0;
  margin-bottom: 0.5rem;
  
  ${props => props.required && `
    &::after {
      content: ' *';
      color: #ef4444;
    }
  `}
`;

// Error text
export const ErrorText = styled.span`
  display: block;
  font-size: 0.75rem;
  color: #ef4444;
  margin-top: 0.25rem;
  font-weight: 500;
`;

// Helper text
export const HelperText = styled.span`
  display: block;
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.25rem;
`;
