/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: CreateClientModal                                ║
 * ║  PURPOSE: Admin form for adding new clients (SwanStudios      ║
 * ║           Move Fitness, or External) to the system            ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-22 (AI Village Phase 2+3+4)        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [X] Create New Client                                      │
 * │                                                            │
 * │ Source: [SwanStudios] [Move Fitness] [External]             │
 * │                                                            │
 * │ ┌──────────────┐  ┌──────────────┐                        │
 * │ │ First Name*  │  │ Last Name*   │                        │
 * │ └──────────────┘  └──────────────┘                        │
 * │ ┌──────────────┐  ┌──────────────┐                        │
 * │ │ Email*       │  │ Phone        │                        │
 * │ └──────────────┘  └──────────────┘                        │
 * │ ┌──────────────┐  ┌──────────────┐                        │
 * │ │ Username*    │  │ Password*    │  (SwanStudios only)    │
 * │ └──────────────┘  └──────────────┘                        │
 * │ ┌────────────────────────────────┐                        │
 * │ │ Fitness Goal / Health Concerns │                        │
 * │ └────────────────────────────────┘                        │
 * │                                                            │
 * │              [Cancel]  [Create Client]                     │
 * └────────────────────────────────────────────────────────────┘
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Source chip] → Sets clientSource state → Shows/hides username/password fields
 * [Create Client] → Validates form → POST /api/admin/clients → onClose() + onSubmit()
 * [Cancel/X/Escape] → handleClose() → Clears errors → Calls onClose()
 *
 * DATA FLOW:
 * Props In:  { open, onClose, onSubmit, trainers[] }
 * State:     { formData, clientSource, loading, error, fieldErrors }
 * API Calls: onSubmit prop delegates to parent (POST /api/admin/clients)
 * Events:    None
 * Children:  None (self-contained modal)
 *
 * GAMIFICATION HOOKS:
 * - Client creation triggers server-side onboarding badge check
 * - forcePasswordChange=true set for new clients (password flow on first login)
 *
 * Architecture: styled-components + lucide-react (zero MUI)
 * Theme: Enchanted Apex — Crystalline Swan (NOT Crystalline Swan — RETIRED)
 * Touch targets: 44px minimum on all interactive elements
 * Responsive: CSS Grid 2-col → 1-col at 640px
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { X, Save, XCircle } from 'lucide-react';
import { CreateClientRequest, ClientSource, CLIENT_SOURCE_LABELS, CLIENT_SOURCE_COLORS } from '../../../../services/adminClientService';

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
  background: rgba(0, 32, 96, 0.85);
  backdrop-filter: blur(8px);

  @supports not (backdrop-filter: blur(8px)) {
    background: rgba(0, 32, 96, 0.95);
  }
