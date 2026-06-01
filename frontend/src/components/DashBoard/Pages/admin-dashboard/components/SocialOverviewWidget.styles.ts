import { motion } from 'framer-motion';
import styled from 'styled-components';
import { CommandCard } from '../AdminDashboardCards';

export const SOCIAL_ICE = 'var(--accent-primary, #60C0F0)';
export const SOCIAL_GOLD = 'var(--accent-gold, #C6A84B)';
const SOCIAL_TEXT = 'var(--text-primary, #E0ECF4)';
const SOCIAL_MUTED = 'var(--text-muted, rgba(224, 236, 244, 0.65))';
const SOCIAL_SUCCESS = 'var(--success, #22C55E)';
const SOCIAL_WARNING = 'var(--warning, #F59E0B)';
const SOCIAL_DANGER = 'var(--error, #EF4444)';
const SOCIAL_SURFACE = 'linear-gradient(135deg, color-mix(in srgb, var(--surface-elevated, #003080) 45%, transparent) 0%, color-mix(in srgb, var(--btn-primary-bg, #002060) 25%, transparent) 100%)';
const SOCIAL_BORDER = 'color-mix(in srgb, var(--accent-gold, #C6A84B) 25%, transparent)';

export const statusColor = (status: string) => {
  if (status === 'approved') return SOCIAL_SUCCESS;
  if (status === 'flagged' || status === 'pending') return SOCIAL_WARNING;
  return SOCIAL_DANGER;
};

export const SocialCommandCard = styled(CommandCard)`
  background: ${SOCIAL_SURFACE};
  border-color: ${SOCIAL_BORDER};
  margin-bottom: 1.5rem;
  padding: 1.15rem;
`;

export const HeaderRow = styled.div`
  align-items: center; display: flex; gap: 0.75rem;
  justify-content: space-between; margin-bottom: 1rem;
`;

export const Title = styled.h3`
  align-items: center; color: ${SOCIAL_TEXT}; display: flex; font-size: 1.05rem;
  gap: 0.5rem; margin: 0;
`;

export const HeaderActions = styled.div`
  display: flex; flex-wrap: wrap; gap: 0.5rem;
`;

export const ActionButton = styled.button`
  align-items: center; background: ${SOCIAL_SURFACE}; border: 1px solid ${SOCIAL_BORDER};
  border-radius: 10px; color: ${SOCIAL_TEXT}; cursor: pointer; display: inline-flex;
  font-size: 0.8rem; gap: 0.4rem; min-height: 44px; padding: 0.4rem 0.8rem;

  &:hover { border-color: ${SOCIAL_ICE}; }
  &:focus-visible { outline: 2px solid ${SOCIAL_ICE}; outline-offset: 2px; }
`;

export const MetricsGrid = styled.div`
  display: grid; gap: 0.75rem; grid-template-columns: repeat(4, minmax(130px, 1fr));
  margin-bottom: 1rem;
  @media (max-width: 960px) { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
`;

export const Metric = styled.div`
  background: ${SOCIAL_SURFACE}; border: 1px solid ${SOCIAL_BORDER};
  border-radius: 12px; padding: 0.65rem 0.75rem;

  .label {
    align-items: center; color: ${SOCIAL_MUTED}; display: flex; font-size: 0.73rem;
    gap: 0.25rem; margin-bottom: 0.25rem;
  }

  .value {
    color: ${SOCIAL_TEXT}; font-size: 1.1rem; font-weight: 700;
  }
`;

export const PostList = styled.div`
  display: flex; flex-direction: column; gap: 0.65rem;
`;

export const PostItem = styled(motion.div)`
  background: color-mix(in srgb, var(--btn-primary-bg, #002060) 35%, transparent);
  border: 1px solid color-mix(in srgb, ${SOCIAL_ICE} 20%, transparent);
  border-radius: 10px; padding: 0.65rem 0.75rem;
`;

export const TopRow = styled.div`
  display: flex; gap: 0.75rem; justify-content: space-between; margin-bottom: 0.25rem;
`;

export const PostAuthor = styled.div`
  color: ${SOCIAL_TEXT}; font-size: 0.82rem; font-weight: 600;
`;

export const MetaRow = styled.div`
  align-items: center; color: ${SOCIAL_MUTED}; display: flex; font-size: 0.74rem; gap: 0.6rem;
`;

export const FooterMetaRow = styled(MetaRow)`
  margin-top: 0.7rem;
`;

export const StatusPill = styled.span<{ $status: string }>`
  align-items: center; border: 1px solid color-mix(in srgb, ${({ $status }) => statusColor($status)} 40%, transparent);
  border-radius: 999px; color: ${({ $status }) => statusColor($status)}; display: inline-flex;
  font-size: 0.7rem; letter-spacing: 0.03em; padding: 0.1rem 0.45rem; text-transform: uppercase;
  background: color-mix(in srgb, ${({ $status }) => statusColor($status)} 12%, transparent);
`;

export const PostText = styled.p`
  -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: ${SOCIAL_MUTED};
  display: -webkit-box; font-size: 0.78rem; margin: 0; overflow: hidden;
`;

export const Empty = styled.div`
  color: ${SOCIAL_MUTED}; font-size: 0.85rem; padding: 0.75rem 0; text-align: center;
`;

export const AlertText = styled.div`
  align-items: center; color: ${SOCIAL_WARNING}; display: flex; font-size: 0.78rem;
  gap: 0.4rem; margin-bottom: 0.65rem;
`;
