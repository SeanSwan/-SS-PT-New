import React from "react";
import { FieldGroup, TextAreaField } from "../../../components/form";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const InfoNote = styled.p`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
`;

const SummarySection: React.FC<{
  formData: any;
  updateFormData: (data: any) => void;
}> = ({ formData, updateFormData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  return (
    <SectionContainer>
      <InfoNote>
        You're almost done! Share anything else that will help your trainer build the perfect program for you.
      </InfoNote>

      <FieldGroup label="Anything Else We Should Know?">
        <TextAreaField
          name="additionalNotes"
          value={formData.additionalNotes || ""}
          onChange={handleChange}
          placeholder="Any other information that might be helpful for your trainer"
          rows={4}
        />
      </FieldGroup>

      <FieldGroup label="What Are You Most Excited About?">
        <TextAreaField
          name="mostExcitedAbout"
          value={formData.mostExcitedAbout || ""}
          onChange={handleChange}
          placeholder="What part of your fitness journey excites you most?"
          rows={3}
        />
      </FieldGroup>

      <FieldGroup label="Questions For Your Trainer">
        <TextAreaField
          name="questionsForTrainer"
          value={formData.questionsForTrainer || ""}
          onChange={handleChange}
          placeholder="Any questions you'd like to ask before your first session?"
          rows={3}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default SummarySection;
