/**
 * Accessibility-Aware Authentication
 * Provides authentication with accessibility considerations
 */

import { piiSafeLogger } from './piiSafeLogging.mjs';

export class AccessibilityAwareAuth {
  constructor() {
    // Role-based permissions with accessibility context
    this.rolePermissions = {
      user: {
        permissions: [
          'view_public_content',
          'update_own_profile',
          'view_own_data',
          'manage_own_accessibility_preferences'
        ],
        accessibilityFeatures: [
          'screen_reader_support',
          'keyboard_navigation',
          'high_contrast_mode',
          'font_size_adjustment',
          'color_blindness_support'
        ]
      },
      client: {
        permissions: [
          'view_public_content',
          'update_own_profile',
          'view_own_data',
          'manage_own_accessibility_preferences',
          'view_workout_plans',
          'log_workouts',
          'view_progress',
          'communicate_with_trainer'
        ],
        accessibilityFeatures: [
          'screen_reader_support',
          'keyboard_navigation',
          'high_contrast_mode',
          'font_size_adjustment',
          'color_blindness_support',
          'voice_commands',
          'gesture_navigation',
          'large_touch_targets'
        ]
      },
      trainer: {
        permissions: [
          'view_public_content',
          'update_own_profile',
          'view_own_data',
          'manage_own_accessibility_preferences',
          'view_client_data',
          'create_workout_plans',
          'analyze_client_progress',
          'communicate_with_clients',
          'manage_schedule'
        ],
        accessibilityFeatures: [
          'screen_reader_support',
          'keyboard_navigation',
          'high_contrast_mode',
          'font_size_adjustment',
          'color_blindness_support',
          'voice_commands',
          'gesture_navigation',
          'large_touch_targets',
          'data_visualization_alternatives'
        ]
      },
      admin: {
        permissions: [
          'view_public_content',
          'update_own_profile',
          'view_own_data',
          'manage_own_accessibility_preferences',
          'system_monitoring',
          'user_management',
          'content_moderation',
          'privacy_management',
          'accessibility_testing',
          'progress_analysis'
        ],
        accessibilityFeatures: [
          'screen_reader_support',
          'keyboard_navigation',
          'high_contrast_mode',
          'font_size_adjustment',
          'color_blindness_support',
          'voice_commands',
          'gesture_navigation',
          'large_touch_targets',
          'data_visualization_alternatives',
          'accessibility_analytics_dashboard'
        ]
      }
    };
    
    // Accessibility-specific error messages
    this.accessibilityErrors = {
      permission_denied: {
        screenReader: 'Access denied. You do not have permission to access this feature.',
        visual: 'Access Denied',
        description: 'You do not have the required permissions for this action.',
        alternatives: 'Please contact your administrator if you believe this is an error.',
        keyboardShortcut: 'Press Alt+H for help options'
      },
      authentication_required: {
        screenReader: 'Authentication required. Please sign in to continue.',
        visual: 'Sign In Required',
        description: 'This feature requires you to be signed in.',
        alternatives: 'Use Ctrl+L to go to the login page.',
        keyboardShortcut: 'Press Ctrl+L to sign in'
      },
      accessibility_feature_unavailable: {
        screenReader: 'The requested accessibility feature is not available in your current plan.',
        visual: 'Feature Unavailable',
        description: 'This accessibility feature requires an upgraded account.',
        alternatives: 'Contact support for information about accessibility accommodations.',
        keyboardShortcut: 'Press Ctrl+Shift+H for accessibility help'
      }
    };
    
    // Accessibility preferences schema
    this.accessibilityPreferences = {
      visual: {
        fontSize: { type: 'number', min: 12, max: 32, default: 16 },
        fontFamily: { type: 'string', options: ['default', 'dyslexic-friendly', 'serif'], default: 'default' },
        highContrast: { type: 'boolean', default: false },
        darkMode: { type: 'boolean', default: false },
        colorBlindnessType: { type: 'string', options: ['none', 'protanopia', 'deuteranopia', 'tritanopia'], default: 'none' },
        reducedMotion: { type: 'boolean', default: false },
        colorCoding: { type: 'boolean', default: true }
      },
      motor: {
        keyboardNavigation: { type: 'boolean', default: true },
        mouseAlternatives: { type: 'boolean', default: false },
        touchTargetSize: { type: 'string', options: ['default', 'large', 'extra-large'], default: 'default' },
        gestureSupport: { type: 'boolean', default: false },
        voiceControl: { type: 'boolean', default: false },
        dwellTime: { type: 'number', min: 100, max: 2000, default: 500 }
      },
      cognitive: {
        simplifiedInterface: { type: 'boolean', default: false },
        reducedComplexity: { type: 'boolean', default: false },
        memoryAids: { type: 'boolean', default: false },
        timeoutExtensions: { type: 'boolean', default: false },
        progressIndicators: { type: 'boolean', default: true },
        confirmationDialogs: { type: 'boolean', default: true }
      },
      hearing: {
        captionsEnabled: { type: 'boolean', default: false },
        videoDescriptions: { type: 'boolean', default: false },
        soundAlerts: { type: 'boolean', default: true },
        visualAlerts: { type: 'boolean', default: false },
        vibrateAlerts: { type: 'boolean', default: false },
        signLanguage: { type: 'boolean', default: false }
      },
      language: {
        preferredLanguage: { type: 'string', default: 'en' },
        simplifiedLanguage: { type: 'boolean', default: false },
        translationSupport: { type: 'boolean', default: false },
        rightToLeft: { type: 'boolean', default: false }
      }
    };
  }
  
