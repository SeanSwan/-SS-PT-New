// backend/services/notificationSettingsService.mjs
import NotificationSettings from '../models/NotificationSettings.mjs';
import logger from '../utils/logger.mjs';

/**
 * Gets all active notification recipients for a specific notification type
 * Falls back to environment variables if database settings are not available
 * 
 * @param {string} type - The notification type (ADMIN, ORIENTATION, ORDER, SYSTEM, ALL)
 * @returns {Promise<{emails: string[], phones: string[]}>} - Arrays of email addresses and phone numbers
 */
export async function getNotificationRecipients(type = 'ALL') {
  try {
    // Get recipients from database
    const settings = await NotificationSettings.findAll({
      where: {
        isActive: true,
        notificationType: [type, 'ALL'] // Include both specific type and 'ALL' type
      }
    });

    // Extract emails and phones, filtering out null/undefined values
    const emails = settings
      .filter(setting => setting.email)
      .map(setting => setting.email);
    
    const phones = settings
      .filter(setting => setting.phone)
      .map(setting => setting.phone);

    // If no settings found in database, fall back to environment variables
    if (emails.length === 0 && phones.length === 0) {
      logger.warn(`No notification settings found in database for type: ${type}. Falling back to environment variables.`);
      
      // Parse environment variable lists
      const envEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
      const envPhones = process.env.ADMIN_PHONES?.split(',').map(phone => phone.trim()) || [];
      
      return { emails: envEmails, phones: envPhones };
    }

    // Make sure priority contacts are included
    const priorityEmail = process.env.PRIORITY_EMAIL;
    const priorityPhone = process.env.PRIORITY_PHONE;
    
    if (priorityEmail && !emails.includes(priorityEmail)) {
      emails.push(priorityEmail);
    }
    
    if (priorityPhone && !phones.includes(priorityPhone)) {
      phones.push(priorityPhone);
    }

    return { emails, phones };
  } catch (error) {
    logger.error('Error retrieving notification settings from database:', error);
    
    // Fall back to environment variables in case of error
    const envEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
    const envPhones = process.env.ADMIN_PHONES?.split(',').map(phone => phone.trim()) || [];
    
    // Make sure priority contacts are included
    const priorityEmail = process.env.PRIORITY_EMAIL;
    const priorityPhone = process.env.PRIORITY_PHONE;
    
    if (priorityEmail && !envEmails.includes(priorityEmail)) {
      envEmails.push(priorityEmail);
    }
    
    if (priorityPhone && !envPhones.includes(priorityPhone)) {
      envPhones.push(priorityPhone);
    }
    
    return { emails: envEmails, phones: envPhones };
  }
}

/**
 * Gets all primary notification recipients (prioritized contacts)
 * 
 * @returns {Promise<{emails: string[], phones: string[]}>} - Arrays of email addresses and phone numbers
 */
export async function getPrimaryRecipients() {
  try {
    // Get primary recipients from database
    const settings = await NotificationSettings.findAll({
      where: {
        isActive: true,
        isPrimary: true
      }
    });

    // Extract emails and phones, filtering out null/undefined values
    const emails = settings
      .filter(setting => setting.email)
      .map(setting => setting.email);
    
    const phones = settings
      .filter(setting => setting.phone)
      .map(setting => setting.phone);

    // If no primary settings found, fall back to priority environment variables
    if (emails.length === 0 && phones.length === 0) {
      logger.warn('No primary notification settings found in database. Falling back to priority environment variables.');
      
      const priorityEmail = process.env.PRIORITY_EMAIL;
      const priorityPhone = process.env.PRIORITY_PHONE;
      
      return { 
        emails: priorityEmail ? [priorityEmail] : [], 
        phones: priorityPhone ? [priorityPhone] : [] 
      };
    }

    return { emails, phones };
  } catch (error) {
    logger.error('Error retrieving primary notification settings from database:', error);
    
    // Fall back to priority environment variables in case of error
    const priorityEmail = process.env.PRIORITY_EMAIL;
    const priorityPhone = process.env.PRIORITY_PHONE;
    
    return { 
      emails: priorityEmail ? [priorityEmail] : [], 
      phones: priorityPhone ? [priorityPhone] : [] 
    };
  }
}
