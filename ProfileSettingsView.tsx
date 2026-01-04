import React, { useState } from 'react';
import styled from 'styled-components';
import { useAuth } from '../../hooks/useAuth';
import ProfilePhotoUploader from './ProfilePhotoUploader';
import UserProfileCard from './UserProfileCard';
import { User, Mail, Phone, Save } from 'lucide-react';
import api from '../../utils/api';
import { toast } from 'react-toastify';

const ProfileSettingsView: React.FC = () => {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.put('/api/profile', formData);
      if (setUser) {
        setUser(response.data.user);
      }
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <PageHeader>
        <Title>Profile Settings</Title>
        <Subtitle>Manage your personal information and account settings</Subtitle>
      </PageHeader>

      <ContentGrid>
        <LeftColumn>
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfilePhotoUploader />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Profile Preview</CardTitle>
            </CardHeader>
            <CardContent style={{ display: 'flex', justifyContent: 'center' }}>
              <UserProfileCard />
            </CardContent>
          </Card>
        </LeftColumn>

        <RightColumn>
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Form onSubmit={handleSubmit}>
                <FormGroup>
                  <Label>First Name</Label>
                  <InputWrapper>
                    <User size={18} />
                    <Input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="First Name"
                    />
                  </InputWrapper>
                </FormGroup>

                <FormGroup>
                  <Label>Last Name</Label>
                  <InputWrapper>
                    <User size={18} />
                    <Input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Last Name"
                    />
                  </InputWrapper>
                </FormGroup>

                <FormGroup>
                  <Label>Email Address</Label>
                  <InputWrapper>
                    <Mail size={18} />
                    <Input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      style={{ opacity: 0.7, cursor: 'not-allowed' }}
                    />
                  </InputWrapper>
                  <HelperText>Email cannot be changed</HelperText>
                </FormGroup>

                <FormGroup>
                  <Label>Phone Number</Label>
                  <InputWrapper>
                    <Phone size={18} />
                    <Input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Phone Number"
                    />
                  </InputWrapper>
                </FormGroup>

                <Button type="submit" disabled={isSubmitting}>
                  <Save size={18} />
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </Form>
            </CardContent>
          </Card>
        </RightColumn>
      </ContentGrid>
    </Container>
  );
};

// Styled Components (Galaxy-Swan Theme)
const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  color: var(--text-primary, #FFFFFF);
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #FFFFFF 0%, #00CED1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Subtitle = styled.p`
  color: var(--text-secondary, #B8B8B8);
  font-size: 1rem;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;

  @media (min-width: 1024px) {
    grid-template-columns: 350px 1fr;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Card = styled.div`
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 16px;
  backdrop-filter: blur(10px);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
`;

const CardTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: var(--primary-cyan, #00CED1);
`;

const CardContent = styled.div`
  padding: 1.5rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary, #B8B8B8);
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--dark-bg, #0a0e1a);
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  border-radius: 8px;
  padding: 0.75rem 1rem;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--primary-cyan, #00CED1);
  }

  svg {
    color: var(--text-secondary, #B8B8B8);
  }
`;

const Input = styled.input`
  background: transparent;
  border: none;
  color: var(--text-primary, #FFFFFF);
  font-size: 1rem;
  width: 100%;

  &:focus {
    outline: none;
  }

  &::placeholder {
    color: var(--text-secondary, #B8B8B8);
    opacity: 0.5;
  }
`;

const HelperText = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary, #B8B8B8);
  opacity: 0.7;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, var(--primary-cyan, #00CED1), var(--accent-purple, #9D4EDD));
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  margin-top: 1rem;

  &:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default ProfileSettingsView;