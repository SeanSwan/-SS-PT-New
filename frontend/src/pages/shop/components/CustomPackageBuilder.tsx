/**
 * CustomPackageBuilder.tsx - 3-Step Wizard for Custom Packages
 * ==============================================================
 * Interactive modal wizard for building custom personal training packages
 *
 * Features:
 * - 3-step wizard: Sessions → Schedule → Review
 * - Real-time pricing calculation with volume discounts
 * - Mobile-first responsive design with swipe gestures
 * - Galaxy-Swan theme compliance
 * - WCAG 2.1 AAA accessibility
 * - Debounced API calls (300ms) for optimal performance
 *
 * AI Village Implementation:
 * - Gemini: UX/UI design, real-time pricing integration, mobile-first approach
 * - Kilo: Business logic integration (volume discounts, min/max validation)
 * - MinMax: Mobile optimization, swipe gestures, touch targets
 * - Roo: TypeScript safety, performance optimization, state management
 */

import React, { useState, useReducer, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeable } from 'react-swipeable';
import useCustomPackagePricing from '../../../hooks/useCustomPackagePricing';

// ===================== INTERFACES =====================

interface CustomPackageBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (packageData: CustomPackageData) => void;
}

interface CustomPackageData {
  sessions: number;
  pricePerSession: number;
  totalCost: number;
  discountTier: 'bronze' | 'silver' | 'gold';
  volumeDiscount: number;
  schedulePreference: 'flexible' | 'weekly' | 'biweekly';
  notes?: string;
}

interface WizardState {
  currentStep: number;
  sessions: number;
  schedulePreference: 'flexible' | 'weekly' | 'biweekly';
  notes: string;
}

type WizardAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_SESSIONS'; payload: number }
  | { type: 'SET_SCHEDULE'; payload: 'flexible' | 'weekly' | 'biweekly' }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'RESET' };

// ===================== WIZARD STATE REDUCER =====================

const initialWizardState: WizardState = {
  currentStep: 1,
  sessions: 25, // Default: Silver tier
  schedulePreference: 'flexible',
  notes: ''
};

const wizardReducer = (state: WizardState, action: WizardAction): WizardState => {
  switch (action.type) {
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, 3) };
    case 'PREV_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) };
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    case 'SET_SCHEDULE':
      return { ...state, schedulePreference: action.payload };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'RESET':
      return initialWizardState;
    default:
      return state;
  }
};

// ===================== MAIN COMPONENT =====================

