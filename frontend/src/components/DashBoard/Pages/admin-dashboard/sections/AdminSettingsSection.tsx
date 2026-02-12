/**
 * AdminSettingsSection.tsx
 * ========================
 * 
 * Comprehensive Admin Settings Interface for Admin Dashboard
 * Manages system configuration, permissions, and administrative preferences
 * Styled with Stellar Command Center theme
 * 
 * Features:
 * - System configuration management
 * - User permissions and role management
 * - Platform settings and preferences
 * - Security and authentication settings
 * - API keys and integrations management
 * - Backup and maintenance settings
 * - Audit logs and system monitoring
 * - WCAG AA accessibility compliance
 * 
 * Backend Integration:
 * - /api/admin/settings (GET, PUT)
 * - /api/admin/permissions (GET, PUT)
 * - /api/admin/security (GET, PUT)
 * - /api/admin/integrations (GET, POST, PUT, DELETE)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import {
  Settings, Shield, Users, Key, Database, Globe,
  Search, Filter, Save, RefreshCw, MoreVertical,
  AlertTriangle, CheckCircle, Clock, Eye, EyeOff,
  Edit3, Trash2, Plus, Lock, Unlock, Copy,
  Mail, Smartphone, Bell, Zap, Activity, FileText,
  Download, Upload, RotateCw, HardDrive, Wifi, User
} from 'lucide-react';
import { useAuth } from '../../../../../context/AuthContext';

// === STYLED COMPONENTS ===
const ManagementContainer = styled.div`
  padding: 0;
`;

const ActionBar = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(30, 58, 138, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 0.75rem 1rem;
  padding-left: 2.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-size: 0.875rem;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.6);
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  
  &::-webkit-scrollbar {
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 2px;
  }
`;

const TabButton = styled(motion.button)`
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  background: ${props => props.active ? 
    'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 
    'transparent'
  };
  border: none;
  border-radius: 8px;
  color: ${props => props.active ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  font-weight: ${props => props.active ? 600 : 400};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  
  &:hover {
    background: ${props => props.active ? 
      'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 
      'rgba(255, 255, 255, 0.1)'
    };
    color: white;
  }
`;

const CommandButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(45deg, #3b82f6 0%, #00ffff 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(45deg, #2563eb 0%, #00e6ff 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
  
  &:focus {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  &.success {
    background: linear-gradient(45deg, #10b981 0%, #00ffff 100%);
    
    &:hover {
      background: linear-gradient(45deg, #059669 0%, #00e6ff 100%);
    }
  }
  
  &.danger {
    background: linear-gradient(45deg, #ef4444 0%, #f59e0b 100%);
    
    &:hover {
      background: linear-gradient(45deg, #dc2626 0%, #d97706 100%);
    }
  }
`;

const SettingsPanel = styled(motion.div)`
  background: rgba(30, 58, 138, 0.2);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  padding: 2rem;
  margin-bottom: 2rem;
`;

const PanelTitle = styled.h3`
  color: #00ffff;
  margin: 0 0 1.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
`;

const SettingsGrid = styled.div`
  display: grid;
  gap: 2rem;
`;

const SettingGroup = styled.div`
  display: grid;
  gap: 1rem;
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }
`;

const SettingInfo = styled.div`
  flex: 1;
`;

const SettingTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.25rem;
`;

const SettingDescription = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
`;

const SettingControl = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Toggle = styled.label`
  position: relative;
  width: 44px;
  height: 24px;
  cursor: pointer;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(107, 114, 128, 0.5);
    border-radius: 24px;
    transition: 0.3s;
    
    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }
  }
  
  input:checked + .slider {
    background: linear-gradient(45deg, #10b981, #00ffff);
  }
  
  input:checked + .slider:before {
    transform: translateX(20px);
  }
`;

const FormInput = styled.input`
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.875rem;
  min-width: 200px;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    box-shadow: 0 0 0 2px rgba(0, 255, 255, 0.2);
  }
`;

const FormSelect = styled.select`
  padding: 0.5rem 0.75rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 6px;
  color: #ffffff;
  font-size: 0.875rem;
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: #00ffff;
  }
  
  option {
    background: #1e3a8a;
    color: #ffffff;
  }
`;

const APIKeyCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
`;

const APIKeyHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const APIKeyInfo = styled.div`
  flex: 1;
`;

const APIKeyName = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.5rem;
`;

const APIKeyDescription = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 0.5rem;
`;

const APIKeyValue = styled.div`
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.2);
  padding: 0.5rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  
  button {
    background: none;
    border: none;
    color: #3b82f6;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: all 0.2s;
    
    &:hover {
      background: rgba(59, 130, 246, 0.1);
    }
  }
`;

const StatusBadge = styled.span`
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  
  &.active {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  &.inactive {
    background: rgba(107, 114, 128, 0.2);
    color: #6b7280;
    border: 1px solid rgba(107, 114, 128, 0.3);
  }
  
  &.expired {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
`;

const BackupPanel = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
`;

const BackupCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
`;

const BackupIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #00ffff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  color: white;
  font-size: 1.25rem;
`;

const BackupTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.5rem;
`;

const BackupDescription = styled.div`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1rem;
  line-height: 1.4;
`;

// === INTERFACES ===
interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxFileUploadSize: number;
  sessionTimeout: number;
  timezone: string;
}

interface SecuritySettings {
  twoFactorRequired: boolean;
  passwordMinLength: number;
  passwordRequireSpecial: boolean;
  maxLoginAttempts: number;
  lockoutDuration: number;
  ipWhitelisting: boolean;
  auditLogging: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  digestFrequency: string;
  adminAlerts: boolean;
}

interface APIKey {
  id: string;
  name: string;
  description: string;
  key: string;
  status: 'active' | 'inactive' | 'expired';
  createdAt: string;
  lastUsed?: string;
  permissions: string[];
}

// === MAIN COMPONENT ===
const AdminSettingsSection: React.FC = () => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState('system');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    siteName: 'SwanStudios',
    siteDescription: 'Premium Personal Training & Fitness Platform',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxFileUploadSize: 10,
    sessionTimeout: 30,
    timezone: 'America/New_York'
  });
  
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorRequired: false,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    ipWhitelisting: false,
    auditLogging: true
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    digestFrequency: 'daily',
    adminAlerts: true
  });
  
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);

  // Fetch settings from backend
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [systemRes, securityRes, notificationRes, apiKeysRes] = await Promise.all([
        authAxios.get('/api/admin/settings/system'),
        authAxios.get('/api/admin/settings/security'),
        authAxios.get('/api/admin/settings/notifications'),
        authAxios.get('/api/admin/settings/api-keys')
      ]);
      
      if (systemRes.data.success) {
        setSystemSettings(systemRes.data.data?.settings || systemRes.data.settings);
      }

      if (securityRes.data.success) {
        setSecuritySettings(securityRes.data.data?.settings || securityRes.data.settings);
      }

      if (notificationRes.data.success) {
        setNotificationSettings(notificationRes.data.data?.settings || notificationRes.data.settings);
      }

      if (apiKeysRes.data.success) {
        setApiKeys(apiKeysRes.data.data?.keys || apiKeysRes.data.keys || []);
      }
    } catch (error) {
      console.error('[AdminSettings] API error - using defaults:', error);
      setMockData();
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  // Set mock data for development/testing
  const setMockData = () => {
    const mockApiKeys: APIKey[] = [
      {
        id: '1',
        name: 'Stripe Production',
        description: 'Live payment processing integration',
        key: 'sk_live_51Abc...xyz123',
        status: 'active',
        createdAt: '2024-01-15T10:00:00Z',
        lastUsed: '2024-05-22T14:30:00Z',
        permissions: ['payments:read', 'payments:write']
      },
      {
        id: '2',
        name: 'Email Service',
        description: 'Transactional email delivery',
        key: 'sg_api_key_abc123...xyz789',
        status: 'active',
        createdAt: '2024-02-01T09:00:00Z',
        lastUsed: '2024-05-22T10:15:00Z',
        permissions: ['email:send']
      },
      {
        id: '3',
        name: 'Analytics API',
        description: 'Google Analytics integration (deprecated)',
        key: 'ga_key_deprecated_123',
        status: 'expired',
        createdAt: '2023-06-01T12:00:00Z',
        lastUsed: '2024-03-15T08:45:00Z',
        permissions: ['analytics:read']
      }
    ];
    
    setApiKeys(mockApiKeys);
  };

  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save settings
  const saveSettings = async (type: string, settings: any) => {
    try {
      setSaving(true);
      const response = await authAxios.put(`/api/admin/settings/${type}`, settings);
      
      if (response.data.success) {
        console.log(`${type} settings saved successfully`);
      } else {
        console.error(`Failed to save ${type} settings`);
      }
    } catch (error) {
      console.error(`Error saving ${type} settings:`, error);
    } finally {
      setSaving(false);
    }
  };

  // Handle API key actions
  const generateApiKey = async () => {
    try {
      const response = await authAxios.post('/api/admin/settings/api-keys', {
        name: 'New API Key',
        description: 'Generated API key',
        permissions: ['basic:read']
      });
      
      if (response.data.success) {
        await fetchSettings();
      }
    } catch (error) {
      console.error('Error generating API key:', error);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await authAxios.delete(`/api/admin/settings/api-keys/${keyId}`);
      
      if (response.data.success) {
        await fetchSettings();
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    console.log('API key copied to clipboard');
  };

  const performBackup = async (type: string) => {
    try {
      const response = await authAxios.post('/api/admin/backup', {
        type: type
      });
      
      if (response.data.success) {
        console.log(`${type} backup started successfully`);
      }
    } catch (error) {
      console.error(`Error starting ${type} backup:`, error);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + '...' + key.substring(key.length - 4);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <ManagementContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw size={32} color="#00ffff" />
          </motion.div>
        </div>
      </ManagementContainer>
    );
  }

  return (
    <ManagementContainer>
      {/* Action Bar */}
      <ActionBar
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <SearchContainer>
          <div style={{ position: 'relative', flex: 1 }}>
            <SearchIcon>
              <Search size={16} />
            </SearchIcon>
            <SearchInput
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </SearchContainer>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <CommandButton
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchSettings}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </CommandButton>
          
          <CommandButton
            className="success"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              switch (activeTab) {
                case 'system':
                  saveSettings('system', systemSettings);
                  break;
                case 'security':
                  saveSettings('security', securitySettings);
                  break;
                case 'notifications':
                  saveSettings('notifications', notificationSettings);
                  break;
              }
            }}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </CommandButton>
        </div>
      </ActionBar>

      {/* Tab Navigation */}
      <TabContainer>
        <TabButton
          active={activeTab === 'system'}
          onClick={() => setActiveTab('system')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Settings size={16} />
          System
        </TabButton>
        <TabButton
          active={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Shield size={16} />
          Security
        </TabButton>
        <TabButton
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Users size={16} />
          Users & Roles
        </TabButton>
        <TabButton
          active={activeTab === 'notifications'}
          onClick={() => setActiveTab('notifications')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Bell size={16} />
          Notifications
        </TabButton>
        <TabButton
          active={activeTab === 'integrations'}
          onClick={() => setActiveTab('integrations')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Key size={16} />
          API & Integrations
        </TabButton>
        <TabButton
          active={activeTab === 'backup'}
          onClick={() => setActiveTab('backup')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <HardDrive size={16} />
          Backup & Maintenance
        </TabButton>
      </TabContainer>

      {/* System Settings */}
      {activeTab === 'system' && (
        <SettingsPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PanelTitle>
            <Settings size={20} />
            System Configuration
          </PanelTitle>
          
          <SettingsGrid>
            <SettingGroup>
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Site Name</SettingTitle>
                  <SettingDescription>The name of your fitness platform</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <FormInput
                    type="text"
                    value={systemSettings.siteName}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, siteName: e.target.value }))}
                  />
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Site Description</SettingTitle>
                  <SettingDescription>Brief description of your platform</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <FormInput
                    type="text"
                    value={systemSettings.siteDescription}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                  />
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Maintenance Mode</SettingTitle>
                  <SettingDescription>Enable maintenance mode to restrict site access</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={systemSettings.maintenanceMode}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Allow Registration</SettingTitle>
                  <SettingDescription>Allow new users to register accounts</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={systemSettings.allowRegistration}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, allowRegistration: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Email Verification</SettingTitle>
                  <SettingDescription>Require email verification for new accounts</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={systemSettings.requireEmailVerification}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, requireEmailVerification: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Max File Upload Size</SettingTitle>
                  <SettingDescription>Maximum file size for uploads (MB)</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <FormInput
                    type="number"
                    value={systemSettings.maxFileUploadSize}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, maxFileUploadSize: parseInt(e.target.value) }))}
                    min="1"
                    max="100"
                  />
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Session Timeout</SettingTitle>
                  <SettingDescription>User session timeout in minutes</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <FormInput
                    type="number"
                    value={systemSettings.sessionTimeout}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                    min="5"
                    max="480"
                  />
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Timezone</SettingTitle>
                  <SettingDescription>Default timezone for the platform</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <FormSelect
                    value={systemSettings.timezone}
                    onChange={(e) => setSystemSettings(prev => ({ ...prev, timezone: e.target.value }))}
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="UTC">UTC</option>
                  </FormSelect>
                </SettingControl>
              </SettingItem>
            </SettingGroup>
          </SettingsGrid>
        </SettingsPanel>
      )}

      {/* Security Settings */}
      {activeTab === 'security' && (
        <SettingsPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PanelTitle>
            <Shield size={20} />
            Security Configuration
          </PanelTitle>
          
          <SettingsGrid>
            <SettingGroup>
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Two-Factor Authentication</SettingTitle>
                  <SettingDescription>Require 2FA for all user accounts</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={securitySettings.twoFactorRequired}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, twoFactorRequired: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Minimum Password Length</SettingTitle>
                  <SettingDescription>Minimum number of characters for passwords</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <FormInput
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) }))}
                    min="6"
                    max="32"
                  />
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Require Special Characters</SettingTitle>
                  <SettingDescription>Passwords must contain special characters</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={securitySettings.passwordRequireSpecial}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordRequireSpecial: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Max Login Attempts</SettingTitle>
                  <SettingDescription>Maximum failed login attempts before lockout</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <FormInput
                    type="number"
                    value={securitySettings.maxLoginAttempts}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))}
                    min="3"
                    max="10"
                  />
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Lockout Duration</SettingTitle>
                  <SettingDescription>Account lockout duration in minutes</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <FormInput
                    type="number"
                    value={securitySettings.lockoutDuration}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, lockoutDuration: parseInt(e.target.value) }))}
                    min="5"
                    max="1440"
                  />
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>IP Whitelisting</SettingTitle>
                  <SettingDescription>Enable IP address whitelisting for admin access</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={securitySettings.ipWhitelisting}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, ipWhitelisting: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Audit Logging</SettingTitle>
                  <SettingDescription>Log all administrative actions</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={securitySettings.auditLogging}
                      onChange={(e) => setSecuritySettings(prev => ({ ...prev, auditLogging: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
            </SettingGroup>
          </SettingsGrid>
        </SettingsPanel>
      )}

      {/* Users & Roles Tab */}
      {activeTab === 'users' && (
        <SettingsPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PanelTitle>
            <Users size={20} />
            User Roles & Permissions
          </PanelTitle>
          
          <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255, 255, 255, 0.6)' }}>
            <Users size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <h3>User Management</h3>
            <p>Configure user roles and permissions for different access levels</p>
            <CommandButton style={{ marginTop: '1rem' }}>
              <Plus size={16} />
              Create Role
            </CommandButton>
          </div>
        </SettingsPanel>
      )}

      {/* Notifications Settings */}
      {activeTab === 'notifications' && (
        <SettingsPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PanelTitle>
            <Bell size={20} />
            Notification Settings
          </PanelTitle>
          
          <SettingsGrid>
            <SettingGroup>
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Email Notifications</SettingTitle>
                  <SettingDescription>Enable email notifications for users</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailNotifications}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Push Notifications</SettingTitle>
                  <SettingDescription>Enable push notifications for mobile users</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={notificationSettings.pushNotifications}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>SMS Notifications</SettingTitle>
                  <SettingDescription>Enable SMS notifications for critical alerts</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={notificationSettings.smsNotifications}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, smsNotifications: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Digest Frequency</SettingTitle>
                  <SettingDescription>How often to send digest emails</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <FormSelect
                    value={notificationSettings.digestFrequency}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, digestFrequency: e.target.value }))}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="never">Never</option>
                  </FormSelect>
                </SettingControl>
              </SettingItem>
              
              <SettingItem>
                <SettingInfo>
                  <SettingTitle>Admin Alerts</SettingTitle>
                  <SettingDescription>Send alerts for critical system events</SettingDescription>
                </SettingInfo>
                <SettingControl>
                  <Toggle>
                    <input
                      type="checkbox"
                      checked={notificationSettings.adminAlerts}
                      onChange={(e) => setNotificationSettings(prev => ({ ...prev, adminAlerts: e.target.checked }))}
                    />
                    <span className="slider"></span>
                  </Toggle>
                </SettingControl>
              </SettingItem>
            </SettingGroup>
          </SettingsGrid>
        </SettingsPanel>
      )}

      {/* API & Integrations */}
      {activeTab === 'integrations' && (
        <SettingsPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PanelTitle>
            <Key size={20} />
            API Keys & Integrations
          </PanelTitle>
          
          <div style={{ marginBottom: '2rem' }}>
            <CommandButton
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={generateApiKey}
            >
              <Plus size={16} />
              Generate New API Key
            </CommandButton>
          </div>
          
          <div>
            {apiKeys.map((apiKey) => (
              <APIKeyCard
                key={apiKey.id}
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <APIKeyHeader>
                  <APIKeyInfo>
                    <APIKeyName>{apiKey.name}</APIKeyName>
                    <APIKeyDescription>{apiKey.description}</APIKeyDescription>
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.5rem', 
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      <span>Created: {formatDate(apiKey.createdAt)}</span>
                      {apiKey.lastUsed && <span>• Last used: {formatDate(apiKey.lastUsed)}</span>}
                    </div>
                  </APIKeyInfo>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <StatusBadge className={apiKey.status}>
                      {apiKey.status}
                    </StatusBadge>
                    
                    <CommandButton
                      className="danger"
                      size="small"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => revokeApiKey(apiKey.id)}
                    >
                      <Trash2 size={14} />
                      Revoke
                    </CommandButton>
                  </div>
                </APIKeyHeader>
                
                <APIKeyValue>
                  <span>
                    {showApiKey === apiKey.id ? apiKey.key : maskApiKey(apiKey.key)}
                  </span>
                  <button
                    onClick={() => setShowApiKey(showApiKey === apiKey.id ? null : apiKey.id)}
                  >
                    {showApiKey === apiKey.id ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => copyApiKey(apiKey.key)}>
                    <Copy size={14} />
                  </button>
                </APIKeyValue>
                
                <div style={{ 
                  display: 'flex', 
                  gap: '0.5rem', 
                  marginTop: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  {apiKey.permissions.map((permission, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '0.25rem 0.5rem',
                        background: 'rgba(59, 130, 246, 0.2)',
                        color: '#3b82f6',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        border: '1px solid rgba(59, 130, 246, 0.3)'
                      }}
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </APIKeyCard>
            ))}
          </div>
        </SettingsPanel>
      )}

      {/* Backup & Maintenance */}
      {activeTab === 'backup' && (
        <SettingsPanel
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <PanelTitle>
            <HardDrive size={20} />
            Backup & Maintenance
          </PanelTitle>
          
          <BackupPanel>
            <BackupCard>
              <BackupIcon>
                <Database size={24} />
              </BackupIcon>
              <BackupTitle>Database Backup</BackupTitle>
              <BackupDescription>
                Create a complete backup of all user data, sessions, and system information
              </BackupDescription>
              <CommandButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => performBackup('database')}
              >
                <Download size={16} />
                Backup Database
              </CommandButton>
            </BackupCard>
            
            <BackupCard>
              <BackupIcon>
                <FileText size={24} />
              </BackupIcon>
              <BackupTitle>System Configuration</BackupTitle>
              <BackupDescription>
                Export all system settings, configurations, and customizations
              </BackupDescription>
              <CommandButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => performBackup('config')}
              >
                <Download size={16} />
                Export Config
              </CommandButton>
            </BackupCard>
            
            <BackupCard>
              <BackupIcon>
                <Upload size={24} />
              </BackupIcon>
              <BackupTitle>System Restore</BackupTitle>
              <BackupDescription>
                Restore system from a previous backup file
              </BackupDescription>
              <CommandButton
                className="danger"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Upload size={16} />
                Restore Backup
              </CommandButton>
            </BackupCard>
            
            <BackupCard>
              <BackupIcon>
                <RotateCw size={24} />
              </BackupIcon>
              <BackupTitle>System Maintenance</BackupTitle>
              <BackupDescription>
                Perform system cleanup, optimization, and maintenance tasks
              </BackupDescription>
              <CommandButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCw size={16} />
                Run Maintenance
              </CommandButton>
            </BackupCard>
          </BackupPanel>
        </SettingsPanel>
      )}
    </ManagementContainer>
  );
};

export default AdminSettingsSection;