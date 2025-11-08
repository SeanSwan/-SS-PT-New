import React from "react";
import { FieldGroup, InputField, TextAreaField } from "../../../components/form";
import { useUniversalTheme } from "../../../context/ThemeContext/UniversalThemeContext";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const HealthSection: React.FC<{
  formData: any;
  updateFormData: (data: any) => void;
}> = ({ formData, updateFormData }) => {
  const { isDarkMode } = useUniversalTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  return (
    <SectionContainer>
      <FieldGroup label="Medical Conditions">
        <TextAreaField
          name="medicalConditions"
          value={formData.medicalConditions || ""}
          onChange={handleChange}
          placeholder="List any medical conditions"
          rows={3}
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Current Medications">
        <TextAreaField
          name="medications"
          value={formData.medications || ""}
          onChange={handleChange}
          placeholder="List any current medications"
          rows={3}
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Injuries">
        <TextAreaField
          name="injuries"
          value={formData.injuries || ""}
          onChange={handleChange}
          placeholder="List any past or current injuries"
          rows={3}
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default HealthSection;