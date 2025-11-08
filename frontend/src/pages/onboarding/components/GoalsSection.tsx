import React from "react";
import { FieldGroup, InputField, TextAreaField } from "../../../components/form";
import { useUniversalTheme } from "../../../context/ThemeContext/UniversalThemeContext";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const GoalsSection: React.FC<{
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
      <FieldGroup label="Primary Goal" required>
        <InputField
          name="primaryGoal"
          value={formData.primaryGoal || ""}
          onChange={handleChange}
          placeholder="Weight loss, muscle gain, etc."
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Why This Goal Matters To You">
        <TextAreaField
          name="whyGoalMatters"
          value={formData.whyGoalMatters || ""}
          onChange={handleChange}
          placeholder="Explain why achieving this goal is important to you"
          rows={3}
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="What Success Looks Like In 6 Months">
        <TextAreaField
          name="successIn6Months"
          value={formData.successIn6Months || ""}
          onChange={handleChange}
          placeholder="Describe your vision of success"
          rows={3}
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Desired Timeline">
        <InputField
          name="desiredTimeline"
          value={formData.desiredTimeline || ""}
          onChange={handleChange}
          placeholder="3 months, 6 months, etc."
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default GoalsSection;