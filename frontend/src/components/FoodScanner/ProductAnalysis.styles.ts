import styled from 'styled-components';
import type { RatingTone } from './productAnalysis.types';

export const toneColor = (tone: RatingTone | string) => {
  if (tone === 'good') return 'var(--accent-primary, #60C0F0)';
  if (tone === 'bad') return 'var(--error, #C92A54)';
  return 'var(--accent-secondary, #C6A84B)';
};

export const toneSurface = (tone: RatingTone | string) => {
  if (tone === 'good') return 'rgba(96, 192, 240, 0.12)';
  if (tone === 'bad') return 'rgba(201, 42, 84, 0.12)';
  return 'rgba(198, 168, 75, 0.12)';
};

export const AnalysisContainer = styled.div`
  margin-top: 1.5rem;
  overflow: hidden;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: 8px;
  background: var(--card-bg, rgba(20, 20, 40, 0.72));
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28);
`;

export const HeaderGrid = styled.div<{ $tone: RatingTone }>`
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 1rem;
  padding: 1.25rem;
  background:
    linear-gradient(135deg, ${({ $tone }) => toneSurface($tone)}, rgba(0, 32, 96, 0.32)),
    var(--surface-dark, #141419);

  @media (max-width: 560px) {
    grid-template-columns: 68px 1fr;
    padding: 1rem;
  }
`;

export const ProductImage = styled.div<{ $imageUrl?: string | null }>`
  width: 88px;
  height: 88px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14));
  border-radius: 8px;
  background: ${({ $imageUrl }) => $imageUrl ? `url(${$imageUrl}) center / cover` : 'rgba(96, 192, 240, 0.08)'};
  display: grid;
  place-items: center;
  color: var(--accent-primary, #60C0F0);

  @media (max-width: 560px) {
    width: 68px;
    height: 68px;
  }
`;

export const ProductTitle = styled.h3`
  margin: 0 0 0.35rem;
  color: var(--text-primary, #E0ECF4);
  font-size: clamp(1.05rem, 2vw, 1.3rem);
  line-height: 1.2;
`;

export const ProductMeta = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.88rem;
`;

export const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

export const Chip = styled.span<{ $tone?: RatingTone | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 28px;
  padding: 0.25rem 0.65rem;
  border: 1px solid ${({ $tone = 'neutral' }) => $tone === 'neutral' ? 'var(--border-subtle, rgba(255, 255, 255, 0.12))' : toneColor($tone)};
  border-radius: 999px;
  background: ${({ $tone = 'neutral' }) => $tone === 'neutral' ? 'rgba(255, 255, 255, 0.05)' : toneSurface($tone)};
  color: ${({ $tone = 'neutral' }) => $tone === 'neutral' ? 'var(--text-secondary, rgba(224, 236, 244, 0.72))' : toneColor($tone)};
  font-size: 0.75rem;
  font-weight: 700;
`;

export const PanelShell = styled.section`
  padding: 1.25rem;
`;

export const SectionTitle = styled.h4`
  margin: 0 0 0.9rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
`;

export const SectionCopy = styled.p`
  margin: 0 0 0.8rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
  font-size: 0.88rem;
  line-height: 1.55;
`;

export const InfoMessage = styled.div`
  padding: 1rem;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.88rem;
`;

export const TabList = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  background: rgba(0, 32, 96, 0.18);

  @media (max-width: 560px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const TabButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border: 0;
  border-bottom: 2px solid ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'transparent'};
  background: ${({ $active }) => $active ? 'rgba(96, 192, 240, 0.1)' : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, rgba(224, 236, 244, 0.68))'};
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;

  &:hover,
  &:focus-visible {
    background: rgba(96, 192, 240, 0.12);
    outline: none;
  }
`;

export const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
`;

export const ActionButton = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  min-width: 44px;
  border: ${({ $primary }) => $primary ? '0' : '1px solid var(--border-subtle, rgba(255, 255, 255, 0.16))'};
  border-radius: 8px;
  background: ${({ $primary }) => $primary ? 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))' : 'rgba(255, 255, 255, 0.06)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-size: 0.86rem;
  font-weight: 800;
  padding: 0.7rem 1rem;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  &:hover:not(:disabled),
  &:focus-visible:not(:disabled) {
    transform: translateY(-1px);
    outline: none;
  }
`;

export const DetailRow = styled.div`
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  margin-top: 0.45rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.74));
  font-size: 0.82rem;
  line-height: 1.5;
`;

export const DetailLabel = styled.span`
  min-width: 74px;
  flex-shrink: 0;
  color: var(--accent-primary, #60C0F0);
  font-weight: 800;
`;
