import styled from 'styled-components';
import ForgeButton from '../ui/forge/ForgeButton'; // Forge strangler (was GlowButton)

// Phase E: Late Cancel Warning Dialog Styles
export const LateCancelWarningPanel = styled.div`
  padding: 1.25rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: 12px;
  margin: 1rem 0;
`;

export const LateCancelWarningHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: #ef4444; /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */
  font-weight: 600;
  font-size: 1.1rem;
`;

export const LateCancelWarningIcon = styled.span`
  font-size: 1.5rem;
`;

export const LateCancelWarningMessage = styled.p`
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.95rem;
  line-height: 1.6;
  margin: 0 0 1rem 0;
`;

export const PositiveLateCancelWarningMessage = styled(LateCancelWarningMessage)`
  color: rgba(16, 185, 129, 0.9);
`;

export const LateCancelFeeBox = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.15);
  border-radius: 8px;
  margin-bottom: 1rem;
`;

export const LateCancelFeeLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.875rem;
`;

export const LateCancelFeeAmount = styled.span`
  color: #ef4444; /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */
  font-weight: 600;
  font-size: 1.1rem;
`;

export const LateCancelSessionInfo = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

export const LateCancelSessionDate = styled.div`
  color: white;
  font-weight: 500;
  font-size: 0.95rem;
`;

export const LateCancelHoursLeft = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin-top: 0.25rem;
`;

export const LateCancelButtonRow = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

export const LateCancelActionButton = styled(ForgeButton)`
  flex: 1;
`;

export const LateCancelContinueButton = styled.button`
  flex: 1;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #ef4444, #dc2626); /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: linear-gradient(135deg, #dc2626, #b91c1c); /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

export const LateCancelBackButton = styled.button`
  flex: 1;
  padding: 0.75rem 1rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

// Early (no penalty) cancel confirmation styling
export const EarlyCancelPanel = styled.div`
  padding: 1.25rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 12px;
  margin: 1rem 0;
`;

export const EarlyCancelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  color: #10b981; /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */
  font-weight: 600;
  font-size: 1.1rem;
`;

export const PackageInfoBanner = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  margin-bottom: 1rem;
`;

export const PackageSection = styled.div`
  margin-top: 20px;
  padding: 16px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
`;

export const PackageSectionTitle = styled.h4`
  color: #8B5CF6; /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */
  font-size: 0.875rem;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const PackageDetail = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

export const PackageLabel = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.875rem;
`;

export const PackageValue = styled.span<{ $tone?: 'success' | 'gold' }>`
  color: ${({ $tone }) => {
    switch ($tone) {
      case 'success':
        return '#00FF88'; /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */
      case 'gold':
        return '#FFD700'; /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */
      default:
        return 'white';
    }
  }};
  font-size: 0.875rem;
  font-weight: 500;
`;

export const SessionsProgress = styled.div`
  margin-top: 12px;
`;

export const ProgressBar = styled.div`
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 6px;
`;

export const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: linear-gradient(90deg, #8B5CF6, #8B5CF6); /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (ticket SWA-206; expires 2026-11-23) */
  border-radius: 4px;
  transition: width 0.3s ease;
`;
