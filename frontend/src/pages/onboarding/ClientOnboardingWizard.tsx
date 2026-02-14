import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useUniversalTheme } from "../../context/ThemeContext/UniversalThemeContext";
import { useNavigate } from "react-router-dom";
import apiService from "../../services/api.service";

import BasicInfo from "./components/BasicInfoSection";
import HealthSection from "./components/HealthSection";
import GoalsSection from "./components/GoalsSection";
import NutritionSection from "./components/NutritionSection";
import LifestyleSection from "./components/LifestyleSection";
import TrainingSection from "./components/TrainingSection";
import SummarySection from "./components/SummarySection";

/* ── Galaxy-Swan theme tokens ── */
const GALAXY_CORE = "#0a0a1a";
const SWAN_CYAN = "#00FFFF";
const COSMIC_PURPLE = "#7851A9";

const cyanPulse = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 255, 0.1); }
  50% { box-shadow: 0 0 30px rgba(0, 255, 255, 0.2); }
`;

const WizardContainer = styled.div<{ $embedded?: boolean }>`
  min-height: ${(props) => (props.$embedded ? "auto" : "100vh")};
  background: ${(props) =>
    props.$embedded
      ? "transparent"
      : `linear-gradient(135deg, ${GALAXY_CORE} 0%, #1a1a2e 50%, #0f0f23 100%)`};
  padding: ${(props) => (props.$embedded ? "0" : "2rem")};
  display: flex;
  justify-content: center;
  align-items: ${(props) => (props.$embedded ? "stretch" : "center")};
`;

const WizardCard = styled(motion.div)`
  background: rgba(15, 15, 35, 0.92);
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 255, 255, 0.1), inset 0 1px 0 rgba(255,255,255,0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 2.5rem;
  max-width: 900px;
  width: 100%;
  backdrop-filter: blur(20px);
  animation: ${cyanPulse} 4s ease-in-out infinite;

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
  background: linear-gradient(90deg, ${SWAN_CYAN}, ${COSMIC_PURPLE});
  border-radius: 10px;
  box-shadow: 0 0 12px rgba(0, 255, 255, 0.5);
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 2rem;
  gap: 0;
`;

const Step = styled.div<{ $active: boolean; $completed: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  border: 2px solid
    ${(props) => {
      if (props.$completed) return SWAN_CYAN;
      if (props.$active) return COSMIC_PURPLE;
      return "rgba(255, 255, 255, 0.15)";
    }};
  background: ${(props) => {
    if (props.$completed) return "rgba(0, 255, 255, 0.15)";
    if (props.$active) return "rgba(120, 81, 169, 0.25)";
    return "rgba(255, 255, 255, 0.03)";
  }};
  color: ${(props) => {
    if (props.$completed) return SWAN_CYAN;
    if (props.$active) return "#ffffff";
    return "rgba(255, 255, 255, 0.35)";
  }};
  cursor: ${(props) => (props.$completed ? "pointer" : "default")};
  transition: all 0.3s ease;
  ${(props) => props.$active && `box-shadow: 0 0 16px rgba(120, 81, 169, 0.4);`}

  &:hover {
    transform: ${(props) => (props.$completed ? "scale(1.12)" : "none")};
  }

  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
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
    width: 12px;
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
    background: linear-gradient(135deg, ${SWAN_CYAN}, #00aadd);
    color: ${GALAXY_CORE};
    box-shadow: 0 4px 18px rgba(0, 255, 255, 0.35);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(0, 255, 255, 0.5);
    }
  `
      : `
    background: rgba(255, 255, 255, 0.06);
    color: ${SWAN_CYAN};
    border: 1px solid rgba(0, 255, 255, 0.3);

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: ${SWAN_CYAN};
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
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, ${SWAN_CYAN}, ${COSMIC_PURPLE});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  letter-spacing: -0.02em;

  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.55);
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
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(135deg, rgba(15, 15, 35, 0.98) 0%, rgba(25, 25, 55, 0.98) 100%);
  border-radius: 20px;
  padding: 2.5rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 255, 255, 0.25);
  border: 1px solid rgba(0, 255, 255, 0.3);
  backdrop-filter: blur(20px);
  text-align: center;

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

const ModalTitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, ${SWAN_CYAN}, ${COSMIC_PURPLE});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ModalText = styled.p`
  font-size: 1.05rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.75rem;
  line-height: 1.6;
`;

const HighlightText = styled.span`
  font-weight: 700;
  color: ${SWAN_CYAN};
  font-size: 1.2rem;
`;

const CredentialsBox = styled.div`
  background: rgba(0, 255, 255, 0.06);
  border: 1px solid rgba(0, 255, 255, 0.25);
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  text-align: left;
`;

const CredentialRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  font-family: "Courier New", monospace;
  font-size: 1rem;
  color: ${SWAN_CYAN};
`;

interface ClientOnboardingWizardProps {
  embedded?: boolean;
  selfSubmit?: boolean;
  onComplete?: (result: any) => void;
  onCancel?: () => void;
}

const ClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
  embedded = false,
  selfSubmit = false,
  onComplete,
  onCancel,
}) => {
  // Force dark mode for this wizard (Galaxy-Swan is always dark)
  const _themeCtx = useUniversalTheme();
  void _themeCtx; // consumed but we always render dark
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const steps = [
    { id: 1, label: "Basic Info", component: BasicInfo },
    { id: 2, label: "Goals", component: GoalsSection },
    { id: 3, label: "Health", component: HealthSection },
    { id: 4, label: "Nutrition", component: NutritionSection },
    { id: 5, label: "Lifestyle", component: LifestyleSection },
    { id: 6, label: "Training", component: TrainingSection },
    { id: 7, label: "Summary", component: SummarySection },
  ];

  const CurrentSection = steps[currentStep].component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleJumpToStep = (index: number) => {
    if (index <= currentStep) {
      setCurrentStep(index);
    }
  };

  const updateFormData = (sectionData: any) => {
    setFormData({ ...formData, ...sectionData });
  };

  const handleExit = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate("/");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = selfSubmit ? "/api/onboarding/self" : "/api/onboarding";
      const response = await apiService.post(endpoint, formData);
      const data = response.data;

      if (!data.success) {
        setError(data.error || data.message || "Submission failed. Please try again.");
      } else {
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
                title={step.label}
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
            <CurrentSection formData={formData} updateFormData={updateFormData} />
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
            onClick={() => {
              setShowSuccessModal(false);
              if (!onComplete) {
                navigate("/client-dashboard");
              }
            }}
          >
            <ModalContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalTitle>Welcome to SwanStudios!</ModalTitle>

              <ModalText>
                Your onboarding is complete. You have been assigned a Spirit Name:
              </ModalText>

              <HighlightText>
                {submissionResult.spiritName}
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
                {submissionResult.tempPassword && (
                  <CredentialRow>
                    <CredLabel>Temporary Password:</CredLabel>
                    <CredValue>{submissionResult.tempPassword}</CredValue>
                  </CredentialRow>
                )}
              </CredentialsBox>

              <ModalText>
                {submissionResult.tempPassword
                  ? "Please save your temporary password. You will be asked to change it on first login."
                  : "Your login credentials have been sent to your email."}
              </ModalText>

              <Button
                $variant="primary"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (!onComplete) {
                    navigate("/client-dashboard");
                  }
                }}
                style={{ marginTop: "1.5rem" }}
              >
                Go to Dashboard
              </Button>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </WizardContainer>
  );
};

export default ClientOnboardingWizard;
