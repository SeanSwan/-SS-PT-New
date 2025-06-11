import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  EyeOff, 
  Globe, 
  PaintBucket,
  Moon,
  Sun,
  Check,
  HelpCircle
} from 'lucide-react';
import ClientMainContent, { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter, 
  Grid, 
  Flex,
  Badge,
  Button
} from '../ClientMainContent';

// Types for settings
type ColorTheme = 'light' | 'dark' | 'system';
type NotificationSetting = 'all' | 'important' | 'none';
type PrivacySetting = 'public' | 'friends' | 'private';

/**
 * SettingsSection Component
 * 
 * Provides user controls for account settings, preferences,
 * notifications, privacy, and appearance.
 */
const SettingsSection: React.FC = () => {
  // State for various settings
  const [colorTheme, setColorTheme] = useState<ColorTheme>('system');
  const [notificationSetting, setNotificationSetting] = useState<NotificationSetting>('all');
  const [privacySetting, setPrivacySetting] = useState<PrivacySetting>('friends');
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  
  // Mock account details
  const account = {
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    createdAt: '2024-12-15T10:30:00',
    lastLogin: '2025-05-06T08:15:00',
    membership: 'Premium',
    membershipRenewal: '2026-05-06T08:15:00',
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ClientMainContent
      title="Settings"
      actions={<Button variant="primary">Save Changes</Button>}
    >
      {/* Settings Navigation */}
      <Card>
        <CardContent>
          <Flex gap="0.5rem">
            <Button variant="outline" style={{ gap: '0.5rem' }}>
              <User size={18} />
              Account
            </Button>
            <Button variant="outline" style={{ gap: '0.5rem' }}>
              <Bell size={18} />
              Notifications
            </Button>
            <Button variant="outline" style={{ gap: '0.5rem' }}>
              <EyeOff size={18} />
              Privacy
            </Button>
            <Button variant="outline" style={{ gap: '0.5rem' }}>
              <PaintBucket size={18} />
              Appearance
            </Button>
            <Button 
              variant="outline" 
              style={{ gap: '0.5rem' }}
              onClick={() => setShowAccessibilitySettings(!showAccessibilitySettings)}
            >
              <Globe size={18} />
              Accessibility
            </Button>
          </Flex>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Flex align="center" gap="0.5rem">
              <User size={20} />
              Account Settings
            </Flex>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Grid columns={2}>
            <div>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Account Information</h3>
              
              <Flex direction="column" gap="0.75rem" style={{ marginBottom: '1rem' }}>
                <Flex justify="space-between">
                  <span style={{ color: 'var(--text-muted)' }}>Email</span>
                  <span>{account.email}</span>
                </Flex>
                
                <Flex justify="space-between">
                  <span style={{ color: 'var(--text-muted)' }}>Phone</span>
                  <span>{account.phone}</span>
                </Flex>
                
                <Flex justify="space-between">
                  <span style={{ color: 'var(--text-muted)' }}>Member Since</span>
                  <span>{formatDate(account.createdAt)}</span>
                </Flex>
                
                <Flex justify="space-between">
                  <span style={{ color: 'var(--text-muted)' }}>Last Login</span>
                  <span>{formatDate(account.lastLogin)}</span>
                </Flex>
              </Flex>
              
              <Flex gap="0.5rem">
                <Button variant="outline">Change Email</Button>
                <Button variant="outline">Change Phone</Button>
              </Flex>
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Password & Security</h3>
              
              <Flex direction="column" gap="0.75rem" style={{ marginBottom: '1rem' }}>
                <Flex justify="space-between">
                  <span style={{ color: 'var(--text-muted)' }}>Password</span>
                  <span>••••••••••••</span>
                </Flex>
                
                <Flex justify="space-between">
                  <span style={{ color: 'var(--text-muted)' }}>Two-Factor Authentication</span>
                  <Badge color="var(--error)">Disabled</Badge>
                </Flex>
                
                <Flex justify="space-between">
                  <span style={{ color: 'var(--text-muted)' }}>Last Password Change</span>
                  <span>Never</span>
                </Flex>
              </Flex>
              
              <Flex gap="0.5rem">
                <Button variant="outline">Change Password</Button>
                <Button variant="outline">Enable 2FA</Button>
              </Flex>
            </div>
          </Grid>
          
          <hr style={{ 
            margin: '1.5rem 0', 
            border: 'none', 
            borderTop: '1px solid var(--border-color)' 
          }} />
          
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Membership Details</h3>
          
          <Flex style={{ 
            padding: '1rem',
            backgroundColor: 'var(--primary-color)11',
            borderRadius: '8px',
            marginBottom: '1rem',
          }}>
            <div style={{ flex: 1 }}>
              <Flex align="center" gap="0.5rem" style={{ marginBottom: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>{account.membership} Plan</h4>
                <Badge color="var(--success)">Active</Badge>
              </Flex>
              
              <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Renews on {formatDate(account.membershipRenewal)}
              </p>
            </div>
            
            <Flex gap="0.5rem">
              <Button variant="outline">Manage Plan</Button>
              <Button variant="outline">Billing History</Button>
            </Flex>
          </Flex>
          
          <Flex style={{ justifyContent: 'space-between' }}>
            <Button variant="outline" style={{ color: 'var(--error)' }}>
              Deactivate Account
            </Button>
            
            <Button variant="outline" style={{ color: 'var(--error)' }}>
              Delete Account
            </Button>
          </Flex>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Flex align="center" gap="0.5rem">
              <Bell size={20} />
              Notification Settings
            </Flex>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Flex direction="column" gap="1rem">
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Email Notifications</h3>
              
              <Flex 
                style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid var(--border-color)',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Session Reminders</h4>
                  <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Receive reminders before scheduled sessions
                  </p>
                </div>
                
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider round"></span>
                </label>
              </Flex>
              
              <Flex 
                style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid var(--border-color)',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Achievement Notifications</h4>
                  <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Receive emails when you earn achievements
                  </p>
                </div>
                
                <label className="switch">
                  <input type="checkbox" defaultChecked />
                  <span className="slider round"></span>
                </label>
              </Flex>
              
              <Flex 
                style={{ 
                  padding: '0.75rem', 
                  borderBottom: '1px solid var(--border-color)',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Marketing Emails</h4>
                  <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Receive promotional offers and updates
                  </p>
                </div>
                
                <label className="switch">
                  <input type="checkbox" />
                  <span className="slider round"></span>
                </label>
              </Flex>
            </div>
            
            <div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>Push Notifications</h3>
              
              <Flex gap="0.5rem" style={{ marginBottom: '1rem' }}>
                <Button 
                  variant={notificationSetting === 'all' ? 'primary' : 'outline'}
                  onClick={() => setNotificationSetting('all')}
                >
                  All Notifications
                </Button>
                
                <Button 
                  variant={notificationSetting === 'important' ? 'primary' : 'outline'}
                  onClick={() => setNotificationSetting('important')}
                >
                  Important Only
                </Button>
                
                <Button 
                  variant={notificationSetting === 'none' ? 'primary' : 'outline'}
                  onClick={() => setNotificationSetting('none')}
                >
                  Disable All
                </Button>
              </Flex>
              
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ 
                  margin: '0', 
                  fontSize: '0.9rem', 
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}>
                  {notificationSetting === 'all' && 'You will receive all notifications in real-time.'}
                  {notificationSetting === 'important' && 'You will only receive important notifications such as session reminders and direct messages.'}
                  {notificationSetting === 'none' && 'You will not receive any push notifications.'}
                </p>
              </div>
            </div>
          </Flex>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Flex align="center" gap="0.5rem">
              <Shield size={20} />
              Privacy Settings
            </Flex>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Profile Visibility</h3>
          
          <Flex gap="0.5rem" style={{ marginBottom: '1.5rem' }}>
            <Button 
              variant={privacySetting === 'public' ? 'primary' : 'outline'}
              onClick={() => setPrivacySetting('public')}
            >
              <Globe size={18} style={{ marginRight: '0.5rem' }} />
              Public
            </Button>
            
            <Button 
              variant={privacySetting === 'friends' ? 'primary' : 'outline'}
              onClick={() => setPrivacySetting('friends')}
            >
              <User size={18} style={{ marginRight: '0.5rem' }} />
              Friends Only
            </Button>
            
            <Button 
              variant={privacySetting === 'private' ? 'primary' : 'outline'}
              onClick={() => setPrivacySetting('private')}
            >
              <EyeOff size={18} style={{ marginRight: '0.5rem' }} />
              Private
            </Button>
          </Flex>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ 
              margin: '0', 
              fontSize: '0.9rem', 
              color: 'var(--text-muted)',
              fontStyle: 'italic',
            }}>
              {privacySetting === 'public' && 'Your profile, achievements, and creative works will be visible to everyone.'}
              {privacySetting === 'friends' && 'Your profile, achievements, and creative works will only be visible to your connections.'}
              {privacySetting === 'private' && 'Your profile, achievements, and creative works will be private and only visible to you.'}
            </p>
          </div>
          
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Data & Cookies</h3>
          
          <Flex 
            style={{ 
              padding: '0.75rem', 
              borderBottom: '1px solid var(--border-color)',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Activity Tracking</h4>
              <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Allow tracking of your activity for personalized recommendations
              </p>
            </div>
            
            <label className="switch">
              <input type="checkbox" defaultChecked />
              <span className="slider round"></span>
            </label>
          </Flex>
          
          <Flex 
            style={{ 
              padding: '0.75rem', 
              borderBottom: '1px solid var(--border-color)',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Cookie Preferences</h4>
              <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Manage how we use cookies on your device
              </p>
            </div>
            
            <Button variant="outline">Manage Cookies</Button>
          </Flex>
          
          <Flex 
            style={{ 
              padding: '0.75rem', 
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Download Your Data</h4>
              <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Request a copy of all your personal data
              </p>
            </div>
            
            <Button variant="outline">Request Data</Button>
          </Flex>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Flex align="center" gap="0.5rem">
              <PaintBucket size={20} />
              Appearance Settings
            </Flex>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Color Theme</h3>
          
          <Flex gap="0.75rem" style={{ marginBottom: '1.5rem' }}>
            <div
              onClick={() => setColorTheme('light')}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF',
                border: `2px solid ${colorTheme === 'light' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Sun size={24} color="#333333" />
              <span style={{ fontSize: '0.8rem', color: '#333333' }}>Light</span>
              
              {colorTheme === 'light' && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={16} color="#FFFFFF" />
                </div>
              )}
            </div>
            
            <div
              onClick={() => setColorTheme('dark')}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                backgroundColor: '#222222',
                border: `2px solid ${colorTheme === 'dark' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Moon size={24} color="#FFFFFF" />
              <span style={{ fontSize: '0.8rem', color: '#FFFFFF' }}>Dark</span>
              
              {colorTheme === 'dark' && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={16} color="#FFFFFF" />
                </div>
              )}
            </div>
            
            <div
              onClick={() => setColorTheme('system')}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '8px',
                background: 'linear-gradient(to bottom right, #FFFFFF 50%, #222222 50%)',
                border: `2px solid ${colorTheme === 'system' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <Settings size={24} color="#555555" />
              <span style={{ fontSize: '0.8rem', color: '#555555', backgroundColor: 'rgba(255, 255, 255, 0.8)', padding: '0 4px', borderRadius: '4px' }}>System</span>
              
              {colorTheme === 'system' && (
                <div style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Check size={16} color="#FFFFFF" />
                </div>
              )}
            </div>
          </Flex>
          
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Primary Color</h3>
          
          <Flex gap="0.75rem" style={{ marginBottom: '1.5rem' }}>
            {['#00FFFF', '#7851A9', '#FF6B6B', '#4CAF50', '#FFC107', '#2196F3'].map((color) => (
              <div
                key={color}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: color === '#00FFFF' ? '2px solid #333333' : 'none',
                }}
              />
            ))}
          </Flex>
        </CardContent>
      </Card>

      {/* Accessibility Settings */}
      {showAccessibilitySettings && (
        <Card>
          <CardHeader>
            <CardTitle>
              <Flex align="center" gap="0.5rem">
                <Globe size={20} />
                Accessibility Settings
              </Flex>
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Font Size</h3>
              
              <Flex gap="0.5rem">
                <Button 
                  variant={fontSize === 'small' ? 'primary' : 'outline'}
                  onClick={() => setFontSize('small')}
                >
                  Small
                </Button>
                
                <Button 
                  variant={fontSize === 'medium' ? 'primary' : 'outline'}
                  onClick={() => setFontSize('medium')}
                >
                  Medium
                </Button>
                
                <Button 
                  variant={fontSize === 'large' ? 'primary' : 'outline'}
                  onClick={() => setFontSize('large')}
                >
                  Large
                </Button>
                
                <Button 
                  variant={fontSize === 'extra-large' ? 'primary' : 'outline'}
                  onClick={() => setFontSize('extra-large')}
                >
                  Extra Large
                </Button>
              </Flex>
            </div>
            
            <Flex 
              style={{ 
                padding: '0.75rem', 
                borderBottom: '1px solid var(--border-color)',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>High Contrast Mode</h4>
                <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Increases contrast between elements for better visibility
                </p>
              </div>
              
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={highContrast}
                  onChange={() => setHighContrast(!highContrast)}
                />
                <span className="slider round"></span>
              </label>
            </Flex>
            
            <Flex 
              style={{ 
                padding: '0.75rem', 
                borderBottom: '1px solid var(--border-color)',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Reduced Motion</h4>
                <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Minimizes animations and transitions
                </p>
              </div>
              
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={reducedMotion}
                  onChange={() => setReducedMotion(!reducedMotion)}
                />
                <span className="slider round"></span>
              </label>
            </Flex>
            
            <Flex 
              style={{ 
                padding: '0.75rem',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>Screen Reader Compatibility</h4>
                <p style={{ margin: '0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                  Ensures all elements are properly labeled for screen readers
                </p>
              </div>
              
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="slider round"></span>
              </label>
            </Flex>
          </CardContent>
        </Card>
      )}

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle>
            <Flex align="center" gap="0.5rem">
              <HelpCircle size={20} />
              Help & Support
            </Flex>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <Flex gap="1rem">
            <Button variant="outline" style={{ flex: 1 }}>
              Contact Support
            </Button>
            
            <Button variant="outline" style={{ flex: 1 }}>
              FAQ
            </Button>
            
            <Button variant="outline" style={{ flex: 1 }}>
              User Guide
            </Button>
          </Flex>
        </CardContent>
      </Card>
    </ClientMainContent>
  );
};

export default SettingsSection;