import styled, { keyframes } from 'styled-components';
import { Loader, Search } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';
import { DESKTOP_BREAKPOINT_MQ, MAX_ROWS_DESKTOP, MAX_ROWS_MOBILE, ROW_HEIGHT } from './NASMExerciseRolodex.helpers';

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const Wrapper = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 100;
  background: ${withAlpha(CS.cardDark, 0.96)};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${withAlpha(CS.glow, 0.15)};
  border-radius: 1rem;
  padding: 12px;
  max-height: min(760px, calc(100dvh - 168px));
  overflow-y: auto; overscroll-behavior: contain;
  scrollbar-gutter: stable; scroll-behavior: smooth;
  box-shadow: 0 16px 48px ${withAlpha(CS.bgDeep, 0.5)}, 0 0 40px ${withAlpha(CS.glow, 0.06)};
  animation: ${slideDown} 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  @media (prefers-reduced-motion: reduce) { animation: none; }
  @media (prefers-reduced-motion: reduce) { scroll-behavior: auto; }
  @media (max-width: 600px) { max-height: min(82dvh, calc(100dvh - 96px)); }
`;

export const SearchRow = styled.div`
  position: relative; display: flex; align-items: center; margin-bottom: 4px;
`;

export const SearchIconStyled = styled(Search)`
  position: absolute;
  left: 12px;
  color: ${CS.gaming};
  pointer-events: none;
  z-index: 1;
`;

export const SpinnerIcon = styled(Loader)`
  position: absolute;
  right: 12px;
  color: ${CS.gaming};
  animation: ${spin} 0.8s linear infinite;
  @media (prefers-reduced-motion: reduce) { animation-duration: 1.5s; }
`;

export const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 40px 10px 38px;
  border-radius: 0.75rem;
  border: 1.5px solid ${CS.glassBorder};
  background: ${CS.inputBg};
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  &:focus {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px ${withAlpha(CS.glow, 0.15)};
  }
  &::placeholder { color: ${withAlpha(CS.text, 0.4)}; }
`;

export const FilterToggle = styled.button`
  display: block;
  min-height: 44px;
  padding: 8px 10px;
  margin-bottom: 4px;
  border: none;
  background: transparent;
  color: ${CS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { color: ${CS.text}; }
  &:focus-visible { outline: 2px solid ${CS.glow}; outline-offset: 2px; border-radius: 0.5rem; }
`;

export const FilterRows = styled.div`padding: 0 0 6px;`;

export const FilterLabel = styled.div`
  font-size: 0.65rem; font-weight: 700;
  color: ${CS.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px; margin: 2px 0 2px 2px;
`;

export const MiniChipRow = styled.div`
  display: flex;
  gap: 4px; flex-wrap: wrap; margin-bottom: 4px;
`;

export const MiniChip = styled.button<{ $active: boolean }>`
  min-width: 44px;
  min-height: 44px;
  padding: 7px 10px;
  border-radius: 1rem;
  border: 1px solid ${({ $active }) => $active ? CS.secondary : 'transparent'};
  background: ${({ $active }) => $active ? withAlpha(CS.secondary, 0.2) : withAlpha(CS.glow, 0.06)};
  color: ${({ $active }) => $active ? CS.text : CS.textSecondary};
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.15;
  cursor: pointer;
  &:hover { color: ${CS.text}; background: ${withAlpha(CS.glow, 0.12)}; }
  &:focus-visible { outline: 2px solid ${CS.glow}; outline-offset: 2px; }
`;

export const SplitView = styled.div<{ $hasPreview: boolean }>`
  display: ${({ $hasPreview }) => $hasPreview ? 'grid' : 'block'};
  grid-template-columns: ${({ $hasPreview }) => $hasPreview ? '1fr 1fr' : '1fr'};
  gap: 8px;
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const ListSide = styled.div``;

export const PreviewSide = styled.div`
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${withAlpha(CS.glow, 0.12)};
  background: ${withAlpha(CS.glow, 0.04)};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  line-height: 1.5;
  color: ${CS.textSecondary};
  max-height: ${MAX_ROWS_MOBILE * ROW_HEIGHT}px;
  overflow: visible;
  @media (max-width: 600px) { order: -1; max-height: none; }
  @media ${DESKTOP_BREAKPOINT_MQ} { max-height: ${MAX_ROWS_DESKTOP * ROW_HEIGHT}px; }
  @media (min-width: 2560px) { font-size: 0.92rem; }
  @media (min-width: 3840px) { font-size: 1rem; }
`;

export const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${CS.glow};
  margin-bottom: 6px;
`;

export const PreviewTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 700;
  color: ${CS.text};
  margin-bottom: 8px;
`;

export const PreviewRow = styled.div`
  margin-bottom: 5px;
`;

export const PreviewLabel = styled.span`
  font-weight: 700;
  color: ${CS.glow};
  font-size: 0.72rem;
  margin-right: 4px;
`;

export const AddButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid ${CS.secondary};
  background: ${withAlpha(CS.secondary, 0.15)};
  color: ${CS.text};
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${CS.secondary};
    color: ${CS.text};
  }
  &:focus-visible { outline: 2px solid ${CS.glow}; outline-offset: 2px; }
`;

export const ListContainer = styled.div`
  border-radius: 0.5rem;
  overflow: hidden;
  & > div {
    scrollbar-gutter: stable; overscroll-behavior: contain; scroll-behavior: smooth;
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
      background: ${withAlpha(CS.glow, 0.25)};
      border-radius: 3px;
    }
  }
`;

export const ExerciseRow = styled.div<{ $highlighted: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 14px;
  cursor: pointer;
  transition: background 0.12s;
  background: ${({ $highlighted }) => $highlighted ? withAlpha(CS.glow, 0.12) : 'transparent'};
  border-left: 3px solid ${({ $highlighted }) => $highlighted ? CS.glow : 'transparent'};
  &:hover {
    background: ${withAlpha(CS.glow, 0.08)};
    border-left-color: ${withAlpha(CS.glow, 0.4)};
  }
`;

export const ExName = styled.span`
  color: ${CS.text};
  font-size: 0.88rem;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  @media (min-width: 2560px) { font-size: 0.98rem; }
  @media (min-width: 3840px) { font-size: 1.05rem; }
`;

export const ExMeta = styled.span`
  color: ${CS.textSecondary};
  font-size: 0.8rem;
  font-family: 'Sora', sans-serif;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  @media (min-width: 2560px) { font-size: 0.88rem; }
  @media (min-width: 3840px) { font-size: 0.95rem; }
`;

export const TypeBadge = styled.span`
  display: inline-block;
  padding: 1px 7px;
  border-radius: 1rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${withAlpha(CS.glow, 0.12)};
  color: ${CS.glowLight};
  border: 1px solid ${withAlpha(CS.glow, 0.2)};
  flex-shrink: 0;
`;

export const EmptyState = styled.div`
  padding: 32px 16px;
  text-align: center;
  color: ${CS.textMuted};
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
`;

export const StatusBar = styled.div`
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid ${withAlpha(CS.glow, 0.08)};
  font-size: 0.68rem;
  color: ${CS.textMuted};
  font-family: 'Sora', sans-serif;
  text-align: center;
`;
