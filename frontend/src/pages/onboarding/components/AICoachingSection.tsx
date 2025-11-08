import React from "react";
import { FieldGroup, InputField } from "../../../components/form";
import { useUniversalTheme } from "../../../context/ThemeContext/UniversalThemeContext";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const AICoachingSection: React.FC<{
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
      <FieldGroup label="Preferred Check-in Method">
        <InputField
          name="checkInMethod"
          value={formData.checkInMethod || ""}
          onChange={handleChange}
          placeholder="e.g. Text, Email, App"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Preferred Check-in Time">
        <InputField
          name="checkInTime"
          type="time"
          value={formData.checkInTime || ""}
          onChange={handleChange}
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="AI Assistance Preferences">
        <InputField
          name="aiHelp"
          value={formData.aiHelp || ""}
          onChange={handleChange}
          placeholder="e.g. Workout reminders, Nutrition tips"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default AICoachingSection;