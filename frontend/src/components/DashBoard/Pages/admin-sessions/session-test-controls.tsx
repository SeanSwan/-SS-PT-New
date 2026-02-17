import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast';

// Icons
import {
  Beaker,
  UserPlus,
  Zap,
  Check,
  AlertTriangle,
  Copy
} from 'lucide-react';

// ─── Styled Components ──────────────────────────────────────────────

const StyledCard = styled(motion.div)`
  background-color: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
  overflow: hidden;
`;

const StyledCardHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CardHeaderTitle = styled.h6`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: #ffffff;
  line-height: 1.6;
`;

const StyledCardContent = styled.div`
  padding: 24px;
`;

const WarningAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  margin-bottom: 24px;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
  background-color: rgba(255, 152, 0, 0.15);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  line-height: 1.5;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: #ff9800;
  }
`;

const InfoAlert = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background-color: rgba(0, 0, 0, 0.2);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  line-height: 1.5;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const StyledPaper = styled.div`
  padding: 16px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  height: 100%;
  box-sizing: border-box;
`;

const SectionTitle = styled.h6`
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.6;
`;

const BodyText = styled.p`
  margin: 0 0 16px 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

const ButtonWrapper = styled.div`
  margin-bottom: 16px;
`;

const PrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 22px;
  margin-top: 8px;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #0a0a1a;
  cursor: pointer;
  background: linear-gradient(135deg, #00ffff, #00c8ff);
  box-shadow: 0 4px 10px rgba(0, 200, 255, 0.3);
  transition: box-shadow 0.2s ease, background 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 6px 15px rgba(0, 200, 255, 0.4);
    background: linear-gradient(135deg, #00ffff, #00b8eb);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 22px;
  margin-top: 8px;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  background: linear-gradient(135deg, #7851a9, #a67dd4);
  box-shadow: 0 4px 10px rgba(120, 81, 169, 0.3);
  transition: box-shadow 0.2s ease, background 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 6px 15px rgba(120, 81, 169, 0.4);
    background: linear-gradient(135deg, #7851a9, #9366c7);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const CopyButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;
  padding: 8px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 10px 14px;
  margin: 16px 0;
  min-height: 44px;
  box-sizing: border-box;
  font-size: 0.875rem;
  color: #ffffff;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s ease;

  &:hover:not(:disabled) {
    border-color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.15);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const InputLabel = styled.label`
  display: block;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 4px;
  margin-top: 16px;
`;

const ClientInfoBox = styled.div`
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  background-color: rgba(0, 255, 255, 0.05);
`;

const ClientInfoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const ClientInfoTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
`;

const ClientInfoDetail = styled.p`
  margin: 4px 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;

  strong {
    color: #ffffff;
  }
`;

const SessionInfoBox = styled.div`
  margin-top: 16px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid rgba(120, 81, 169, 0.3);
  background-color: rgba(120, 81, 169, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SessionInfoContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const SessionInfoTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: #a67dd4;
`;

const SessionInfoText = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

// ─── Animation Variants ─────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5
    }
  }
};

/**
 * Session Test Controls Component
 *
 * This component provides admin controls for testing the session system:
 * - Create test clients
 * - Add sessions to test clients
 * - Display test client credentials for login
 *
 * This component should only be used in development environments.
 */
const SessionTestControls: React.FC = () => {
  const { services } = useAuth();
  const { toast } = useToast();

  // State for test clients
  const [testClient, setTestClient] = useState<any>(null);
  const [creatingClient, setCreatingClient] = useState(false);

  // State for adding sessions
  const [sessions, setSessions] = useState<number>(5);
  const [addingSessions, setAddingSessions] = useState(false);

  // Handle creating a test client
  const handleCreateTestClient = async () => {
    try {
      setCreatingClient(true);

      // Call the create test client API
      const result = await services.session.createTestClient();

      if (result.success) {
        setTestClient(result.data);
        toast({
          title: "Success",
          description: "Test client created successfully",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error creating test client:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create test client",
        variant: "destructive",
      });
    } finally {
      setCreatingClient(false);
    }
  };

  // Handle adding sessions to test client
  const handleAddSessions = async () => {
    if (!testClient) {
      toast({
        title: "Error",
        description: "No test client selected",
        variant: "destructive",
      });
      return;
    }

    try {
      setAddingSessions(true);

      // Call the add sessions API
      const result = await services.session.addSessionsToTestClient(testClient.id, sessions);

      if (result.success) {
        setTestClient(result.data);
        toast({
          title: "Success",
          description: `Added ${sessions} sessions to test client`,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Error adding sessions:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add sessions",
        variant: "destructive",
      });
    } finally {
      setAddingSessions(false);
    }
  };

  // Handle copying client credentials to clipboard
  const handleCopyCredentials = () => {
    if (!testClient) return;

    const credentials = `Email: ${testClient.email}\nPassword: ${testClient.password || 'Test123!'}`;
    navigator.clipboard.writeText(credentials);

    toast({
      title: "Copied!",
      description: "Test client credentials copied to clipboard",
    });
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <StyledCard
        variants={itemVariants}
      >
        <StyledCardHeader>
          <Beaker size={22} />
          <CardHeaderTitle>Session Testing Controls</CardHeaderTitle>
        </StyledCardHeader>

        <StyledCardContent>
          <WarningAlert>
            <AlertTriangle size={20} />
            <span>
              These testing controls are for development purposes only. They allow you to create test clients and add sessions to them to test the session management system.
            </span>
          </WarningAlert>

          <GridContainer>
            {/* Test Client Creation */}
            <StyledPaper>
              <SectionTitle>
                <UserPlus size={18} />
                Create Test Client
              </SectionTitle>

              <BodyText>
                Create a test client with an automatically generated email and password.
              </BodyText>

              <ButtonWrapper>
                <PrimaryButton
                  onClick={handleCreateTestClient}
                  disabled={creatingClient}
                >
                  <UserPlus size={16} />
                  {creatingClient ? 'Creating...' : 'Create Test Client'}
                </PrimaryButton>
              </ButtonWrapper>

              {testClient && (
                <ClientInfoBox>
                  <ClientInfoHeader>
                    <ClientInfoTitle>Test Client Created</ClientInfoTitle>
                    <CopyButton
                      onClick={handleCopyCredentials}
                      title="Copy Credentials"
                    >
                      <Copy size={16} />
                    </CopyButton>
                  </ClientInfoHeader>

                  <ClientInfoDetail>
                    <strong>Name:</strong> {testClient.firstName} {testClient.lastName}
                  </ClientInfoDetail>
                  <ClientInfoDetail>
                    <strong>Email:</strong> {testClient.email}
                  </ClientInfoDetail>
                  <ClientInfoDetail>
                    <strong>Password:</strong> {testClient.password || 'Test123!'}
                  </ClientInfoDetail>
                  <ClientInfoDetail>
                    <strong>Available Sessions:</strong> {testClient.availableSessions || 0}
                  </ClientInfoDetail>
                </ClientInfoBox>
              )}
            </StyledPaper>

            {/* Test Add Sessions */}
            <StyledPaper>
              <SectionTitle>
                <Zap size={18} />
                Add Test Sessions
              </SectionTitle>

              <BodyText>
                Add sessions to your test client to simulate package purchases.
              </BodyText>

              <ButtonWrapper>
                <InputLabel htmlFor="session-count">Number of Sessions</InputLabel>
                <StyledInput
                  id="session-count"
                  type="number"
                  value={sessions}
                  onChange={(e) => setSessions(parseInt(e.target.value) || 1)}
                  min={1}
                  max={100}
                  placeholder="Number of Sessions"
                  disabled={!testClient || addingSessions}
                />

                <SecondaryButton
                  onClick={handleAddSessions}
                  disabled={!testClient || addingSessions}
                >
                  <Zap size={16} />
                  {addingSessions ? 'Adding...' : 'Add Sessions'}
                </SecondaryButton>
              </ButtonWrapper>

              {!testClient && (
                <InfoAlert>
                  Create a test client first before adding sessions
                </InfoAlert>
              )}

              {testClient && testClient.availableSessions > 0 && (
                <SessionInfoBox>
                  <Check size={20} color="#a67dd4" />
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
