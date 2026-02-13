import React from "react";
import { FieldGroup, InputField, TextAreaField } from "../../../components/form";
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

const TrainingSection: React.FC<{
  formData: any;
  updateFormData: (data: any) => void;
}> = ({ formData, updateFormData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  return (
    <SectionContainer>
      <FieldRow>
        <FieldGroup label="Current Workout Frequency (per week)">
          <InputField
            name="workoutsPerWeek"
            type="number"
            value={formData.workoutsPerWeek || ""}
            onChange={handleChange}
            placeholder="e.g. 3"
          />
        </FieldGroup>
        <FieldGroup label="Training Experience">
          <InputField
            name="trainingExperience"
            value={formData.trainingExperience || ""}
            onChange={handleChange}
            placeholder="e.g. Beginner, 2 years, Advanced"
          />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Current Workout Types">
        <InputField
          name="workoutTypes"
          value={formData.workoutTypes || ""}
          onChange={handleChange}
          placeholder="e.g. Strength training, Cardio, Yoga, None"
        />
      </FieldGroup>

      <FieldGroup label="Exercises You Enjoy">
        <InputField
          name="favoriteExercises"
          value={formData.favoriteExercises || ""}
          onChange={handleChange}
          placeholder="e.g. Squats, Deadlifts, Running, Swimming"
        />
      </FieldGroup>

      <FieldGroup label="Exercises You Dislike or Avoid">
        <InputField
          name="dislikedExercises"
          value={formData.dislikedExercises || ""}
          onChange={handleChange}
          placeholder="e.g. Burpees, Running, None"
        />
      </FieldGroup>

      <FieldGroup label="Any Movement Limitations?">
        <TextAreaField
          name="movementLimitations"
          value={formData.movementLimitations || ""}
          onChange={handleChange}
          placeholder="e.g. Limited shoulder mobility, knee pain during squats, none"
          rows={2}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default TrainingSection;
