// backend/controllers/testNotificationController.mjs
import logger from '../utils/logger.mjs';
import { sendAdminNotification, sendNotification } from '../services/notificationService.mjs';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';

/**
 * Test Admin Notification Controller
 * 
 * This function sends a test notification to all configured admin emails and phones.
 * This is used for testing and debugging purposes only.
 */
export const testAdminNotification = async (req, res) => {
  try {
    logger.info('Processing test admin notification request');
    
    // Extract optional custom message
    const { message } = req.body;
    const customMessage = message || 'This is a test notification from Swan Studios';
    
    // Prepare email content
    const emailSubject = 'Test Admin Notification - Swan Studios';
    const emailText = `
      Test Admin Notification
      
      ${customMessage}
      
      This is a test notification to verify that the admin notification system is working correctly.
      If you received this message, the email notification system is functioning properly.
      
      Timestamp: ${new Date().toISOString()}
      Generated from IP: ${req.ip}
      
      Swan Studios System
    `;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Test Admin Notification</h2>
        <p><strong>${customMessage}</strong></p>
        <p>This is a test notification to verify that the admin notification system is working correctly.</p>
        <p>If you received this message, the email notification system is functioning properly.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Generated from IP:</strong> ${req.ip}</p>
        </div>
        
        <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          Swan Studios System
        </p>
      </div>
    `;
    
    // Prepare SMS content
    const smsBody = `Swan Studios Test: ${customMessage}. Sent at ${new Date().toLocaleTimeString()}. If received, SMS notifications are working.`;
    
    // Send the notification
    const result = await sendAdminNotification({
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      smsBody
    });
    
    logger.info('Test admin notification sent', { result });
    
    return successResponse(res, {
      message: 'Test notification sent successfully',
      result
    });
    
  } catch (error) {
    logger.error('Error in testAdminNotification:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error sending test notification', 500);
  }
};

/**
 * Test Direct Notification Controller
 * 
 * This function sends a test notification to a specific email and phone number.
 * This is used for testing and debugging purposes only.
 */
export const testDirectNotification = async (req, res) => {
  try {
    logger.info('Processing test direct notification request');
    
    // Extract required parameters
    const { email, phone, message } = req.body;
    
    if (!email && !phone) {
      return errorResponse(res, 'Either email or phone is required', 400);
    }
    
    const customMessage = message || 'This is a test notification from Swan Studios';
    
    // Prepare email content
    const emailSubject = 'Test Direct Notification - Swan Studios';
    const emailText = `
      Test Direct Notification
      
      ${customMessage}
      
      This is a test notification to verify that the notification system is working correctly.
      If you received this message, the email notification system is functioning properly.
      
      Timestamp: ${new Date().toISOString()}
      
      Swan Studios System
    `;
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Test Direct Notification</h2>
        <p><strong>${customMessage}</strong></p>
        <p>This is a test notification to verify that the notification system is working correctly.</p>
        <p>If you received this message, the email notification system is functioning properly.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        
        <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
          Swan Studios System
        </p>
      </div>
    `;
    
    // Prepare SMS content
    const smsBody = `Swan Studios Test: ${customMessage}. Sent at ${new Date().toLocaleTimeString()}. If received, SMS notifications are working.`;
    
    // Send the notification
    const result = await sendNotification({
      to: email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      phone,
      smsBody
    });
    
    logger.info('Test direct notification sent', { result });
    
    return successResponse(res, {
      message: 'Test notification sent successfully',
      result
    });
    
  } catch (error) {
    logger.error('Error in testDirectNotification:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error sending test notification', 500);
  }
};
