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

const SectionLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(0, 255, 255, 0.6);
  margin-top: 0.5rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
`;

const BasicInfoSection: React.FC<{
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
        <FieldGroup label="First Name" required>
          <InputField
            name="firstName"
            value={formData.firstName || ""}
            onChange={handleChange}
            placeholder="First name"
          />
        </FieldGroup>
        <FieldGroup label="Last Name" required>
          <InputField
            name="lastName"
            value={formData.lastName || ""}
            onChange={handleChange}
            placeholder="Last name"
          />
        </FieldGroup>
      </FieldRow>

      <FieldGroup label="Preferred Name">
        <InputField
          name="preferredName"
          value={formData.preferredName || ""}
          onChange={handleChange}
          placeholder="What should we call you?"
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Email" required>
          <InputField
            name="email"
            type="email"
            value={formData.email || ""}
            onChange={handleChange}
            placeholder="client@email.com"
          />
        </FieldGroup>
        <FieldGroup label="Phone Number" required>
          <InputField
            name="phone"
            type="tel"
            value={formData.phone || ""}
            onChange={handleChange}
            placeholder="(555) 123-4567"
          />
        </FieldGroup>
      </FieldRow>

      <FieldRow>
        <FieldGroup label="Date of Birth">
          <InputField
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth || ""}
            onChange={handleChange}
          />
        </FieldGroup>
        <FieldGroup label="Gender">
          <InputField
            name="gender"
            value={formData.gender || ""}
            onChange={handleChange}
            placeholder="e.g. Male, Female, Non-binary"
          />
        </FieldGroup>
      </FieldRow>

      <SectionLabel>Emergency Contact</SectionLabel>
      <FieldRow>
        <FieldGroup label="Emergency Contact Name" required>
          <InputField
            name="emergencyContactName"
            value={formData.emergencyContactName || ""}
            onChange={handleChange}
            placeholder="Full name"
          />
        </FieldGroup>
        <FieldGroup label="Emergency Contact Phone" required>
          <InputField
            name="emergencyContactPhone"
            type="tel"
            value={formData.emergencyContactPhone || ""}
            onChange={handleChange}
            placeholder="(555) 123-4567"
          />
        </FieldGroup>
      </FieldRow>
    </SectionContainer>
  );
};

export default BasicInfoSection;
