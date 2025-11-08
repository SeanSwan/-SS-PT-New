import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { motion, AnimatePresence } from "framer-motion";
import { useUniversalTheme } from "../../context/ThemeContext/UniversalThemeContext";
import { useNavigate } from "react-router-dom";

// Section imports
import BasicInfo from "./components/BasicInfoSection";
import HealthSection from "./components/HealthSection";
import GoalsSection from "./components/GoalsSection";
import NutritionSection from "./components/NutritionSection";
import LifestyleSection from "./components/LifestyleSection";
import TrainingSection from "./components/TrainingSection";
import AICoachingSection from "./components/AICoachingSection";
import PackageSection from "./components/PackageSection";
import SummarySection from "./components/SummarySection";

// Keyframes
const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`;

// Styled Components
const WizardContainer = styled.div<{ $isDarkMode: boolean }>`
  min-height: 100vh;
  background: ${(props) =>
    props.$isDarkMode
      ? "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f23 100%)"
      : "linear-gradient(135deg, #f0f4f8 0%, #d9e2ec 50%, #bcccdc 100%)"};
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const WizardCard = styled(motion.div)<{ $isDarkMode: boolean }>`
  background: ${(props) =>
    props.$isDarkMode
      ? "rgba(20, 20, 40, 0.95)"
      : "rgba(255, 255, 255, 0.95)"};
  border-radius: 24px;
  box-shadow: ${(props) =>
    props.$isDarkMode
      ? "0 20px 60px rgba(0, 255, 255, 0.3)"
      : "0 20px 60px rgba(0, 0, 0, 0.15)"};
  border: 2px solid
    ${(props) => (props.$isDarkMode ? "rgba(0, 255, 255, 0.3)" : "rgba(100, 150, 200, 0.3)")};
  padding: 3rem;
  max-width: 900px;
  width: 100%;
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    border-radius: 16px;
  }
`;

const ProgressBarContainer = styled.div<{ $isDarkMode: boolean }>`
  width: 100%;
  height: 8px;
  background: ${(props) =>
    props.$isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  border-radius: 10px;
  margin-bottom: 2rem;
  overflow: hidden;
`;

const ProgressBar = styled(motion.div)<{ $isDarkMode: boolean }>`
  height: 100%;
  background: ${(props) =>
    props.$isDarkMode
      ? "linear-gradient(90deg, #00ffff, #00ccff, #0099ff)"
      : "linear-gradient(90deg, #4CAF50, #45a049, #3d8b40)"};
  border-radius: 10px;
  box-shadow: 0 0 20px
    ${(props) => (props.$isDarkMode ? "rgba(0, 255, 255, 0.6)" : "rgba(76, 175, 80, 0.6)")};
`;

