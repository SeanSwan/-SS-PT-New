import styled from 'styled-components';

export const Page = styled.div`
  padding: var(--space-xl, 2rem);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg, 1.5rem);
  color: var(--text-primary, #E0ECF4);
`;

export const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.75rem);
`;

export const Title = styled.h1`
  margin: 0;
  font-size: var(--font-size-2xl, 1.5rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--text-primary, #E0ECF4);
`;

export const Subtitle = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  max-width: 720px;
  line-height: 1.6;
`;

export const SelectorRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm, 0.75rem);
  align-items: center;
`;

export const ClientSelect = styled.select`
  background: var(--bg-surface, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  border-radius: 12px;
  padding: 0.75rem 1rem;
  color: var(--text-primary, #E0ECF4);
  min-width: min(280px, 100%);
  min-height: 44px;
  font-family: var(--font-body, 'Sora', sans-serif);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  appearance: auto;

  &:focus,
  &:hover {
    outline: none;
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
    background: var(--bg-base, #0A0A0F);
  }

  option {
    background: var(--bg-base, #0A0A0F);
    color: var(--text-primary, #E0ECF4);
    padding: 12px;
    font-family: var(--font-body, 'Sora', sans-serif);
  }
`;

export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: var(--space-md, 1rem);
`;

export const Card = styled.div`
  background: var(--bg-elevated, #1A1A24);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 16px;
  padding: var(--space-md, 1rem);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.75rem);
  box-shadow: var(--shadow-strong, 0 18px 48px rgba(0, 0, 0, 0.32));
`;

export const CardLabel = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  font-size: var(--font-size-sm, 0.875rem);
`;

export const CardValue = styled.div`
  font-size: var(--font-size-xl, 1.25rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--accent-primary, #60C0F0);
`;

export const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 1rem);
`;

export const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-sm, 0.75rem);
  color: var(--accent-primary, #60C0F0);
  font-weight: var(--font-weight-semibold, 600);
`;

export const EmptyState = styled.div`
  padding: var(--space-lg, 1.5rem);
  border-radius: 16px;
  border: 1px dashed color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #1A1A24) 74%, transparent);
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
`;

export const GoalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.75rem);
`;

export const GoalRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

export const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm, 0.75rem);
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  font-size: var(--font-size-sm, 0.875rem);

  @media (max-width: 430px) {
    flex-direction: column;
  }
`;

export const GoalBar = styled.div`
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, var(--bg-base, #0A0A0F));
  overflow: hidden;
`;

export const GoalFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${(props) => Math.min(100, Math.max(0, props.$progress))}%;
  background: linear-gradient(90deg, var(--chart-primary, #50A0F0), var(--accent-secondary, #8B5CF6));
  border-radius: inherit;
`;

export const MeasurementList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-sm, 0.75rem);
`;

export const MeasurementRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm, 0.75rem);
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, var(--bg-surface, #141419));

  @media (max-width: 430px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const MeasurementDate = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  font-size: var(--font-size-sm, 0.875rem);
`;

export const MeasurementValue = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-weight: var(--font-weight-semibold, 600);
`;
