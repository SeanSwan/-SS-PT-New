import React from "react";
import { FieldGroup, InputField, TextAreaField } from "../../../components/form";
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
          placeholder="e.g. Fat loss, muscle gain, strength, athletic performance"
        />
      </FieldGroup>

      <FieldGroup label="Why This Goal Matters To You">
        <TextAreaField
          name="whyGoalMatters"
          value={formData.whyGoalMatters || ""}
          onChange={handleChange}
          placeholder="What's driving you to make this change?"
          rows={3}
        />
      </FieldGroup>

      <FieldGroup label="What Does Success Look Like In 6 Months?">
        <TextAreaField
          name="successIn6Months"
          value={formData.successIn6Months || ""}
          onChange={handleChange}
          placeholder="Describe your vision — be specific"
          rows={3}
        />
      </FieldGroup>

      <FieldGroup label="Desired Timeline">
        <InputField
          name="desiredTimeline"
          value={formData.desiredTimeline || ""}
          onChange={handleChange}
          placeholder="3 months, 6 months, 1 year"
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default GoalsSection;
