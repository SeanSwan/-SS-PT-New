/**
 * Client Recurring Booking Modal
 * ==============================
 * Allows clients to book multiple available sessions as a recurring series.
 * Uses POST /api/sessions/book-recurring endpoint.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Calendar, Clock, MapPin, User, Check, AlertCircle } from 'lucide-react';
import {
  Modal,
  FormField,
  Label,
  CustomSelect,
  PrimaryButton,
  OutlinedButton,
  ErrorText,
  HelperText,
  SmallText,
  BodyText,
  PrimaryHeading
} from './ui';

interface Session {
  id: number;
  sessionDate: string;
  duration: number;
  location: string;
  status: string;
  trainer?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface ClientRecurringBookingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableSessions: Session[];
  userCredits: number;
}

const daysOfWeekOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const weeksAheadOptions = [
  { value: 2, label: '2 weeks' },
  { value: 4, label: '4 weeks' },
  { value: 6, label: '6 weeks' },
  { value: 8, label: '8 weeks' },
  { value: 12, label: '12 weeks' }
];

const ClientRecurringBookingModal: React.FC<ClientRecurringBookingModalProps> = ({
  open,
  onClose,
  onSuccess,
  availableSessions,
  userCredits
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'filter' | 'select' | 'confirm'>('filter');

  // Filter criteria
  const [selectedDay, setSelectedDay] = useState<number | ''>('');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [weeksAhead, setWeeksAhead] = useState<number>(4);

  // Selection
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<number>>(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('filter');
      setSelectedDay('');
      setSelectedTimeSlot('');
      setWeeksAhead(4);
      setSelectedSessionIds(new Set());
      setError(null);
    }
  }, [open]);

  // Get unique time slots from available sessions
  const timeSlotOptions = useMemo(() => {
    const slots = new Set<string>();
    availableSessions.forEach(session => {
      const date = new Date(session.sessionDate);
      const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      slots.add(time);
    });
    return Array.from(slots).sort().map(time => ({
      value: time,
      label: new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    }));
  }, [availableSessions]);

  // Filter sessions by selected criteria
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (weeksAhead * 7));

    return availableSessions.filter(session => {
      const sessionDate = new Date(session.sessionDate);

      // Must be in the future
      if (sessionDate <= now) return false;

      // Must be within weeks ahead range
      if (sessionDate > endDate) return false;

      // Match day of week if selected
      if (selectedDay !== '' && sessionDate.getDay() !== selectedDay) return false;

      // Match time slot if selected
      if (selectedTimeSlot) {
        const sessionTime = sessionDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        if (sessionTime !== selectedTimeSlot) return false;
      }

      return session.status === 'available';
    }).sort((a, b) =>
      new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
    );
  }, [availableSessions, selectedDay, selectedTimeSlot, weeksAhead]);

  const toggleSessionSelection = (sessionId: number) => {
    const newSelection = new Set(selectedSessionIds);
    if (newSelection.has(sessionId)) {
      newSelection.delete(sessionId);
    } else {
      // Check if user has enough credits
      if (newSelection.size >= userCredits) {
        setError(`You can only select up to ${userCredits} sessions (your available credits)`);
        return;
      }
      newSelection.add(sessionId);
    }
    setError(null);
    setSelectedSessionIds(newSelection);
  };

  const selectAll = () => {
    const maxSelectable = Math.min(filteredSessions.length, userCredits);
    const newSelection = new Set(filteredSessions.slice(0, maxSelectable).map(s => s.id));
    setSelectedSessionIds(newSelection);
    if (filteredSessions.length > userCredits) {
      setError(`Limited to ${userCredits} sessions based on your available credits`);
    }
  };

  const clearSelection = () => {
    setSelectedSessionIds(new Set());
    setError(null);
  };

  const handleBookRecurring = async () => {
    if (selectedSessionIds.size === 0) {
      setError('Please select at least one session to book');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/sessions/book-recurring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          sessionIds: Array.from(selectedSessionIds)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to book recurring sessions');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to book sessions');
    } finally {
      setLoading(false);
    }
  };

  const renderFilterStep = () => (
    <StepContainer>
      <StepTitle>
        <Calendar size={20} />
        Set Your Recurring Schedule
      </StepTitle>
      <StepDescription>
        Choose your preferred day and time to find matching available sessions.
      </StepDescription>

      <FormField>
        <Label>Preferred Day</Label>
        <CustomSelect
          value={selectedDay}
          onChange={(val) => setSelectedDay(val === '' ? '' : Number(val))}
          options={[
            { value: '', label: 'Any day' },
            ...daysOfWeekOptions
          ]}
          placeholder="Select a day"
        />
      </FormField>

      <FormField>
        <Label>Preferred Time</Label>
        <CustomSelect
          value={selectedTimeSlot}
          onChange={(val) => setSelectedTimeSlot(String(val))}
          options={[
            { value: '', label: 'Any time' },
            ...timeSlotOptions
          ]}
          placeholder="Select a time"
        />
      </FormField>

      <FormField>
        <Label>How far ahead?</Label>
        <CustomSelect
          value={weeksAhead}
          onChange={(val) => setWeeksAhead(Number(val))}
          options={weeksAheadOptions}
        />
        <HelperText>
          We'll find available sessions for the next {weeksAhead} weeks
        </HelperText>
      </FormField>

      <ResultPreview>
        <SmallText secondary>Sessions matching your criteria:</SmallText>
        <ResultCount hasResults={filteredSessions.length > 0}>
          {filteredSessions.length} available
        </ResultCount>
      </ResultPreview>
    </StepContainer>
  );

  const renderSelectStep = () => (
    <StepContainer>
      <StepHeader>
        <StepTitle>
          <Check size={20} />
          Select Sessions to Book
        </StepTitle>
        <SelectionActions>
          <SmallButton onClick={selectAll}>Select All</SmallButton>
          <SmallButton onClick={clearSelection}>Clear</SmallButton>
        </SelectionActions>
      </StepHeader>

      <CreditsBadge>
        <SmallText secondary>Your Credits:</SmallText>
        <BodyText style={{ fontWeight: 600 }}>{userCredits}</BodyText>
        <SmallText secondary>|</SmallText>
        <SmallText secondary>Selected:</SmallText>
        <BodyText style={{ fontWeight: 600, color: selectedSessionIds.size > 0 ? '#00d4ff' : undefined }}>
          {selectedSessionIds.size}
        </BodyText>
      </CreditsBadge>

      <SessionList>
        {filteredSessions.length === 0 ? (
          <EmptyState>
            <AlertCircle size={24} />
            <BodyText>No available sessions match your criteria</BodyText>
            <SmallText secondary>Try adjusting your filters</SmallText>
          </EmptyState>
        ) : (
          filteredSessions.map(session => {
            const sessionDate = new Date(session.sessionDate);
            const isSelected = selectedSessionIds.has(session.id);

            return (
              <SessionCard
                key={session.id}
                selected={isSelected}
                onClick={() => toggleSessionSelection(session.id)}
              >
                <SessionCheckbox checked={isSelected}>
                  {isSelected && <Check size={14} />}
                </SessionCheckbox>
                <SessionInfo>
                  <SessionDate>
                    <Calendar size={14} />
                    {sessionDate.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </SessionDate>
                  <SessionTime>
                    <Clock size={14} />
                    {sessionDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                    <span>({session.duration} min)</span>
                  </SessionTime>
                </SessionInfo>
                <SessionMeta>
                  {session.trainer && (
                    <SessionTrainer>
                      <User size={14} />
                      {session.trainer.firstName}
                    </SessionTrainer>
                  )}
                  <SessionLocation>
                    <MapPin size={14} />
                    {session.location || 'Main Studio'}
                  </SessionLocation>
                </SessionMeta>
              </SessionCard>
            );
          })
        )}
      </SessionList>
    </StepContainer>
  );

  const renderConfirmStep = () => {
    const selectedSessions = filteredSessions.filter(s => selectedSessionIds.has(s.id));
    const creditsAfter = userCredits - selectedSessionIds.size;

    return (
      <StepContainer>
        <StepTitle>
          <Check size={20} />
          Confirm Recurring Booking
        </StepTitle>

        <ConfirmSummary>
          <SummaryRow>
            <SmallText secondary>Sessions to Book</SmallText>
            <BodyText style={{ fontWeight: 600, fontSize: '1.25rem' }}>
              {selectedSessionIds.size}
            </BodyText>
          </SummaryRow>
          <SummaryRow>
            <SmallText secondary>Credits Used</SmallText>
            <BodyText style={{ fontWeight: 600, color: '#ef4444' }}>
              -{selectedSessionIds.size}
            </BodyText>
          </SummaryRow>
          <SummaryDivider />
          <SummaryRow>
            <SmallText secondary>Credits Remaining</SmallText>
            <BodyText style={{ fontWeight: 600, color: creditsAfter > 0 ? '#22c55e' : '#ef4444' }}>
              {creditsAfter}
            </BodyText>
          </SummaryRow>
        </ConfirmSummary>

        <ConfirmSessionList>
          <SmallText secondary style={{ marginBottom: '0.5rem' }}>
            Sessions you're booking:
          </SmallText>
          {selectedSessions.map(session => {
            const sessionDate = new Date(session.sessionDate);
            return (
              <ConfirmSessionItem key={session.id}>
                <span>
                  {sessionDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
                <span>
                  {sessionDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </ConfirmSessionItem>
            );
          })}
        </ConfirmSessionList>
      </StepContainer>
    );
  };

  const getFooter = () => {
    switch (step) {
      case 'filter':
        return (
          <>
            <OutlinedButton onClick={onClose}>Cancel</OutlinedButton>
            <PrimaryButton
              onClick={() => setStep('select')}
              disabled={filteredSessions.length === 0}
            >
              Find Sessions ({filteredSessions.length})
            </PrimaryButton>
          </>
        );
      case 'select':
        return (
          <>
            <OutlinedButton onClick={() => setStep('filter')}>Back</OutlinedButton>
            <PrimaryButton
              onClick={() => setStep('confirm')}
              disabled={selectedSessionIds.size === 0}
            >
              Review ({selectedSessionIds.size} selected)
            </PrimaryButton>
          </>
        );
      case 'confirm':
        return (
          <>
            <OutlinedButton onClick={() => setStep('select')} disabled={loading}>
              Back
            </OutlinedButton>
            <PrimaryButton onClick={handleBookRecurring} disabled={loading}>
              {loading ? 'Booking...' : `Book ${selectedSessionIds.size} Sessions`}
            </PrimaryButton>
          </>
        );
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Book Recurring Sessions"
      size="md"
      footer={getFooter()}
    >
      {error && <ErrorText style={{ marginBottom: '1rem' }}>{error}</ErrorText>}

      <StepIndicator>
        <StepDot active={step === 'filter'} completed={step !== 'filter'}>1</StepDot>
        <StepLine completed={step !== 'filter'} />
        <StepDot active={step === 'select'} completed={step === 'confirm'}>2</StepDot>
        <StepLine completed={step === 'confirm'} />
        <StepDot active={step === 'confirm'}>3</StepDot>
      </StepIndicator>

      {step === 'filter' && renderFilterStep()}
      {step === 'select' && renderSelectStep()}
      {step === 'confirm' && renderConfirmStep()}
    </Modal>
  );
};

export default ClientRecurringBookingModal;

// Styled Components
const StepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StepHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const StepTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;

  svg {
    color: #00d4ff;
  }
`;

const StepDescription = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  margin-bottom: 1.5rem;
`;

const StepDot = styled.div<{ active?: boolean; completed?: boolean }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s ease;

  background: ${props => {
    if (props.active) return '#00d4ff';
    if (props.completed) return '#22c55e';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  color: ${props => props.active || props.completed ? '#000' : 'rgba(255, 255, 255, 0.5)'};
  border: 2px solid ${props => {
    if (props.active) return '#00d4ff';
    if (props.completed) return '#22c55e';
    return 'rgba(255, 255, 255, 0.2)';
  }};
`;

const StepLine = styled.div<{ completed?: boolean }>`
  width: 40px;
  height: 2px;
  background: ${props => props.completed ? '#22c55e' : 'rgba(255, 255, 255, 0.2)'};
  transition: background 0.2s ease;
`;

const ResultPreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  margin-top: 0.5rem;
`;

const ResultCount = styled.span<{ hasResults?: boolean }>`
  font-weight: 600;
  color: ${props => props.hasResults ? '#22c55e' : '#ef4444'};
`;

const SelectionActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const SmallButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const CreditsBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 212, 255, 0.1);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 8px;
`;

const SessionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }
`;

const SessionCard = styled.div<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: ${props => props.selected ? 'rgba(0, 212, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${props => props.selected ? '#00d4ff' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 44px;

  &:hover {
    background: ${props => props.selected ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)'};
    border-color: ${props => props.selected ? '#00d4ff' : 'rgba(255, 255, 255, 0.2)'};
  }

  &:active {
    transform: scale(0.99);
  }
`;

const SessionCheckbox = styled.div<{ checked?: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid ${props => props.checked ? '#00d4ff' : 'rgba(255, 255, 255, 0.3)'};
  background: ${props => props.checked ? '#00d4ff' : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;

  svg {
    color: #000;
  }
`;

const SessionInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
`;

const SessionDate = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #ffffff;

  svg {
    color: #00d4ff;
    flex-shrink: 0;
  }
`;

const SessionTime = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);

  svg {
    color: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
  }

  span {
    color: rgba(255, 255, 255, 0.5);
  }
`;

const SessionMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-end;
`;

const SessionTrainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);

  svg {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const SessionLocation = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);

  svg {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  text-align: center;

  svg {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const ConfirmSummary = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
`;

const SummaryDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0.5rem 0;
`;

const ConfirmSessionList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  padding-right: 0.5rem;
`;

const ConfirmSessionItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }
`;
