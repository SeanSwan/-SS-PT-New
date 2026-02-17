/**
 * Create Client Modal
 * Form for adding new clients to the system
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Galaxy-Swan (cosmic dark, cyan accents, glass surfaces)
 * Touch targets: 44px minimum on all interactive elements
 * Responsive: CSS Grid 2-col → 1-col at 640px
 */

import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Save, XCircle } from 'lucide-react';
import { CreateClientRequest } from '../../../../services/adminClientService';

/* ─────────────────────── Keyframes ─────────────────────── */

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* ─────────────────────── Modal Shell ─────────────────────── */

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
`;

const ModalPanel = styled.div`
  background: rgba(29, 31, 43, 0.98);
  border-radius: 12px;
  max-width: 600px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(14, 165, 233, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #252742;
  border-radius: 12px 12px 0 0;
`;

const ModalTitle = styled.h2`
  color: #00ffff;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  background: transparent;
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const ModalBody = styled.div`
  overflow-y: auto;
  padding: 24px;
  flex: 1;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 0 0 12px 12px;
`;

/* ─────────────────────── Form Layout ─────────────────────── */

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FullWidthCell = styled.div`
  grid-column: 1 / -1;
`;

/* ─────────────────────── Section Headers ─────────────────────── */

const SectionTitle = styled.h3`
  color: #00ffff;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const SectionDivider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0 0 8px 0;
`;

/* ─────────────────────── Field Components ─────────────────────── */

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.label`
  color: #94a3b8;
  font-size: 0.85rem;
  font-weight: 500;
`;

const StyledInput = styled.input<{ $error?: boolean }>`
  min-height: 44px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  border: 1px solid ${({ $error }) => ($error ? '#f44336' : 'rgba(255, 255, 255, 0.2)')};
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  width: 100%;
  box-sizing: border-box;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: ${({ $error }) => ($error ? '#f44336' : 'rgba(0, 255, 255, 0.5)')};
  }

  &:focus {
    border-color: ${({ $error }) => ($error ? '#f44336' : '#00ffff')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: #64748b;
  }
`;

const StyledTextarea = styled.textarea<{ $error?: boolean }>`
  min-height: 88px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  border: 1px solid ${({ $error }) => ($error ? '#f44336' : 'rgba(255, 255, 255, 0.2)')};
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s, background 0.2s;
  width: 100%;
  box-sizing: border-box;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: ${({ $error }) => ($error ? '#f44336' : 'rgba(0, 255, 255, 0.5)')};
  }

  &:focus {
    border-color: ${({ $error }) => ($error ? '#f44336' : '#00ffff')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const NativeSelect = styled.select<{ $error?: boolean }>`
  min-height: 44px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  border: 1px solid ${({ $error }) => ($error ? '#f44336' : 'rgba(255, 255, 255, 0.2)')};
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  width: 100%;
  box-sizing: border-box;
  appearance: auto;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: ${({ $error }) => ($error ? '#f44336' : 'rgba(0, 255, 255, 0.5)')};
  }

  &:focus {
    border-color: ${({ $error }) => ($error ? '#f44336' : '#00ffff')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background: #1d1f2b;
    color: #e2e8f0;
  }
`;

const FieldError = styled.span`
  color: #f44336;
  font-size: 0.75rem;
  min-height: 1em;
`;

/* ─────────────────────── Buttons ─────────────────────── */

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  background: linear-gradient(135deg, #00ffff, #00c8ff);
  color: #0a0a1a;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #00e6ff, #00b3ff);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
  }

  &:disabled {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.3);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 10px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(0, 255, 255, 0.5);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

/* ─────────────────────── Alert ─────────────────────── */

const AlertBox = styled.div<{ $severity?: 'error' | 'warning' | 'info' | 'success' }>`
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.9rem;
  color: #e2e8f0;
  border-left: 4px solid
    ${({ $severity }) => {
      switch ($severity) {
        case 'error':
          return '#f44336';
        case 'warning':
          return '#ff9800';
        case 'success':
          return '#4caf50';
        default:
          return '#0ea5e9';
      }
    }};
  background: ${({ $severity }) => {
    switch ($severity) {
      case 'error':
        return 'rgba(244, 67, 54, 0.1)';
      case 'warning':
        return 'rgba(255, 152, 0, 0.1)';
      case 'success':
        return 'rgba(76, 175, 80, 0.1)';
      default:
        return 'rgba(14, 165, 233, 0.1)';
    }
  }};
`;

/* ─────────────────────── Spinner ─────────────────────── */

const SpinnerIcon = styled.span`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(10, 10, 26, 0.3);
  border-top-color: #0a0a1a;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;

/* ─────────────────────── Component ─────────────────────── */

interface CreateClientModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientRequest) => Promise<void>;
  trainers?: Array<{ id: string; firstName: string; lastName: string }>;
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  open,
  onClose,
  onSubmit,
  trainers = []
}) => {
  const [formData, setFormData] = useState<CreateClientRequest>({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    weight: undefined,
    height: undefined,
    fitnessGoal: '',
    trainingExperience: '',
    healthConcerns: '',
    emergencyContact: '',
    availableSessions: 1,
    trainerId: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.password.trim()) errors.password = 'Password is required';
    if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Clean up data before submission
      const cleanData: CreateClientRequest = {
        ...formData,
        weight: formData.weight || undefined,
        height: formData.height || undefined,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        fitnessGoal: formData.fitnessGoal || undefined,
        trainingExperience: formData.trainingExperience || undefined,
        healthConcerns: formData.healthConcerns || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        trainerId: formData.trainerId || undefined,
      };

      await onSubmit(cleanData);

      // Reset form on success
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        weight: undefined,
        height: undefined,
        fitnessGoal: '',
        trainingExperience: '',
        healthConcerns: '',
        emergencyContact: '',
        availableSessions: 1,
        trainerId: ''
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create client');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateClientRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setFieldErrors({});
      onClose();
    }
  };

  if (!open) return null;

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalPanel onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Add New Client</ModalTitle>
          <CloseButton onClick={handleClose} disabled={loading} aria-label="Close">
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <ModalBody>
          {error && (
            <AlertBox $severity="error">
              {error}
            </AlertBox>
          )}

          <form onSubmit={handleSubmit}>
            <FormGrid>
              {/* Basic Information */}
              <FullWidthCell>
                <SectionTitle>Basic Information</SectionTitle>
                <SectionDivider />
              </FullWidthCell>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-firstName">First Name *</FieldLabel>
                <StyledInput
                  id="ccm-firstName"
                  $error={!!fieldErrors.firstName}
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.firstName && <FieldError>{fieldErrors.firstName}</FieldError>}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-lastName">Last Name *</FieldLabel>
                <StyledInput
                  id="ccm-lastName"
                  $error={!!fieldErrors.lastName}
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.lastName && <FieldError>{fieldErrors.lastName}</FieldError>}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-email">Email *</FieldLabel>
                <StyledInput
                  id="ccm-email"
                  type="email"
                  $error={!!fieldErrors.email}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-username">Username *</FieldLabel>
                <StyledInput
                  id="ccm-username"
                  $error={!!fieldErrors.username}
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.username && <FieldError>{fieldErrors.username}</FieldError>}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-password">Password *</FieldLabel>
                <StyledInput
                  id="ccm-password"
                  type="password"
                  $error={!!fieldErrors.password}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-phone">Phone Number</FieldLabel>
                <StyledInput
                  id="ccm-phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={loading}
                />
              </FieldGroup>

              {/* Personal Information */}
              <FullWidthCell style={{ marginTop: 16 }}>
                <SectionTitle>Personal Information</SectionTitle>
                <SectionDivider />
              </FullWidthCell>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-dob">Date of Birth</FieldLabel>
                <StyledInput
                  id="ccm-dob"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  disabled={loading}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-gender">Gender</FieldLabel>
                <NativeSelect
                  id="ccm-gender"
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </NativeSelect>
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-weight">Weight (kg)</FieldLabel>
                <StyledInput
                  id="ccm-weight"
                  type="number"
                  value={formData.weight ?? ''}
                  onChange={(e) => handleInputChange('weight', e.target.value ? Number(e.target.value) : undefined)}
                  disabled={loading}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-height">Height (cm)</FieldLabel>
                <StyledInput
                  id="ccm-height"
                  type="number"
                  value={formData.height ?? ''}
                  onChange={(e) => handleInputChange('height', e.target.value ? Number(e.target.value) : undefined)}
                  disabled={loading}
                />
              </FieldGroup>

              {/* Fitness Information */}
              <FullWidthCell style={{ marginTop: 16 }}>
                <SectionTitle>Fitness Information</SectionTitle>
                <SectionDivider />
              </FullWidthCell>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-fitnessGoal">Fitness Goal</FieldLabel>
                <StyledInput
                  id="ccm-fitnessGoal"
                  value={formData.fitnessGoal}
                  onChange={(e) => handleInputChange('fitnessGoal', e.target.value)}
                  disabled={loading}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-experience">Training Experience</FieldLabel>
                <NativeSelect
                  id="ccm-experience"
                  value={formData.trainingExperience}
                  onChange={(e) => handleInputChange('trainingExperience', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select...</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </NativeSelect>
              </FieldGroup>

              <FullWidthCell>
                <FieldGroup>
                  <FieldLabel htmlFor="ccm-health">Health Concerns</FieldLabel>
                  <StyledTextarea
                    id="ccm-health"
                    rows={3}
                    value={formData.healthConcerns}
                    onChange={(e) => handleInputChange('healthConcerns', e.target.value)}
                    disabled={loading}
                  />
                </FieldGroup>
              </FullWidthCell>

              <FullWidthCell>
                <FieldGroup>
                  <FieldLabel htmlFor="ccm-emergency">Emergency Contact</FieldLabel>
                  <StyledInput
                    id="ccm-emergency"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    disabled={loading}
                  />
                </FieldGroup>
              </FullWidthCell>

              {/* Training Setup */}
              <FullWidthCell style={{ marginTop: 16 }}>
                <SectionTitle>Training Setup</SectionTitle>
                <SectionDivider />
              </FullWidthCell>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-sessions">Initial Available Sessions</FieldLabel>
                <StyledInput
                  id="ccm-sessions"
                  type="number"
                  min={0}
                  value={formData.availableSessions}
                  onChange={(e) => handleInputChange('availableSessions', Number(e.target.value))}
                  disabled={loading}
                />
              </FieldGroup>

              {trainers.length > 0 && (
                <FieldGroup>
                  <FieldLabel htmlFor="ccm-trainer">Assign Trainer (Optional)</FieldLabel>
                  <NativeSelect
                    id="ccm-trainer"
                    value={formData.trainerId}
                    onChange={(e) => handleInputChange('trainerId', e.target.value)}
                    disabled={loading}
                  >
                    <option value="">No trainer assigned</option>
                    {trainers.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.firstName} {trainer.lastName}
                      </option>
                    ))}
                  </NativeSelect>
                </FieldGroup>
              )}
            </FormGrid>
          </form>
        </ModalBody>

        <ModalFooter>
          <SecondaryButton onClick={handleClose} disabled={loading}>
            <XCircle size={18} />
            Cancel
          </SecondaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={loading}>
            {loading ? <SpinnerIcon /> : <Save size={18} />}
            {loading ? 'Creating...' : 'Create Client'}
          </PrimaryButton>
        </ModalFooter>
      </ModalPanel>
    </ModalOverlay>
  );
};

export default CreateClientModal;
