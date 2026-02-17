import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { Bell, Plus, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../../../../services/api';

// ─── Galaxy-Swan Theme Tokens ─────────────────────────────────────────────────
const THEME = {
  bg: 'rgba(15,23,42,0.95)',
  bgSurface: 'rgba(15,23,42,0.85)',
  bgOverlay: 'rgba(0,0,0,0.6)',
  border: 'rgba(14,165,233,0.2)',
  borderHover: 'rgba(14,165,233,0.4)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  accent: '#0ea5e9',
  accentHover: '#38bdf8',
  success: '#22c55e',
  successBg: 'rgba(34,197,94,0.15)',
  error: '#ef4444',
  errorBg: 'rgba(239,68,68,0.15)',
  errorHover: '#f87171',
  primaryBg: 'rgba(14,165,233,0.15)',
  glass: 'rgba(255,255,255,0.03)',
  divider: 'rgba(148,163,184,0.12)',
};

// ─── Keyframes ────────────────────────────────────────────────────────────────
const spin = keyframes`
  to { transform: rotate(360deg); }
`;

// ─── Styled Components ────────────────────────────────────────────────────────

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  padding: 2rem;
`;

const Spinner = styled.div`
  width: 36px;
  height: 36px;
  border: 3px solid ${THEME.border};
  border-top-color: ${THEME.accent};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

const PanelWrapper = styled.div`
  width: 100%;
  margin-bottom: 1rem;
  overflow: hidden;
  background: ${THEME.bg};
  border: 1px solid ${THEME.border};
  border-radius: 12px;
  backdrop-filter: blur(12px);
`;

const PanelHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid ${THEME.divider};
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TitleIcon = styled.span`
  color: ${THEME.accent};
  display: flex;
  align-items: center;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: ${THEME.text};
`;

const Subtitle = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: ${THEME.textSecondary};
  line-height: 1.5;
`;

const PrimaryButton = styled.button<{ $variant?: 'primary' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.5rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  background: ${({ $variant }) =>
    $variant === 'error' ? THEME.error : THEME.accent};
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, transform 0.1s;
  white-space: nowrap;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'error' ? THEME.errorHover : THEME.accentHover};
  }

  &:active {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const GhostButton = styled.button`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${THEME.textSecondary};
  background: transparent;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;

  &:hover {
    color: ${THEME.text};
    border-color: ${THEME.borderHover};
  }
`;

const AlertBox = styled.div<{ $severity: 'error' | 'success' }>`
  margin: 0.75rem 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  line-height: 1.5;
  color: ${({ $severity }) =>
    $severity === 'error' ? THEME.error : THEME.success};
  background: ${({ $severity }) =>
    $severity === 'error' ? THEME.errorBg : THEME.successBg};
  border: 1px solid
    ${({ $severity }) =>
      $severity === 'error'
        ? 'rgba(239,68,68,0.3)'
        : 'rgba(34,197,94,0.3)'};
`;

// ─── Table Styled Components ──────────────────────────────────────────────────

const TableWrapper = styled.div`
  max-height: 60vh;
  overflow: auto;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StyledThead = styled.thead`
  position: sticky;
  top: 0;
  z-index: 1;
`;

const StyledTh = styled.th`
  padding: 0.75rem 1rem;
  text-align: left;
  font-size: 0.8125rem;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.bgSurface};
  border-bottom: 1px solid ${THEME.border};
  white-space: nowrap;
`;

const StyledTr = styled.tr`
  transition: background 0.15s;

  &:hover {
    background: ${THEME.glass};
  }
`;

const StyledTd = styled.td`
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  color: ${THEME.text};
  border-bottom: 1px solid ${THEME.divider};
  vertical-align: middle;
`;

const EmptyCell = styled.td`
  padding: 1.5rem 1rem;
  text-align: center;
  font-size: 0.9375rem;
  color: ${THEME.textSecondary};
`;

const Chip = styled.span<{ $color?: 'success' | 'primary' | 'default' }>`
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  white-space: nowrap;
  color: ${({ $color }) => {
    if ($color === 'success') return THEME.success;
    if ($color === 'primary') return THEME.accent;
    return THEME.textMuted;
  }};
  background: ${({ $color }) => {
    if ($color === 'success') return THEME.successBg;
    if ($color === 'primary') return THEME.primaryBg;
    return 'rgba(100,116,139,0.15)';
  }};
`;

const IconBtn = styled.button<{ $color?: 'primary' | 'error' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0.375rem;
  color: ${({ $color }) =>
    $color === 'error' ? THEME.error : THEME.accent};
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: ${({ $color }) =>
      $color === 'error' ? THEME.errorBg : THEME.primaryBg};
  }
`;

// ─── Dialog / Modal Styled Components ─────────────────────────────────────────

const Overlay = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? 'flex' : 'none')};
  position: fixed;
  inset: 0;
  z-index: 1300;
  align-items: center;
  justify-content: center;
  background: ${THEME.bgOverlay};
  backdrop-filter: blur(4px);
`;

const DialogPanel = styled.div<{ $wide?: boolean }>`
  width: 90%;
  max-width: ${({ $wide }) => ($wide ? '600px' : '480px')};
  max-height: 90vh;
  overflow-y: auto;
  background: ${THEME.bg};
  border: 1px solid ${THEME.border};
  border-radius: 12px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
`;

const DialogTitleBar = styled.div`
  padding: 1.25rem 1.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: ${THEME.text};
  border-bottom: 1px solid ${THEME.divider};
`;

const DialogBody = styled.div`
  padding: 1.5rem;
`;

const DialogFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid ${THEME.divider};
`;

// ─── Form Styled Components ───────────────────────────────────────────────────

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const FormFieldFull = styled.div`
  grid-column: 1 / -1;
`;

const FieldLabel = styled.label`
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 500;
  color: ${THEME.textSecondary};
`;

const FieldHint = styled.span`
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: ${THEME.textMuted};
`;

const StyledInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: ${THEME.text};
  background: ${THEME.glass};
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &::placeholder {
    color: ${THEME.textMuted};
  }

  &:focus {
    border-color: ${THEME.accent};
  }
`;

const StyledSelect = styled.select`
  width: 100%;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: ${THEME.text};
  background: ${THEME.bgSurface};
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  box-sizing: border-box;

  &:focus {
    border-color: ${THEME.accent};
  }

  option {
    background: ${THEME.bg};
    color: ${THEME.text};
  }
`;

// ─── Switch Styled Components ─────────────────────────────────────────────────

const SwitchLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
  min-height: 44px;
  user-select: none;
`;

const HiddenCheckbox = styled.input`
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
`;

const SwitchTrack = styled.span<{ $checked: boolean }>`
  position: relative;
  display: inline-block;
  width: 42px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $checked }) =>
    $checked ? THEME.accent : 'rgba(100,116,139,0.3)'};
  transition: background 0.2s;
