import React from "react";
import { FieldGroup, InputField, TextAreaField } from "../../../components/form";
import styled from "styled-components";

const SectionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionLabel = styled.div`
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(0, 255, 255, 0.6);
  margin-top: 0.25rem;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid rgba(0, 255, 255, 0.1);
`;

const InfoNote = styled.p`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const HealthSection: React.FC<{
  formData: any;
  updateFormData: (data: any) => void;
}> = ({ formData, updateFormData }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
  };

  return (
    <SectionContainer>
      <SectionLabel>PAR-Q Health Screening</SectionLabel>
      <InfoNote>
        This information helps your trainer design a safe, effective program aligned with NASM protocols.
      </InfoNote>

      <FieldGroup label="Has a doctor ever said you have a heart condition?">
        <InputField
          name="heartCondition"
          value={formData.heartCondition || ""}
          onChange={handleChange}
          placeholder="Yes / No — if yes, please describe"
        />
      </FieldGroup>

      <FieldGroup label="Do you experience chest pain during physical activity?">
        <InputField
          name="chestPain"
          value={formData.chestPain || ""}
          onChange={handleChange}
          placeholder="Yes / No"
        />
      </FieldGroup>

      <FieldGroup label="Do you have high or low blood pressure?">
        <InputField
          name="bloodPressure"
          value={formData.bloodPressure || ""}
          onChange={handleChange}
          placeholder="Yes / No — if yes, is it managed with medication?"
        />
      </FieldGroup>

      <SectionLabel>Medical History</SectionLabel>

      <FieldGroup label="Medical Conditions">
        <TextAreaField
          name="medicalConditions"
          value={formData.medicalConditions || ""}
          onChange={handleChange}
          placeholder="Diabetes, asthma, thyroid issues, etc."
          rows={3}
        />
      </FieldGroup>

      <FieldGroup label="Current Medications">
        <TextAreaField
          name="medications"
          value={formData.medications || ""}
          onChange={handleChange}
          placeholder="List any current medications and dosages"
          rows={3}
        />
      </FieldGroup>

      <FieldGroup label="Past or Current Injuries">
        <TextAreaField
          name="injuries"
          value={formData.injuries || ""}
          onChange={handleChange}
          placeholder="Shoulder surgery, knee replacement, back pain, etc."
          rows={3}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="Doctor Clearance for Exercise?">
          <InputField
            name="doctorClearance"
            value={formData.doctorClearance || ""}
            onChange={handleChange}
            placeholder="Yes / No / Pending"
          />
        </FieldGroup>
        <FieldGroup label="Physician Name (optional)">
          <InputField
            name="physicianName"
            value={formData.physicianName || ""}
            onChange={handleChange}
            placeholder="Dr. Smith"
          />
        </FieldGroup>
      </FieldRow>
    </SectionContainer>
  );
};

export default HealthSection;
