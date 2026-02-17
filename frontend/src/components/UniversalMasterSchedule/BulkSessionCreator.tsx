/**
 * 🚀 BULK SESSION CREATOR - Business Efficiency Tool
 * =================================================
 * Allows admins to quickly create multiple sessions at once
 * Essential for training businesses to set up weekly schedules
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass panels)
 */

import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Calendar, Clock, Users, Plus, X, AlertCircle, Info } from 'lucide-react';

// ─── Theme Tokens ───────────────────────────────────────────────────────────
const theme = {
  bg: 'rgba(15,23,42,0.95)',
  bgLight: 'rgba(30,41,59,0.8)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#0ea5e9',
  success: '#10b981',
  glass: 'rgba(15,23,42,0.85)',
};

// ─── Animations ─────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
`;

// ─── Overlay & Dialog ───────────────────────────────────────────────────────
const Overlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: ${fadeIn} 0.2s ease-out;
`;

const DialogPanel = styled.div`
  background: ${theme.bg};
  border: 1px solid ${theme.border};
  border-radius: 16px;
  backdrop-filter: blur(12px);
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: ${slideUp} 0.3s ease-out;
  box-shadow:
    0 0 40px rgba(14, 165, 233, 0.08),
    0 24px 48px rgba(0, 0, 0, 0.4);
`;

const DialogHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 24px;
  border-bottom: 1px solid ${theme.border};
  color: ${theme.text};
  font-size: 1.25rem;
  font-weight: 600;

  svg {
    color: ${theme.accent};
  }
`;

const DialogBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid ${theme.border};
`;

// ─── Section ────────────────────────────────────────────────────────────────
const SectionTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${theme.text};
  margin: 0 0 12px 0;
`;

// ─── Grid ───────────────────────────────────────────────────────────────────
const Row = styled.div<{ $cols?: number; $gap?: number }>`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols || 2}, 1fr);
  gap: ${({ $gap }) => $gap || 16}px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

// ─── Input ──────────────────────────────────────────────────────────────────
const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${theme.textMuted};
`;

const inputStyles = css`
  min-height: 44px;
  padding: 10px 14px;
  background: ${theme.bgLight};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  color: ${theme.text};
  font-size: 0.9375rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    border-color: ${theme.accent};
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &::placeholder {
    color: ${theme.textMuted};
  }
`;

const StyledInput = styled.input`
  ${inputStyles}
`;

const StyledSelect = styled.select`
  ${inputStyles}
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;

  option {
    background: ${theme.bg};
    color: ${theme.text};
  }
`;

// ─── Button ─────────────────────────────────────────────────────────────────
const Button = styled.button<{ $variant?: 'primary' | 'ghost' | 'outline'; $disabled?: boolean }>`
  min-height: 44px;
  min-width: 44px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  font-family: inherit;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  border: none;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};

  ${({ $variant }) => {
    switch ($variant) {
      case 'primary':
        return css`
          background: linear-gradient(135deg, ${theme.accent}, #6366f1);
          color: #fff;
          &:hover:not(:disabled) {
            background: linear-gradient(135deg, ${theme.accentHover}, #818cf8);
            box-shadow: 0 4px 16px rgba(14, 165, 233, 0.3);
          }
        `;
      case 'outline':
        return css`
          background: transparent;
          color: ${theme.accent};
          border: 1px solid ${theme.border};
          &:hover:not(:disabled) {
            border-color: ${theme.accent};
            background: rgba(14, 165, 233, 0.08);
          }
        `;
      case 'ghost':
      default:
        return css`
          background: transparent;
          color: ${theme.textMuted};
          &:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.05);
            color: ${theme.text};
          }
        `;
    }
  }}
