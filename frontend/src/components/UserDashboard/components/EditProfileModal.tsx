/**
 * EditProfileModal
 * Simple modal for editing user profile fields
 */
import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { UserProfile } from '../../../services/profileService';

interface EditProfileModalProps {
  profile: UserProfile | null;
  onClose: () => void;
  onSave: (data: Partial<UserProfile>) => Promise<void>;
}

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const Modal = styled(motion.div)`
  background: ${({ theme }) => theme.background?.secondary || '#1a1a2e'};
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.15)'};
  border-radius: 20px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
`;

const CloseButton = styled.button`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.1)'};
  border: 1px solid ${({ theme }) => theme.borders?.subtle || 'rgba(255,255,255,0.1)'};
  border-radius: 10px;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.colors?.error || '#FF6B6B'};
    color: white;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const Label = styled.label`
  display: block;
  color: ${({ theme }) => theme.text?.secondary || 'rgba(255,255,255,0.7)'};
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.15)'};
  border-radius: 10px;
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => theme.colors?.primary || '#60C0F0'};
  }

  &::placeholder {
    color: ${({ theme }) => theme.text?.muted || 'rgba(255,255,255,0.4)'};
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 0.75rem 1rem;
  background: ${({ theme }) => theme.background?.elevated || 'rgba(255,255,255,0.05)'};
  border: 1px solid ${({ theme }) => theme.borders?.elegant || 'rgba(255,255,255,0.15)'};
  border-radius: 10px;
  color: ${({ theme }) => theme.text?.primary || 'white'};
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s ease;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  box-sizing: border-box;

  &:focus {
    border-color: ${({ theme }) => theme.colors?.primary || '#60C0F0'};
  }

  &::placeholder {
    color: ${({ theme }) => theme.text?.muted || 'rgba(255,255,255,0.4)'};
  }
`;

const SaveButton = styled(motion.button)`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, #60C0F0, #4070C0)'};
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, onClose, onSave }) => {
  const [firstName, setFirstName] = useState(profile?.firstName || '');
  const [lastName, setLastName] = useState(profile?.lastName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [fitnessGoal, setFitnessGoal] = useState(profile?.fitnessGoal || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({ firstName, lastName, bio, fitnessGoal, phone });
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <Modal
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Header>
            <Title>Edit Profile</Title>
            <CloseButton onClick={onClose}>
              <X size={20} />
            </CloseButton>
          </Header>

          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>First Name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />
            </FormGroup>

            <FormGroup>
              <Label>Last Name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />
            </FormGroup>

            <FormGroup>
              <Label>Bio</Label>
              <TextArea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community about yourself..."
                maxLength={500}
              />
            </FormGroup>

            <FormGroup>
              <Label>Fitness Goal</Label>
              <Input
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value)}
                placeholder="e.g., Build muscle, Lose weight, Stay active"
              />
            </FormGroup>

            <FormGroup>
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter your phone number"
                type="tel"
              />
            </FormGroup>

            <SaveButton
              type="submit"
              disabled={isSaving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Save size={18} />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </SaveButton>
          </form>
        </Modal>
      </Overlay>
    </AnimatePresence>
  );
};

export default EditProfileModal;