export const CustomPackageBuilder: React.FC<CustomPackageBuilderProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const { pricing, loading, error } = useCustomPackagePricing(state.sessions);

  // Swipe gesture handlers for mobile (MinMax's enhancement)
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (state.currentStep < 3) dispatch({ type: 'NEXT_STEP' });
    },
    onSwipedRight: () => {
      if (state.currentStep > 1) dispatch({ type: 'PREV_STEP' });
    },
    trackMouse: true,
    delta: 50 // Minimum swipe distance
  });

  // Handle session slider change
  const handleSessionsChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newSessions = parseInt(e.target.value, 10);
    dispatch({ type: 'SET_SESSIONS', payload: newSessions });
  }, []);

  // Handle schedule selection
  const handleScheduleSelect = useCallback((preference: 'flexible' | 'weekly' | 'biweekly') => {
    dispatch({ type: 'SET_SCHEDULE', payload: preference });
  }, []);

  // Handle wizard completion
  const handleComplete = useCallback(() => {
    if (!pricing) return;

    const packageData: CustomPackageData = {
      sessions: state.sessions,
      pricePerSession: pricing.pricePerSession,
      totalCost: pricing.finalTotal,
      discountTier: pricing.discountTier,
      volumeDiscount: pricing.volumeDiscount,
      schedulePreference: state.schedulePreference,
      notes: state.notes
    };

    onComplete(packageData);
    dispatch({ type: 'RESET' });
  }, [pricing, state, onComplete]);

  // Handle close
  const handleClose = useCallback(() => {
    dispatch({ type: 'RESET' });
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <ModalOverlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <ModalContent
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            {...swipeHandlers}
          >
            {/* Header */}
            <ModalHeader>
              <HeaderTitle>Build Your Custom Package</HeaderTitle>
              <CloseButton onClick={handleClose} aria-label="Close wizard">
                ✕
              </CloseButton>
            </ModalHeader>

            {/* Step Indicator */}
            <StepIndicator>
              <Step active={state.currentStep >= 1} completed={state.currentStep > 1}>
                <StepNumber>1</StepNumber>
                <StepLabel>Sessions</StepLabel>
              </Step>
              <StepConnector active={state.currentStep >= 2} />
              <Step active={state.currentStep >= 2} completed={state.currentStep > 2}>
                <StepNumber>2</StepNumber>
                <StepLabel>Schedule</StepLabel>
              </Step>
              <StepConnector active={state.currentStep >= 3} />
              <Step active={state.currentStep >= 3} completed={false}>
                <StepNumber>3</StepNumber>
                <StepLabel>Review</StepLabel>
              </Step>
            </StepIndicator>

            {/* Step Content */}
            <StepContent>
              <AnimatePresence mode="wait">
                {state.currentStep === 1 && (
                  <StepContainer
                    key="step1"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <StepTitle>How many sessions do you need?</StepTitle>

                    {/* Session Slider */}
                    <SliderContainer>
                      <SessionDisplay>
                        <SessionNumber>{state.sessions}</SessionNumber>
                        <SessionLabel>sessions</SessionLabel>
                      </SessionDisplay>

                      <Slider
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={state.sessions}
                        onChange={handleSessionsChange}
                        aria-label="Number of sessions"
                      />

                      <SliderLabels>
                        <span>10</span>
                        <span>25</span>
                        <span>50</span>
                        <span>75</span>
                        <span>100</span>
                      </SliderLabels>
                    </SliderContainer>

                    {/* Pricing Display */}
                    {loading && <LoadingSpinner>Calculating pricing...</LoadingSpinner>}
                    {error && <ErrorMessage>{error}</ErrorMessage>}
                    {pricing && !loading && (
                      <PricingCard tier={pricing.discountTier}>
                        <PricingHeader>
                          <TierBadge tier={pricing.discountTier}>
                            {pricing.discountTier === 'bronze' && '🥉 Bronze'}
                            {pricing.discountTier === 'silver' && '🥈 Silver'}
                            {pricing.discountTier === 'gold' && '🥇 Gold'}
                          </TierBadge>
                          <DiscountTag>Save ${pricing.volumeDiscount}/session</DiscountTag>
                        </PricingHeader>

                        <PriceBreakdown>
                          <PriceRow>
                            <span>{pricing.sessions} sessions × ${pricing.pricePerSession}/session</span>
                            <PriceValue>${pricing.finalTotal.toLocaleString()}</PriceValue>
                          </PriceRow>
                          <SavingsRow>
                            <span>{pricing.savingsMessage}</span>
                          </SavingsRow>
                        </PriceBreakdown>

                        {/* Tier Progress Hint */}
                        {pricing.metadata.nextTierSessions && (
                          <TierHint>
                            💡 {pricing.metadata.nextTierMessage}
                          </TierHint>
                        )}
                      </PricingCard>
                    )}
                  </StepContainer>
                )}

                {state.currentStep === 2 && (
                  <StepContainer
                    key="step2"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <StepTitle>Choose your schedule preference</StepTitle>

                    <ScheduleOptions>
                      <ScheduleOption
                        selected={state.schedulePreference === 'flexible'}
                        onClick={() => handleScheduleSelect('flexible')}
                      >
                        <ScheduleIcon>📅</ScheduleIcon>
                        <ScheduleTitle>Flexible Schedule</ScheduleTitle>
                        <ScheduleDesc>Book sessions when it works for you</ScheduleDesc>
                      </ScheduleOption>

                      <ScheduleOption
                        selected={state.schedulePreference === 'weekly'}
                        onClick={() => handleScheduleSelect('weekly')}
                      >
                        <ScheduleIcon>🗓️</ScheduleIcon>
                        <ScheduleTitle>Weekly Sessions</ScheduleTitle>
                        <ScheduleDesc>Same day/time each week</ScheduleDesc>
                      </ScheduleOption>

                      <ScheduleOption
                        selected={state.schedulePreference === 'biweekly'}
                        onClick={() => handleScheduleSelect('biweekly')}
                      >
                        <ScheduleIcon>📆</ScheduleIcon>
                        <ScheduleTitle>Bi-Weekly Sessions</ScheduleTitle>
                        <ScheduleDesc>Every other week consistency</ScheduleDesc>
                      </ScheduleOption>
                    </ScheduleOptions>

                    {/* Optional Notes */}
                    <NotesSection>
                      <NotesLabel>Additional notes (optional)</NotesLabel>
                      <NotesTextarea
                        placeholder="Any specific goals, preferences, or scheduling constraints?"
                        value={state.notes}
                        onChange={(e) => dispatch({ type: 'SET_NOTES', payload: e.target.value })}
                        rows={3}
                      />
                    </NotesSection>
                  </StepContainer>
                )}

                {state.currentStep === 3 && pricing && (
                  <StepContainer
                    key="step3"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                  >
                    <StepTitle>Review your custom package</StepTitle>

                    <ReviewCard>
                      <ReviewSection>
                        <ReviewLabel>Package Details</ReviewLabel>
                        <ReviewValue>{state.sessions} Personal Training Sessions</ReviewValue>
                      </ReviewSection>

                      <ReviewSection>
                        <ReviewLabel>Discount Tier</ReviewLabel>
                        <ReviewValue>
                          {pricing.discountTier === 'bronze' && '🥉 Bronze Tier'}
                          {pricing.discountTier === 'silver' && '🥈 Silver Tier'}
                          {pricing.discountTier === 'gold' && '🥇 Gold Tier'}
                          {' '}(${pricing.volumeDiscount} off per session)
                        </ReviewValue>
                      </ReviewSection>

                      <ReviewSection>
                        <ReviewLabel>Price Per Session</ReviewLabel>
                        <ReviewValue>${pricing.pricePerSession}</ReviewValue>
                      </ReviewSection>

                      <ReviewSection>
                        <ReviewLabel>Schedule Preference</ReviewLabel>
                        <ReviewValue>
                          {state.schedulePreference === 'flexible' && '📅 Flexible Schedule'}
                          {state.schedulePreference === 'weekly' && '🗓️ Weekly Sessions'}
                          {state.schedulePreference === 'biweekly' && '📆 Bi-Weekly Sessions'}
                        </ReviewValue>
                      </ReviewSection>

                      {state.notes && (
                        <ReviewSection>
                          <ReviewLabel>Notes</ReviewLabel>
                          <ReviewValue>{state.notes}</ReviewValue>
                        </ReviewSection>
                      )}

                      <TotalSection>
                        <TotalLabel>Total Investment</TotalLabel>
                        <TotalValue>${pricing.finalTotal.toLocaleString()}</TotalValue>
                        <TotalSavings>{pricing.savingsMessage}</TotalSavings>
                      </TotalSection>
                    </ReviewCard>
                  </StepContainer>
                )}
              </AnimatePresence>
            </StepContent>

            {/* Footer Navigation */}
            <ModalFooter>
              {state.currentStep > 1 && (
                <BackButton onClick={() => dispatch({ type: 'PREV_STEP' })}>
                  ← Back
                </BackButton>
              )}

              <div style={{ flex: 1 }} />

              {state.currentStep < 3 ? (
                <NextButton
                  onClick={() => dispatch({ type: 'NEXT_STEP' })}
                  disabled={!pricing || loading}
                >
                  Next: {state.currentStep === 1 ? 'Schedule' : 'Review'} →
                </NextButton>
              ) : (
                <CompleteButton
                  onClick={handleComplete}
                  disabled={!pricing || loading}
                >
                  Add to Cart 🛒
                </CompleteButton>
              )}
            </ModalFooter>
          </ModalContent>
        </ModalOverlay>
      )}
    </AnimatePresence>
  );
};

