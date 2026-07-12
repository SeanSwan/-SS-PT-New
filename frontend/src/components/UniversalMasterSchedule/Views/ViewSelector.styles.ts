import styled from 'styled-components';
import { VIEW_SELECTOR_THEME } from './ViewSelector.logic';

export const SelectorContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: ${VIEW_SELECTOR_THEME.surface};
  border: 1px solid ${VIEW_SELECTOR_THEME.border};
  border-radius: 12px;
  position: sticky;
  top: 0;
  z-index: 5;

  @media (max-width: 1024px) {
    padding: 0.875rem 1.25rem;
    gap: 0.75rem;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    padding: 0.75rem 1rem;
    gap: 0.75rem;
  }

  @media (max-width: 480px) {
    padding: 0.625rem 0.75rem;
    border-radius: 10px;
  }

  @media (max-width: 430px) {
    padding: 0.5rem;
    border-radius: 6px;
  }

  @media (max-width: 375px) {
    padding: 0.5rem 0.375rem;
    border-radius: 0;
    border-left: none;
    border-right: none;
  }

  @media (max-width: 320px) {
    padding: 0.375rem 0.25rem;
    border-radius: 0;
    border: none;
  }

  @media (min-width: 2560px) {
    padding: 1.25rem 2rem;
    gap: 1.25rem;
  }

  @media (min-width: 3840px) {
    padding: 1.5rem 2.5rem;
    gap: 1.5rem;
  }
`;

export const Tabs = styled.div`
  display: inline-flex;
  gap: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.375rem;
  }

  @media (max-width: 480px) {
    /* phone: one swipeable snap row — no cramped multi-row wrap */
    display: flex;
    flex-wrap: nowrap;
    gap: 0.375rem;
    justify-content: flex-start;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    overscroll-behavior-x: contain;
    padding-bottom: 2px;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }
`;

export const ViewTab = styled.button<{ $active?: boolean }>`
  cursor: pointer;
  padding: 0.55rem 1.1rem;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ $active }) => ($active ? VIEW_SELECTOR_THEME.base : VIEW_SELECTOR_THEME.textSoft)};
  background: ${({ $active }) => ($active ? VIEW_SELECTOR_THEME.activeGradient : VIEW_SELECTOR_THEME.surface)};
  border: 1px solid ${({ $active }) => ($active ? VIEW_SELECTOR_THEME.primary : VIEW_SELECTOR_THEME.border)};
  box-shadow: ${({ $active }) => ($active ? VIEW_SELECTOR_THEME.activeGlow : 'none')};
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  min-height: 44px;

  &:hover {
    border-color: ${VIEW_SELECTOR_THEME.primary};
    color: ${VIEW_SELECTOR_THEME.text};
    box-shadow: ${VIEW_SELECTOR_THEME.activeGlow};
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }

  &:focus-visible {
    outline: 2px solid ${VIEW_SELECTOR_THEME.primary};
    outline-offset: 2px;
  }

  @media (max-width: 1024px) {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }

  @media (max-width: 480px) {
    padding: 0.45rem 0.85rem;
    font-size: 0.8rem;
    border-radius: 999px;
    flex: 0 0 auto;
    white-space: nowrap;
    scroll-snap-align: start;
  }

  @media (min-width: 2560px) {
    padding: 0.65rem 1.3rem;
    font-size: 1.1rem;
  }

  @media (min-width: 3840px) {
    padding: 0.75rem 1.5rem;
    font-size: 1.25rem;
    min-height: 52px;
  }
`;

export const DateControls = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
  }

  @media (max-width: 480px) {
    gap: 0.375rem;
  }
`;

export const NavButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${VIEW_SELECTOR_THEME.border};
  background: ${VIEW_SELECTOR_THEME.surfaceStrong};
  color: ${VIEW_SELECTOR_THEME.text};
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 150ms ease-out;
  flex-shrink: 0;

  &:hover {
    border-color: ${VIEW_SELECTOR_THEME.primary};
    box-shadow: ${VIEW_SELECTOR_THEME.activeGlow};
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: 2px solid ${VIEW_SELECTOR_THEME.primary};
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    font-size: 1.25rem;
  }

  @media (min-width: 3840px) {
    width: 52px;
    height: 52px;
    font-size: 1.35rem;
  }
`;

export const DateLabel = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: ${VIEW_SELECTOR_THEME.text};
  width: 280px;
  text-align: center;
  flex-shrink: 0;

  @media (max-width: 768px) {
    font-size: 0.95rem;
    width: 260px;
  }

  @media (max-width: 480px) {
    font-size: 0.875rem;
    width: auto;
    flex: 1 1 auto;
    min-width: 0;
  }

  @media (min-width: 2560px) {
    font-size: 1.15rem;
    width: 320px;
  }

  @media (min-width: 3840px) {
    font-size: 1.35rem;
    width: 380px;
  }
`;

export const TodayButton = styled.button`
  border-radius: 999px;
  border: 1px solid ${VIEW_SELECTOR_THEME.primary};
  background: transparent;
  color: ${VIEW_SELECTOR_THEME.primary};
  padding: 0.45rem 0.9rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease-out;
  min-height: 44px;
  flex-shrink: 0;

  &:hover {
    background: ${VIEW_SELECTOR_THEME.hoverSurface};
    box-shadow: ${VIEW_SELECTOR_THEME.activeGlow};
  }

  &:active {
    transform: scale(0.97);
  }

  &:focus-visible {
    outline: 2px solid ${VIEW_SELECTOR_THEME.primary};
    outline-offset: 2px;
  }

  @media (max-width: 768px) {
    min-height: 40px;
  }

  @media (max-width: 480px) {
    min-height: 44px;
    padding: 0.5rem 1rem;
  }

  @media (min-width: 2560px) {
    font-size: 1rem;
    padding: 0.55rem 1.1rem;
  }

  @media (min-width: 3840px) {
    font-size: 1.15rem;
    padding: 0.65rem 1.3rem;
    min-height: 52px;
  }
`;
