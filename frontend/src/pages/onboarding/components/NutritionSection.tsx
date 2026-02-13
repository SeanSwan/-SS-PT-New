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

const NutritionSection: React.FC<{
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
        <FieldGroup label="Meals Per Day">
          <InputField
            name="mealsPerDay"
            type="number"
            value={formData.mealsPerDay || ""}
            onChange={handleChange}
            placeholder="e.g. 3"
          />
        </FieldGroup>
        <FieldGroup label="Water Intake (oz/day)">
          <InputField
            name="waterIntake"
            type="number"
            value={formData.waterIntake || ""}
            onChange={handleChange}
            placeholder="e.g. 64"
          />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Dietary Preferences or Restrictions">
        <InputField
          name="dietaryPreferences"
          value={formData.dietaryPreferences || ""}
          onChange={handleChange}
          placeholder="e.g. Vegetarian, Gluten-free, High protein"
        />
      </FieldGroup>

      <FieldGroup label="Food Allergies">
        <InputField
          name="foodAllergies"
          value={formData.foodAllergies || ""}
          onChange={handleChange}
          placeholder="e.g. Peanuts, Shellfish, None"
        />
      </FieldGroup>

      <FieldGroup label="Typical Daily Diet (optional)">
        <TextAreaField
          name="typicalDiet"
          value={formData.typicalDiet || ""}
          onChange={handleChange}
          placeholder="Briefly describe what you eat on a typical day"
          rows={3}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default NutritionSection;