`;

const ModalPanel = styled.div`
  background: #003080;
  border-radius: 12px;
  max-width: 600px;
  width: 95%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(96, 192, 240, 0.2);
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);

  @supports not (backdrop-filter: blur(12px)) {
    background: rgba(0, 48, 128, 0.98);
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #002060;
  border-radius: 12px 12px 0 0;
`;

const ModalTitle = styled.h2`
  color: #E0ECF4;
  font-family: 'Plus Jakarta Sans', sans-serif;
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
  color: #E0ECF4;
  font-family: 'Plus Jakarta Sans', sans-serif;
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
  color: #E0ECF4;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
`;

const StyledInput = styled.input<{ $error?: boolean }>`
  min-height: 44px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.05);
  color: #E0ECF4;
  border: 1px solid ${({ $error }) => ($error ? '#fca5a5' : 'rgba(224, 236, 244, 0.5)')};
  border-radius: 8px;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  width: 100%;
  box-sizing: border-box;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: ${({ $error }) => ($error ? '#fca5a5' : 'rgba(139, 92, 246, 0.5)')};
  }

  &:focus {
    border-color: ${({ $error }) => ($error ? '#fca5a5' : '#8B5CF6')};
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
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
    border-color: ${({ $error }) => ($error ? '#f44336' : 'rgba(139, 92, 246, 0.5)')};
  }

  &:focus {
    border-color: ${({ $error }) => ($error ? '#f44336' : '#60C0F0')};
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
    border-color: ${({ $error }) => ($error ? '#f44336' : 'rgba(139, 92, 246, 0.5)')};
  }

  &:focus {
    border-color: ${({ $error }) => ($error ? '#f44336' : '#60C0F0')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background: #002060;
    color: #E0ECF4;
  }
`;

const FieldError = styled.span`
  color: #fca5a5;
  font-size: 0.8rem;
  min-height: 1em;
`;

/* ─────────────────────── Source Selector ─────────────────────── */

const SourceSelectorRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const SourceChip = styled.button<{ $active: boolean; $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid ${({ $active, $color }) => ($active ? $color : 'rgba(255, 255, 255, 0.15)')};
  border-radius: 8px;
  background: ${({ $active, $color }) =>
    $active ? `${$color}20` : 'rgba(255, 255, 255, 0.03)'};
  color: ${({ $active, $color }) => ($active ? $color : '#94a3b8')};
  font-size: 0.9rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    border-color: ${({ $color }) => $color};
    background: ${({ $color }) => `${$color}10`};
  }
`;

const ExternalNote = styled.div`
  padding: 10px 14px;
  background: rgba(96, 192, 240, 0.08);
  border-left: 3px solid #60C0F0;
  border-radius: 0 8px 8px 0;
  color: #E0ECF4;
  font-size: 0.85rem;
  line-height: 1.5;
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
  background: #8B5CF6;
  color: #FFFFFF;

  &:hover:not(:disabled) {
    background: #7c3aed;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(96, 192, 240, 0.4);
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
    border-color: rgba(139, 92, 246, 0.5);
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

const DiscardOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(6px);
`;

const DiscardDialog = styled.div`
  width: min(420px, 100%);
  border-radius: 12px;
  border: 1px solid rgba(198, 168, 75, 0.35);
  background: var(--bg-elevated, #1A1A24);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
  padding: 20px;
`;

const DiscardTitle = styled.h3`
  margin: 0 0 8px;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
`;

const DiscardCopy = styled.p`
  margin: 0;
  color: var(--text-secondary, #94a3b8);
  line-height: 1.5;
  font-size: 0.875rem;
`;

const DiscardActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
`;

/* ─────────────────────── Spinner ─────────────────────── */

const SpinnerIcon = styled.span`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 32, 96, 0.3);
  border-top-color: #002060;
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

