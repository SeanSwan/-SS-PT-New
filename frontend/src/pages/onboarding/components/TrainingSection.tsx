import React from "react";
import { FieldGroup, InputField } from "../../../components/form";
import { useUniversalTheme } from "../../../context/ThemeContext/UniversalThemeContext";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const TrainingSection: React.FC<{
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
      <FieldGroup label="Current Workout Frequency (per week)">
        <InputField
          name="workoutsPerWeek"
          type="number"
          value={formData.workoutsPerWeek || ""}
          onChange={handleChange}
          placeholder="e.g. 3"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Workout Types">
        <InputField
          name="workoutTypes"
          value={formData.workoutTypes || ""}
          onChange={handleChange}
          placeholder="e.g. Strength training, Cardio"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Favorite Exercises">
        <InputField
          name="favoriteExercises"
          value={formData.favoriteExercises || ""}
          onChange={handleChange}
          placeholder="e.g. Squats, Deadlifts"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default TrainingSection;