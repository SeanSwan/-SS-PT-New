import styled from 'styled-components';
import ForgeButton from '../ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import { SmallText } from './ui';

// Client Feedback Styled Components
export const ClientFeedbackPanel = styled.div`
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent) 0%,
    color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent) 100%
  );
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
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
    color: var(--accent-primary, #60C0F0);
  }
`;

export const FeedbackSubmittedBadge = styled.span`
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--success, #10b981) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--success, #10b981) 40%, transparent);
  color: var(--success, #10b981);
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
  color: ${props => props.$active
    ? 'var(--warning, #fbbf24)'
    : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 22%, transparent)'};

  &:hover {
    transform: scale(1.2);
    color: var(--warning, #fbbf24);
  }

  &:focus {
    outline: none;
  }
`;

export const RatingValue = styled.span`
  margin-left: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.7));
`;

export const FeedbackSubmitButton = styled(ForgeButton)`
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
          background: color-mix(in srgb, var(--success, #10b981) 15%, transparent);
          border-color: var(--success, #10b981);
          color: var(--success, #10b981);
          &:hover:not(:disabled) {
            background: color-mix(in srgb, var(--success, #10b981) 25%, transparent);
          }
        `;
      case 'late':
        return `
          background: color-mix(in srgb, var(--warning, #f59e0b) 15%, transparent);
          border-color: var(--warning, #f59e0b);
          color: var(--warning, #f59e0b);
          &:hover:not(:disabled) {
            background: color-mix(in srgb, var(--warning, #f59e0b) 25%, transparent);
          }
        `;
      case 'noshow':
        return `
          background: color-mix(in srgb, var(--danger, #ef4444) 15%, transparent);
          border-color: var(--danger, #ef4444);
          color: var(--danger, #ef4444);
          &:hover:not(:disabled) {
            background: color-mix(in srgb, var(--danger, #ef4444) 25%, transparent);
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
          background: color-mix(in srgb, var(--success, #10b981) 15%, transparent);
          border: 1px solid color-mix(in srgb, var(--success, #10b981) 40%, transparent);
          color: var(--success, #10b981);
        `;
      case 'late':
        return `
          background: color-mix(in srgb, var(--warning, #f59e0b) 15%, transparent);
          border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 40%, transparent);
          color: var(--warning, #f59e0b);
        `;
      case 'no_show':
        return `
          background: color-mix(in srgb, var(--danger, #ef4444) 15%, transparent);
          border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 40%, transparent);
          color: var(--danger, #ef4444);
        `;
    }
  }}
`;

export const NoShowReasonBox = styled.div`
  background: color-mix(in srgb, var(--danger, #ef4444) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 30%, transparent);
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
  background: color-mix(in srgb, var(--danger, #ef4444) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 20%, transparent);
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
  background: color-mix(in srgb, var(--danger, #ef4444) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 35%, transparent);

  @media (max-width: 430px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

export const PaymentNeededText = styled.span`
  color: var(--danger, #ef4444);
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
    ? 'color-mix(in srgb, var(--danger, #ef4444) 15%, transparent)'
    : 'color-mix(in srgb, var(--success, #10b981) 15%, transparent)'};
  color: ${({ $low }) => $low ? 'var(--danger, #ef4444)' : 'var(--success, #10b981)'};
  border: 1px solid ${({ $low }) => $low
    ? 'color-mix(in srgb, var(--danger, #ef4444) 30%, transparent)'
    : 'color-mix(in srgb, var(--success, #10b981) 30%, transparent)'};
`;