const parseOptionalPositiveNumber = (value: number | string | undefined): number | undefined => {
  if (value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const DEFAULT_FORM_DATA: CreateClientRequest = {
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
  trainerId: '',
  clientSource: 'swanstudios'
};

const createDefaultFormData = (): CreateClientRequest => ({ ...DEFAULT_FORM_DATA });

const heightPartsToInches = (feetValue: string, inchesValue: string): number | undefined => {
  const feet = parseOptionalPositiveNumber(feetValue) || 0;
  const inches = parseOptionalPositiveNumber(inchesValue) || 0;
  const total = (feet * 12) + inches;
  return total > 0 ? total : undefined;
};

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  open,
  onClose,
  onSubmit,
  trainers = []
}) => {
  const [clientSource, setClientSource] = useState<ClientSource>('swanstudios');
  const isExternal = clientSource !== 'swanstudios';
  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');

  const [formData, setFormData] = useState<CreateClientRequest>(createDefaultFormData);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [discardOpen, setDiscardOpen] = useState(false);

  const hasDraftChanges = useMemo(() => (
    clientSource !== 'swanstudios' ||
    !!heightFeet.trim() ||
    !!heightInches.trim() ||
    (Object.keys(DEFAULT_FORM_DATA) as Array<keyof CreateClientRequest>).some(
      key => formData[key] !== DEFAULT_FORM_DATA[key]
    )
  ), [clientSource, formData, heightFeet, heightInches]);

  const resetDraft = useCallback(() => {
    setClientSource('swanstudios');
    setHeightFeet('');
    setHeightInches('');
    setFormData(createDefaultFormData());
  }, []);

  const closeWithoutPrompt = useCallback(() => {
    setError(null);
    setFieldErrors({});
    onClose();
  }, [onClose]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    // Username/password only required for SwanStudios clients
    if (!isExternal) {
      if (!formData.username.trim()) errors.username = 'Username is required';
      if (!formData.password.trim()) errors.password = 'Password is required';
      else if (!/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/.test(formData.password)) {
        errors.password = 'Password must be 8+ characters with at least one letter and one number';
      }
    }

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
        clientSource,
        availableSessions: isExternal ? 0 : formData.availableSessions,
        weight: parseOptionalPositiveNumber(formData.weight),
        height: heightPartsToInches(heightFeet, heightInches),
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        fitnessGoal: formData.fitnessGoal || undefined,
        trainingExperience: formData.trainingExperience || undefined,
        healthConcerns: formData.healthConcerns || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        trainerId: formData.trainerId || undefined,
      };
      if (isExternal) {
        delete (cleanData as Partial<CreateClientRequest>).username;
        delete (cleanData as Partial<CreateClientRequest>).password;
      }

      await onSubmit(cleanData);

      // Close modal + reset form on success
      onClose();
      resetDraft();
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

  const handleClose = useCallback(() => {
    if (loading) return;
    if (hasDraftChanges) {
      setDiscardOpen(true);
      return;
    }
    closeWithoutPrompt();
  }, [closeWithoutPrompt, hasDraftChanges, loading]);

  const confirmDiscard = useCallback(() => {
    setDiscardOpen(false);
    resetDraft();
    closeWithoutPrompt();
  }, [closeWithoutPrompt, resetDraft]);

  // Focus trap + Escape key handler
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { handleClose(); return; }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0] as HTMLElement;
      const last = focusable[focusable.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const firstInput = modalRef.current?.querySelector('input') as HTMLElement;
    firstInput?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, open]);

  if (!open) return null;

  return (
    <ModalOverlay data-testid="create-client-modal-overlay">
      <ModalPanel ref={modalRef} role="dialog" aria-modal="true" aria-label={isExternal ? `Add ${CLIENT_SOURCE_LABELS[clientSource]} Client` : 'Add New Client'} onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{isExternal ? `Add ${CLIENT_SOURCE_LABELS[clientSource]} Client` : 'Add New Client'}</ModalTitle>
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
              {/* Client Source Selection */}
              <FullWidthCell>
                <SectionTitle>Client Type</SectionTitle>
                <SectionDivider />
                <SourceSelectorRow>
                  {(Object.entries(CLIENT_SOURCE_LABELS) as [ClientSource, string][]).map(([key, label]) => (
                    <SourceChip
                      key={key}
                      type="button"
                      $active={clientSource === key}
                      $color={CLIENT_SOURCE_COLORS[key]}
                      onClick={() => {
                        setClientSource(key);
                        if (key !== 'swanstudios') {
                          setFormData(prev => ({ ...prev, availableSessions: 0, clientSource: key }));
                        } else {
                          setFormData(prev => ({ ...prev, availableSessions: 1, clientSource: key }));
                        }
                      }}
                      disabled={loading}
                    >
                      {label}
                    </SourceChip>
                  ))}
                </SourceSelectorRow>
                {isExternal && (
                  <ExternalNote style={{ marginTop: 10 }}>
                    {clientSource === 'move_fitness'
                      ? 'Move Fitness client — gets full tool access (Workout Log, Food Logger, Body Map, Social) with 0 SwanStudios sessions. Username and password auto-generated.'
                      : 'External client — gets full tool access with 0 SwanStudios sessions.'}
                  </ExternalNote>
                )}
              </FullWidthCell>

              {/* Basic Information */}
              <FullWidthCell style={{ marginTop: 12 }}>
                <SectionTitle>Basic Information</SectionTitle>
                <SectionDivider />
              </FullWidthCell>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-firstName">First Name *</FieldLabel>
                <StyledInput
                  id="ccm-firstName"
                  autoComplete="given-name"
                  $error={!!fieldErrors.firstName}
                  aria-describedby={fieldErrors.firstName ? 'ccm-firstName-error' : undefined}
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.firstName && <FieldError id="ccm-firstName-error">{fieldErrors.firstName}</FieldError>}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-lastName">Last Name *</FieldLabel>
                <StyledInput
                  id="ccm-lastName"
                  autoComplete="family-name"
                  $error={!!fieldErrors.lastName}
                  aria-describedby={fieldErrors.lastName ? 'ccm-lastName-error' : undefined}
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.lastName && <FieldError id="ccm-lastName-error">{fieldErrors.lastName}</FieldError>}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-email">Email *</FieldLabel>
                <StyledInput
                  id="ccm-email"
                  type="email"
                  autoComplete="email"
                  $error={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'ccm-email-error' : undefined}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={loading}
                />
                {fieldErrors.email && <FieldError id="ccm-email-error">{fieldErrors.email}</FieldError>}
              </FieldGroup>

              {!isExternal && (
                <FieldGroup>
                  <FieldLabel htmlFor="ccm-username">Username *</FieldLabel>
                  <StyledInput
                    id="ccm-username"
                    autoComplete="off"
                    $error={!!fieldErrors.username}
                    aria-describedby={fieldErrors.username ? 'ccm-username-error' : undefined}
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    disabled={loading}
                  />
                  {fieldErrors.username && <FieldError id="ccm-username-error">{fieldErrors.username}</FieldError>}
                </FieldGroup>
              )}

              {!isExternal && (
                <FieldGroup>
                  <FieldLabel htmlFor="ccm-password">Password *</FieldLabel>
                  <StyledInput
                    id="ccm-password"
                    type="password"
                    autoComplete="new-password"
                    $error={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'ccm-password-error' : undefined}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={loading}
                  />
                  {fieldErrors.password && <FieldError id="ccm-password-error">{fieldErrors.password}</FieldError>}
                </FieldGroup>
              )}

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
                <FieldLabel htmlFor="ccm-weight">Weight (lbs)</FieldLabel>
                <StyledInput
                  id="ccm-weight"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={formData.weight ?? ''}
                  onChange={(e) => handleInputChange('weight', parseOptionalPositiveNumber(e.target.value))}
                  disabled={loading}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-height-feet">Height (ft)</FieldLabel>
                <StyledInput
                  id="ccm-height-feet"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="8"
                  step="1"
                  value={heightFeet}
                  onChange={(e) => setHeightFeet(e.target.value)}
                  disabled={loading}
                />
              </FieldGroup>

              <FieldGroup>
                <FieldLabel htmlFor="ccm-height-inches">Height (in)</FieldLabel>
                <StyledInput
                  id="ccm-height-inches"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="11"
                  step="1"
                  value={heightInches}
                  onChange={(e) => setHeightInches(e.target.value)}
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

              {/* Training Setup — only for SwanStudios clients */}
              {!isExternal && (
                <>
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
                </>
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
      {discardOpen && (
        <DiscardOverlay>
          <DiscardDialog role="dialog" aria-modal="true" aria-label="Discard client draft">
            <DiscardTitle>Discard client draft?</DiscardTitle>
            <DiscardCopy>
              You have client onboarding details started. Keep editing to preserve the draft, or discard it and close this modal.
            </DiscardCopy>
            <DiscardActions>
              <SecondaryButton type="button" onClick={() => setDiscardOpen(false)}>
                Keep editing
              </SecondaryButton>
              <PrimaryButton type="button" onClick={confirmDiscard}>
                Discard client draft
              </PrimaryButton>
            </DiscardActions>
          </DiscardDialog>
        </DiscardOverlay>
      )}
    </ModalOverlay>
  );
};

export default CreateClientModal;
