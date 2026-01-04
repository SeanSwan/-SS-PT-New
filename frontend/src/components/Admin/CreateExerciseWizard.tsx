import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useForm, Controller, get } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { X, UploadCloud, Youtube, Film, Check } from 'lucide-react';
import api from '../../utils/api';

// Zod schema for validation, based on the blueprint
const exerciseSchema = z.object({
  name: z.string().min(3, 'Exercise name must be at least 3 characters'),
  description: z.string().optional(),
  primary_muscle: z.string().min(1, 'Primary muscle is required'),
  equipment: z.string().min(1, 'Equipment type is required'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  video: z.object({
    type: z.enum(['youtube', 'upload']),
    video_id: z.string().optional(),
    title: z.string().optional(),
  }),
  videoFile: z.any().optional(),
  nasm_phases: z.array(z.string()).min(1, 'At least one NASM phase is required'),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

interface CreateExerciseWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateExerciseWizard: React.FC<CreateExerciseWizardProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { control, register, handleSubmit, watch, setValue, getValues, formState: { errors } } = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      difficulty: 'intermediate',
      video: { type: 'youtube' },
      nasm_phases: [],
    },
  });

  const videoType = watch('video.type');

  const createExerciseMutation = useMutation({
    mutationFn: (formData: FormData) => {
      return api.post('/api/admin/exercise-library', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      toast.success('Exercise created successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-videos'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create exercise.');
    },
  });

  const onSubmit = (data: ExerciseFormData) => {
    const formData = new FormData();

    // Append all fields as strings, backend will parse
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'videoFile' && value && value.length > 0) {
        formData.append('video_file', value[0]);
      } else if (key === 'video' && typeof value === 'object' && value !== null) {
        // Handle nested video object
        Object.entries(value).forEach(([subKey, subValue]) => {
          if (subValue !== undefined) {
            formData.append(`video[${subKey}]`, String(subValue));
          }
        });
      } else if (key === 'nasm_phases' && Array.isArray(value)) {
         value.forEach(item => formData.append(`nasm_phases[]`, item));
      } else if (value !== undefined && key !== 'videoFile') {
        formData.append(key, String(value));
      }
    });

    createExerciseMutation.mutate(formData);
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoPreview(URL.createObjectURL(e.target.files[0]));
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <StepContent>
            <Input {...register('name')} placeholder="Exercise Name (e.g., Dumbbell Bench Press)" $error={!!errors.name} />
            {errors.name && <ErrorMessage>{errors.name.message}</ErrorMessage>}
            <TextArea {...register('description')} placeholder="Description and form cues..." />
            <FormGrid>
              <Select {...register('primary_muscle')} $error={!!errors.primary_muscle}>
                <option value="">Primary Muscle*</option>
                <option value="chest">Chest</option>
                <option value="back">Back</option>
                <option value="shoulders">Shoulders</option>
                <option value="legs">Legs</option>
                <option value="arms">Arms</option>
                <option value="core">Core</option>
              </Select>
              <Select {...register('equipment')} $error={!!errors.equipment}>
                <option value="">Equipment*</option>
                <option value="dumbbell">Dumbbell</option>
                <option value="barbell">Barbell</option>
                <option value="bodyweight">Bodyweight</option>
                <option value="cable">Cable</option>
                <option value="machine">Machine</option>
              </Select>
              <Select {...register('difficulty')}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </FormGrid>
          </StepContent>
        );
      case 2:
        return (
          <StepContent>
            <SegmentedControl>
              <SegmentButton $active={videoType === 'youtube'} onClick={() => setValue('video.type', 'youtube')}><Youtube size={16}/> YouTube</SegmentButton>
              <SegmentButton $active={videoType === 'upload'} onClick={() => setValue('video.type', 'upload')}><Film size={16}/> Upload</SegmentButton>
            </SegmentedControl>
            {videoType === 'youtube' ? (
              <Input {...register('video.video_id')} placeholder="YouTube Video ID or URL" />
            ) : (
              <Dropzone htmlFor="video-upload">
                <input
                  id="video-upload"
                  type="file"
                  accept="video/mp4,video/mov,video/webm"
                  style={{ display: 'none' }}
                  {...register('videoFile')}
                  onChange={handleFileChange}
                />
                {videoPreview ? (
                  <video src={videoPreview} controls style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <>

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header>
          <Title>Create Exercise</Title>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </Header>

        <Content>
          {step === 1 && (
            <StepBasicInfo>
              <h3>Basic Information</h3>
              <Input
                {...register('title', { required: true })}
                placeholder="Exercise Title"
                $error={!!errors.title}
              />
              <TextArea
                {...register('description')}
                placeholder="Description (optional)"
              />
            </StepBasicInfo>
          )}

          {step === 2 && (
            <StepVideo>
              <h3>Video Source</h3>
              <Select {...register('videoType')}>
                <option value="youtube">YouTube</option>
                <option value="upload">Upload</option>
              </Select>

              {watch('videoType') === 'youtube' && (
                <Input
                  {...register('videoId')}
                  placeholder="YouTube URL"
                />
              )}
            </StepVideo>
          )}

          {step === 3 && (
            <StepPhases>
              <h3>NASM Phases</h3>
              {/* Phase selection UI */}
            </StepPhases>
          )}

          {step === 4 && (
            <StepReview>
              <h3>Review</h3>
              {/* Summary of all data */}
            </StepReview>
          )}
        </Content>

        <Footer>
          {step > 1 && (
            <SecondaryButton onClick={prevStep}>
              Back
            </SecondaryButton>
          )}
          {step < 4 ? (
            <PrimaryButton onClick={nextStep}>
              Next Step
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={handleSubmit(onSubmit)} disabled={createExerciseMutation.isPending}>
              {createExerciseMutation.isPending ? 'Creating...' : '✓ Create Exercise'}
            </PrimaryButton>
          )}
        </Footer>
      </Modal>
    </Overlay>
  );
};

const Input = styled.input<{ $error?: boolean }>`
  padding: 12px;
  border: 1px solid ${props => props.$error ? 'var(--error, #FF4444)' : 'var(--glass-border, rgba(0, 206, 209, 0.2))'};
  border-radius: 8px;
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  color: var(--text-primary, #FFFFFF);
  font-size: 16px;
  backdrop-filter: blur(10px);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-cyan, #00CED1);
  }
`;

const TextArea = styled.textarea`
  padding: 12px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: var(--dark-bg);
  color: var(--text-primary, #FFFFFF);
  min-height: 100px;
  font-size: 16px;
  font-family: inherit;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-cyan, #00CED1);
  }
`;

const Select = styled.select`
  padding: 12px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: var(--dark-bg);
  color: var(--text-primary, #FFFFFF);
  font-size: 16px;

  option {
    background: var(--dark-bg, #0a0e1a);
    color: var(--text-primary, #FFFFFF);
  }
`;

const PrimaryButton = styled.button`
  background: linear-gradient(135deg, var(--primary-cyan, #00CED1), var(--accent-purple, #9D4EDD));
  color: var(--dark-bg);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  background: transparent;
  color: var(--text-primary, #FFFFFF);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-cyan, #00CED1);
    background: var(--glass-bg, rgba(0, 206, 209, 0.1));
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background: var(--dark-bg, #0a0e1a);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary, #FFFFFF);
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: var(--text-secondary, #B8B8B8);
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;

  &:hover {
    color: var(--primary-cyan, #00CED1);
  }
`;

const Content = styled.div`
  padding: 24px;
  flex-grow: 1;
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

// New styled components for the completed wizard
const StepContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const ErrorMessage = styled.p`
  color: var(--error, #FF4444);
  font-size: 0.875rem;
  margin: -0.75rem 0 0 0;
`;

const SegmentedControl = styled.div`
  display: flex;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  overflow: hidden;
`;

const SegmentButton = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 12px;
  background: ${props => props.$active ? 'var(--primary-cyan)' : 'transparent'};
  color: ${props => props.$active ? 'var(--dark-bg)' : 'var(--text-primary)'};
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:not(:last-child) {
    border-right: 1px solid var(--glass-border);
  }
`;

const Dropzone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  border: 2px dashed var(--glass-border);
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-secondary);
  text-align: center;
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--primary-cyan);
  }

  svg {
    color: var(--primary-cyan);
    margin-bottom: 12px;
  }
`;

const CheckboxGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 16px;
`;

const CheckboxInput = styled.input`
  display: none;
`;

const Checkmark = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid var(--glass-border);
  border-radius: 4px;
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  ${CheckboxInput}:checked + & {
    background-color: var(--primary-cyan);
    border-color: var(--primary-cyan);
  }
`;

const SummaryCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid var(--glass-border);
`;

const SummaryItem = styled.p`
  margin: 0 0 0.5rem 0;
  strong {
    color: var(--primary-cyan);
  }
`;

const ProgressBar = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
`;

const ProgressStep = styled.div<{ $active: boolean }>`
  flex: 1;
  text-align: center;
  padding-bottom: 8px;
  border-bottom: 2px solid ${props => props.$active ? 'var(--primary-cyan)' : 'var(--glass-border)'};
  color: ${props => props.$active ? 'var(--primary-cyan)' : 'var(--text-secondary)'};
  font-weight: 600;
  transition: all 0.3s;
`;

export default CreateExerciseWizard;