  /**
   * Get user permissions for a specific role
   */
  getUserPermissions(role) {
    const normalizedRole = role.toLowerCase();
    const roleConfig = this.rolePermissions[normalizedRole];
    
    if (!roleConfig) {
      piiSafeLogger.warn('Unknown role requested', { role });
      return this.rolePermissions.user; // Default to user permissions
    }
    
    return roleConfig;
  }
  
  /**
   * Check if user has specific permission with accessibility context
   */
  checkPermission(feature, userRole, context = {}) {
    try {
      const { userId, accessibility = {} } = context;
      const permissions = this.getUserPermissions(userRole);
      
      // Check if user has the required permission
      const hasPermission = permissions.permissions.includes(feature);
      
      // Log permission check with accessibility context
      piiSafeLogger.trackAccessibilityUsage('permission_check', userId, {
        feature,
        userRole,
        hasPermission,
        accessibilityPreferences: Object.keys(accessibility).length > 0
      });
      
      return hasPermission;
    } catch (error) {
      piiSafeLogger.error('Permission check failed', {
        error: error.message,
        feature,
        userRole,
        userId: context.userId
      });
      return false;
    }
  }
  
  /**
   * Generate accessible navigation based on user role and preferences
   */
  generateAccessibleNavigation(userRole, accessibilityPreferences = {}) {
    try {
      const permissions = this.getUserPermissions(userRole);
      const navigation = {
        mainNav: [],
        accessibility: {
          skipLinks: [],
          landmarks: [],
          keyboardShortcuts: {},
          ariaLabels: {}
        }
      };
      
      // Generate main navigation based on permissions
      const navItems = this.getNavigationItems(permissions.permissions);
      
      // Apply accessibility enhancements
      navigation.mainNav = navItems.map((item, index) => ({
        ...item,
        tabIndex: 0,
        ariaLabel: this.generateAriaLabel(item, userRole),
        keyboardShortcut: this.generateKeyboardShortcut(item, index),
        accessibilityEnhanced: true
      }));
      
      // Add skip links for screen readers
      navigation.accessibility.skipLinks = [
        { label: 'Skip to main content', target: '#main-content', shortcut: 'Alt+M' },
        { label: 'Skip to navigation', target: '#navigation', shortcut: 'Alt+N' },
        { label: 'Skip to search', target: '#search', shortcut: 'Alt+S' },
        { label: 'Accessibility options', target: '#accessibility-menu', shortcut: 'Alt+A' }
      ];
      
      // Define page landmarks
      navigation.accessibility.landmarks = [
        { role: 'banner', label: 'Site header' },
        { role: 'navigation', label: 'Main navigation' },
        { role: 'main', label: 'Main content' },
        { role: 'complementary', label: 'Sidebar' },
        { role: 'contentinfo', label: 'Site footer' }
      ];
      
      // Apply user accessibility preferences
      if (accessibilityPreferences.keyboardNavigation) {
        navigation.accessibility.keyboardNavigation = {
          enabled: true,
          highlight: true,
          instructions: 'Use Tab to navigate, Enter to select, Escape to close'
        };
      }
      
      if (accessibilityPreferences.simplifiedInterface) {
        navigation.mainNav = navigation.mainNav.filter(item => item.essential !== false);
      }
      
      // Add role-specific accessibility features
      navigation.accessibility.roleFeatures = permissions.accessibilityFeatures;
      
      return navigation;
    } catch (error) {
      piiSafeLogger.error('Failed to generate accessible navigation', {
        error: error.message,
        userRole
      });
      
      // Return basic navigation as fallback
      return {
        mainNav: [
          { label: 'Home', path: '/', essential: true },
          { label: 'Profile', path: '/profile', essential: true }
        ],
        accessibility: {
          skipLinks: [{ label: 'Skip to main content', target: '#main-content' }],
          landmarks: [],
          keyboardShortcuts: {},
          ariaLabels: {}
        }
      };
    }
  }
  
