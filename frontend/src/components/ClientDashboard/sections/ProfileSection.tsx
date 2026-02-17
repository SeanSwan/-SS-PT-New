import React, { useState } from 'react';
import styled from 'styled-components';
import GlowButton from '../../ui/GlowButton';
import { Edit2, Save, X, Camera } from 'lucide-react';

const PageTitle = styled.h4`
  font-size: 2rem;
  font-weight: 600;
  color: white;
  margin: 0 0 24px;
`;

const Panel = styled.div`
  padding: 24px;
  margin-bottom: 24px;
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 600px) {
    grid-template-columns: auto 1fr;
  }
`;

const AvatarColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ProfileAvatar = styled.div`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: url('https://via.placeholder.com/150') center/cover;
  margin-bottom: 16px;
  position: relative;
`;

const CameraBtn = styled.button`
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #00ffff;
  color: #0a0a1a;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover { background: #33ffff; }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const FieldsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const FieldGroupFull = styled(FieldGroup)`
  @media (min-width: 600px) {
    grid-column: 1 / -1;
  }
`;

const FieldLabel = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 4px;
`;

const FieldValue = styled.span`
  font-size: 1rem;
  color: white;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;

  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.5); }
`;

const StyledTextarea = styled.textarea`
  width: 100%;
  padding: 8px 12px;
  min-height: 100px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;

  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.5); }
`;

const InterestTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const InterestChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 16px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  color: #00ffff;
  font-size: 0.8125rem;
`;

const ChipDeleteBtn = styled.button`
  background: none;
  border: none;
  color: rgba(0, 255, 255, 0.6);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;

  &:hover { color: #00ffff; }
`;

const SectionTitle = styled.h6`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0 0 16px;
`;

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 600px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const ProfileSection: React.FC = () => {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    phone: '(555) 123-4567',
    location: 'Los Angeles, CA',
    bio: 'Fitness enthusiast and wellness advocate. I love combining traditional workouts with dance and creative movement.',
    interests: ['HIIT', 'Yoga', 'Dance', 'Nutrition']
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditMode(false);
  };

  return (
    <div>
      <PageTitle>Profile</PageTitle>

      <Panel>
        <form onSubmit={handleSubmit}>
          <FormGrid>
            <AvatarColumn>
              <ProfileAvatar>
                {editMode && (
                  <CameraBtn type="button" aria-label="Change photo">
                    <Camera size={16} />
                  </CameraBtn>
                )}
              </ProfileAvatar>

              {!editMode ? (
                <GlowButton
                  variant="primary"
                  startIcon={<Edit2 size={16} />}
                  onClick={() => setEditMode(true)}
                >
                  Edit Profile
                </GlowButton>
              ) : (
                <ButtonRow>
                  <GlowButton
                    variant="success"
                    type="submit"
                    startIcon={<Save size={16} />}
                  >
                    Save
                  </GlowButton>
                  <GlowButton
                    variant="warning"
                    startIcon={<X size={16} />}
                    onClick={() => setEditMode(false)}
                  >
                    Cancel
                  </GlowButton>
                </ButtonRow>
              )}
            </AvatarColumn>

            <FieldsGrid>
              <FieldGroup>
                <FieldLabel>Full Name</FieldLabel>
                {editMode ? (
                  <StyledInput
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                ) : (
                  <FieldValue>{formData.name}</FieldValue>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Email</FieldLabel>
                {editMode ? (
                  <StyledInput
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    type="email"
                  />
                ) : (
                  <FieldValue>{formData.email}</FieldValue>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Phone</FieldLabel>
                {editMode ? (
                  <StyledInput
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                ) : (
                  <FieldValue>{formData.phone}</FieldValue>
                )}
              </FieldGroup>

              <FieldGroup>
                <FieldLabel>Location</FieldLabel>
                {editMode ? (
                  <StyledInput
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                  />
                ) : (
                  <FieldValue>{formData.location}</FieldValue>
                )}
              </FieldGroup>

              <FieldGroupFull>
                <FieldLabel>Bio</FieldLabel>
                {editMode ? (
                  <StyledTextarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                  />
                ) : (
                  <FieldValue>{formData.bio}</FieldValue>
                )}
              </FieldGroupFull>

              <FieldGroupFull>
                <FieldLabel>Interests</FieldLabel>
                <InterestTags>
                  {formData.interests.map((interest, index) => (
                    <InterestChip key={index}>
                      {interest}
                      {editMode && (
                        <ChipDeleteBtn
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              interests: prev.interests.filter((_, i) => i !== index)
                            }));
                          }}
                          aria-label={`Remove ${interest}`}
                        >
                          <X size={14} />
                        </ChipDeleteBtn>
                      )}
                    </InterestChip>
                  ))}
                  {editMode && (
                    <GlowButton variant="secondary" size="small">
                      Add Interest
                    </GlowButton>
                  )}
                </InterestTags>
              </FieldGroupFull>
            </FieldsGrid>
          </FormGrid>
        </form>
      </Panel>

      <Panel>
        <SectionTitle>Account Settings</SectionTitle>
        <SettingsGrid>
          <GlowButton variant="secondary" fullWidth>
            Change Password
          </GlowButton>
          <GlowButton variant="secondary" fullWidth>
            Privacy Settings
          </GlowButton>
          <GlowButton variant="secondary" fullWidth>
            Notification Preferences
          </GlowButton>
          <GlowButton variant="secondary" fullWidth>
            Connected Accounts
          </GlowButton>
        </SettingsGrid>
      </Panel>
    </div>
  );
};

export default ProfileSection;
