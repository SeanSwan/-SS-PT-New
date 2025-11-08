import React from "react";
import styled from "styled-components";

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  $isDarkMode?: boolean;
}

const StyledInput = styled.input<{ $isDarkMode: boolean }>`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 2px solid ${(props) => 
    props.$isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)"};
  background: ${(props) => 
    props.$isDarkMode ? "rgba(20, 20, 40, 0.5)" : "rgba(255, 255, 255, 0.8)"};
  color: ${(props) => 
    props.$isDarkMode ? "#ffffff" : "#333333"};
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${(props) => 
      props.$isDarkMode ? "#00ccff" : "#2196F3"};
    box-shadow: 0 0 0 2px ${(props) => 
      props.$isDarkMode ? "rgba(0, 204, 255, 0.2)" : "rgba(33, 150, 243, 0.2)"};
  }

  &::placeholder {
    color: ${(props) => 
      props.$isDarkMode ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.4)"};
  }
`;

const InputField: React.FC<InputFieldProps> = ({ $isDarkMode = false, ...props }) => {
  return <StyledInput $isDarkMode={$isDarkMode} {...props} />;
};

export default InputField;