import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

export const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 860px;
  margin: 0 auto;

  @media (min-width: 1440px) {
    max-width: 920px;
  }

  @media (min-width: 1920px) {
    max-width: 1040px;
  }

  @media (min-width: 2560px) {
    max-width: 1120px;
  }

  @media (min-width: 3840px) {
    max-width: 1280px;
  }
`;

export const FeedTopBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
`;

export const InfiniteScrollSentinel = styled.div`
  display: flex;
  justify-content: center;
  padding: 16px;
  min-height: 48px;
`;

export const EmptyFeedMessage = styled.div`
  padding: 24px;
  text-align: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-elevated, #003080) 86%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--bg-base, #030712) 38%, transparent);

  @supports (backdrop-filter: blur(12px)) {
    backdrop-filter: blur(12px);
    box-shadow: none;
  }
`;

export const WelcomeCard = styled.div`
  padding: 32px 24px;
  text-align: center;
  border-radius: 8px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent),
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  backdrop-filter: blur(12px);
`;

export const WelcomeTip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 16px;
  min-height: 34px;
  padding: 8px 14px;
  color: var(--accent-data, #50A0F0);
  background: color-mix(in srgb, var(--primary, #002060) 60%, transparent);
  border-radius: 8px;
  font-size: 0.75rem;
`;

export const GamificationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 24px;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(135deg, var(--primary, #002060), var(--accent-secondary, #8B5CF6));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  border-radius: 8px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);

  @media (max-width: 560px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const PointsDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--text-primary, #E0ECF4) 18%, transparent);
  backdrop-filter: blur(10px);
`;

export const StreakDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.9rem;
`;

export const ActivityIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border-left: 4px solid var(--accent-primary, #60C0F0);
  border-radius: 8px;
`;

export const FeedStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

export const StatCard = styled.div`
  padding: 16px;
  text-align: center;
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-elevated, #003080) 86%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--bg-base, #030712) 34%, transparent);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  @supports (backdrop-filter: blur(12px)) {
    backdrop-filter: blur(12px);
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export const LiveActivityBadgeWrapper = styled.span`
  position: relative;
  display: inline-flex;
`;

export const LiveBadgeLabel = styled.span`
  position: absolute;
  top: -8px;
  right: -12px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  color: var(--bg-base, #030712);
  background: var(--accent-primary, #60C0F0);
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
  animation: ${pulse} 2s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Heading6 = styled.h6<{ $color?: string; $fontWeight?: string | number; $mb?: number; $gutterBottom?: boolean }>`
  margin: 0;
  margin-bottom: ${({ $mb, $gutterBottom }) => {
    if ($mb !== undefined) return `${$mb * 8}px`;
    if ($gutterBottom) return '0.35em';
    return '0';
  }};
  color: ${({ $color }) => $color || 'inherit'};
  font-size: 1.25rem;
  font-weight: ${({ $fontWeight }) => $fontWeight || 500};
  line-height: 1.6;
  letter-spacing: 0;
`;

export const BodyText2 = styled.p<{ $color?: string; $fontWeight?: string | number; $opacity?: number; $paragraph?: boolean }>`
  margin: 0;
  margin-bottom: ${({ $paragraph }) => ($paragraph ? '16px' : '0')};
  color: ${({ $color }) => $color || 'inherit'};
  font-size: 0.875rem;
  font-weight: ${({ $fontWeight }) => $fontWeight || 400};
  line-height: 1.43;
  letter-spacing: 0;
  opacity: ${({ $opacity }) => $opacity ?? 1};
`;

export const CaptionText = styled.span<{ $color?: string }>`
  color: ${({ $color }) => $color || 'inherit'};
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.66;
  letter-spacing: 0;
`;

export const ContainedButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 8px 22px;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(135deg, var(--primary, #002060), var(--accent-secondary, #8B5CF6));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  border-radius: 8px;
  box-shadow: 0 3px 8px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.75;
  gap: 8px;
  letter-spacing: 0;
  text-transform: uppercase;
  transition: opacity 0.2s ease, box-shadow 0.2s ease;

  &:hover,
  &:focus-visible {
    opacity: 0.92;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
  }
`;

export const OutlinedButton = styled(ContainedButton)`
  color: var(--accent-secondary, #8B5CF6);
  background: transparent;
  border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
  box-shadow: none;

  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, transparent);
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: none;
  }
`;

export const Spinner = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  border: 3px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  border-top-color: var(--accent-secondary, #8B5CF6);
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const CenterBox = styled.div`
  display: flex;
  justify-content: center;
  margin: 32px 0;
`;
export const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
`;