const StepIndicator = styled.div<{ $isDarkMode: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Step = styled.div<{ $active: boolean; $completed: boolean; $isDarkMode: boolean }>`
  flex: 1;
  min-width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
  border: 2px solid
    ${(props) => {
      if (props.$completed)
        return props.$isDarkMode ? "#00ffff" : "#4CAF50";
      if (props.$active) return props.$isDarkMode ? "#00ccff" : "#2196F3";
      return props.$isDarkMode ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.2)";
    }};
  background: ${(props) => {
    if (props.$completed)
      return props.$isDarkMode
        ? "rgba(0, 255, 255, 0.2)"
        : "rgba(76, 175, 80, 0.2)";
    if (props.$active)
      return props.$isDarkMode
        ? "rgba(0, 204, 255, 0.2)"
        : "rgba(33, 150, 243, 0.2)";
    return "transparent";
  }};
  color: ${(props) => {
    if (props.$completed || props.$active)
      return props.$isDarkMode ? "#00ffff" : "#2196F3";
    return props.$isDarkMode ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)";
  }};
  cursor: ${(props) => (props.$completed ? "pointer" : "default")};
  transition: all 0.3s ease;

  &:hover {
    transform: ${(props) => (props.$completed ? "scale(1.1)" : "none")};
  }

  @media (max-width: 768px) {
    min-width: 50px;
    height: 50px;
    font-size: 0.8rem;
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

const Button = styled.button<{ $variant?: "primary" | "secondary"; $isDarkMode: boolean }>`
  padding: 1rem 2.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;

  ${(props) =>
    props.$variant === "primary"
      ? `
    background: ${
      props.$isDarkMode
        ? "linear-gradient(135deg, #00ffff, #00ccff)"
        : "linear-gradient(135deg, #4CAF50, #45a049)"
    };
    color: ${props.$isDarkMode ? "#0a0a0f" : "#fff"};
    box-shadow: 0 4px 15px ${
      props.$isDarkMode ? "rgba(0, 255, 255, 0.4)" : "rgba(76, 175, 80, 0.4)"
    };

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px ${
        props.$isDarkMode ? "rgba(0, 255, 255, 0.6)" : "rgba(76, 175, 80, 0.6)"
      };
    }
  `
      : `
    background: ${
      props.$isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)"
    };
    color: ${props.$isDarkMode ? "#00ffff" : "#2196F3"};
    border: 2px solid ${props.$isDarkMode ? "#00ffff" : "#2196F3"};

    &:hover {
      background: ${
        props.$isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"
      };
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      transform: none;
    }
  }
`;

const Title = styled.h1<{ $isDarkMode: boolean }>`
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: ${(props) =>
    props.$isDarkMode
      ? "linear-gradient(135deg, #00ffff, #00ccff, #0099ff)"
      : "linear-gradient(135deg, #4CAF50, #2196F3, #9C27B0)"};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const Subtitle = styled.p<{ $isDarkMode: boolean }>`
  font-size: 1.1rem;
  color: ${(props) =>
    props.$isDarkMode ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.6)"};
  text-align: center;
  margin-bottom: 2rem;
`;

const ErrorMessage = styled.div<{ $isDarkMode: boolean }>`
  background: ${(props) =>
    props.$isDarkMode ? "rgba(255, 50, 50, 0.2)" : "rgba(255, 50, 50, 0.1)"};
  border: 2px solid #ff3232;
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  color: ${(props) => (props.$isDarkMode ? "#ff6b6b" : "#d32f2f")};
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  &::before {
    content: "⚠️";
    font-size: 1.2rem;
  }
`;

const ModalOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContent = styled(motion.div)<{ $isDarkMode: boolean }>`
  background: ${(props) =>
    props.$isDarkMode
      ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
      : "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)"};
  border-radius: 24px;
  padding: 3rem;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 255, 255, 0.4);
  border: 2px solid ${(props) => (props.$isDarkMode ? "#00ffff" : "#4CAF50")};
  text-align: center;

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
  }
`;

const ModalTitle = styled.h2<{ $isDarkMode: boolean }>`
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 1rem;
  background: ${(props) =>
    props.$isDarkMode
      ? "linear-gradient(135deg, #00ffff, #00ccff)"
      : "linear-gradient(135deg, #4CAF50, #2196F3)"};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const ModalText = styled.p<{ $isDarkMode: boolean }>`
  font-size: 1.1rem;
  color: ${(props) =>
    props.$isDarkMode ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.7)"};
  margin-bottom: 0.75rem;
  line-height: 1.6;
`;

const HighlightText = styled.span<{ $isDarkMode: boolean }>`
  font-weight: 700;
  color: ${(props) => (props.$isDarkMode ? "#00ffff" : "#2196F3")};
  font-size: 1.2rem;
`;

const CredentialsBox = styled.div<{ $isDarkMode: boolean }>`
  background: ${(props) =>
    props.$isDarkMode ? "rgba(0, 255, 255, 0.1)" : "rgba(33, 150, 243, 0.1)"};
  border: 2px solid ${(props) => (props.$isDarkMode ? "#00ffff" : "#2196F3")};
  border-radius: 12px;
  padding: 1.5rem;
  margin: 1.5rem 0;
  text-align: left;
`;

