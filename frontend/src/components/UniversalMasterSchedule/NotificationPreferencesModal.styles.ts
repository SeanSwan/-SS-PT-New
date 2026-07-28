/**
 * Notification Preferences Modal Styles
 * =====================================
 * Scoped styled-components for the schedule notification settings modal.
 */
import styled from 'styled-components';
import { CheckboxWrapper, SmallText } from './ui';

export const PreferenceCheckboxWrapper = styled(CheckboxWrapper)`
  min-height: 44px;
  padding: 0.25rem 0;
`;

export const CategorySection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin: 0.25rem 0 1rem;
`;

export const SectionHeading = styled(SmallText)`
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
`;

export const CategoryRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--input-border, rgba(96, 192, 240, 0.20));
  border-radius: 8px;
  background: var(--input-bg, rgba(224, 236, 244, 0.05));

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const CategoryCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
`;

export const CategoryTitle = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  font-weight: 700;
`;

export const CategoryDescription = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.65));
  font-size: 0.75rem;
  line-height: 1.4;
`;

export const CategoryChannels = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5rem;

  @media (max-width: 560px) {
    justify-content: flex-start;
  }
`;

export const CategoryToggle = styled(CheckboxWrapper)`
  min-height: 44px;
  min-width: 76px;
  justify-content: center;
  padding: 0.35rem 0.55rem;
  border: 1px solid var(--input-border, rgba(96, 192, 240, 0.20));
  border-radius: 6px;
  background: var(--input-bg-hover, rgba(224, 236, 244, 0.08));

  span {
    font-size: 0.75rem;
    font-weight: 700;
  }
`;