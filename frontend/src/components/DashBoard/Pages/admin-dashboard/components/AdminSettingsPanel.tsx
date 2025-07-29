/**
 * AdminSettingsPanel.tsx
 * =======================
 * 
 * Enterprise Administrative Settings & Configuration Center
 * Platform configuration, administrative preferences, integration settings, and system-wide controls
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Comprehensive platform configuration management
 * - Security settings and access controls
 * - Integration management (Stripe, APIs, webhooks)
 * - Email and notification settings
 * - System maintenance and backup controls
 * - Environment variable management
 * - Advanced user role and permission configuration
 * - Audit logging and compliance settings
 * 
 * Master Prompt Alignment:
 * - Enterprise-grade system administration
 * - 7-star configuration management
 * - Security-first administrative controls
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  Settings, 
  Shield, 
  Lock, 
  Key, 
  Mail,
  Bell,
  Database,
  Server,
  Globe,
  Users,
  CreditCard,
  Webhook,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Edit3,
  Trash2,
  Plus,
  Download,
  Upload
} from 'lucide-react';

// === STYLED COMPONENTS ===
const SettingsContainer = styled(motion.div)`
  padding: 2rem;
  min-height: 100vh;
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(248, 250, 252, 1) 100%);
`;

const SettingsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(59, 130, 246, 0.2);
`;

const HeaderTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #0ea5e9 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: flex;
  align-items: center;
  gap: 1rem;
  
  .header-icon {
    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
    border-radius: 12px;
    padding: 0.75rem;
    color: white;
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  border: 2px solid ${props => {
    switch (props.$variant) {
      case 'primary': return '#3b82f6';
      case 'danger': return '#ef4444';
      default: return '#e5e7eb';
    }
  }};
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return '#3b82f6';
      case 'danger': return '#ef4444';
      default: return 'white';
    }
  }};
  color: ${props => props.$variant === 'primary' || props.$variant === 'danger' ? 'white' : '#64748b'};
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => {
      switch (props.$variant) {
        case 'primary': return '#2563eb';
        case 'danger': return '#dc2626';
        default: return '#f8fafc';
      }
    }};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const SettingsNavigation = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  height: fit-content;
  
  @media (max-width: 1024px) {
    display: flex;
    overflow-x: auto;
    padding: 1rem;
    gap: 0.5rem;
  }
`;

const NavItem = styled(motion.button)<{ $active?: boolean }>`
  width: 100%;
  padding: 1rem;
  border: none;
  background: ${props => props.$active ? 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 58, 138, 0.05) 100%)' : 'transparent'};
  border-radius: 12px;
  color: ${props => props.$active ? '#1e40af' : '#64748b'};
  font-weight: ${props => props.$active ? '600' : '500'};
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(59, 130, 246, 0.05);
    color: #1e40af;
  }
  
  .nav-icon {
    width: 20px;
    height: 20px;
  }
  
  @media (max-width: 1024px) {
    min-width: 200px;
    margin-bottom: 0;
  }
`;

const SettingsContent = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const ContentHeader = styled.div`
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 1) 100%);
  border-bottom: 1px solid #e5e7eb;
  
  .content-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 0.5rem;
  }
  
  .content-description {
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.5;
  }
`;

const ContentBody = styled.div`
  padding: 2rem;
`;

const SettingsSection = styled.div`
  margin-bottom: 2rem;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .section-title {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .section-description {
    color: #64748b;
    font-size: 0.85rem;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }
`;

const SettingsGrid = styled.div`
  display: grid;
  gap: 1.5rem;
`;

const SettingItem = styled.div`
  .setting-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.75rem;
  }
  
  .setting-label {
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.25rem;
  }
  
  .setting-description {
    color: #64748b;
    font-size: 0.85rem;
    line-height: 1.4;
  }
  
  .setting-control {
    flex-shrink: 0;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9rem;
  background: white;
  transition: all 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const Toggle = styled.div<{ $active?: boolean }>`
  width: 50px;
  height: 26px;
  border-radius: 13px;
  background: ${props => props.$active ? '#3b82f6' : '#d1d5db'};
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  
  .toggle-handle {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: white;
    position: absolute;
    top: 2px;
    left: ${props => props.$active ? '26px' : '2px'};
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const KeyValueEditor = styled.div`
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  
  .kv-header {
    background: #f8fafc;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    display: grid;
    grid-template-columns: 1fr 1fr 60px;
    gap: 1rem;
    font-weight: 500;
    color: #374151;
    font-size: 0.85rem;
  }
  
  .kv-row {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f1f5f9;
    display: grid;
    grid-template-columns: 1fr 1fr 60px;
    gap: 1rem;
    align-items: center;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background: #f8fafc;
    }
  }
  
  .kv-input {
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 0.85rem;
    
    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const SmallButton = styled(motion.button)<{ $variant?: 'primary' | 'danger' }>`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return 'rgba(59, 130, 246, 0.1)';
      case 'danger': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'primary': return '#1e40af';
      case 'danger': return '#dc2626';
      default: return '#374151';
    }
  }};
  
  &:hover {
    transform: scale(1.1);
    background: ${props => {
      switch (props.$variant) {
        case 'primary': return 'rgba(59, 130, 246, 0.2)';
        case 'danger': return 'rgba(239, 68, 68, 0.2)';
        default: return 'rgba(107, 114, 128, 0.2)';
      }
    }};
  }
`;

// === NAVIGATION ITEMS ===
const navigationItems = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'integrations', label: 'Integrations', icon: Globe },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'users', label: 'User Management', icon: Users }
];

// === MOCK SETTINGS DATA ===
const mockSettings = {
  general: {
    siteName: 'Swan Studios',
    siteDescription: 'Revolutionary Fitness Social Platform',
    maintenanceMode: false,
    registrationEnabled: true,
    defaultUserRole: 'client'
  },
  security: {
    requireEmailVerification: true,
    enforceStrongPasswords: true,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    twoFactorRequired: false
  },
  integrations: {
    stripeEnabled: true,
    stripeWebhookSecret: '****_****_****_****',
    emailProvider: 'sendgrid',
    analyticsEnabled: true
  },
  notifications: {
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    marketingEmails: true
  }
};

// === MAIN COMPONENT ===
const AdminSettingsPanel: React.FC = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [settings, setSettings] = useState(mockSettings);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [envVars, setEnvVars] = useState([
    { key: 'STRIPE_PUBLIC_KEY', value: 'pk_live_****', editable: false },
    { key: 'DATABASE_URL', value: 'postgresql://****', editable: false },
    { key: 'JWT_SECRET', value: '****_secret_****', editable: true }
  ]);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSaving(false);
    console.log('Settings saved:', settings);
  };

  const handleToggle = (section: string, key: string) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: !prev[section as keyof typeof prev][key as never]
      }
    }));
  };

  const handleInputChange = (section: string, key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }));
  };

  const addEnvVar = () => {
    setEnvVars(prev => [...prev, { key: '', value: '', editable: true }]);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(prev => prev.filter((_, i) => i !== index));
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    setEnvVars(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const renderGeneralSettings = () => (
    <SettingsGrid>
      <SettingItem>
        <div className="setting-header">
          <div>
            <div className="setting-label">Site Name</div>
            <div className="setting-description">The name of your platform</div>
          </div>
        </div>
        <Input
          value={settings.general.siteName}
          onChange={(e) => handleInputChange('general', 'siteName', e.target.value)}
          placeholder="Enter site name"
        />
      </SettingItem>

      <SettingItem>
        <div className="setting-header">
          <div>
            <div className="setting-label">Site Description</div>
            <div className="setting-description">Brief description of your platform</div>
          </div>
        </div>
        <Input
          value={settings.general.siteDescription}
          onChange={(e) => handleInputChange('general', 'siteDescription', e.target.value)}
          placeholder="Enter site description"
        />
      </SettingItem>

      <SettingItem>
        <div className="setting-header">
          <div>
            <div className="setting-label">Maintenance Mode</div>
            <div className="setting-description">Enable to put the site in maintenance mode</div>
          </div>
          <div className="setting-control">
            <Toggle
              $active={settings.general.maintenanceMode}
              onClick={() => handleToggle('general', 'maintenanceMode')}
            >
              <div className="toggle-handle"></div>
            </Toggle>
          </div>
        </div>
      </SettingItem>

      <SettingItem>
        <div className="setting-header">
          <div>
            <div className="setting-label">Registration Enabled</div>
            <div className="setting-description">Allow new user registrations</div>
          </div>
          <div className="setting-control">
            <Toggle
              $active={settings.general.registrationEnabled}
              onClick={() => handleToggle('general', 'registrationEnabled')}
            >
              <div className="toggle-handle"></div>
            </Toggle>
          </div>
        </div>
      </SettingItem>

      <SettingItem>
        <div className="setting-header">
          <div>
            <div className="setting-label">Default User Role</div>
            <div className="setting-description">Default role assigned to new users</div>
          </div>
        </div>
        <Select
          value={settings.general.defaultUserRole}
          onChange={(e) => handleInputChange('general', 'defaultUserRole', e.target.value)}
        >
          <option value="client">Client</option>
          <option value="trainer">Trainer</option>
          <option value="admin">Admin</option>
        </Select>
      </SettingItem>
    </SettingsGrid>
  );

  const renderSecuritySettings = () => (
    <SettingsGrid>
      <SettingItem>
        <div className="setting-header">
          <div>
            <div className="setting-label">Email Verification Required</div>
            <div className="setting-description">Require email verification for new accounts</div>
          </div>
          <div className="setting-control">
            <Toggle
              $active={settings.security.requireEmailVerification}
              onClick={() => handleToggle('security', 'requireEmailVerification')}
            >
              <div className="toggle-handle"></div>
            </Toggle>
          </div>
        </div>
      </SettingItem>

      <SettingItem>
        <div className="setting-header">
          <div>
            <div className="setting-label">Enforce Strong Passwords</div>
            <div className="setting-description">Require complex passwords with special characters</div>
          </div>
          <div className="setting-control">
            <Toggle
              $active={settings.security.enforceStrongPasswords}
              onClick={() => handleToggle('security', 'enforceStrongPasswords')}
            >
              <div className="toggle-handle"></div>
            </Toggle>
          </div>
        </div>
      </SettingItem>

      <SettingItem>
        <div className="setting-header">
          <div>
            <div className="setting-label">Session Timeout (hours)</div>
            <div className="setting-description">Automatic logout after inactivity</div>
          </div>
        </div>
        <Input
          type="number"
          value={settings.security.sessionTimeout}
          onChange={(e) => handleInputChange('security', 'sessionTimeout', e.target.value)}
          min="1"
          max="168"
        />
      </SettingItem>

      <SettingItem>
        <div className="setting-header">
          <div>
            <div className="setting-label">Max Login Attempts</div>
            <div className="setting-description">Maximum failed login attempts before lockout</div>
          </div>
        </div>
        <Input
          type="number"
          value={settings.security.maxLoginAttempts}
          onChange={(e) => handleInputChange('security', 'maxLoginAttempts', e.target.value)}
          min="1"
          max="10"
        />
      </SettingItem>
    </SettingsGrid>
  );

  const renderIntegrationsSettings = () => (
    <SettingsGrid>
      <SettingsSection>
        <div className="section-title">
          <CreditCard size={16} />
          Payment Integration
        </div>
        <div className="section-description">
          Configure Stripe payment processing and webhook settings
        </div>
        
        <SettingItem>
          <div className="setting-header">
            <div>
              <div className="setting-label">Stripe Integration</div>
              <div className="setting-description">Enable Stripe payment processing</div>
            </div>
            <div className="setting-control">
              <Toggle
                $active={settings.integrations.stripeEnabled}
                onClick={() => handleToggle('integrations', 'stripeEnabled')}
              >
                <div className="toggle-handle"></div>
              </Toggle>
            </div>
          </div>
        </SettingItem>

        <SettingItem>
          <div className="setting-header">
            <div>
              <div className="setting-label">Webhook Secret</div>
              <div className="setting-description">Stripe webhook endpoint secret</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Input
              type={showSecrets ? 'text' : 'password'}
              value={settings.integrations.stripeWebhookSecret}
              onChange={(e) => handleInputChange('integrations', 'stripeWebhookSecret', e.target.value)}
              placeholder="whsec_..."
            />
            <SmallButton
              onClick={() => setShowSecrets(!showSecrets)}
              title={showSecrets ? 'Hide' : 'Show'}
            >
              {showSecrets ? <EyeOff size={14} /> : <Eye size={14} />}
            </SmallButton>
          </div>
        </SettingItem>
      </SettingsSection>

      <SettingsSection>
        <div className="section-title">
          <Mail size={16} />
          Email Integration
        </div>
        <div className="section-description">
          Configure email service provider and settings
        </div>
        
        <SettingItem>
          <div className="setting-header">
            <div>
              <div className="setting-label">Email Provider</div>
              <div className="setting-description">Service used for sending emails</div>
            </div>
          </div>
          <Select
            value={settings.integrations.emailProvider}
            onChange={(e) => handleInputChange('integrations', 'emailProvider', e.target.value)}
          >
            <option value="sendgrid">SendGrid</option>
            <option value="mailgun">Mailgun</option>
            <option value="aws-ses">AWS SES</option>
          </Select>
        </SettingItem>
      </SettingsSection>

      <SettingsSection>
        <div className="section-title">
          <Globe size={16} />
          Environment Variables
        </div>
        <div className="section-description">
          Manage secure environment variables and API keys
        </div>
        
        <KeyValueEditor>
          <div className="kv-header">
            <div>Variable Name</div>
            <div>Value</div>
            <div>Actions</div>
          </div>
          
          {envVars.map((envVar, index) => (
            <div key={index} className="kv-row">
              <input
                className="kv-input"
                value={envVar.key}
                onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                placeholder="VARIABLE_NAME"
                disabled={!envVar.editable}
              />
              <input
                className="kv-input"
                type={showSecrets ? 'text' : 'password'}
                value={envVar.value}
                onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                placeholder="variable_value"
                disabled={!envVar.editable}
              />
              <ActionButtons>
                {envVar.editable && (
                  <SmallButton
                    $variant="danger"
                    onClick={() => removeEnvVar(index)}
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </SmallButton>
                )}
              </ActionButtons>
            </div>
          ))}
          
          <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9' }}>
            <ActionButton
              onClick={addEnvVar}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={16} />
              Add Variable
            </ActionButton>
          </div>
        </KeyValueEditor>
      </SettingsSection>
    </SettingsGrid>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings();
      case 'security':
        return renderSecuritySettings();
      case 'integrations':
        return renderIntegrationsSettings();
      default:
        return (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            <Settings size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <div>Settings for {activeSection} coming soon...</div>
          </div>
        );
    }
  };

  const getSectionInfo = () => {
    switch (activeSection) {
      case 'general':
        return {
          title: 'General Settings',
          description: 'Basic platform configuration and site-wide settings'
        };
      case 'security':
        return {
          title: 'Security Settings',
          description: 'Authentication, authorization, and security policies'
        };
      case 'integrations':
        return {
          title: 'Integrations & APIs',
          description: 'Third-party services, webhooks, and environment variables'
        };
      case 'notifications':
        return {
          title: 'Notification Settings',
          description: 'Email, push, and SMS notification configuration'
        };
      case 'database':
        return {
          title: 'Database Settings',
          description: 'Database configuration, backups, and maintenance'
        };
      case 'users':
        return {
          title: 'User Management',
          description: 'Default roles, permissions, and user policies'
        };
      default:
        return {
          title: 'Settings',
          description: 'Configure your platform'
        };
    }
  };

  const sectionInfo = getSectionInfo();

  return (
    <SettingsContainer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <SettingsHeader>
        <HeaderTitle>
          <div className="header-icon">
            <Settings size={24} />
          </div>
          Administrative Settings
        </HeaderTitle>
        
        <HeaderActions>
          <ActionButton
            onClick={() => console.log('Export settings')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Download size={16} />
            Export Config
          </ActionButton>
          
          <ActionButton
            $variant="primary"
            onClick={handleSave}
            disabled={saving}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </ActionButton>
        </HeaderActions>
      </SettingsHeader>

      <SettingsLayout>
        <SettingsNavigation>
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavItem
                key={item.id}
                $active={activeSection === item.id}
                onClick={() => setActiveSection(item.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <IconComponent className="nav-icon" />
                {item.label}
              </NavItem>
            );
          })}
        </SettingsNavigation>

        <SettingsContent>
          <ContentHeader>
            <div className="content-title">{sectionInfo.title}</div>
            <div className="content-description">{sectionInfo.description}</div>
          </ContentHeader>
          
          <ContentBody>
            {renderContent()}
          </ContentBody>
        </SettingsContent>
      </SettingsLayout>
    </SettingsContainer>
  );
};

export default AdminSettingsPanel;
