// src/Components/ClientDashboard/DataUploadSection.tsx
import React from "react";
import styled from "styled-components";
import { motion } from "framer-motion";

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.royalPurple};
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const DropzoneContainer = styled.div`
  border: 2px dashed ${({ theme }) => theme.colors.neonBlue};
  padding: 2rem;
  text-align: center;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.3s;
  &:hover {
    background: ${({ theme }) => theme.colors.silver};
  }
`;

const UploadMessage = styled.p`
  font-size: 1rem;
  color: ${({ theme }) => theme.colors.text};
`;

const FileList = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 1rem;
`;

const FileItem = styled.li`
  background: ${({ theme }) => theme.colors.silver};
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 5px;
  color: ${({ theme }) => theme.colors.text};
`;

interface DataUploadSectionProps {
  getRootProps: Function;
  getInputProps: Function;
  isDragActive: boolean;
  uploadedFiles: File[];
}

/**
 * DataUploadSection:
 * Separated out for clarity.
 */
const DataUploadSection: React.FC<DataUploadSectionProps> = ({
  getRootProps,
  getInputProps,
  isDragActive,
  uploadedFiles,
}) => {
  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <SectionTitle>Upload Your Data</SectionTitle>
      <DropzoneContainer {...(getRootProps() as any)}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <UploadMessage>Drop the files here ...</UploadMessage>
        ) : (
          <UploadMessage>
            Drag &amp; drop files here, or click to select files.
          </UploadMessage>
        )}
      </DropzoneContainer>

      {uploadedFiles.length > 0 && (
        <FileList>
          {uploadedFiles.map((file, index) => (
            <FileItem key={index}>{file.name}</FileItem>
          ))}
        </FileList>
      )}
    </motion.div>
  );
};

export default DataUploadSection;
