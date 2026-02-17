/**
 * Client Details Panel - Comprehensive Client Profile Management
 * ===========================================================
 *
 * Complete client profile view and management interface
 * Allows admins to view, edit, and manage all aspects of a client
 *
 * FEATURES:
 * - Comprehensive client profile display
 * - Edit client information interface
 * - Session history and progress tracking
 * - Payment history and billing management
 * - Trainer assignment and scheduling
 * - Health screening and fitness assessment review
 * - Communication center for notes and messages
 * - Progress photos and measurements tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { css, keyframes } from 'styled-components';
import {
  X,
  Pencil,
  Save,
  XCircle,
  User,
  Dumbbell,
  Clock,
  CreditCard,
  MessageSquare,
  TrendingUp,
  ClipboardList,
  Phone,
  Mail,
  ShieldAlert,
  Plus,
  Minus,
  Eye,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Timer,
  DollarSign,
  Camera,
  StickyNote,
  History
} from 'lucide-react';

// Services
import { adminClientService } from '../../../../services/adminClientService';
import { useToast } from '../../../../hooks/use-toast';

// P0: Billing & Sessions Card
import BillingSessionsCard from './BillingSessionsCard';

// ============================================================
// Styled Components - Galaxy-Swan Theme
// ============================================================

const DialogHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #e2e8f0;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(14, 165, 233, 0.2);
  padding: 16px 24px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderRight = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const AvatarCircle = styled.div<{ $size?: number }>`
  width: ${({ $size }) => $size || 40}px;
  height: ${({ $size }) => $size || 40}px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0ea5e9, #7c3aed);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: ${({ $size }) => ($size ? $size * 0.35 : 14)}px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const HeaderTitle = styled.h6`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
`;

const HeaderSubtitle = styled.p`
  margin: 0;
  font-size: 0.75rem;
  color: rgba(226, 232, 240, 0.7);
`;

const ActionButton = styled.button<{ $variant?: 'contained' | 'outlined'; $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  ${({ $variant, $color }) => {
    if ($variant === 'contained') {
      return css`
        background: ${$color || 'linear-gradient(135deg, #0ea5e9, #0284c7)'};
        color: white;
        border: none;

        &:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
      `;
    }
    return css`
      background: transparent;
      color: #e2e8f0;
      border: 1px solid rgba(14, 165, 233, 0.3);

      &:hover {
        border-color: rgba(14, 165, 233, 0.6);
        background: rgba(14, 165, 233, 0.1);
      }
    `;
  }}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.15);
  }
`;

const SmallIconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(14, 165, 233, 0.15);
  }
`;

const DialogBody = styled.div`
  padding: 0;
  background: rgba(15, 23, 42, 0.95);
  overflow-y: auto;
`;

const AlertBox = styled.div<{ $severity?: 'error' | 'warning' | 'success' | 'info' }>`
  margin: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  ${({ $severity }) => {
    switch ($severity) {
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        `;
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fcd34d;
        `;
      case 'success':
        return css`
          background: rgba(16, 185, 129, 0.15);
          border: 1px solid rgba(16, 185, 129, 0.3);
          color: #6ee7b7;
        `;
      default:
        return css`
          background: rgba(14, 165, 233, 0.15);
          border: 1px solid rgba(14, 165, 233, 0.3);
          color: #7dd3fc;
        `;
    }
  }}
`;

const AlertTitleText = styled.span`
  font-weight: 600;
  font-size: 0.875rem;
`;

const progressAnimation = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(14, 165, 233, 0.1);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, #0ea5e9, transparent);
    animation: ${progressAnimation} 1.5s ease-in-out infinite;
  }
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(14, 165, 233, 0.2);
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const TabButton = styled.button<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  min-height: 44px;
  min-width: 44px;
  border: none;
  background: transparent;
  color: ${({ $active }) => ($active ? '#0ea5e9' : 'rgba(226, 232, 240, 0.7)')};
  cursor: pointer;
  white-space: nowrap;
  font-size: 0.75rem;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  transition: all 0.2s ease;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${({ $active }) => ($active ? '#0ea5e9' : 'transparent')};
    transition: background 0.2s ease;
  }

  &:hover {
    color: #0ea5e9;
    background: rgba(14, 165, 233, 0.05);
  }
`;

const TabPanelWrapper = styled.div``;

const SectionPadding = styled.div`
  padding: 24px;
`;

const GridContainer = styled.div<{ $columns?: string; $gap?: number }>`
  display: grid;
  grid-template-columns: ${({ $columns }) => $columns || '1fr'};
  gap: ${({ $gap }) => $gap || 24}px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const GridItem = styled.div<{ $span?: number }>`
  ${({ $span }) =>
    $span &&
    css`
      grid-column: span ${$span};

      @media (max-width: 768px) {
        grid-column: span 1;
      }
    `}
`;

const GlassCard = styled.div`
  background: rgba(71, 85, 105, 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 12px;
  overflow: hidden;
`;

const CardBody = styled.div`
  padding: 24px;
`;

const CenteredCardBody = styled(CardBody)`
  text-align: center;
`;

const SectionTitle = styled.h6`
  margin: 0 0 24px 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
`;

const BodyText = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: rgba(226, 232, 240, 0.7);
`;

const HeadingText = styled.h5`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
`;

const StatusChip = styled.span<{ $status?: 'success' | 'error' | 'info' | 'warning' | 'default' }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  min-height: 28px;

  ${({ $status }) => {
    switch ($status) {
      case 'success':
        return css`
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.3);
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.2);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.3);
        `;
      case 'info':
        return css`
          background: rgba(14, 165, 233, 0.2);
          color: #7dd3fc;
          border: 1px solid rgba(14, 165, 233, 0.3);
        `;
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.2);
          color: #fcd34d;
          border: 1px solid rgba(245, 158, 11, 0.3);
        `;
      default:
        return css`
          background: rgba(100, 116, 139, 0.3);
          color: #cbd5e1;
          border: 1px solid rgba(100, 116, 139, 0.3);
        `;
    }
  }}
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FieldLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(226, 232, 240, 0.7);
`;

const TextInput = styled.input`
  width: 100%;
  padding: 10px 12px;
  min-height: 44px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: rgba(226, 232, 240, 0.4);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  min-height: 80px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.2s ease;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: rgba(226, 232, 240, 0.4);
  }
`;

const SelectInput = styled.select`
  width: 100%;
  padding: 10px 12px;
  min-height: 44px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(14, 165, 233, 0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
  appearance: auto;

  &:focus {
    outline: none;
    border-color: #0ea5e9;
    box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  option {
    background: #0f172a;
    color: #e2e8f0;
  }
`;

const SwitchLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 12px;
  color: #e2e8f0;
  font-size: 0.875rem;
  cursor: pointer;
  min-height: 44px;
`;

const HiddenCheckbox = styled.input.attrs({ type: 'checkbox' })`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const SwitchTrack = styled.span<{ $checked?: boolean }>`
  position: relative;
  width: 44px;
  height: 24px;
  background: ${({ $checked }) =>
    $checked ? 'rgba(14, 165, 233, 0.6)' : 'rgba(100, 116, 139, 0.4)'};
  border-radius: 12px;
  transition: background 0.2s ease;
  cursor: pointer;
  flex-shrink: 0;
`;

const SwitchThumb = styled.span<{ $checked?: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '22px' : '2px')};
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: left 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(14, 165, 233, 0.15);
  margin: 16px 0;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead``;

const TableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  color: #e2e8f0;
  font-weight: 600;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(14, 165, 233, 0.2);
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  &:hover {
    background: rgba(14, 165, 233, 0.05);
  }
`;

const TableCell = styled.td<{ $align?: string }>`
  padding: 12px 16px;
  color: #e2e8f0;
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(14, 165, 233, 0.1);
  text-align: ${({ $align }) => $align || 'left'};
`;

const FlexRow = styled.div<{ $gap?: number; $justify?: string; $align?: string; $wrap?: boolean }>`
  display: flex;
  gap: ${({ $gap }) => $gap || 8}px;
  justify-content: ${({ $justify }) => $justify || 'flex-start'};
  align-items: ${({ $align }) => $align || 'stretch'};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
`;

const FlexCol = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap || 8}px;
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

// ============================================================
// Types
// ============================================================

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  fitnessGoal?: string;
  trainingExperience?: string;
  healthConcerns?: string;
  emergencyContact?: string;
  availableSessions: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedTrainer?: {
    id: number;
    firstName: string;
    lastName: string;
    photo?: string;
  };
}

interface ClientDetailsPanelProps {
  client: Client;
  onClose: () => void;
  onUpdate: (updatedClient: Client) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab Panel Component
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`client-tabpanel-${index}`}
      aria-labelledby={`client-tab-${index}`}
      {...other}
    >
      {value === index && <TabPanelWrapper>{children}</TabPanelWrapper>}
    </div>
  );
};

/**
 * Client Details Panel Component
 */
