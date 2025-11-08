import React from "react";
import { FieldGroup, InputField } from "../../../components/form";
import { useUniversalTheme } from "../../../context/ThemeContext/UniversalThemeContext";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PackageSection: React.FC<{
  formData: any;
  updateFormData: (data: any) => void;
}> = ({ formData, updateFormData }) => {
  const { isDarkMode } = useUniversalTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  return (
    <SectionContainer>
      <FieldGroup label="Preferred Training Package">
        <InputField
          name="trainingPackage"
          value={formData.trainingPackage || ""}
          onChange={handleChange}
          placeholder="e.g. Platinum, Gold, Silver"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Sessions Per Week">
        <InputField
          name="sessionsPerWeek"
          type="number"
          value={formData.sessionsPerWeek || ""}
          onChange={handleChange}
          placeholder="e.g. 3"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Session Duration (minutes)">
        <InputField
          name="sessionDuration"
          type="number"
          value={formData.sessionDuration || ""}
          onChange={handleChange}
          placeholder="e.g. 60"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default PackageSection;