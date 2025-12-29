import React, { useState } from 'react';
import styled from 'styled-components';
import { X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

interface ExerciseData {
  title: string;
  description: string;
  videoType?: 'youtube' | 'upload';
  videoId?: string;
  phases?: number[];
}

interface CreateExerciseWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Multi-step wizard for creating exercises with video integration
 *
 * Steps:
 * 1. Basic Info (name, description, muscles, equipment)
 * 2. Video Upload (file upload, YouTube link, or select existing)
 * 3. NASM Tags (phases, movement patterns, acute variables)
 * 4. Preview & Submit
 *
 * TODO: Implement full wizard functionality
 */
const CreateExerciseWizard: React.FC<CreateExerciseWizardProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const queryClient = useQueryClient();
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      videoType: 'youtube',
      phases: []
    }
  });

  const createExerciseMutation = useMutation({
    mutationFn: (data: ExerciseData) => axios.post('/api/admin/exercise-library', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['exercises']);
      onSuccess();
    }
  });

  const onSubmit = (data: FormData) => {
    createExerciseMutation.mutate(data);
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

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
                error={errors.title}
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
              Next
            </PrimaryButton>
          ) : (
            <PrimaryButton onClick={handleSubmit(onSubmit)}>
              Create Exercise
            </PrimaryButton>
          )}
        </Footer>
      </Modal>
    </Overlay>
  );
};

const StepBasicInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StepVideo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StepPhases = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StepReview = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Input = styled.input<{ error?: boolean }>`
  padding: 12px;
  border: 1px solid ${props => props.error ? 'var(--error-red)' : 'var(--glass-border)'};
  border-radius: 8px;
  background: var(--dark-bg);
  color: var(--text-primary);
`;

const TextArea = styled.textarea`
  padding: 12px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: var(--dark-bg);
  color: var(--text-primary);
  min-height: 100px;
`;

const Select = styled.select`
  padding: 12px;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  background: var(--dark-bg);
  color: var(--text-primary);
`;

const PrimaryButton = styled.button`
  background: var(--primary-cyan);
  color: var(--dark-bg);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const SecondaryButton = styled.button`
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-cyan);
    background: var(--glass-bg);
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
  text-align: center;
`;

const PlaceholderText = styled.div`
  font-size: 32px;
  color: var(--primary-cyan, #00CED1);
  margin-bottom: 16px;
`;

const PlaceholderDescription = styled.div`
  font-size: 16px;
  color: var(--text-secondary, #B8B8B8);
  line-height: 1.6;

  ul {
    text-align: left;
    max-width: 400px;
    margin: 16px auto 0;
  }

  li {
    margin-bottom: 8px;
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

const CancelButton = styled.button`
  background: transparent;
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #FFFFFF);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--primary-cyan, #00CED1);
    background: var(--glass-bg, rgba(0, 206, 209, 0.1));
  }
`;

export default CreateExerciseWizard;
