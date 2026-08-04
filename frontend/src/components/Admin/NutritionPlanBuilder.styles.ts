/**
 * NutritionPlanBuilder.styles.ts
 * ==============================
 * Crystalline Swan surface styles for the Nutrition Plan Builder.
 * House standard: dark card surfaces on var(--card-dark, #141419),
 * responsive form grid, Wing Purple focus rings, 44px controls,
 * inline label/hint/error states. Breakpoints: 414 / 768 / 1024.
 */

import styled from 'styled-components';
import { Card, FlexBox } from '../UniversalMasterSchedule/ui';

export const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  max-width: 960px;
  margin: 0 auto;
  padding: 0.75rem;

  @media (min-width: 414px) {
    padding: 1rem;
  }

  @media (min-width: 768px) {
    gap: 1.5rem;
    padding: 1.5rem;
  }

  @media (min-width: 1024px) {
    padding: 2rem;
  }
`;

export const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

export const Subheading = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

/**
 * Dark builder card surface. Also enforces the interactive-control contract
 * for everything composed inside it: 44px minimum controls and a Wing Purple
 * focus ring on inputs/textareas (dual-glow discipline: purple ring, cyan
 * accents stay on links/data).
 */
export const BuilderCard = styled(Card)`
  background: var(--card-dark, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-radius: 12px;

  input,
  textarea {
    min-height: 44px;

    &:focus,
    &:focus-visible {
      outline: none;
      border-color: var(--wing-purple, #8B5CF6);
      box-shadow: 0 0 0 3px var(--focus-ring, rgba(139, 92, 246, 0.3));
    }
  }

  textarea {
    min-height: 88px;
  }

  button {
    min-height: 44px;
  }
`;

/** Responsive form grid: single column on phones, two columns from tablet up. */
export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 414px) {
    gap: 1.1rem;
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.25rem;
  }

  @media (min-width: 1024px) {
    gap: 1.5rem;
  }
`;

export const MealCard = styled(Card)`
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--surface-dark, #1A1A24);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.1));
`;

export const MealHeader = styled(FlexBox)`
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 0.75rem;
`;

export const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;

  @media (max-width: 413px) {
    justify-content: stretch;

    button {
      width: 100%;
      justify-content: center;
    }
  }
`;

export const SuccessText = styled.span`
  display: block;
  font-size: 0.875rem;
  color: var(--feedback-success, #10b981);
`;

/** Inline field-level error, paired to its input via aria-describedby. */
export const FieldErrorText = styled.span`
  display: block;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--error, #C92A54);
`;

/** Grid-level errors (e.g. the backend's cross-field 4/4/9 macro check). */
export const FormErrorList = styled.ul`
  margin: 0.75rem 0 0;
  padding: 0.75rem 1rem 0.75rem 2rem;
  border: 1px solid var(--error-border, rgba(201, 42, 84, 0.35));
  border-radius: 8px;
  background: var(--error-surface, rgba(201, 42, 84, 0.1));
  color: var(--error, #C92A54);
  font-size: 0.85rem;
  line-height: 1.5;
`;
