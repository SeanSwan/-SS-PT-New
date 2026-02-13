import React from "react";
import styled from "styled-components";

interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  $isDarkMode?: boolean;
}

const StyledTextArea = styled.textarea<{ $isDarkMode: boolean }>`
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.15);
  background: rgba(10, 10, 30, 0.6);
  color: #ffffff;
  font-size: 1rem;
  transition: all 0.2s ease;
  min-height: 100px;
  resize: vertical;
  width: 100%;
  box-sizing: border-box;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: #00ccff;
    box-shadow: 0 0 0 2px rgba(0, 204, 255, 0.2), 0 0 12px rgba(0, 255, 255, 0.1);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
`;

const TextAreaField: React.FC<TextAreaFieldProps> = ({ $isDarkMode = true, ...props }) => {
  return <StyledTextArea $isDarkMode={$isDarkMode} {...props} />;
};

export default TextAreaField;
