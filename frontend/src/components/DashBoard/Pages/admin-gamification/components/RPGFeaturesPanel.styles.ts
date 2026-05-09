import styled from 'styled-components';

import type { RPGFeatureStatus } from './RPGFeaturesPanel.data';

const activeBorder = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent)';
const plannedBorder = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent)';
const activeBadgeBg = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent)';
const plannedBadgeBg = 'color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent)';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const SectionTitle = styled.h2`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

export const SectionDescription = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  margin: 0;
  max-width: 700px;
`;

export const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const FeatureCard = styled.div<{ $status: RPGFeatureStatus }>`
  background: var(--bg-elevated, #141419);
  border: 1px solid ${({ $status }) => ($status === 'active' ? activeBorder : plannedBorder)};
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  opacity: ${({ $status }) => ($status === 'planned' ? 0.65 : 1)};
  transition: border-color 0.3s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    border-color: ${({ $status }) =>
      $status === 'active'
        ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent)'
        : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 15%, transparent)'};
    transform: translateY(-2px);
  }
`;

export const FeatureHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

export const FeatureName = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const StatusBadge = styled.span<{ $status: RPGFeatureStatus }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 20px;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: ${({ $status }) => ($status === 'active' ? activeBadgeBg : plannedBadgeBg)};
  color: ${({ $status }) =>
    $status === 'active'
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--accent-gold, #C6A84B)'};
  border: 1px solid ${({ $status }) =>
    $status === 'active'
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)'
      : 'color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent)'};
`;

export const FeatureDescription = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  margin: 0;
  line-height: 1.5;
`;

export const FeatureMeta = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

export const MetaLabel = styled.span`
  font-weight: 600;
  color: var(--text-secondary, rgba(224, 236, 244, 0.5));
`;

export const PreviewButton = styled.button`
  align-self: flex-start;
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  background: linear-gradient(135deg, var(--bg-surface, #003080) 0%, var(--bg-base, #002060) 100%);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  cursor: pointer;
  margin-top: 4px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    background: var(--bg-surface, #003080);
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }
`;

export const PreviewSection = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  border-radius: 12px;
  padding: 24px;
`;

export const PreviewTitle = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 16px 0;
`;

export const PreviewLoading = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));
  padding: 24px;
  text-align: center;
`;
