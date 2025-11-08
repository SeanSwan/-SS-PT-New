import React from "react";
import { FieldGroup, TextAreaField } from "../../../components/form";
import { useUniversalTheme } from "../../../context/ThemeContext/UniversalThemeContext";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SummarySection: React.FC<{
  formData: any;
  updateFormData: (data: any) => void;
}> = ({ formData, updateFormData }) => {
  const { isDarkMode } = useUniversalTheme();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  return (
    <SectionContainer>
      <FieldGroup label="Anything Else We Should Know?">
        <TextAreaField
          name="additionalNotes"
          value={formData.additionalNotes || ""}
          onChange={handleChange}
          placeholder="Any other information that might be helpful"
          rows={4}
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="What Are You Most Excited About?">
        <TextAreaField
          name="mostExcitedAbout"
          value={formData.mostExcitedAbout || ""}
          onChange={handleChange}
          placeholder="Share your excitement!"
          rows={4}
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Questions For Your Trainer">
        <TextAreaField
          name="questionsForTrainer"
          value={formData.questionsForTrainer || ""}
          onChange={handleChange}
          placeholder="Any questions you'd like to ask?"
          rows={4}
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default SummarySection;