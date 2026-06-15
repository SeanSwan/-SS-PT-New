import { motion } from 'framer-motion';
import styled, { css } from 'styled-components';
import { CS, withAlpha } from '../WorkoutLogger/WorkoutLoggerCS';
type Severity = 'danger' | 'warn' | 'info';
const severityColor = (severity?: Severity) => {
  if (severity === 'danger') return CS.error;
  if (severity === 'warn') return CS.warning;
  return CS.gaming;
};
const insightColor = (type?: string) => {
  if (type === 'pain_exclusion') return CS.error;
  if (type === 'pain_warning') return CS.warning;
  if (type === 'compensation_awareness') return CS.secondary;
  return CS.gaming;
};
export const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, ${CS.bgDeep} 0%, ${CS.bg} 100%);
  color: ${CS.text};
  padding: 20px;
`;
export const TopBar = styled.div`
  max-width: 1400px;
  margin: 0 auto 20px;
`;
export const Title = styled.h1`
  font-size: 22px;
  font-weight: 800;
  margin: 0;
`;
export const Subtitle = styled.p`
  font-size: 13px;
  color: ${withAlpha(CS.text, 0.7)};
  margin: 4px 0 0;
`;
export const ThreePane = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 16px;
  min-height: calc(100vh - 120px);
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;
export const Panel = styled.div`
  background: ${withAlpha(CS.tertiary, 0.28)};
  backdrop-filter: blur(16px);
  border: 1px solid ${withAlpha(CS.gaming, 0.12)};
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 120px);
  @media (max-width: 1024px) {
    max-height: none;
  }
`;
export const PanelTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${CS.gaming};
  margin: 0 0 12px;
`;
export const Label = styled.span`
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: ${withAlpha(CS.text, 0.8)};
  margin-bottom: 4px;
`;
export const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  background: ${withAlpha(CS.bgDeep, 0.5)};
  border: 1px solid ${withAlpha(CS.gaming, 0.2)};
  border-radius: 8px;
  color: ${CS.text};
  font-size: 14px;
  min-height: 44px;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${CS.gaming}; }
  &::placeholder { color: ${withAlpha(CS.text, 0.4)}; }
`;
export const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  background: ${withAlpha(CS.bgDeep, 0.5)};
  border: 1px solid ${withAlpha(CS.gaming, 0.2)};
  border-radius: 8px;
  color: ${CS.text};
  font-size: 14px;
  min-height: 44px;
  &:focus { outline: none; border-color: ${CS.gaming}; }
`;
export const FormGroup = styled.div`
  margin-bottom: 12px;
`;
export const PrimaryButton = styled.button<{ $auto?: boolean; $variant?: 'primary' | 'secondary' }>`
  width: ${({ $auto }) => $auto ? 'auto' : '100%'};
  padding: 10px;
  background: ${({ $variant }) => $variant === 'secondary' ? withAlpha(CS.bgDeep, 0.42) : `linear-gradient(135deg, ${CS.gaming} 0%, ${CS.secondary} 100%)`};
  border: 1px solid ${({ $variant }) => $variant === 'secondary' ? withAlpha(CS.gaming, 0.35) : 'transparent'};
  border-radius: 8px;
  color: ${CS.text};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
export const ContextCard = styled.div<{ $severity?: Severity }>`
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: ${({ $severity }) => withAlpha(severityColor($severity), $severity === 'info' ? 0.06 : 0.1)};
  border: 1px solid ${({ $severity }) => withAlpha(severityColor($severity), $severity === 'info' ? 0.1 : 0.2)};
`;
export const ContextLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${withAlpha(CS.text, 0.6)};
  margin-bottom: 4px;
`;
export const ContextValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${CS.text};
`;
export const ContextMeta = styled.div<{ $center?: boolean; $pad?: number; $top?: number; $warning?: boolean }>`
  font-size: 11px;
  color: ${({ $warning }) => $warning ? CS.warningText : withAlpha(CS.text, 0.5)};
  margin-top: ${({ $top }) => $top ? `${$top}px` : '2px'};
  padding: ${({ $pad }) => $pad ? `${$pad}px` : 0};
  text-align: ${({ $center }) => $center ? 'center' : 'left'};