  /**
   * Generate accessibility-aware error messages
   */
  generateAccessibilityError(feature, context = {}) {
    try {
      const { 
        userId, 
        userRole = 'user', 
        preferredLanguage = 'en',
        accessibilityPreferences = {} 
      } = context;
      
      // Determine error type
      let errorType = 'permission_denied';
      
      if (!userId) {
        errorType = 'authentication_required';
      } else if (feature.includes('accessibility') && !this.hasAccessibilityAccess(userRole)) {
        errorType = 'accessibility_feature_unavailable';
      }
      
      const errorConfig = this.accessibilityErrors[errorType];
      
      // Build comprehensive error response
      const accessibilityError = {
        type: errorType,
        feature,
        userRole,
        message: {
          standard: errorConfig.visual,
          screenReader: errorConfig.screenReader,
          description: errorConfig.description,
          alternatives: errorConfig.alternatives
        },
        accessibility: {
          ariaLive: 'assertive',
          role: 'alert',
          keyboardShortcut: errorConfig.keyboardShortcut,
          focusTarget: '#error-message',
          announceImmediately: true
        },
        actions: this.generateErrorActions(errorType, feature, userRole),
        support: {
          accessibilityHelpline: '+1-800-ACCESS',
          email: 'accessibility@company.com',
          documentation: '/accessibility-help'
        }
      };
      
      // Apply user preferences
      if (accessibilityPreferences.simplifiedLanguage) {
        accessibilityError.message.simplified = this.simplifyErrorMessage(errorConfig.visual);
      }
      
      if (accessibilityPreferences.visualAlerts) {
        accessibilityError.visual = {
          type: 'modal',
          icon: 'warning',
          color: 'high-contrast',
          animation: accessibilityPreferences.reducedMotion ? false : 'subtle'
        };
      }
      
      // Log accessibility error
      piiSafeLogger.trackAccessibilityUsage('error_generated', userId, {
        errorType,
        feature,
        userRole,
        hasAccessibilityPreferences: Object.keys(accessibilityPreferences).length > 0
      });
      
      return accessibilityError;
    } catch (error) {
      piiSafeLogger.error('Failed to generate accessibility error', {
        error: error.message,
        feature,
        userId: context.userId
      });
      
      // Return basic error as fallback
      return {
        type: 'general_error',
        message: {
          standard: 'An error occurred',
          screenReader: 'An error has occurred. Please try again or contact support.',
          description: 'Unable to complete the requested action.'
        },
        accessibility: {
          ariaLive: 'assertive',
          role: 'alert'
        }
      };
    }
  }
  
  /**
   * Validate and normalize accessibility preferences
   */
  validateAccessibilityPreferences(preferences) {
    try {
      const validated = {};
      
      for (const [category, categoryPrefs] of Object.entries(preferences)) {
        if (!this.accessibilityPreferences[category]) {
          continue;
        }
        
        validated[category] = {};
        const categorySchema = this.accessibilityPreferences[category];
        
        for (const [key, value] of Object.entries(categoryPrefs)) {
          if (!categorySchema[key]) {
            continue;
          }
          
          const schema = categorySchema[key];
          const validatedValue = this.validatePreferenceValue(value, schema);
          
          if (validatedValue !== null) {
            validated[category][key] = validatedValue;
          }
        }
      }
      
      return validated;
    } catch (error) {
      piiSafeLogger.error('Failed to validate accessibility preferences', {
        error: error.message
      });
      return {};
    }
  }
  
  /**
   * Get accessibility features available for a role
   */
  getAccessibilityFeatures(userRole) {
    const permissions = this.getUserPermissions(userRole);
    return permissions.accessibilityFeatures || [];
  }
  
  /**
   * Check if role has access to accessibility features
   */
  hasAccessibilityAccess(userRole) {
    const features = this.getAccessibilityFeatures(userRole);
    return features.length > 0;
  }
  
