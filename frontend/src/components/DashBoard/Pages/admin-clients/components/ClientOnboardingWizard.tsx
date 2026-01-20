import React from "react";
import ClientOnboardingWizard from "../../../../../pages/onboarding/ClientOnboardingWizard";

interface ClientOnboardingWizardProps {
  onComplete: (client: any) => void;
  onCancel: () => void;
}

const AdminClientOnboardingWizard: React.FC<ClientOnboardingWizardProps> = ({
  onComplete,
  onCancel,
}) => <ClientOnboardingWizard embedded onComplete={onComplete} onCancel={onCancel} />;

export default AdminClientOnboardingWizard;