// ===================== STYLED COMPONENTS =====================

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 15, 0.9);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(135deg, #1e1e3f 0%, #0a0a0f 100%);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 255, 255, 0.3);

  /* Galaxy-Swan glass effect */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(30, 30, 63, 0.7);
    filter: blur(10px);
    z-index: -1;
    border-radius: 20px;
  }

  @media (max-width: 768px) {
    max-height: 95vh;
    border-radius: 16px;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem 2rem 1rem;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);

  @media (max-width: 768px) {
    padding: 1.5rem 1.5rem 1rem;
  }
`;

const HeaderTitle = styled.h2`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.75rem;
  color: #00ffff;
  margin: 0;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);

  @media (max-width: 768px) {
    font-size: 1.35rem;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: #00ffff;
  font-size: 2rem;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  transition: transform 0.2s ease;
  min-width: 44px; /* WCAG AAA touch target */
  min-height: 44px;

  &:hover {
    transform: scale(1.1);
    color: #ff416c;
  }
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 2rem 1rem;
  gap: 0.5rem;

  @media (max-width: 768px) {
    padding: 1.5rem 1rem 1rem;
  }
`;

const Step = styled.div<{ active: boolean; completed: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  opacity: ${props => props.active ? 1 : 0.5};
`;

const StepNumber = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ffff 0%, #9370DB 100%);
  color: #0a0a0f;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }
`;

const StepLabel = styled.span`
  font-size: 0.85rem;
  color: #ffffff;
  font-family: 'Rajdhani', sans-serif;

  @media (max-width: 768px) {
    font-size: 0.75rem;
  }
`;

const StepConnector = styled.div<{ active: boolean }>`
  width: 60px;
  height: 2px;
  background: ${props => props.active
    ? 'linear-gradient(90deg, #00ffff 0%, #9370DB 100%)'
    : 'rgba(255, 255, 255, 0.2)'};
  margin-top: -20px;

  @media (max-width: 768px) {
    width: 40px;
  }
`;

const StepContent = styled.div`
  padding: 1.5rem 2rem;
  min-height: 400px;

  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
    min-height: 350px;
  }
