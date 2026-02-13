import React from "react";
import styled from "styled-components";

const FieldGroupContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.01em;
`;

const RequiredIndicator = styled.span`
  color: #00ffff;
  margin-left: 0.25rem;
`;

interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

const FieldGroup: React.FC<FieldGroupProps> = ({ label, children, required = false }) => {
  return (
    <FieldGroupContainer>
      <Label>
        {label}
        {required && <RequiredIndicator>*</RequiredIndicator>}
      </Label>
      {children}
    </FieldGroupContainer>
  );
};

export default FieldGroup;