`;
export const ExerciseCard = styled(motion.div)<{ $aiOptimized?: boolean }>`
  padding: 14px;
  border-radius: 10px;
  margin-bottom: 10px;
  background: ${withAlpha(CS.bgDeep, 0.4)};
  border: 1px solid ${({ $aiOptimized }) => withAlpha(CS.gaming, $aiOptimized ? 0.3 : 0.1)};
  ${({ $aiOptimized }) => $aiOptimized && css`
    box-shadow: 0 0 12px ${withAlpha(CS.gaming, 0.1)};
  `}
`;
export const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;
export const ExerciseName = styled.div`
  font-size: 14px;
  font-weight: 600;
`;
export const AiBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: ${withAlpha(CS.gaming, 0.15)};
  color: ${CS.gaming};
`;
export const ExerciseParams = styled.div`
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: ${withAlpha(CS.text, 0.7)};
`;
export const InlineReason = styled.span`
  font-size: 11px;
  color: ${withAlpha(CS.text, 0.5)};
`;
export const ParamChip = styled.span`
  background: ${withAlpha(CS.bgDeep, 0.4)};
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
`;
export const MuscleTags = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 6px;
`;
export const MuscleTag = styled.span`
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: ${withAlpha(CS.secondary, 0.15)};
  color: ${withAlpha(CS.text, 0.6)};
`;
export const InsightCard = styled.div<{ $type?: string }>`
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: ${({ $type }) => withAlpha(insightColor($type), $type === 'compensation_awareness' ? 0.1 : 0.08)};
  border-left: 3px solid ${({ $type }) => insightColor($type)};
`;
export const InsightMessage = styled.div`
  font-size: 13px;
  color: ${CS.text};
  margin-bottom: 4px;
`;
export const InsightDetail = styled.div`
  font-size: 11px;
  color: ${withAlpha(CS.text, 0.55)};
`;
export const SectionDivider = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${withAlpha(CS.gaming, 0.5)};
  margin: 16px 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid ${withAlpha(CS.gaming, 0.1)};
`;
export const ErrorBanner = styled.div<{ $top?: number }>`
  padding: 12px;
  border-radius: 8px;
  background: ${withAlpha(CS.error, 0.1)};
  border: 1px solid ${withAlpha(CS.error, 0.25)};
  color: ${CS.errorText};
  font-size: 13px;
  margin-top: ${({ $top }) => $top ? `${$top}px` : 0};
  margin-bottom: 12px;
`;
export const SuccessBanner = styled.div<{ $bottom?: number }>`
  padding: 12px;
  border-radius: 8px;
  background: ${withAlpha(CS.success, 0.08)};
  border: 1px solid ${withAlpha(CS.success, 0.2)};
  color: ${CS.successText};
  font-size: 13px;
  font-weight: 600;
  margin-bottom: ${({ $bottom }) => $bottom ? `${$bottom}px` : 0};
`;
export const CorrectivePanelWrap = styled.div`
  margin-top: 4px;
`;
export const ModeToggleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;
export const ModeToggleButton = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: ${CS.gaming};
  cursor: pointer;
  font: inherit;
  opacity: ${({ $active }) => $active ? 1 : 0.5};
`;
export const ConfigRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;
export const ConfigField = styled(FormGroup)`
  flex: 1;
  min-width: 120px;
`;
export const CompactConfigField = styled(FormGroup)`
  flex: 1;
  min-width: 100px;
`;
export const PhaseName = styled.div`
  font-size: 13px;
  color: ${CS.text};
  margin-bottom: 4px;
`;
export const ErrorBoundaryPanel = styled.div`
  text-align: center;
  padding-top: 80px;
`;
export const ErrorBoundaryTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${withAlpha(CS.text, 0.7)};
  margin-bottom: 8px;
`;
export const ErrorBoundaryCopy = styled.p`
  color: ${withAlpha(CS.text, 0.5)};
  margin-bottom: 16px;
`;
