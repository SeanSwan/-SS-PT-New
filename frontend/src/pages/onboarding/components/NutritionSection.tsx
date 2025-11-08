import React from "react";
import { FieldGroup, InputField } from "../../../components/form";
import { useUniversalTheme } from "../../../context/ThemeContext/UniversalThemeContext";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const NutritionSection: React.FC<{
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
      <FieldGroup label="Daily Protein Intake (grams)">
        <InputField
          name="dailyProtein"
          type="number"
          value={formData.dailyProtein || ""}
          onChange={handleChange}
          placeholder="e.g. 150"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Water Intake (oz per day)">
        <InputField
          name="waterIntake"
          type="number"
          value={formData.waterIntake || ""}
          onChange={handleChange}
          placeholder="e.g. 64"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Dietary Preferences">
        <InputField
          name="dietaryPreferences"
          value={formData.dietaryPreferences || ""}
          onChange={handleChange}
          placeholder="e.g. High protein, Low carb"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default NutritionSection;