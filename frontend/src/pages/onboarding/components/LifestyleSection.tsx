import React from "react";
import { FieldGroup, InputField } from "../../../components/form";
import { useUniversalTheme } from "../../../context/ThemeContext/UniversalThemeContext";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const LifestyleSection: React.FC<{
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
      <FieldGroup label="Average Sleep Hours">
        <InputField
          name="sleepHours"
          type="number"
          value={formData.sleepHours || ""}
          onChange={handleChange}
          placeholder="e.g. 7"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Stress Level (1-10)">
        <InputField
          name="stressLevel"
          type="number"
          min="1"
          max="10"
          value={formData.stressLevel || ""}
          onChange={handleChange}
          placeholder="e.g. 5"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Occupation">
        <InputField
          name="occupation"
          value={formData.occupation || ""}
          onChange={handleChange}
          placeholder="e.g. Software Engineer"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default LifestyleSection;