const CredentialRow = styled.div<{ $isDarkMode: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  color: ${(props) =>
    props.$isDarkMode ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.8)"};

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.span`
  font-weight: 600;
  margin-right: 1rem;
`;

const Value = styled.span<{ $isDarkMode: boolean }>`
  font-family: monospace;
  font-size: 1rem;
  color: ${(props) => (props.$isDarkMode ? "#00ffff" : "#2196F3")};
`;

// Main Component
const ClientOnboardingWizard: React.FC = () => {
  const { isDarkMode } = useUniversalTheme();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const steps = [
    { id: 1, label: "Basic", component: BasicInfo },
    { id: 2, label: "Goals", component: GoalsSection },
    { id: 3, label: "Health", component: HealthSection },
    { id: 4, label: "Nutrition", component: NutritionSection },
    { id: 5, label: "Lifestyle", component: LifestyleSection },
    { id: 6, label: "Training", component: TrainingSection },
    { id: 7, label: "AI Coach", component: AICoachingSection },
    { id: 8, label: "Package", component: PackageSection },
    { id: 9, label: "Summary", component: SummarySection },
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      setError("You must be logged in to submit onboarding. Please log in first.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || "Submission failed. Please try again.");
      } else {
        setSubmissionResult(data.data);
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WizardContainer $isDarkMode={isDarkMode}>
      <WizardCard
        $isDarkMode={isDarkMode}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Title $isDarkMode={isDarkMode}>Client Onboarding</Title>
        <Subtitle $isDarkMode={isDarkMode}>
          Step {currentStep + 1} of {steps.length} - {steps[currentStep].label}
        </Subtitle>

        <ProgressBarContainer $isDarkMode={isDarkMode}>
          <ProgressBar
            $isDarkMode={isDarkMode}
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </ProgressBarContainer>

        <StepIndicator $isDarkMode={isDarkMode}>
          {steps.map((step, index) => (
            <Step
              key={step.id}
              $active={index === currentStep}
              $completed={index < currentStep}
              $isDarkMode={isDarkMode}
              onClick={() => handleJumpToStep(index)}
              title={step.label}
            >
              {index < currentStep ? "✓" : index + 1}
            </Step>
          ))}
        </StepIndicator>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentSection formData={formData} updateFormData={updateFormData} />
          </motion.div>
        </AnimatePresence>

        {error && <ErrorMessage $isDarkMode={isDarkMode}>{error}</ErrorMessage>}

        <ButtonGroup>
          <Button
            $variant="secondary"
            $isDarkMode={isDarkMode}
            onClick={handlePrev}
            disabled={currentStep === 0 || isSubmitting}
          >
            ← Previous
          </Button>
          <Button
            $variant="primary"
            $isDarkMode={isDarkMode}
            onClick={currentStep === steps.length - 1 ? handleSubmit : handleNext}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Submitting..."
              : currentStep === steps.length - 1
              ? "Submit Onboarding"
              : "Next →"}
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
              navigate("/client-dashboard");
            }}
          >
            <ModalContent
              $isDarkMode={isDarkMode}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ModalTitle $isDarkMode={isDarkMode}>
                Welcome to SwanStudios! 🎉
              </ModalTitle>

              <ModalText $isDarkMode={isDarkMode}>
                Your onboarding is complete! You've been assigned a Spirit Name:
              </ModalText>

              <HighlightText $isDarkMode={isDarkMode}>
                {submissionResult.spiritName}
              </HighlightText>

              <CredentialsBox $isDarkMode={isDarkMode}>
                <CredentialRow $isDarkMode={isDarkMode}>
                  <Label>Client ID:</Label>
                  <Value $isDarkMode={isDarkMode}>{submissionResult.clientId}</Value>
                </CredentialRow>
                <CredentialRow $isDarkMode={isDarkMode}>
                  <Label>Email:</Label>
                  <Value $isDarkMode={isDarkMode}>{submissionResult.email}</Value>
                </CredentialRow>
                {submissionResult.tempPassword && (
                  <CredentialRow $isDarkMode={isDarkMode}>
                    <Label>Temporary Password:</Label>
                    <Value $isDarkMode={isDarkMode}>{submissionResult.tempPassword}</Value>
                  </CredentialRow>
                )}
              </CredentialsBox>

              <ModalText $isDarkMode={isDarkMode}>
                {submissionResult.tempPassword
                  ? "Please save your temporary password. You'll be asked to change it on first login."
                  : "Your login credentials have been sent to your email."}
              </ModalText>

              <Button
                $variant="primary"
                $isDarkMode={isDarkMode}
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/client-dashboard");
                }}
                style={{ marginTop: "1.5rem" }}
              >
                Go to Dashboard →
              </Button>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>
    </WizardContainer>
  );
};

export default ClientOnboardingWizard;