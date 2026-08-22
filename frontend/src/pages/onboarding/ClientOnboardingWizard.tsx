import React, { useState, useEffect, useRef, Suspense } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useUniversalTheme } from "../../context/ThemeContext/UniversalThemeContext";
import { useNavigate } from "react-router-dom";
import apiService from "../../services/api.service";
import { grantConsent } from "../../services/aiConsentService";
import { logger } from '@/utils/logger';
import {
  getOnboardingAccessModalCopy,
  getOnboardingResetUrlToCopy,
  getOnboardingAccessStatusLabel,
} from "./ClientOnboardingAccessHandoff";
import { StyledBox } from '@/components/ui/StyledBox';
import { useAuth } from "../../context/AuthContext";
import { readDraft, writeDraft, clearDraft } from "./useOnboardingDraft";
import { AI_CONSENT_CLIENT_ID_NOTE } from '../../content/aiConsentCopy';

/* ── Lazy-loaded wizard sections (code-split for FCP) ── */
const BasicInfo = React.lazy(() => import("./components/BasicInfoSection"));
const HealthSection = React.lazy(() => import("./components/HealthSection"));
const GoalsSection = React.lazy(() => import("./components/GoalsSection"));
const NutritionSection = React.lazy(() => import("./components/NutritionSection"));
const LifestyleSection = React.lazy(() => import("./components/LifestyleSection"));
const TrainingSection = React.lazy(() => import("./components/TrainingSection"));
const ConsentSection = React.lazy(() => import("./components/ConsentSection"));
const SummarySection = React.lazy(() => import("./components/SummarySection"));

/* ── Step definitions (outside component to avoid re-creation on every render) ── */
const WIZARD_STEPS = [
  { id: 1, label: "Basic Info", component: BasicInfo },
  { id: 2, label: "Goals", component: GoalsSection },
  { id: 3, label: "Health", component: HealthSection },
  { id: 4, label: "Nutrition", component: NutritionSection },
  { id: 5, label: "Lifestyle", component: LifestyleSection },
  { id: 6, label: "Training", component: TrainingSection },
  { id: 7, label: "Swan Coach Consent", component: ConsentSection },
  { id: 8, label: "Summary", component: SummarySection },
] as const;

/* ── Crystalline Swan theme tokens ── */
const MIDNIGHT_SAPPHIRE = "#002060";
const ROYAL_DEPTH = "#003080";
const WING_PURPLE = "#8B5CF6";
const ICE_WING = "#60C0F0";
const FROST_WHITE = "#E0ECF4";
/* Legacy aliases for downstream references */

const SWAN_CYAN = WING_PURPLE;
const COSMIC_PURPLE = WING_PURPLE;

const cyanPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.1); }
  50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.2); }
`;

const WizardContainer = styled.div<{ $embedded?: boolean }>`
  min-height: ${(props) => (props.$embedded ? "auto" : "100vh")};
  background: ${(props) =>
    props.$embedded
      ? "transparent"
      : `radial-gradient(circle at top right, rgba(96, 192, 240, 0.1) 0%, transparent 40%),
         linear-gradient(135deg, ${MIDNIGHT_SAPPHIRE} 0%, ${ROYAL_DEPTH} 100%)`};
  padding: ${(props) => (props.$embedded ? "0" : "2rem")};
  display: flex;
  justify-content: center;
  align-items: ${(props) => (props.$embedded ? "stretch" : "center")};
