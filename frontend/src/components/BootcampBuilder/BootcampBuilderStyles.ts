/**
 * ============================================================================
 * FILE: BootcampBuilderStyles.ts
 * PURPOSE: Styled components for the Bootcamp Builder UI
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-04-01
 * ============================================================================
 */
import styled, { css } from 'styled-components';

export const PageWrapper = styled.div<{ $floorMode?: boolean }>`
  min-height: 100vh;
  padding: 20px;
  ${({ $floorMode }) => $floorMode
    ? css`background: #000; color: #F8F9FA;`
    : css`background: var(--bg-base, #0A0A0F); color: var(--text-primary, #e0ecf4);`
  }

  @media (max-width: 430px) {
    padding: 12px;
  }

  @media (max-width: 375px) {
    padding: 8px;
  }
`;

export const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: 430px) {
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 12px;
    gap: 8px;
  }
`;

export const Title = styled.h1`
  font-size: 22px;
  font-weight: 700;
  margin: 0;

  @media (max-width: 430px) {
    font-size: 18px;
  }
`;

export const Subtitle = styled.p`
  font-size: 14px;
  opacity: 0.7;
  margin: 4px 0 0 0;
`;

export const FloorModeToggle = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 8px 20px;
  border-radius: 8px;
  border: 2px solid ${({ $active }) => $active ? '#FF6B35' : 'rgba(96,192,240,0.3)'};
  background: ${({ $active }) => $active ? 'rgba(255,107,53,0.2)' : 'transparent'};
  color: ${({ $active }) => $active ? '#FF6B35' : 'var(--accent-primary, #60c0f0)'};
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
`;

export const ThreePane = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 320px;
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  @media (max-width: 430px) {
    gap: 8px;
  }
`;

export const Panel = styled.div`
  background: var(--bg-elevated, rgba(20, 20, 25, 0.6));
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
  border-radius: 12px;
  padding: 16px;

  @media (max-width: 430px) {
    padding: 12px;
    border-radius: 8px;
  }
`;

export const PanelTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: var(--accent-primary, #60c0f0);
`;

export const FormGroup = styled.div`
  margin-bottom: 12px;
`;

export const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 4px;
  opacity: 0.7;
`;

export const Select = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 6px;
  color: var(--text-primary, #e0ecf4);
  font-size: 14px;
  &:focus { border-color: var(--accent-primary, #60c0f0); outline: none; }

  @media (max-width: 430px) {
    font-size: 16px;
    padding: 10px 14px;
  }
`;

export const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 6px;
  color: var(--text-primary, #e0ecf4);
  font-size: 14px;
  &:focus { border-color: var(--accent-primary, #60c0f0); outline: none; }

  @media (max-width: 430px) {
    font-size: 16px;
    padding: 10px 14px;
  }
`;

export const PrimaryButton = styled.button<{ $floorMode?: boolean }>`
  width: 100%;
  min-height: ${({ $floorMode }) => $floorMode ? '64px' : '44px'};
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--accent-primary, #60c0f0) 0%, var(--accent-secondary, #8B5CF6) 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  font-size: ${({ $floorMode }) => $floorMode ? '18px' : '14px'};
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const ErrorBanner = styled.div`
  background: rgba(201, 42, 84, 0.1);
  border: 1px solid rgba(201, 42, 84, 0.3);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary, #E0ECF4);
  font-size: 13px;
  border-left: 4px solid #C92A54;
`;

export const SectionDivider = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary, #60c0f0);
  margin: 16px 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.15));
`;

export const StationCard = styled.div`
  background: var(--bg-surface, rgba(20, 20, 25, 0.7));
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.2));
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
`;

export const StationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

export const StationName = styled.span`
  font-weight: 600;
  font-size: 14px;
`;

export const ExerciseRow = styled.button<{ $isCardio?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 4px;
  font-size: 13px;
  min-height: 44px;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  border-left: 3px solid transparent;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  ${({ $isCardio }) => $isCardio && css`
    color: #00FF88;
    font-style: italic;
  `}

  &:hover {
    background: rgba(255, 255, 255, 0.03);
    border-left-color: rgba(96, 192, 240, 0.3);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: -2px;
    border-radius: 4px;
  }

  @media (max-width: 430px) {
    padding: 10px 4px;
    font-size: 14px;
  }
`;

export const DifficultyChip = styled.span<{ $tier: string }>`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  ${({ $tier }) => {
    switch ($tier) {
      case 'easy': return css`background: rgba(0,255,136,0.1); color: #00FF88;`;
      case 'hard': return css`background: rgba(201,42,84,0.1); color: #C92A54;`;
      default: return css`background: rgba(96,192,240,0.1); color: var(--accent-primary, #60c0f0);`;
    }
  }}
`;

export const TimingBadge = styled.span`
  background: rgba(96, 192, 240, 0.1);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--accent-primary, #60c0f0);
`;

export const InsightCard = styled.div<{ $type?: string }>`
  background: ${({ $type }) => {
    switch ($type) {
      case 'overflow': return 'rgba(255, 184, 0, 0.08)';
      case 'freshness': return 'rgba(0, 255, 136, 0.06)';
      default: return 'rgba(96, 192, 240, 0.06)';
    }
  }};
  border: 1px solid ${({ $type }) => {
    switch ($type) {
      case 'overflow': return 'rgba(255, 184, 0, 0.2)';
      case 'freshness': return 'rgba(0, 255, 136, 0.2)';
      default: return 'rgba(96, 192, 240, 0.15)';
    }
  }};
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  font-size: 13px;
`;

export const ModGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 4px;
  margin-top: 4px;
`;

export const ModChip = styled.span`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;
