import styled from 'styled-components';
import { Loader2 } from 'lucide-react';

export const PanelContainer = styled.div<{ $isOpen: boolean }>`
  width: ${({ $isOpen }) => ($isOpen ? '320px' : '0')};
  min-width: ${({ $isOpen }) => ($isOpen ? '320px' : '0')};
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-elevated, #0D0D15);
  border-left: ${({ $isOpen }) => ($isOpen ? '1px solid var(--border-soft, rgba(96, 192, 240, 0.08))' : 'none')};
  overflow: hidden;
  transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1),
              min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  flex-shrink: 0;

  @media (max-width: 1023px) {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: ${({ $isOpen }) => ($isOpen ? 'min(85vw, 360px)' : '0')};
    min-width: 0;
    z-index: 50;
    box-shadow: ${({ $isOpen }) => ($isOpen ? '-4px 0 24px var(--shadow-strong, rgba(0, 0, 0, 0.5))' : 'none')};
  }
`;

export const PanelOverlay = styled.button<{ $visible: boolean }>`
  border: 0;
  display: none;
  padding: 0;

  @media (max-width: 1023px) {
    display: block;
    position: fixed;
    inset: 0;
    background: var(--overlay-scrim, rgba(0, 0, 0, 0.5));
    z-index: 49;
    opacity: ${({ $visible }) => ($visible ? 1 : 0)};
    pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
    transition: opacity 0.2s ease;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  flex-shrink: 0;
`;

export const PanelTitle = styled.div`
  flex: 1;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-heading, #E0ECF4);
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CloseBtn = styled.button`
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover { color: var(--text-primary, #E0ECF4); }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const SearchWrap = styled.div`
  padding: 8px 14px;
  position: relative;
  flex-shrink: 0;
`;

export const SearchInput = styled.input`
  width: 100%;
  padding: 8px 12px 8px 34px;
  border-radius: 8px;
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  min-height: 44px;
  outline: none;
  transition: border-color 0.2s ease;

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.4));
  }

  &:focus {
    border-color: var(--accent-primary, #60C0F0);
  }
`;

export const SearchIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 24px;
  transform: translateY(-50%);
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  pointer-events: none;
`;

export const ResultsDropdown = styled.div`
  position: absolute;
  top: calc(100% - 4px);
  left: 14px;
  right: 14px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  max-height: 260px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 8px 24px var(--shadow-strong, rgba(0, 0, 0, 0.4));
`;

export const ResultItem = styled.button`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  min-height: 44px;
  transition: background 0.15s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  }

  & + & {
    border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  }
`;

export const ResultMeta = styled.span`
  font-size: 0.68rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
`;

export const PanelBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  min-height: 0;
`;

export const ExerciseName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 12px;
`;

export const SkeletonSpacer = styled.div`
  height: 16px;
`;

export const DropdownStatus = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  padding: 16px;
  text-align: center;
`;

export const LoadingIcon = styled(Loader2)`
  animation: spin 1s linear infinite;
`;

export const TabLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
`;

export const TeachErrorBox = styled.div`
  background: color-mix(in srgb, var(--danger-text, #C92A54) 6%, transparent);
  border-left: 3px solid var(--danger-text, #C92A54);
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 16px;
`;

export const TeachErrorText = styled.p`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  margin: 0 0 8px;
`;

export const RetryButton = styled.button`
  background: transparent;
  border: 1px solid var(--accent-primary, #60C0F0);
  border-radius: 6px;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  min-height: 44px;
  padding: 6px 14px;
`;