const ClientDetailsPanel: React.FC<ClientDetailsPanelProps> = ({
  client,
  onClose,
  onUpdate
}) => {
  const { toast } = useToast();

  // State Management
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState(client);
  const [sessions, setSessions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [notes, setNotes] = useState([]);

  // Data fetching
  const fetchClientData = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsData, paymentsData] = await Promise.all([
        adminClientService.getClientSessions(client.id),
        adminClientService.getClientPayments(client.id)
      ]);

      setSessions(sessionsData || []);
      setPayments(paymentsData || []);
    } catch (err) {
      console.error('Error fetching client data:', err);
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  // Event Handlers
  const handleTabChange = (newValue: number) => {
    setActiveTab(newValue);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      setEditData(client); // Reset changes
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const updatedClient = await adminClientService.updateClient(client.id, editData);
      onUpdate(updatedClient);
      setIsEditing(false);
      toast({
        title: 'Success',
        description: 'Client information updated successfully',
        variant: 'default'
      });
    } catch (err: any) {
      setError(err.message || 'Failed to update client');
      toast({
        title: 'Error',
        description: 'Failed to update client information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditDataChange = (field: string, value: any) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSessions = async (sessionCount: number) => {
    try {
      await adminClientService.addSessions(client.id, sessionCount);
      const updatedClient = { ...client, availableSessions: client.availableSessions + sessionCount };
      onUpdate(updatedClient);
      toast({
        title: 'Success',
        description: `Added ${sessionCount} sessions to client account`,
        variant: 'default'
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: 'Failed to add sessions',
        variant: 'destructive'
      });
    }
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  // Callback for billing card updates
  const handleBillingUpdate = useCallback(() => {
    fetchClientData();
  }, [fetchClientData]);

  // Render Tab Content
  const renderPersonalInfo = () => (
    <SectionPadding>
      <GridContainer $columns="1fr" $gap={24}>
        {/* P0: Billing & Sessions Card - Prominent at top */}
        <GridItem>
          <BillingSessionsCard
            clientId={client.id}
            clientName={`${client.firstName} ${client.lastName}`}
            onUpdate={handleBillingUpdate}
          />
        </GridItem>
      </GridContainer>

      <GridContainer $columns="1fr 2fr" $gap={24} style={{ marginTop: 24 }}>
        <GlassCard>
          <CenteredCardBody>
            <AvatarCircle $size={120} style={{ margin: '0 auto 16px' }}>
              {editData.photo ? (
                <img src={editData.photo} alt={`${editData.firstName} ${editData.lastName}`} />
              ) : (
                <>{editData.firstName[0]}{editData.lastName[0]}</>
              )}
            </AvatarCircle>
            <HeadingText>
              {editData.firstName} {editData.lastName}
            </HeadingText>
            <BodyText style={{ marginBottom: 16 }}>
              {editData.dateOfBirth && `Age: ${calculateAge(editData.dateOfBirth)}`}
            </BodyText>
            <div style={{ marginBottom: 16 }}>
              <StatusChip $status={editData.isActive ? 'success' : 'error'}>
                {editData.isActive ? 'Active' : 'Inactive'}
              </StatusChip>
            </div>
            {isEditing && (
              <ActionButton $variant="outlined">
                <Camera size={16} />
                Update Photo
              </ActionButton>
            )}
          </CenteredCardBody>
        </GlassCard>

        <GlassCard>
          <CardBody>
            <SectionTitle>Personal Information</SectionTitle>

            <GridContainer $columns="1fr 1fr" $gap={16}>
              <FormField>
                <FieldLabel>First Name</FieldLabel>
                <TextInput
                  value={editData.firstName}
                  onChange={(e) => handleEditDataChange('firstName', e.target.value)}
                  disabled={!isEditing}
                />
              </FormField>

              <FormField>
                <FieldLabel>Last Name</FieldLabel>
                <TextInput
                  value={editData.lastName}
                  onChange={(e) => handleEditDataChange('lastName', e.target.value)}
                  disabled={!isEditing}
                />
              </FormField>

              <FormField>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  type="email"
                  value={editData.email}
                  onChange={(e) => handleEditDataChange('email', e.target.value)}
                  disabled={!isEditing}
                />
              </FormField>

              <FormField>
                <FieldLabel>Phone</FieldLabel>
                <TextInput
                  value={editData.phone || ''}
                  onChange={(e) => handleEditDataChange('phone', e.target.value)}
                  disabled={!isEditing}
                />
              </FormField>

              <FormField>
                <FieldLabel>Date of Birth</FieldLabel>
                <TextInput
                  type="date"
                  value={editData.dateOfBirth || ''}
                  onChange={(e) => handleEditDataChange('dateOfBirth', e.target.value)}
                  disabled={!isEditing}
                />
              </FormField>

              <FormField>
                <FieldLabel>Gender</FieldLabel>
                <SelectInput
                  value={editData.gender || ''}
                  onChange={(e) => handleEditDataChange('gender', e.target.value)}
                  disabled={!isEditing}
                >
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </SelectInput>
              </FormField>

              <GridItem $span={2}>
                <FormField>
                  <FieldLabel>Emergency Contact</FieldLabel>
                  <TextArea
                    value={editData.emergencyContact || ''}
                    onChange={(e) => handleEditDataChange('emergencyContact', e.target.value)}
                    disabled={!isEditing}
                    rows={2}
                  />
                </FormField>
              </GridItem>

              <GridItem $span={2}>
                <SwitchLabel>
                  <HiddenCheckbox
                    checked={editData.isActive}
                    onChange={(e) => handleEditDataChange('isActive', e.target.checked)}
                    disabled={!isEditing}
                  />
                  <SwitchTrack $checked={editData.isActive}>
                    <SwitchThumb $checked={editData.isActive} />
                  </SwitchTrack>
                  Active Client
                </SwitchLabel>
              </GridItem>
            </GridContainer>
          </CardBody>
        </GlassCard>
      </GridContainer>
    </SectionPadding>
  );

  const renderHealthFitness = () => (
    <SectionPadding>
      <GridContainer $columns="1fr 1fr" $gap={24}>
        <GlassCard>
          <CardBody>
            <SectionTitle>Physical Measurements</SectionTitle>

            <GridContainer $columns="1fr 1fr" $gap={16}>
              <FormField>
                <FieldLabel>Height (inches)</FieldLabel>
                <TextInput
                  type="number"
                  value={editData.height || ''}
                  onChange={(e) => handleEditDataChange('height', parseFloat(e.target.value))}
                  disabled={!isEditing}
                />
              </FormField>

              <FormField>
                <FieldLabel>Weight (lbs)</FieldLabel>
                <TextInput
                  type="number"
                  value={editData.weight || ''}
                  onChange={(e) => handleEditDataChange('weight', parseFloat(e.target.value))}
                  disabled={!isEditing}
                />
              </FormField>

              <GridItem $span={2}>
                {editData.height && editData.weight && (
                  <BodyText>
                    BMI: {(editData.weight / Math.pow(editData.height / 12, 2) * 703).toFixed(1)}
                  </BodyText>
                )}
              </GridItem>
            </GridContainer>
          </CardBody>
        </GlassCard>

        <GlassCard>
          <CardBody>
            <SectionTitle>Fitness Goals &amp; Experience</SectionTitle>

            <FlexCol $gap={16}>
              <FormField>
                <FieldLabel>Primary Fitness Goal</FieldLabel>
                <TextInput
                  value={editData.fitnessGoal || ''}
                  onChange={(e) => handleEditDataChange('fitnessGoal', e.target.value)}
                  disabled={!isEditing}
                />
              </FormField>

              <FormField>
                <FieldLabel>Training Experience</FieldLabel>
                <TextInput
                  value={editData.trainingExperience || ''}
                  onChange={(e) => handleEditDataChange('trainingExperience', e.target.value)}
                  disabled={!isEditing}
                />
              </FormField>
            </FlexCol>
          </CardBody>
        </GlassCard>
      </GridContainer>

      <div style={{ marginTop: 24 }}>
        <GlassCard>
          <CardBody>
            <SectionTitle>Health Concerns &amp; Limitations</SectionTitle>

            <FormField>
              <FieldLabel>Health Concerns</FieldLabel>
              <TextArea
                value={editData.healthConcerns || ''}
                onChange={(e) => handleEditDataChange('healthConcerns', e.target.value)}
                disabled={!isEditing}
                rows={4}
                placeholder="Any injuries, medical conditions, or physical limitations..."
              />
            </FormField>
          </CardBody>
        </GlassCard>
      </div>
    </SectionPadding>
  );

  const renderSessions = () => (
    <SectionPadding>
      <FlexRow $justify="space-between" $align="center" style={{ marginBottom: 24 }}>
        <SectionTitle style={{ marginBottom: 0 }}>Session Management</SectionTitle>
        <FlexRow $gap={12} $align="center">
          <StatusChip $status={client.availableSessions > 0 ? 'success' : 'error'}>
            {client.availableSessions} Available
          </StatusChip>
          <ActionButton
            $variant="contained"
            $color="linear-gradient(135deg, #3b82f6, #1d4ed8)"
            onClick={() => handleAddSessions(1)}
          >
            <Plus size={16} />
            Add Sessions
          </ActionButton>
        </FlexRow>
      </FlexRow>

      <GridContainer $columns="2fr 1fr" $gap={24}>
        <GlassCard>
          <TableWrapper>
            <StyledTable>
              <TableHeader>
                <tr>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Trainer</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Duration</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} $align="center">
                      <BodyText>No sessions found</BodyText>
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session: any) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        {new Date(session.sessionDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          $status={
                            session.status === 'completed' ? 'success' :
                            session.status === 'scheduled' ? 'info' :
                            session.status === 'cancelled' ? 'error' : 'default'
                          }
                        >
                          {session.status}
                        </StatusChip>
                      </TableCell>
                      <TableCell>
                        {session.duration || 60} min
                      </TableCell>
                      <TableCell>
                        <SmallIconBtn>
                          <Eye size={16} />
                        </SmallIconBtn>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </StyledTable>
          </TableWrapper>
        </GlassCard>

        <GlassCard>
          <CardBody>
            <SectionTitle style={{ marginBottom: 16 }}>Session Statistics</SectionTitle>

            <div style={{ marginBottom: 16 }}>
              <BodyText>Total Sessions: {sessions.length}</BodyText>
              <BodyText>Completed: {sessions.filter((s: any) => s.status === 'completed').length}</BodyText>
              <BodyText>Upcoming: {sessions.filter((s: any) => s.status === 'scheduled').length}</BodyText>
            </div>

            <Divider />

            <BodyText style={{ marginBottom: 8 }}>Session Package Actions</BodyText>

            <FlexCol $gap={8}>
              <ActionButton
                $variant="outlined"
                onClick={() => handleAddSessions(5)}
              >
                <Plus size={16} />
                Add 5 Sessions
              </ActionButton>
              <ActionButton
                $variant="outlined"
                onClick={() => handleAddSessions(10)}
              >
                <Plus size={16} />
                Add 10 Sessions
              </ActionButton>
            </FlexCol>
          </CardBody>
        </GlassCard>
      </GridContainer>
    </SectionPadding>
  );

  const renderPayments = () => (
    <SectionPadding>
      <SectionTitle>Payment History</SectionTitle>

      <GlassCard>
        <TableWrapper>
          <StyledTable>
            <TableHeader>
              <tr>
                <TableHeaderCell>Date</TableHeaderCell>
                <TableHeaderCell>Amount</TableHeaderCell>
                <TableHeaderCell>Method</TableHeaderCell>
                <TableHeaderCell>Package</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </tr>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} $align="center">
                    <BodyText>No payment history found</BodyText>
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {new Date(payment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      ${payment.amount}
                    </TableCell>
                    <TableCell>
                      {payment.paymentMethod || 'Card'}
                    </TableCell>
                    <TableCell>
                      {payment.package?.name || 'Session Package'}
                    </TableCell>
                    <TableCell>
                      <StatusChip
                        $status={payment.status === 'completed' ? 'success' : 'warning'}
                      >
                        {payment.status || 'completed'}
                      </StatusChip>
                    </TableCell>
                    <TableCell>
                      <SmallIconBtn>
                        <Download size={16} />
                      </SmallIconBtn>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </StyledTable>
        </TableWrapper>
      </GlassCard>
    </SectionPadding>
  );

  // Tab definitions
  const tabs = [
    { icon: <User size={18} />, label: 'Personal' },
    { icon: <Dumbbell size={18} />, label: 'Health & Fitness' },
    { icon: <Clock size={18} />, label: 'Sessions' },
    { icon: <CreditCard size={18} />, label: 'Payments' },
    { icon: <TrendingUp size={18} />, label: 'Progress' },
    { icon: <MessageSquare size={18} />, label: 'Notes' },
  ];

  // Render Main Component
  return (
    <>
      <DialogHeader>
        <HeaderLeft>
          <AvatarCircle $size={40}>
            {client.photo ? (
              <img src={client.photo} alt={`${client.firstName} ${client.lastName}`} />
            ) : (
              client.firstName[0]
            )}
          </AvatarCircle>
          <div>
            <HeaderTitle>
              {client.firstName} {client.lastName}
            </HeaderTitle>
            <HeaderSubtitle>
              Client Details &amp; Management
            </HeaderSubtitle>
          </div>
        </HeaderLeft>

        <HeaderRight>
          {isEditing ? (
            <>
              <ActionButton
                $variant="contained"
                $color="linear-gradient(135deg, #10b981, #059669)"
                onClick={handleSave}
                disabled={loading}
              >
                <Save size={16} />
                Save
              </ActionButton>
              <ActionButton
                $variant="outlined"
                onClick={handleEditToggle}
              >
                <XCircle size={16} />
                Cancel
              </ActionButton>
            </>
          ) : (
            <ActionButton
              $variant="outlined"
              onClick={handleEditToggle}
            >
              <Pencil size={16} />
              Edit
            </ActionButton>
          )}

          <IconBtn onClick={onClose}>
            <X size={20} />
          </IconBtn>
        </HeaderRight>
      </DialogHeader>

      <DialogBody>
        {error && (
          <AlertBox $severity="error">
            <AlertTitleText>Error</AlertTitleText>
            {error}
          </AlertBox>
        )}

        {loading && <ProgressBar />}

        <TabBar>
          {tabs.map((tab, index) => (
            <TabButton
              key={index}
              $active={activeTab === index}
              onClick={() => handleTabChange(index)}
              aria-selected={activeTab === index}
              role="tab"
            >
              {tab.icon}
              {tab.label}
            </TabButton>
          ))}
        </TabBar>

        <TabPanel value={activeTab} index={0}>
          {renderPersonalInfo()}
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {renderHealthFitness()}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {renderSessions()}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {renderPayments()}
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <SectionPadding>
            <SectionTitle>Progress Tracking</SectionTitle>
            <BodyText>
              Progress tracking features will be implemented here.
            </BodyText>
          </SectionPadding>
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <SectionPadding>
            <SectionTitle>Client Notes</SectionTitle>
            <BodyText>
              Notes and communication features will be implemented here.
            </BodyText>
          </SectionPadding>
        </TabPanel>
      </DialogBody>
    </>
  );
};

export default ClientDetailsPanel;
