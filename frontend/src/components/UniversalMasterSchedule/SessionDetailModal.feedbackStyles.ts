import styled from 'styled-components';
import GlowButton from '../ui/buttons/GlowButton';
import { SmallText } from './ui';

// Client Feedback Styled Components
export const ClientFeedbackPanel = styled.div`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.08) 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 1.25rem;
  margin: 1rem 0;
`;

export const FeedbackHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #3b82f6;
  }
`;

export const FeedbackSubmittedBadge = styled.span`
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #10b981;
  font-size: 0.75rem;
  font-weight: 500;
`;

export const FeedbackIntro = styled(SmallText)`
  margin-bottom: 1rem;
`;

export const StarRatingContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

export const StarButton = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  padding: 0.25rem;
  transition: transform 0.15s ease, color 0.15s ease;
  color: ${props => props.$active ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)'};

  &:hover {
    transform: scale(1.2);
    color: #fbbf24;
  }

  &:focus {
    outline: none;
  }
`;

export const RatingValue = styled.span`
  margin-left: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
`;

export const FeedbackSubmitButton = styled(GlowButton)`
  margin-top: 1rem;
`;

export const FeedbackThankYou = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  text-align: center;
`;

export const CelebrationIcon = styled.span`
  font-size: 2rem;
`;

// Phase D: Attendance Styled Components
export const AttendanceButton = styled.button<{ $variant: 'present' | 'late' | 'noshow' }>`
  padding: 0.625rem 1.25rem;
  min-height: 44px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid;

  ${props => {
    switch (props.$variant) {
      case 'present':
        return `
          background: rgba(16, 185, 129, 0.15);
          border-color: #10b981;
          color: #10b981;
          &:hover:not(:disabled) {
            background: rgba(16, 185, 129, 0.25);
          }
        `;
      case 'late':
        return `
          background: rgba(245, 158, 11, 0.15);
          border-color: #f59e0b;
          color: #f59e0b;
          &:hover:not(:disabled) {
            background: rgba(245, 158, 11, 0.25);
          }
        `;
      case 'noshow':
        return `
          background: rgba(239, 68, 68, 0.15);
          border-color: #ef4444;
          color: #ef4444;
          &:hover:not(:disabled) {
            background: rgba(239, 68, 68, 0.25);
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const AttendanceBadge = styled.span<{ $status: 'present' | 'no_show' | 'late' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;

  ${props => {
    switch (props.$status) {
      case 'present':
        return `
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.4);
          color: #10b981;
        `;
      case 'late':
        return `
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.4);
          color: #f59e0b;
        `;
      case 'no_show':
        return `
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
        `;
    }
  }}
`;

export const NoShowReasonBox = styled.div`
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;

  textarea {
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }
`;

export const NoShowCreditOption = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-height: 44px;
  padding: 0.75rem;
  border-radius: 8px;
  margin-top: 0.75rem;
  background: color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 32%, transparent);
  cursor: pointer;

  input {
    flex: 0 0 auto;
    width: 18px;
    height: 18px;
    margin-top: 0.15rem;
    accent-color: var(--accent-primary, #60C0F0);
  }

  span {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
`;

export const NoShowReasonDisplay = styled.div`
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
`;

export const PaymentNeededBanner = styled.div`
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.35);

  @media (max-width: 430px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const PaymentNeededText = styled.span`
  color: #ef4444;
  font-size: 0.875rem;
  font-weight: 600;
`;

export const SessionsRemainingBadge = styled.span<{ $low?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 1.1rem;
  font-weight: 700;
  background: ${({ $low }) => $low
    ? 'rgba(239, 68, 68, 0.15)'
    : 'rgba(0, 255, 136, 0.15)'};
  color: ${({ $low }) => $low ? '#ef4444' : '#00FF88'};
  border: 1px solid ${({ $low }) => $low
    ? 'rgba(239, 68, 68, 0.3)'
    : 'rgba(0, 255, 136, 0.3)'};
`;
