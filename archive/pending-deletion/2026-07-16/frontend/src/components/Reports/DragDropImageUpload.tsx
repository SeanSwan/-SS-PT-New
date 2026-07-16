// File: frontend/src/components/Reports/DragDropImageUpload.tsx

import React, { useState, DragEvent, ChangeEvent } from 'react';
import styled from 'styled-components';

// Styled drop zone with dynamic border based on drag state.
// Using $isDragOver instead of isDragOver to prevent the prop from leaking to the DOM
const DropZone = styled.div<{ $isDragOver: boolean }>`
  border: 2px dashed ${(props) => (props.$isDragOver ? '#007bff' : '#ccc')};
  padding: 1rem;
  text-align: center;
  border-radius: 8px;
  margin-bottom: 1rem;
  background-color: ${(props) => (props.$isDragOver ? '#f0f8ff' : 'transparent')};
`;

// Preview image style.
const PreviewImage = styled.img`
  max-width: 100%;
  max-height: 150px;
  margin-top: 0.5rem;
  border-radius: 4px;
`;

interface DragDropImageUploadProps {
  label: string;
  onImageUpload: (imageData: string) => void;
  storedImage?: string;
}

const DragDropImageUpload: React.FC<DragDropImageUploadProps> = ({
  label,
  onImageUpload,
  storedImage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string>(storedImage || '');

  // Handle drag events.
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        setPreview(base64data);
        onImageUpload(base64data);
        // Save image to localStorage using the label as key.
        localStorage.setItem(label, base64data);
      };
      reader.readAsDataURL(file);
    }
  };

  // Fallback: Allow file selection via input.
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setPreview(base64data);
          onImageUpload(base64data);
          localStorage.setItem(label, base64data);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div>
      <label>{label}</label>
      <DropZone
        $isDragOver={isDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        Drag & drop an image here or click to select
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'block', margin: '0 auto', marginTop: '1rem' }}
        />
      </DropZone>
      {preview && <PreviewImage src={preview} alt="Preview" />}
    </div>
  );
};

export default DragDropImageUpload;