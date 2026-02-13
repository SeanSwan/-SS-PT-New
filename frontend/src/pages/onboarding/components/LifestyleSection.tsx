import React from "react";
import { FieldGroup, InputField } from "../../../components/form";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const LifestyleSection: React.FC<{
  formData: any;
  updateFormData: (data: any) => void;
}> = ({ formData, updateFormData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  return (
    <SectionContainer>
      <FieldRow>
        <FieldGroup label="Average Sleep (hours/night)">
          <InputField
            name="sleepHours"
            type="number"
            value={formData.sleepHours || ""}
            onChange={handleChange}
            placeholder="e.g. 7"
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
            placeholder="1 = low, 10 = high"
          />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Occupation">
        <InputField
          name="occupation"
          value={formData.occupation || ""}
          onChange={handleChange}
          placeholder="e.g. Software Engineer, Teacher, Nurse"
        />
      </FieldGroup>

      <FieldGroup label="Activity Level Outside of Training">
        <InputField
          name="activityLevel"
          value={formData.activityLevel || ""}
          onChange={handleChange}
          placeholder="e.g. Sedentary desk job, Active on feet all day"
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default LifestyleSection;
