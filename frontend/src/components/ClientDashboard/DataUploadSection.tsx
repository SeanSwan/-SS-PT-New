// src/Components/ClientDashboard/DataUploadSection.tsx

import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.neonBlue};
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 1px solid ${({ theme }) => theme.colors.silver};
  border-radius: 4px;
  background-color: ${({ theme }) => theme.colors.background};
  color: ${({ theme }) => theme.colors.text};
`;

const FileInput = styled(Input)`
  &::file-selector-button {
    background-color: ${({ theme }) => theme.colors.royalPurple};
    color: ${({ theme }) => theme.colors.text};
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
`;

const SubmitButton = styled(motion.button)`
  background-color: ${({ theme }) => theme.colors.neonBlue};
  color: ${({ theme }) => theme.colors.royalPurple};
  border: none;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${({ theme }) => theme.colors.royalPurple};
    color: ${({ theme }) => theme.colors.neonBlue};
  }
`;

/**
 * DataUploadSection Component
 * ---------------------------
 * Provides a form for clients to upload their own data including numerical inputs and file uploads.
 */
const DataUploadSection: React.FC = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission (e.g., upload to server)
    console.log("Data submitted");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <SectionTitle>Upload Your Data</SectionTitle>
      <Form onSubmit={handleSubmit}>
        <Input type="number" placeholder="Weight (kg)" required />
        <Input type="number" placeholder="Body Fat (%)" required />
        <FileInput type="file" accept="image/*" aria-label="Upload progress photo" />
        <FileInput type="file" accept=".pdf,.doc,.docx" aria-label="Upload workout log" />
        <SubmitButton type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          Submit Data
        </SubmitButton>
      </Form>
    </motion.div>
  );
};

export default DataUploadSection;
