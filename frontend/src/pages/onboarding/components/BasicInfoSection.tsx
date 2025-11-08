import React from "react";
import { FieldGroup, InputField } from "../../../components/form";
import { useUniversalTheme } from "../../../context/ThemeContext/UniversalThemeContext";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const BasicInfoSection: React.FC<{
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
      <FieldGroup label="Full Name" required>
        <InputField
          name="fullName"
          value={formData.fullName || ""}
          onChange={handleChange}
          placeholder="John Doe"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Preferred Name">
        <InputField
          name="preferredName"
          value={formData.preferredName || ""}
          onChange={handleChange}
          placeholder="Johnny"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Email" required>
        <InputField
          name="email"
          type="email"
          value={formData.email || ""}
          onChange={handleChange}
          placeholder="john.doe@example.com"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>

      <FieldGroup label="Phone Number">
        <InputField
          name="phone"
          type="tel"
          value={formData.phone || ""}
          onChange={handleChange}
          placeholder="555-123-4567"
          $isDarkMode={isDarkMode}
        />
      </FieldGroup>
    </SectionContainer>
  );
};

export default BasicInfoSection;