`;

const SwitchThumb = styled.span<{ $checked: boolean }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked }) => ($checked ? '20px' : '2px')};
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
`;

const SwitchText = styled.span`
  font-size: 0.875rem;
  color: ${THEME.text};
`;

const ConfirmText = styled.p`
  margin: 0;
  font-size: 0.9375rem;
  color: ${THEME.text};
  line-height: 1.6;

  strong {
    color: ${THEME.accentHover};
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

// Types for notification settings
interface NotificationSetting {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  notificationType: 'ADMIN' | 'ORIENTATION' | 'ORDER' | 'SYSTEM' | 'ALL';
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// Notification types with display names
const notificationTypes = [
  { value: 'ALL', label: 'All Notifications' },
  { value: 'ADMIN', label: 'Admin Notifications' },
  { value: 'ORIENTATION', label: 'Orientation Forms' },
  { value: 'ORDER', label: 'Order Notifications' },
  { value: 'SYSTEM', label: 'System Alerts' }
];

/**
 * Component for managing notification settings
 */
const NotificationSettingsList: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentSetting, setCurrentSetting] = useState<Partial<NotificationSetting> | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mock API functions (replace with actual API calls)
  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      // Replace with actual API call when ready
      // const response = await api.get('/notification-settings');
      // setSettings(response.data);

      // Hardcoded settings for demo
      const mockSettings: NotificationSetting[] = [
        {
          id: 1,
          name: 'Sean Swan',
          email: 'ogpswan@yahoo.com',
          phone: '+13239968153',
          isActive: true,
          notificationType: 'ALL',
          isPrimary: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Jasmine Hearon',
          email: 'jasminehearon@gmail.com',
          phone: '+13239944779',
          isActive: true,
          notificationType: 'ALL',
          isPrimary: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Swan Studios',
          email: 'loveswanstudios@protonmail.com',
          phone: null,
          isActive: true,
          notificationType: 'ALL',
          isPrimary: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      setSettings(mockSettings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load notification settings: ${errorMessage}`);
      console.error('Error loading notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async (setting: Partial<NotificationSetting>) => {
    setSaveError(null);
    try {
      // For new settings
      if (!setting.id) {
        // Replace with actual API call when ready
        // const response = await api.post('/notification-settings', setting);
        // setSettings([...settings, response.data]);

        // For demo, just add to the local state
        const newSetting: NotificationSetting = {
          ...setting,
          id: Math.max(0, ...settings.map(s => s.id)) + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: setting.isActive ?? true,
          isPrimary: setting.isPrimary ?? false,
          notificationType: setting.notificationType ?? 'ALL'
        } as NotificationSetting;

        setSettings([...settings, newSetting]);
        setSuccessMessage('Notification setting added successfully');
      } else {
        // For existing settings
        // Replace with actual API call when ready
        // const response = await api.put(`/notification-settings/${setting.id}`, setting);
        // setSettings(settings.map(s => s.id === setting.id ? response.data : s));

        // For demo, just update the local state
        setSettings(settings.map(s => s.id === setting.id ? {
          ...s,
          ...setting,
          updatedAt: new Date().toISOString()
        } : s));
        setSuccessMessage('Notification setting updated successfully');
      }

      setDialogOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setSaveError(`Failed to save: ${errorMessage}`);
      console.error('Error saving notification setting:', err);
    }
  };

  const deleteSetting = async (id: number) => {
    try {
      // Replace with actual API call when ready
      // await api.delete(`/notification-settings/${id}`);

      // For demo, just remove from local state
      setSettings(settings.filter(s => s.id !== id));
      setDeleteDialogOpen(false);
      setSuccessMessage('Notification setting deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to delete: ${errorMessage}`);
      console.error('Error deleting notification setting:', err);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);

  // Clear success message after a timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handle opening the add/edit dialog
  const handleOpenDialog = (setting: Partial<NotificationSetting> | null = null) => {
    setCurrentSetting(setting || {
      name: '',
      email: '',
      phone: '',
      isActive: true,
      notificationType: 'ALL',
      isPrimary: false
    });
    setDialogOpen(true);
    setSaveError(null);
  };

  // Handle opening the delete confirmation dialog
  const handleDeleteConfirm = (setting: NotificationSetting) => {
    setCurrentSetting(setting);
    setDeleteDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
      </LoadingContainer>
    );
  }

  return (
    <PanelWrapper>
      <PanelHeader>
        <HeaderRow>
          <TitleGroup>
            <TitleIcon>
              <Bell size={20} />
            </TitleIcon>
            <Title>Notification Settings</Title>
          </TitleGroup>
          <PrimaryButton onClick={() => handleOpenDialog()}>
            <Plus size={16} />
            Add Contact
          </PrimaryButton>
        </HeaderRow>
        <Subtitle>
          Manage email and SMS notification recipients for different notification types.
        </Subtitle>
      </PanelHeader>

      {error && (
        <AlertBox $severity="error">
          {error}
        </AlertBox>
      )}

      {successMessage && (
        <AlertBox $severity="success">
          {successMessage}
        </AlertBox>
      )}

      <TableWrapper>
        <StyledTable>
          <StyledThead>
            <tr>
              <StyledTh>Name</StyledTh>
              <StyledTh>Email</StyledTh>
              <StyledTh>Phone</StyledTh>
              <StyledTh>Type</StyledTh>
              <StyledTh>Status</StyledTh>
              <StyledTh>Priority</StyledTh>
              <StyledTh>Actions</StyledTh>
            </tr>
          </StyledThead>
          <tbody>
            {settings.length === 0 ? (
              <tr>
                <EmptyCell colSpan={7}>
                  No notification settings found.
                </EmptyCell>
              </tr>
            ) : (
              settings.map((setting) => (
                <StyledTr key={setting.id}>
                  <StyledTd>{setting.name}</StyledTd>
                  <StyledTd>{setting.email || 'None'}</StyledTd>
                  <StyledTd>{setting.phone || 'None'}</StyledTd>
                  <StyledTd>
                    {notificationTypes.find(t => t.value === setting.notificationType)?.label || setting.notificationType}
                  </StyledTd>
                  <StyledTd>
                    <Chip $color={setting.isActive ? 'success' : 'default'}>
                      {setting.isActive ? 'Active' : 'Inactive'}
                    </Chip>
                  </StyledTd>
                  <StyledTd>
                    {setting.isPrimary && (
                      <Chip $color="primary">
                        Primary
                      </Chip>
                    )}
                  </StyledTd>
                  <StyledTd>
                    <IconBtn
                      $color="primary"
                      onClick={() => handleOpenDialog(setting)}
                      aria-label={`Edit ${setting.name}`}
                    >
                      <Pencil size={16} />
                    </IconBtn>
                    <IconBtn
                      $color="error"
                      onClick={() => handleDeleteConfirm(setting)}
                      aria-label={`Delete ${setting.name}`}
                    >
                      <Trash2 size={16} />
                    </IconBtn>
                  </StyledTd>
                </StyledTr>
              ))
            )}
          </tbody>
        </StyledTable>
      </TableWrapper>

      {/* Add/Edit Dialog */}
      <Overlay $open={dialogOpen} onClick={() => setDialogOpen(false)}>
        <DialogPanel $wide onClick={(e) => e.stopPropagation()}>
          <DialogTitleBar>
            {currentSetting?.id ? 'Edit Notification Setting' : 'Add Notification Setting'}
          </DialogTitleBar>
          <DialogBody>
            <FormGrid>
              <FormFieldFull>
                <FieldLabel>Name *</FieldLabel>
                <StyledInput
                  value={currentSetting?.name || ''}
                  onChange={(e) => setCurrentSetting({ ...currentSetting, name: e.target.value })}
                  placeholder="Contact name"
                  required
                />
              </FormFieldFull>
              <div>
                <FieldLabel>Email</FieldLabel>
                <StyledInput
                  type="email"
                  value={currentSetting?.email || ''}
                  onChange={(e) => setCurrentSetting({ ...currentSetting, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <FieldLabel>Phone Number</FieldLabel>
                <StyledInput
                  value={currentSetting?.phone || ''}
                  onChange={(e) => setCurrentSetting({ ...currentSetting, phone: e.target.value })}
                  placeholder="+1234567890"
                />
                <FieldHint>Include country code (e.g., +1 for US)</FieldHint>
              </div>
              <FormFieldFull>
                <FieldLabel>Notification Type</FieldLabel>
                <StyledSelect
                  value={currentSetting?.notificationType || 'ALL'}
                  onChange={(e) => setCurrentSetting({
                    ...currentSetting,
                    notificationType: e.target.value as any
                  })}
                >
                  {notificationTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </StyledSelect>
              </FormFieldFull>
              <div>
                <SwitchLabel>
                  <HiddenCheckbox
                    type="checkbox"
                    checked={currentSetting?.isActive ?? true}
                    onChange={(e) => setCurrentSetting({
                      ...currentSetting,
                      isActive: e.target.checked
                    })}
                  />
                  <SwitchTrack $checked={currentSetting?.isActive ?? true}>
                    <SwitchThumb $checked={currentSetting?.isActive ?? true} />
                  </SwitchTrack>
                  <SwitchText>Active</SwitchText>
                </SwitchLabel>
              </div>
              <div>
                <SwitchLabel>
                  <HiddenCheckbox
                    type="checkbox"
                    checked={currentSetting?.isPrimary ?? false}
                    onChange={(e) => setCurrentSetting({
                      ...currentSetting,
                      isPrimary: e.target.checked
                    })}
                  />
                  <SwitchTrack $checked={currentSetting?.isPrimary ?? false}>
                    <SwitchThumb $checked={currentSetting?.isPrimary ?? false} />
                  </SwitchTrack>
                  <SwitchText>Priority Contact</SwitchText>
                </SwitchLabel>
              </div>
            </FormGrid>

            {saveError && (
              <AlertBox $severity="error" style={{ margin: '1rem 0 0' }}>
                {saveError}
              </AlertBox>
            )}
          </DialogBody>
          <DialogFooter>
            <GhostButton onClick={() => setDialogOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              onClick={() => currentSetting && saveSetting(currentSetting)}
              disabled={!currentSetting?.name}
            >
              Save
            </PrimaryButton>
          </DialogFooter>
        </DialogPanel>
      </Overlay>

      {/* Delete Confirmation Dialog */}
      <Overlay $open={deleteDialogOpen} onClick={() => setDeleteDialogOpen(false)}>
        <DialogPanel onClick={(e) => e.stopPropagation()}>
          <DialogTitleBar>Confirm Deletion</DialogTitleBar>
          <DialogBody>
            <ConfirmText>
              Are you sure you want to delete the notification setting for{' '}
              <strong>{currentSetting?.name}</strong>?
            </ConfirmText>
          </DialogBody>
          <DialogFooter>
            <GhostButton onClick={() => setDeleteDialogOpen(false)}>Cancel</GhostButton>
            <PrimaryButton
              $variant="error"
              onClick={() => currentSetting?.id && deleteSetting(currentSetting.id)}
            >
              Delete
            </PrimaryButton>
          </DialogFooter>
        </DialogPanel>
      </Overlay>
    </PanelWrapper>
  );
};

export default NotificationSettingsList;