`;

// ─── Checkbox ───────────────────────────────────────────────────────────────
const CheckboxLabel = styled.label<{ $checked: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9375rem;
  color: ${({ $checked }) => ($checked ? theme.accent : theme.textMuted)};
  background: ${({ $checked }) => ($checked ? 'rgba(14,165,233,0.1)' : 'transparent')};
  border: 1px solid ${({ $checked }) => ($checked ? theme.accent : theme.border)};
  transition: all 0.2s;
  user-select: none;

  &:hover {
    border-color: ${theme.borderHover};
    background: rgba(14, 165, 233, 0.05);
  }
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const CheckMark = styled.span<{ $checked: boolean }>`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid ${({ $checked }) => ($checked ? theme.accent : theme.textMuted)};
  background: ${({ $checked }) => ($checked ? theme.accent : 'transparent')};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;

  &::after {
    content: '';
    display: ${({ $checked }) => ($checked ? 'block' : 'none')};
    width: 5px;
    height: 10px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
    margin-bottom: 2px;
  }
`;

// ─── Chip / Tag ─────────────────────────────────────────────────────────────
const ChipWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.875rem;
  color: ${theme.accent};
  border: 1px solid ${theme.border};
  background: rgba(14, 165, 233, 0.08);
`;

const ChipDelete = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${theme.textMuted};
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    color: ${theme.danger};
  }
`;

// ─── Alert ──────────────────────────────────────────────────────────────────
const AlertBox = styled.div<{ $severity: 'info' | 'warning' | 'error' | 'success' }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.5;

  ${({ $severity }) => {
    switch ($severity) {
      case 'info':
        return css`
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.25);
          color: #7dd3fc;
        `;
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.1);
          border: 1px solid rgba(245, 158, 11, 0.25);
          color: #fcd34d;
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #fca5a5;
        `;
      case 'success':
        return css`
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          color: #6ee7b7;
        `;
    }
  }}

  svg {
    flex-shrink: 0;
  }
`;

const DaysRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const AddTimeRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
`;

// ─── Types ──────────────────────────────────────────────────────────────────

interface BulkSessionCreatorProps {
  open: boolean;
  onClose: () => void;
  onSave: (sessions: any[]) => void;
  trainers: Array<{
    id: number;
    firstName: string;
    lastName: string;
  }>;
}

// ─── Component ──────────────────────────────────────────────────────────────