`;

const WizardCard = styled(motion.div)`
  background: rgba(0, 48, 128, 0.7);
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255,255,255,0.05);
  border: 1px solid rgba(96, 192, 240, 0.2);
  padding: 2.5rem;
  max-width: 900px;
  width: 100%;
  backdrop-filter: blur(20px);
  animation: ${cyanPulse} 4s ease-in-out infinite;

  @supports not (backdrop-filter: blur(20px)) {
    background: rgba(0, 48, 128, 0.92);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @media (max-width: 768px) {
    padding: 1.5rem 1.25rem;
    border-radius: 16px;
  }
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  margin-bottom: 2rem;
  overflow: hidden;
`;

const ProgressBar = styled(motion.div)`
  height: 100%;
  background: linear-gradient(90deg, #50A0F0, ${WING_PURPLE});
  border-radius: 10px;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
  gap: 0;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 0.35rem;
  }
`;

const Step = styled.button<{ $active: boolean; $completed: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  padding: 0;
  border: 2px solid
    ${(props) => {
      if (props.$completed) return SWAN_CYAN;
      if (props.$active) return COSMIC_PURPLE;
      return "rgba(255, 255, 255, 0.15)";
    }};
  background: ${(props) => {
    if (props.$completed) return "rgba(139, 92, 246, 0.15)";
    if (props.$active) return "rgba(139, 92, 246, 0.25)";
    return "rgba(255, 255, 255, 0.03)";
  }};
  color: ${(props) => {
    if (props.$completed) return SWAN_CYAN;
    if (props.$active) return "#ffffff";
    return "rgba(255, 255, 255, 0.35)";
  }};
  cursor: ${(props) => (props.$completed ? "pointer" : "default")};
  transition: all 0.3s ease;
  will-change: box-shadow;
  ${(props) => props.$active && `
    box-shadow: 0 0 16px rgba(139, 92, 246, 0.4);
    border-color: ${WING_PURPLE};
  `}
  ${(props) => props.$completed && `
    border-color: ${ICE_WING};
    color: ${ICE_WING};
  `}

  &:hover {
    transform: ${(props) => (props.$completed ? "scale(1.12)" : "none")};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    will-change: auto;
  }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    min-width: 44px;
    min-height: 44px;
    font-size: 0.75rem;
  }
`;

const StepConnector = styled.div<{ $completed: boolean }>`
  width: 24px;
  height: 2px;
  background: ${(props) =>
    props.$completed
      ? `linear-gradient(90deg, ${SWAN_CYAN}, ${COSMIC_PURPLE})`
      : "rgba(255, 255, 255, 0.1)"};
  transition: background 0.3s ease;

  @media (max-width: 768px) {
    display: none;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2.5rem;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Button = styled.button<{ $variant?: "primary" | "secondary" }>`
  padding: 0.875rem 2rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  min-height: 48px;

  ${(props) =>
    props.$variant === "primary"
      ? `
    background: ${WING_PURPLE};
    color: #FFFFFF;
    font-weight: 600;
    box-shadow: 0 4px 18px rgba(139, 92, 246, 0.35);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(96, 192, 240, 0.4);
    }
  `
      : `
    background: rgba(255, 255, 255, 0.06);
    color: ${FROST_WHITE};
    border: 1px solid rgba(96, 192, 240, 0.3);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: ${ICE_WING};
    }
  `}

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    &:hover {
      transform: none;
    }
  }
`;

const Title = styled.h1`
  font-size: 2.2rem;
  font-weight: 800;
  font-family: 'Plus Jakarta Sans', sans-serif;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #FFFFFF, ${FROST_WHITE}, ${ICE_WING});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  letter-spacing: -0.02em;
  filter: drop-shadow(0 0 8px rgba(96, 192, 240, 0.3));

  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  color: ${ICE_WING};
  text-align: center;
  margin-bottom: 1.5rem;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 50, 50, 0.12);
  border: 1px solid rgba(255, 50, 50, 0.4);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  color: #ff6b6b;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &::before {
    content: "!";
    font-size: 1.2rem;
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 32, 96, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 2rem;

  @supports not (backdrop-filter: blur(8px)) {
    background: rgba(0, 32, 96, 0.95);
  }
`;

const ModalContent = styled(motion.div)`
  background: ${ROYAL_DEPTH};
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  backdrop-filter: blur(20px);
  text-align: center;

  @supports not (backdrop-filter: blur(20px)) {
    background: rgba(0, 48, 128, 0.98);
  }

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

const ModalTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 800;
  font-family: 'Plus Jakarta Sans', sans-serif;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #FFFFFF, ${FROST_WHITE}, ${ICE_WING});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 6px rgba(96, 192, 240, 0.3));
`;

const ModalText = styled.p`
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.75rem;
  line-height: 1.6;
`;

const HighlightText = styled.span`
  font-weight: 700;
  color: ${ICE_WING};
  font-size: 1.2rem;
`;

const CredentialsBox = styled.div`
  background: rgba(0, 32, 96, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  text-align: left;
`;

const CredentialRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  color: rgba(255, 255, 255, 0.9);

  &:last-child {
    margin-bottom: 0;
  }
`;

const CredLabel = styled.span`
  font-weight: 600;
  margin-right: 1rem;
  color: rgba(255, 255, 255, 0.7);
`;

const CredValue = styled.span`
  font-family: "Fira Code", "Courier New", monospace;
  font-size: 1rem;
  color: ${ICE_WING};
`;

const ResetLinkValue = styled(CredValue)`
  flex: 1 1 100%;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: 0.82rem;
  line-height: 1.45;
`;

const CopyResetLinkButton = styled.button`
  min-height: 44px;
  padding: 0.65rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(96, 192, 240, 0.35);
  background: rgba(96, 192, 240, 0.12);
  color: ${FROST_WHITE};
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: rgba(96, 192, 240, 0.2);
  }
`;

const ResetLinkCopyStatus = styled.p`
  margin: 0.75rem 0 0;
  color: ${FROST_WHITE};
  font-size: 0.9rem;
  line-height: 1.45;
`;

interface ClientOnboardingWizardProps {
  embedded?: boolean;
  selfSubmit?: boolean;
  onComplete?: (result: any) => void;
  onCancel?: () => void;
  /** Admin override: custom submit handler (bypasses default API call) */
  onSubmit?: (formData: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  /** Pre-populate wizard with existing draft data */
  initialData?: Record<string, any>;
  /** Called on step navigation with current step index and form data */
  onStepChange?: (stepIndex: number, formData: any) => void;
  /** Called whenever form data changes within a step */
  onFormDataChange?: (formData: any) => void;
  /** Skip the built-in success modal (admin flow shows its own feedback) */
  skipSuccessModal?: boolean;
}

const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
  embedded = false,
  selfSubmit = false,
  onComplete,
  onCancel,
  onSubmit,
  initialData,
  onStepChange,
  onFormDataChange,
  skipSuccessModal = false,
}) => {
  // Force dark mode for this wizard (Crystalline Swan is always dark)
  const _themeCtx = useUniversalTheme();
  void _themeCtx; // consumed but we always render dark
  const navigate = useNavigate();
  const { user } = useAuth();

  // Draft persistence applies ONLY to a client filling in their own assessment.
  // Staff creating a client (onSubmit / !selfSubmit) must never restore someone
  // else's half-finished answers into a fresh client record.
  //
  // A REAL user id is required. Falling back to an "anonymous" key would let two
  // different clients sharing one browser inherit each other's health answers
  // (rule 8), and would strand a draft written before auth resolved.
  const draftUserId = user?.id ?? null;
  const draftEnabled = selfSubmit && !onSubmit && draftUserId !== null;
  const restoredDraft = useRef(draftEnabled ? readDraft(draftUserId) : null);

  // Clamp the restored step: a draft saved against an older/longer version of
  // the wizard would otherwise index past the end and crash on
  // `steps[currentStep].component`.
  const restoredStep = Math.min(
    Math.max(restoredDraft.current?.currentStep ?? 0, 0),
    WIZARD_STEPS.length - 1
  );

  const [currentStep, setCurrentStep] = useState(restoredStep);
  const [formData, setFormData] = useState<any>(
    initialData || restoredDraft.current?.formData || {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [copiedResetLink, setCopiedResetLink] = useState(false);
  const [resetLinkCopyStatus, setResetLinkCopyStatus] = useState('');

  // Persist the in-progress assessment to the client's own device so closing a
  // tab at section 6 does not destroy everything (launch audit S4, 2026-07-27).
  useEffect(() => {
    if (!draftEnabled) return;
    writeDraft(draftUserId, { formData, currentStep });
  }, [draftEnabled, draftUserId, formData, currentStep]);

  const steps = WIZARD_STEPS;
  const CurrentSection = steps[currentStep].component as React.ComponentType<any>;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isStaffCreationFlow = !selfSubmit && !onSubmit;
  const completionRoute = isStaffCreationFlow ? "/dashboard/admin/client-management" : "/dashboard/client/overview";
  const completionCtaLabel = isStaffCreationFlow ? "Back to Client Hub" : "Go to Dashboard";
  const accessStatusLabel = getOnboardingAccessStatusLabel(submissionResult);
  const accessModalCopy = getOnboardingAccessModalCopy(submissionResult);
  const resetUrlToCopy = getOnboardingResetUrlToCopy(submissionResult);

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    setCopiedResetLink(false);
    setResetLinkCopyStatus('');
    if (!onComplete) {
      navigate(completionRoute);
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep, formData);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      onStepChange?.(newStep, formData);
    }
  };

  const handleJumpToStep = (index: number) => {
    if (index <= currentStep) {
      setCurrentStep(index);
      onStepChange?.(index, formData);
    }
  };

  const updateFormData = (sectionData: any) => {
    const merged = { ...formData, ...sectionData };
    setFormData(merged);
    onFormDataChange?.(merged);
  };

  const handleCopyResetLink = async () => {
    const resetUrl = resetUrlToCopy || "";
    if (!resetUrl) return;

    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(resetUrl);
      setCopiedResetLink(true);
      setResetLinkCopyStatus("Reset link copied.");
    } catch {
      setCopiedResetLink(false);
      setResetLinkCopyStatus("Clipboard unavailable. Select and copy the reset link manually.");
    }
  };

  const handleExit = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate("/");
  };

  /**
   * After successful onboarding, grant AI consent if the user opted in.
   * Non-blocking: consent failure doesn't break onboarding.
   */
  const maybeGrantAiConsent = async () => {
    if (formData?.aiConsentGranted) {
      try {
        await grantConsent();
      } catch {
        // Consent grant is best-effort during onboarding.
        // User can always grant later from AI Privacy & Consent page.
        logger.warn('[Onboarding] AI consent grant failed — user can grant later.');
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setCopiedResetLink(false);
    setResetLinkCopyStatus("");

    try {
      // Admin override: use custom onSubmit handler if provided
      if (onSubmit) {
        const result = await onSubmit(formData);
        if (result.success) {
          // Skip self-consent grant in admin flow — admin creates the profile
          // server-side; calling grantConsent() here would try to grant consent
          // for the admin's own account (no userId param), which is incorrect.
          if (skipSuccessModal) {
            onComplete?.(result.data);
          } else {
            setSubmissionResult(result.data);
            setShowSuccessModal(true);
            onComplete?.(result.data);
          }
        } else {
          setError(result.error || "Submission failed");
        }
        setIsSubmitting(false);
        return;
      }

      // Default client-facing API path
      const endpoint = selfSubmit ? "/api/onboarding/self" : "/api/onboarding";
      const response = await apiService.post(endpoint, formData);
      const data = response.data;

      if (!data.success) {
        setError(data.error || data.message || "Submission failed. Please try again.");
      } else {
        // Answers are now persisted server-side — do not leave health/injury
        // responses sitting in device storage (rule 8).
        if (draftEnabled) clearDraft(draftUserId);
        await maybeGrantAiConsent();
        setSubmissionResult(data.data);
        setShowSuccessModal(true);
        if (onComplete) {
          onComplete(data.data);
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || "Network error. Please check your connection and try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WizardContainer $embedded={embedded}>
      <WizardCard
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Title>Client Onboarding</Title>
        <Subtitle>
          Step {currentStep + 1} of {steps.length} &mdash; {steps[currentStep].label}
        </Subtitle>

        <ProgressBarContainer>
          <ProgressBar
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </ProgressBarContainer>

        <StepIndicator>
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <Step
                $active={index === currentStep}
                $completed={index < currentStep}
                onClick={() => handleJumpToStep(index)}
                aria-label={`Go to step ${index + 1}: ${step.label}`}
                aria-current={index === currentStep ? 'step' : undefined}
                type="button"
              >
                {index < currentStep ? "\u2713" : index + 1}
              </Step>
              {index < steps.length - 1 && (
                <StepConnector $completed={index < currentStep} />
              )}
            </React.Fragment>
          ))}
        </StepIndicator>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            <Suspense fallback={<StyledBox as="div" $style={{ textAlign: 'center', padding: '2rem', color: FROST_WHITE }}>Loading...</StyledBox>}>
              <CurrentSection formData={formData} updateFormData={updateFormData} data={formData} updateData={updateFormData} />
            </Suspense>
          </motion.div>
        </AnimatePresence>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonGroup>
          <Button
            $variant="secondary"
            onClick={currentStep === 0 ? handleExit : handlePrev}
            disabled={isSubmitting}
          >
            {currentStep === 0 ? "Cancel" : "Previous"}
          </Button>
          <Button
            $variant="primary"
            onClick={currentStep === steps.length - 1 ? handleSubmit : handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Submitting..."
              : currentStep === steps.length - 1
              ? "Submit Onboarding"
              : "Next"}
          </Button>
        </ButtonGroup>
      </WizardCard>

      <AnimatePresence>
        {showSuccessModal && submissionResult && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onPointerDown={(event) => { if (event.target === event.currentTarget) handleSuccessModalClose(); }}
          >
            <ModalContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="client-onboarding-success-title"
            >
              <ModalTitle id="client-onboarding-success-title">Welcome to SwanStudios!</ModalTitle>

              <ModalText>
                Your onboarding is complete. {AI_CONSENT_CLIENT_ID_NOTE}
              </ModalText>

              <HighlightText>
                {submissionResult.clientId || `Client #${submissionResult.userId}`}
              </HighlightText>

              <CredentialsBox>
                <CredentialRow>
                  <CredLabel>Client ID:</CredLabel>
                  <CredValue>{submissionResult.clientId}</CredValue>
                </CredentialRow>
                <CredentialRow>
                  <CredLabel>Email:</CredLabel>
                  <CredValue>{submissionResult.email}</CredValue>
                </CredentialRow>
                {accessStatusLabel && (
                  <CredentialRow>
                    <CredLabel>Access:</CredLabel>
                    <CredValue>{accessStatusLabel}</CredValue>
                  </CredentialRow>
                )}
                {resetUrlToCopy && (
                  <CredentialRow>
                    <CredLabel>Reset Link:</CredLabel>
                    <CopyResetLinkButton type="button" onClick={handleCopyResetLink}>
                      {copiedResetLink ? "Copied" : "Copy reset link"}
                    </CopyResetLinkButton>
                    <ResetLinkValue>{resetUrlToCopy}</ResetLinkValue>
                  </CredentialRow>
                )}
                {resetLinkCopyStatus && (
                  <ResetLinkCopyStatus role="status" aria-live="polite">
                    {resetLinkCopyStatus}
                  </ResetLinkCopyStatus>
                )}

              </CredentialsBox>
              <ModalText>{accessModalCopy}</ModalText>
              <StyledBox as={Button}
                $variant="primary"
                onPointerDown={(event) => { if (event.target === event.currentTarget) handleSuccessModalClose(); }}
                $style={{ marginTop: "1.5rem" }}
              >
                {completionCtaLabel}
              </StyledBox>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </WizardContainer>
  );
};

export default ClientOnboardingWizard;
