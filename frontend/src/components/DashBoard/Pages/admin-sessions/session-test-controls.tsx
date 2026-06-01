import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';
import {
  Beaker,
  UserPlus,
  Zap,
  Check,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import {
  BodyText,
  ButtonWrapper,
  CardHeaderTitle,
  ClientInfoBox,
  ClientInfoDetail,
  ClientInfoHeader,
  ClientInfoTitle,
  containerVariants,
  CopyButton,
  GridContainer,
  InfoAlert,
  InputLabel,
  itemVariants,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
  SessionInfoBox,
  SessionInfoContent,
  SessionInfoText,
  SessionInfoTitle,
  StyledCard,
  StyledCardContent,
  StyledCardHeader,
  StyledInput,
  StyledPaper,
  WarningAlert,
} from './SessionTestControls.styles';

interface TestClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  availableSessions?: number;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const SessionTestControls: React.FC = () => {
  const { services } = useAuth();
  const { toast } = useToast();
  const [testClient, setTestClient] = useState<TestClient | null>(null);
  const [creatingClient, setCreatingClient] = useState(false);
  const [sessions, setSessions] = useState<number>(5);
  const [addingSessions, setAddingSessions] = useState(false);

  const handleCreateTestClient = async () => {
    try {
      setCreatingClient(true);
      const result = await services.session.createTestClient();

      if (result.success) {
        setTestClient(result.data);
        toast({ title: 'Success', description: 'Test client created successfully' });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error creating test client:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to create test client'),
        variant: 'destructive',
      });
    } finally {
      setCreatingClient(false);
    }
  };

  const handleAddSessions = async () => {
    if (!testClient) {
      toast({ title: 'Error', description: 'No test client selected', variant: 'destructive' });
      return;
    }

    try {
      setAddingSessions(true);
      const result = await services.session.addSessionsToTestClient(testClient.id, sessions);

      if (result.success) {
        setTestClient(result.data);
        toast({ title: 'Success', description: `Added ${sessions} sessions to test client` });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error adding sessions:', error);
      toast({
        title: 'Error',
        description: getErrorMessage(error, 'Failed to add sessions'),
        variant: 'destructive',
      });
    } finally {
      setAddingSessions(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!testClient) return;

    const credentials = `Email: ${testClient.email}\nPassword: ${testClient.password || 'Test123!'}`;
    void navigator.clipboard.writeText(credentials);
    toast({ title: 'Copied!', description: 'Test client credentials copied to clipboard' });
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants}>
      <StyledCard variants={itemVariants}>
        <StyledCardHeader>
          <Beaker size={22} aria-hidden="true" />
          <CardHeaderTitle>Session Testing Controls</CardHeaderTitle>
        </StyledCardHeader>

        <StyledCardContent>
          <WarningAlert>
            <AlertTriangle size={20} aria-hidden="true" />
            <span>
              These testing controls are for development purposes only. They allow you to create test clients and add sessions to them to test the session management system.
            </span>
          </WarningAlert>

          <GridContainer>
            <StyledPaper>
              <SectionTitle>
                <UserPlus size={18} aria-hidden="true" />
                Create Test Client
              </SectionTitle>

              <BodyText>Create a test client with an automatically generated email and password.</BodyText>

              <ButtonWrapper>
                <PrimaryButton type="button" onClick={handleCreateTestClient} disabled={creatingClient}>
                  <UserPlus size={16} aria-hidden="true" />
                  {creatingClient ? 'Creating...' : 'Create Test Client'}
                </PrimaryButton>
              </ButtonWrapper>

              {testClient && (
                <ClientInfoBox>
                  <ClientInfoHeader>
                    <ClientInfoTitle>Test Client Created</ClientInfoTitle>
                    <CopyButton type="button" onClick={handleCopyCredentials} title="Copy Credentials">
                      <Copy size={16} aria-hidden="true" />
                    </CopyButton>
                  </ClientInfoHeader>

                  <ClientInfoDetail><strong>Name:</strong> {testClient.firstName} {testClient.lastName}</ClientInfoDetail>
                  <ClientInfoDetail><strong>Email:</strong> {testClient.email}</ClientInfoDetail>
                  <ClientInfoDetail><strong>Password:</strong> {testClient.password || 'Test123!'}</ClientInfoDetail>
                  <ClientInfoDetail><strong>Available Sessions:</strong> {testClient.availableSessions || 0}</ClientInfoDetail>
                </ClientInfoBox>
              )}
            </StyledPaper>

            <StyledPaper>
              <SectionTitle>
                <Zap size={18} aria-hidden="true" />
                Add Test Sessions
              </SectionTitle>

              <BodyText>Add sessions to your test client to simulate package purchases.</BodyText>

              <ButtonWrapper>
                <InputLabel htmlFor="session-count">Number of Sessions</InputLabel>
                <StyledInput
                  id="session-count"
                  type="number"
                  value={sessions}
                  onChange={(event) => setSessions(parseInt(event.target.value, 10) || 1)}
                  min={1}
                  max={100}
                  placeholder="Number of Sessions"
                  disabled={!testClient || addingSessions}
                />

                <SecondaryButton type="button" onClick={handleAddSessions} disabled={!testClient || addingSessions}>
                  <Zap size={16} aria-hidden="true" />
                  {addingSessions ? 'Adding...' : 'Add Sessions'}
                </SecondaryButton>
              </ButtonWrapper>

              {!testClient && <InfoAlert>Create a test client first before adding sessions</InfoAlert>}

              {testClient && Boolean(testClient.availableSessions) && (
                <SessionInfoBox>
                  <Check size={20} aria-hidden="true" />
                  <SessionInfoContent>
                    <SessionInfoTitle>
                      Test Client has {testClient.availableSessions} available sessions
                    </SessionInfoTitle>
                    <SessionInfoText>
                      These sessions will appear in the admin dashboard and can be used by the test client
                    </SessionInfoText>
                  </SessionInfoContent>
                </SessionInfoBox>
              )}
            </StyledPaper>
          </GridContainer>
        </StyledCardContent>
      </StyledCard>
    </motion.div>
  );
};

export default SessionTestControls;
