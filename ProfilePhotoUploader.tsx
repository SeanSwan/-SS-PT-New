import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { UploadCloud, X } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../hooks/useAuth';

const ProfilePhotoUploader: React.FC = () => {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('File is too large. Maximum size is 5MB.');
        return;
      }
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  }, []);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => {
      return api.post('/api/profile/upload-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: (response) => {
      toast.success('Profile photo updated successfully!');
      // Invalidate user queries to refetch fresh data from the server
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      // Also update the auth context directly for an immediate UI update
      if (setUser && response.data.user) {
        setUser(response.data.user);
      }
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Upload failed. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.warn('Please select an image to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('profilePhoto', selectedFile);
    uploadMutation.mutate(formData);
  };

  const reset = () => {
    setSelectedFile(null);
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
  };

  return (
    <UploaderContainer onSubmit={handleSubmit}>
      <Dropzone htmlFor="photo-upload">
        <input
          type="file"
          accept="image/png, image/jpeg, image/gif, image/webp"
          onChange={handleFileChange}
          id="photo-upload"
          style={{ display: 'none' }}
          disabled={uploadMutation.isPending}
        />
        {preview ? (
          <ImagePreview src={preview} alt="Profile photo preview" />
        ) : (
          <UploadPlaceholder>
            <UploadCloud size={48} />
            <p>Click to browse or drag & drop</p>
            <span>PNG, JPG, GIF, WEBP up to 5MB</span>
          </UploadPlaceholder>
        )}
      </Dropzone>
      {preview && (
        <Controls>
          <FileName>{selectedFile?.name}</FileName>
          <ResetButton type="button" onClick={reset} disabled={uploadMutation.isPending}>
            <X size={16} />
          </ResetButton>
        </Controls>
      )}
      <UploadButton type="submit" disabled={!selectedFile || uploadMutation.isPending}>
        {uploadMutation.isPending ? 'Uploading...' : 'Upload Photo'}
      </UploadButton>
    </UploaderContainer>
  );
};

const UploaderContainer = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 16px;
  padding: 24px;
  backdrop-filter: blur(10px);
`;

const Dropzone = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 200px;
  border: 2px dashed var(--glass-border, rgba(0, 206, 209, 0.3));
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s;
  overflow: hidden;

  &:hover {
    border-color: var(--primary-cyan, #00CED1);
  }
`;

const UploadPlaceholder = styled.div`
  text-align: center;
  color: var(--text-secondary, #B8B8B8);

  svg {
    color: var(--primary-cyan, #00CED1);
    margin-bottom: 12px;
  }
  p {
    margin: 0 0 4px 0;
    font-weight: 600;
    color: var(--text-primary, #FFFFFF);
  }
  span {
    font-size: 12px;
  }
`;

const ImagePreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--dark-bg, #0a0e1a);
  padding: 8px 12px;
  border-radius: 8px;
`;

const FileName = styled.span`
  font-size: 14px;
  color: var(--text-secondary, #B8B8B8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResetButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #B8B8B8);
  cursor: pointer;
  padding: 4px;
  display: flex;

  &:hover {
    color: var(--error, #FF4444);
  }
`;

const UploadButton = styled.button`
  background: linear-gradient(135deg, var(--primary-cyan, #00CED1), var(--accent-purple, #9D4EDD));
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default ProfilePhotoUploader;