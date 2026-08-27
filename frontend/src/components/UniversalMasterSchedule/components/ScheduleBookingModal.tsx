import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ShoppingCart } from 'lucide-react';
import {
  BodyText,
  ErrorText,
  FlexBox,
  HelperText,
  Modal,
  OutlinedButton,
  PrimaryHeading,
  SmallText,
} from '../ui';
import ForgeButton from '../../ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import { SCHEDULE_MODALS_THEME } from './ScheduleModals.theme';
import {
  BookingCard,
  BookingRow,
  CreditCard,
  LockDescription,
  LockIconWrapper,
  LockTitle,
  PremiumLockOverlay,
  PurchaseButton,
} from './ScheduleModals.styles';
import type { ScheduleMode } from './ScheduleModals.types';
import { StyledBox } from '@/components/ui/StyledBox';

interface ScheduleBookingModalProps {
  mode: ScheduleMode;
  showBookingDialog: boolean;
  setShowBookingDialog: (show: boolean) => void;
  bookingTarget: any;
  bookingLoading: boolean;
  bookingError: string | null;
  creditsDisplay: string | number;
  normalizedSessionsRemaining?: number;
  isFreeTrackingBooking: boolean;
  isBookingLocked: boolean;
  handleBookSession: () => Promise<void>;
}

const ScheduleBookingModal: React.FC<ScheduleBookingModalProps> = ({
  mode,
  showBookingDialog,
  setShowBookingDialog,
  bookingTarget,
  bookingLoading,
  bookingError,
  creditsDisplay,
  normalizedSessionsRemaining,
  isFreeTrackingBooking,
  isBookingLocked,
  handleBookSession,
}) => {
  const navigate = useNavigate();

  if (!showBookingDialog || !bookingTarget) return null;

  return (
    <Modal
      isOpen={showBookingDialog}
      onClose={() => setShowBookingDialog(false)}
      title={isBookingLocked ? (isFreeTrackingBooking ? 'Session Tracking Only' : 'Session Locked') : 'Confirm Booking'}
      size="sm"
      footer={isBookingLocked ? (
        <OutlinedButton onClick={() => setShowBookingDialog(false)}>
          Close
        </OutlinedButton>
      ) : (
        <>
          <OutlinedButton onClick={() => setShowBookingDialog(false)} disabled={bookingLoading}>
            Cancel
          </OutlinedButton>
          <ForgeButton
            variant="emerald"
            size="medium"
            onClick={handleBookSession}
            disabled={bookingLoading}
            isLoading={bookingLoading}
          >
            {bookingLoading ? 'Booking...' : 'Confirm Booking'}
          </ForgeButton>
        </>
      )}
    >
      <FlexBox direction="column" gap="1rem">
        {isBookingLocked ? (
          <PremiumLockOverlay>
            <LockIconWrapper>
              <Lock size={28} color={SCHEDULE_MODALS_THEME.accentSecondary} />
            </LockIconWrapper>
            <LockTitle>{isFreeTrackingBooking ? 'Session Tracking Only' : 'Unlock Sessions'}</LockTitle>
            <LockDescription>
              {isFreeTrackingBooking
                ? 'This account is tracked through Workout Logger. SwanStudios booking credits do not apply.'
                : 'You have no paid session credits remaining. Purchase a package to book this session.'}
            </LockDescription>
            <BookingCard>
              <BookingRow>
                <SmallText secondary>Date</SmallText>
                <BodyText>{new Date(bookingTarget.sessionDate).toLocaleDateString()}</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Time</SmallText>
                <BodyText>{new Date(bookingTarget.sessionDate).toLocaleTimeString()}</BodyText>
              </BookingRow>
            </BookingCard>
            {!isFreeTrackingBooking && (
              <PurchaseButton onClick={() => { setShowBookingDialog(false); navigate('/shop'); }}>
                <ShoppingCart size={18} />
                Secure Your Session
              </PurchaseButton>
            )}
          </PremiumLockOverlay>
        ) : (
          <>
            <BodyText>
              {mode === 'client'
                ? 'You are booking the session below. One paid credit will be deducted on confirmation.'
                : 'Confirm this schedule booking.'}
            </BodyText>
            <BookingCard>
              <BookingRow>
                <SmallText secondary>Date</SmallText>
                <BodyText>{new Date(bookingTarget.sessionDate).toLocaleDateString()}</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Time</SmallText>
                <BodyText>{new Date(bookingTarget.sessionDate).toLocaleTimeString()}</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Duration</SmallText>
                <BodyText>{bookingTarget.duration} min</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Location</SmallText>
                <BodyText>{bookingTarget.location || 'Main Studio'}</BodyText>
              </BookingRow>
            </BookingCard>
            <CreditCard>
              <SmallText secondary>Credits Remaining</SmallText>
              <StyledBox as={PrimaryHeading} $style={{ fontSize: '1.75rem' }}>
                {creditsDisplay}
              </StyledBox>
              {normalizedSessionsRemaining != null && (
                <HelperText>
                  After booking: {Math.max(0, normalizedSessionsRemaining - 1)}
                </HelperText>
              )}
            </CreditCard>
          </>
        )}
        {bookingError && <ErrorText>{bookingError}</ErrorText>}
      </FlexBox>
    </Modal>
  );
};

export default ScheduleBookingModal;