`;

const StepContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const StepTitle = styled.h3`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.25rem;
  color: #ffffff;
  margin: 0;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.1rem;
  }
`;

const SliderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 255, 0.1);
`;

const SessionDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
`;

const SessionNumber = styled.div`
  font-family: 'Orbitron', sans-serif;
  font-size: 3rem;
  color: #00ffff;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  font-weight: bold;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const SessionLabel = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const Slider = styled.input`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  -webkit-appearance: none;
  margin: 1rem 0;

  /* Thumb styling */
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00ffff 0%, #9370DB 100%);
    cursor: pointer;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }

  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00ffff 0%, #9370DB 100%);
    cursor: pointer;
    border: none;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  }

  /* Track styling */
  &::-webkit-slider-runnable-track {
    background: linear-gradient(90deg, #00ffff 0%, #9370DB 100%);
    height: 8px;
    border-radius: 4px;
  }

  &::-moz-range-track {
    background: linear-gradient(90deg, #00ffff 0%, #9370DB 100%);
    height: 8px;
    border-radius: 4px;
  }
`;

const SliderLabels = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0 0.5rem;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 2rem;
  color: #00ffff;
  font-family: 'Rajdhani', sans-serif;
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 1rem;
  background: rgba(255, 65, 108, 0.1);
  border: 1px solid rgba(255, 65, 108, 0.3);
  border-radius: 8px;
  color: #ff416c;
  font-family: 'Rajdhani', sans-serif;
`;

const PricingCard = styled.div<{ tier: 'bronze' | 'silver' | 'gold' }>`
  padding: 1.5rem;
  background: rgba(0, 255, 255, 0.05);
  border: 2px solid ${props =>
    props.tier === 'gold' ? 'rgba(255, 215, 0, 0.3)' :
    props.tier === 'silver' ? 'rgba(192, 192, 192, 0.3)' :
    'rgba(205, 127, 50, 0.3)'
  };
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 255, 255, 0.2);
`;

const PricingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const TierBadge = styled.div<{ tier: 'bronze' | 'silver' | 'gold' }>`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: ${props =>
    props.tier === 'gold' ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' :
    props.tier === 'silver' ? 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)' :
    'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)'
  };
  color: #0a0a0f;
  font-family: 'Orbitron', sans-serif;
  font-weight: bold;
  font-size: 0.9rem;
`;

const DiscountTag = styled.div`
  padding: 0.5rem 1rem;
  border-radius: 20px;
  background: rgba(0, 255, 0, 0.1);
  border: 1px solid rgba(0, 255, 0, 0.3);
  color: #00ff00;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
`;

const PriceBreakdown = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'Rajdhani', sans-serif;
  color: #ffffff;
  font-size: 1.1rem;
`;

const PriceValue = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.5rem;
  color: #00ffff;
  font-weight: bold;
`;

const SavingsRow = styled.div`
  text-align: center;
  padding: 0.75rem;
  background: rgba(0, 255, 0, 0.1);
  border-radius: 8px;
  color: #00ff00;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  border: 1px solid rgba(0, 255, 0, 0.2);
`;

const TierHint = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(147, 112, 219, 0.1);
  border: 1px solid rgba(147, 112, 219, 0.3);
  border-radius: 8px;
  color: #9370DB;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  text-align: center;
`;

const ScheduleOptions = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 600px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ScheduleOption = styled.button<{ selected: boolean }>`
  padding: 1.5rem 1rem;
  background: ${props => props.selected
    ? 'rgba(0, 255, 255, 0.15)'
    : 'rgba(0, 255, 255, 0.05)'
  };
  border: 2px solid ${props => props.selected
    ? '#00ffff'
    : 'rgba(0, 255, 255, 0.2)'
  };
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  min-height: 140px;
  min-width: 44px; /* WCAG AAA */

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 30px rgba(0, 255, 255, 0.3);
  }
`;

const ScheduleIcon = styled.div`
  font-size: 2.5rem;
`;

const ScheduleTitle = styled.div`
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  color: #00ffff;
  font-weight: bold;
`;

const ScheduleDesc = styled.div`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
`;

const NotesSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const NotesLabel = styled.label`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const NotesTextarea = styled.textarea`
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.75rem;
  color: #ffffff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  resize: vertical;
  min-height: 80px;

  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const ReviewCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: rgba(0, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 12px;
`;

const ReviewSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);

  &:last-of-type {
    border-bottom: none;
    padding-bottom: 0;
  }
`;

const ReviewLabel = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ReviewValue = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: #ffffff;
`;

const TotalSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(147, 112, 219, 0.1) 100%);
  border-radius: 12px;
  border: 2px solid rgba(0, 255, 255, 0.3);
  margin-top: 1rem;
`;

const TotalLabel = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const TotalValue = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 2.5rem;
  color: #00ffff;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
`;

const TotalSavings = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  color: #00ff00;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-top: 1px solid rgba(0, 255, 255, 0.1);

  @media (max-width: 768px) {
    padding: 1rem 1.5rem;
  }
`;

const BackButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: transparent;
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 8px;
  color: #00ffff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 44px; /* WCAG AAA */

  &:hover {
    background: rgba(0, 255, 255, 0.1);
    transform: translateX(-4px);
  }
`;

const NextButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #00ffff 0%, #9370DB 100%);
  border: none;
  border-radius: 8px;
  color: #0a0a0f;
  font-family: 'Orbitron', sans-serif;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3);
  min-height: 44px; /* WCAG AAA */

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 255, 255, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CompleteButton = styled(NextButton)`
  background: linear-gradient(135deg, #00ff00 0%, #00ffff 100%);
`;

export default CustomPackageBuilder;