const BulkSessionCreator: React.FC<BulkSessionCreatorProps> = ({
  open,
  onClose,
  onSave,
  trainers
}) => {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    selectedDays: [] as number[], // 0-6 for Sunday-Saturday
    times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
    duration: 60,
    location: 'Main Studio',
    trainerId: ''
  });

  const [customTime, setCustomTime] = useState('');
  const [preview, setPreview] = useState<any[]>([]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleDayToggle = (dayIndex: number) => {
    setFormData(prev => ({
      ...prev,
      selectedDays: prev.selectedDays.includes(dayIndex)
        ? prev.selectedDays.filter(d => d !== dayIndex)
        : [...prev.selectedDays, dayIndex]
    }));
  };

  const addCustomTime = () => {
    if (customTime && !formData.times.includes(customTime)) {
      setFormData(prev => ({
        ...prev,
        times: [...prev.times, customTime].sort()
      }));
      setCustomTime('');
    }
  };

  const removeTime = (timeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.filter(t => t !== timeToRemove)
    }));
  };

  const generatePreview = () => {
    if (!formData.startDate || !formData.endDate || formData.selectedDays.length === 0 || formData.times.length === 0) {
      setPreview([]);
      return;
    }

    const sessions = [];
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      if (formData.selectedDays.includes(date.getDay())) {
        formData.times.forEach(time => {
          const [hours, minutes] = time.split(':').map(Number);
          const sessionDate = new Date(date);
          sessionDate.setHours(hours, minutes, 0, 0);

          sessions.push({
            sessionDate: sessionDate.toISOString(),
            duration: formData.duration,
            location: formData.location,
            trainerId: formData.trainerId || null,
            status: 'available'
          });
        });
      }
    }

    setPreview(sessions);
  };

  React.useEffect(() => {
    generatePreview();
  }, [formData]);

  const handleSave = () => {
    if (preview.length > 0) {
      onSave(preview);
      onClose();
      // Reset form
      setFormData({
        startDate: '',
        endDate: '',
        selectedDays: [],
        times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        duration: 60,
        location: 'Main Studio',
        trainerId: ''
      });
      setPreview([]);
    }
  };

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <Overlay $open={open} onClick={handleOverlayClick}>
      <DialogPanel role="dialog" aria-modal="true" aria-label="Bulk Session Creator">
        <DialogHeader>
          <Calendar size={24} />
          Bulk Session Creator
        </DialogHeader>

        <DialogBody>
          {/* Date Range */}
          <div>
            <SectionTitle>Date Range</SectionTitle>
            <Row $cols={2} $gap={16}>
              <InputGroup>
                <Label htmlFor="bulk-start-date">Start Date</Label>
                <StyledInput
                  id="bulk-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </InputGroup>
              <InputGroup>
                <Label htmlFor="bulk-end-date">End Date</Label>
                <StyledInput
                  id="bulk-end-date"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </InputGroup>
            </Row>
          </div>

          {/* Days of Week */}
          <div>
            <SectionTitle>Days of Week</SectionTitle>
            <DaysRow>
              {dayNames.map((day, index) => (
                <CheckboxLabel key={index} $checked={formData.selectedDays.includes(index)}>
                  <HiddenCheckbox
                    checked={formData.selectedDays.includes(index)}
                    onChange={() => handleDayToggle(index)}
                  />
                  <CheckMark $checked={formData.selectedDays.includes(index)} />
                  {day}
                </CheckboxLabel>
              ))}
            </DaysRow>
          </div>

          {/* Times */}
          <div>
            <SectionTitle>Session Times</SectionTitle>
            <ChipWrapper>
              {formData.times.map(time => (
                <Chip key={time}>
                  {time}
                  <ChipDelete
                    onClick={() => removeTime(time)}
                    aria-label={`Remove time ${time}`}
                    type="button"
                  >
                    <X size={14} />
                  </ChipDelete>
                </Chip>
              ))}
            </ChipWrapper>
            <AddTimeRow>
              <InputGroup>
                <Label htmlFor="bulk-add-time">Add Time</Label>
                <StyledInput
                  id="bulk-add-time"
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                />
              </InputGroup>
              <Button $variant="outline" onClick={addCustomTime} type="button">
                <Plus size={16} />
                Add
              </Button>
            </AddTimeRow>
          </div>

          {/* Session Details */}
          <div>
            <SectionTitle>Session Details</SectionTitle>
            <Row $cols={3} $gap={16}>
              <InputGroup>
                <Label htmlFor="bulk-duration">Duration (minutes)</Label>
                <StyledInput
                  id="bulk-duration"
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                />
              </InputGroup>
              <InputGroup>
                <Label htmlFor="bulk-location">Location</Label>
                <StyledInput
                  id="bulk-location"
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </InputGroup>
              <InputGroup>
                <Label htmlFor="bulk-trainer">Default Trainer (Optional)</Label>
                <StyledSelect
                  id="bulk-trainer"
                  value={formData.trainerId}
                  onChange={(e) => setFormData(prev => ({ ...prev, trainerId: e.target.value }))}
                >
                  <option value="">None</option>
                  {trainers.map(trainer => (
                    <option key={trainer.id} value={trainer.id}>
                      {trainer.firstName} {trainer.lastName}
                    </option>
                  ))}
                </StyledSelect>
              </InputGroup>
            </Row>
          </div>

          {/* Preview */}
          <div>
            <SectionTitle>Preview ({preview.length} sessions)</SectionTitle>
            {preview.length > 0 ? (
              <AlertBox $severity="info">
                <Info size={18} />
                This will create {preview.length} available session slots.
              </AlertBox>
            ) : (
              <AlertBox $severity="warning">
                <AlertCircle size={18} />
                Please fill in all fields to see preview.
              </AlertBox>
            )}

            {preview.length > 50 && (
              <AlertBox $severity="warning" style={{ marginTop: 8 }}>
                <AlertCircle size={18} />
                Creating {preview.length} sessions at once. This may take a moment.
              </AlertBox>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button $variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            $variant="primary"
            onClick={handleSave}
            $disabled={preview.length === 0}
            disabled={preview.length === 0}
            type="button"
          >
            <Clock size={18} />
            Create {preview.length} Sessions
          </Button>
        </DialogFooter>
      </DialogPanel>
    </Overlay>
  );
};

export default BulkSessionCreator;
