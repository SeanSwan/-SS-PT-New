import { motion } from 'framer-motion';
import styled from 'styled-components';
import { cssUrlValue, sanitizeImageUrl } from '../../utils/imageUrl';



const textPrimary = 'var(--text-primary, #E0ECF4)';
const textMuted = 'var(--text-secondary, rgba(224, 236, 244, 0.68))';
const accent = 'var(--accent-primary, #60C0F0)';
const gold = 'var(--accent-gold, #C6A84B)';



const glassBorder = 'var(--border-subtle, rgba(198, 168, 75, 0.25))';
const glassSurface =
  'linear-gradient(135deg, rgba(0, 48, 128, 0.45) 0%, rgba(0, 32, 96, 0.25) 100%)';

export const Root = styled.div`
  padding: 1.5rem;
  min-height: 100vh;
  color: ${textPrimary};
  background:
    radial-gradient(circle at 15% 15%, rgba(80, 160, 240, 0.12), transparent 48%),
    radial-gradient(circle at 85% 20%, rgba(198, 168, 75, 0.1), transparent 45%),
    linear-gradient(160deg, rgba(0, 48, 128, 0.18) 0%, rgba(0, 32, 96, 0.1) 100%);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

export const HeaderTitle = styled.div`
  h1 {
    margin: 0;
    font-size: 1.65rem;
    letter-spacing: 0;
    background: linear-gradient(135deg, ${accent}, ${textPrimary} 45%, ${gold});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    margin: 0.3rem 0 0;
    color: ${textMuted};
    font-size: 0.9rem;
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
`;

export const Button = styled.button`
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid ${glassBorder};
  background: ${glassSurface};
  color: ${textPrimary};
  padding: 0.5rem 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;

  &:hover {
    border-color: ${accent};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (max-width: 1000px) {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
  }
`;

export const MetricCard = styled.div`
  border: 1px solid ${glassBorder};
  background: ${glassSurface};
  border-radius: 12px;
  padding: 0.8rem;

  .label {
    font-size: 0.74rem;
    color: ${textMuted};
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.2rem;
  }

  .value {
    font-size: 1.2rem;
    font-weight: 700;
    color: ${textPrimary};
  }
`;

export const Toolbar = styled.div`
  border: 1px solid ${glassBorder};
  background: ${glassSurface};
  border-radius: 12px;
  padding: 0.75rem;
  margin-bottom: 1rem;
`;

export const SearchWrap = styled.label`
  width: 100%;
  position: relative;
  display: block;

  svg {
    position: absolute;
    left: 0.65rem;
    top: 50%;
    transform: translateY(-50%);
    color: ${textMuted};
  }
`;

export const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid rgba(96, 192, 240, 0.25);
  background: rgba(0, 32, 96, 0.45);
  color: ${textPrimary};
  padding: 0.5rem 0.8rem 0.5rem 2rem;

  &::placeholder {
    color: ${textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${accent};
  }
`;

export const Board = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

export const Panel = styled.div`
  border: 1px solid ${glassBorder};
  background: ${glassSurface};
  border-radius: 12px;
  padding: 0.9rem;
`;

export const LoadingPanel = styled(Panel)`
  display: grid;
  place-items: center;
  min-height: 260px;
`;

export const PanelTitle = styled.h3`
  margin: 0 0 0.8rem;
  color: ${textPrimary};
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

export const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 70vh;
  overflow: auto;
  padding-right: 0.2rem;
`;

export const Card = styled.div<{ $dragging?: boolean }>`
  border: 1px solid rgba(96, 192, 240, 0.22);
  background: ${({ $dragging }) => ($dragging ? 'rgba(80, 160, 240, 0.22)' : 'rgba(0, 32, 96, 0.42)')};
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  cursor: grab;
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

export const NameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.55rem;
`;

export const Avatar = styled.div<{ $src?: string | null }>`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe
      ? `url(${cssUrlValue(safe)}) center/cover no-repeat`
      : `linear-gradient(135deg, ${accent}, ${gold})`;
  }};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-inverse, #041026);
  font-weight: 700;
  font-size: 0.75rem;
  flex-shrink: 0;
`;

export const Person = styled.div`
  .name {
    color: ${textPrimary};
    font-size: 0.84rem;
    font-weight: 600;
  }

  .meta {
    color: ${textMuted};
    font-size: 0.73rem;
  }
`;

export const TrainerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 0.8rem;

  @media (max-width: 1300px) {
    grid-template-columns: 1fr;
  }
`;

export const Spinner = styled(motion.div)`
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 3px solid rgba(96, 192, 240, 0.2);
  border-top-color: ${accent};
`;

export { Banner } from './ClientTrainerAssignments.styles.tail';