  /**
   * Generate navigation items based on permissions
   */
  getNavigationItems(permissions) {
    const allNavItems = [
      { label: 'Home', path: '/', icon: 'home', essential: true, permissions: ['view_public_content'] },
      { label: 'Profile', path: '/profile', icon: 'user', essential: true, permissions: ['update_own_profile'] },
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard', essential: true, permissions: ['view_own_data'] },
      { label: 'Workouts', path: '/workouts', icon: 'fitness', permissions: ['view_workout_plans'] },
      { label: 'Progress', path: '/progress', icon: 'chart', permissions: ['view_progress'] },
      { label: 'Clients', path: '/clients', icon: 'users', permissions: ['view_client_data'] },
      { label: 'Schedule', path: '/schedule', icon: 'calendar', permissions: ['manage_schedule'] },
      { label: 'Admin', path: '/admin', icon: 'settings', permissions: ['system_monitoring'] },
      { label: 'Accessibility', path: '/accessibility', icon: 'accessibility', essential: false, permissions: ['manage_own_accessibility_preferences'] }
    ];
    
    return allNavItems.filter(item => 
      item.permissions.some(perm => permissions.includes(perm))
    );
  }
  
  /**
   * Generate ARIA label for navigation item
   */
  generateAriaLabel(item, userRole) {
    const roleContext = userRole === 'trainer' ? ' for trainer' : 
                       userRole === 'client' ? ' for client' : 
                       userRole === 'admin' ? ' for administrator' : '';
    
    return `${item.label}${roleContext}. ${item.description || ''}`;
  }
  
  /**
   * Generate keyboard shortcut for navigation item
   */
  generateKeyboardShortcut(item, index) {
    const keyMap = {
      'Home': 'Alt+H',
      'Profile': 'Alt+P',
      'Dashboard': 'Alt+D',
      'Workouts': 'Alt+W',
      'Progress': 'Alt+R',
      'Clients': 'Alt+C',
      'Schedule': 'Alt+S',
      'Admin': 'Alt+A',
      'Accessibility': 'Alt+Shift+A'
    };
    
    return keyMap[item.label] || `Alt+${index + 1}`;
  }
  
  /**
   * Generate error actions based on error type
   */
  generateErrorActions(errorType, feature, userRole) {
    const actions = [];
    
    switch (errorType) {
      case 'authentication_required':
        actions.push(
          { label: 'Sign In', action: 'navigate', target: '/login', primary: true },
          { label: 'Create Account', action: 'navigate', target: '/register' },
          { label: 'Go Home', action: 'navigate', target: '/' }
        );
        break;
        
      case 'permission_denied':
        actions.push(
          { label: 'Go Back', action: 'history.back', primary: true },
          { label: 'Contact Support', action: 'navigate', target: '/support' },
          { label: 'Go Home', action: 'navigate', target: '/' }
        );
        break;
        
      case 'accessibility_feature_unavailable':
        actions.push(
          { label: 'Learn More', action: 'navigate', target: '/accessibility-features', primary: true },
          { label: 'Contact Support', action: 'navigate', target: '/support' },
          { label: 'Accessibility Help', action: 'navigate', target: '/accessibility-help' }
        );
        break;
    }
    
    return actions;
  }
  
  /**
   * Simplify error message for cognitive accessibility
   */
  simplifyErrorMessage(message) {
    // Basic message simplification - in reality, this would be more sophisticated
    return message
      .replace(/cannot/g, 'can not')
      .replace(/don't/g, 'do not')
      .replace(/won't/g, 'will not')
      .split('.')
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0)
      .slice(0, 2) // Keep only first two sentences
      .join('. ') + '.';
  }
  
  /**
   * Validate individual preference value
   */
  validatePreferenceValue(value, schema) {
    try {
      switch (schema.type) {
        case 'boolean':
          return typeof value === 'boolean' ? value : schema.default;
          
        case 'number':
          const numValue = typeof value === 'number' ? value : parseFloat(value);
          if (isNaN(numValue)) return schema.default;
          if (schema.min !== undefined && numValue < schema.min) return schema.min;
          if (schema.max !== undefined && numValue > schema.max) return schema.max;
          return numValue;
          
        case 'string':
          if (typeof value !== 'string') return schema.default;
          if (schema.options && !schema.options.includes(value)) return schema.default;
          return value;
          
        default:
          return schema.default;
      }
    } catch (error) {
      return schema.default;
    }
  }
}

// Export singleton instance
export const accessibilityAwareAuth = new AccessibilityAwareAuth();