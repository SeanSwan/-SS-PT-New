// backend/utils/notification.mjs
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import dotenv from 'dotenv';
import { format } from 'date-fns';
import User from '../models/User.mjs';
import { sendEmail } from '../emailService.mjs';

dotenv.config();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Get formatted session time for notifications
 * @param {Date} sessionDate - The session date and time
 * @param {number} duration - Duration in minutes
 * @returns {string} Formatted session time
 */
const getFormattedSessionTime = (sessionDate, duration = 60) => {
  const startTime = format(new Date(sessionDate), 'EEEE, MMMM d, yyyy h:mm a');
  const endTimeDate = new Date(sessionDate);
  endTimeDate.setMinutes(endTimeDate.getMinutes() + duration);
  const endTime = format(endTimeDate, 'h:mm a');
  
  return `${startTime} - ${endTime}`;
};

/**
 * Send email notification about a session booking
 * @param {Object} options - Notification options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Email text content
 * @param {string} options.html - Email HTML content
 * @param {string} options.templateId - SendGrid template ID (optional)
 * @param {Object} options.dynamicData - Template data (optional)
 * @returns {Promise} - Promise that resolves with the response
 */
export const sendEmailNotification = async (options) => {
  try {
    // If regular email (no template)
    if (!options.templateId) {
      return await sendEmail({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      });
    }
    
    // If using SendGrid template
    const msg = {
      to: options.to,
      from: process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL,
      templateId: options.templateId,
      dynamic_template_data: options.dynamicData || {}
    };
    
    await sgMail.send(msg);
    return { success: true };
  } catch (error) {
    console.error('Email notification error:', error);
    return { success: false, error };
  }
};

/**
 * Send SMS notification about a session booking
 * @param {Object} options - Notification options
 * @param {string} options.to - Recipient phone number
 * @param {string} options.body - SMS text content
 * @returns {Promise} - Promise that resolves with the response
 */
export const sendSmsNotification = async (options) => {
  try {
    if (!options.to) throw new Error('Recipient phone number is required');
    
    const response = await twilioClient.messages.create({
      body: options.body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: options.to
    });
    
    return { success: true, messageId: response.sid };
  } catch (error) {
    console.error('SMS notification error:', error);
    return { success: false, error };
  }
};

/**
 * Notify client about a session booking
 * @param {Object} session - The session that was booked
 * @param {Object} client - The client who booked the session
 * @returns {Promise} - Promise that resolves when notifications are sent
 */
export const notifySessionBooked = async (session, client) => {
  try {
    if (!session || !client) {
      throw new Error('Session and client information required');
    }
    
    // Get trainer info if available
    let trainerInfo = 'a trainer';
    if (session.trainerId) {
      const trainer = await User.findByPk(session.trainerId);
      if (trainer) {
        trainerInfo = `${trainer.firstName} ${trainer.lastName}`;
      }
    }
    
    const sessionTime = getFormattedSessionTime(session.sessionDate, session.duration);
    
    // Prepare notification content
    const subject = 'Session Booking Confirmation - Swan Studios';
    const textContent = `Hi ${client.firstName},\n\nYour personal training session has been booked successfully for ${sessionTime} with ${trainerInfo}.\n\nLocation: ${session.location || 'Main Studio'}\n\nPlease contact us if you need to make any changes to your appointment.\n\nThank you,\nSwan Studios Team`;
    
    // Send email notification
    if (client.email && client.emailNotifications !== false) {
      await sendEmailNotification({
        to: client.email,
        subject,
        text: textContent,
        html: textContent.replace(/\n/g, '<br>')
      });
    }
    
    // Send SMS notification
    if (client.phone && client.smsNotifications !== false) {
      const smsContent = `Swan Studios: Your session with ${trainerInfo} is confirmed for ${sessionTime}. Thank you!`;
      
      await sendSmsNotification({
        to: client.phone,
        body: smsContent
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Session booking notification error:', error);
    return { success: false, error };
  }
};

/**
 * Notify admin/trainer about a new session booking
 * @param {Object} session - The session that was booked
 * @param {Object} client - The client who booked the session
 * @returns {Promise} - Promise that resolves when notifications are sent
 */
export const notifyAdminSessionBooked = async (session, client) => {
  try {
    if (!session || !client) {
      throw new Error('Session and client information required');
    }
    
    const sessionTime = getFormattedSessionTime(session.sessionDate, session.duration);
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
    const adminPhones = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
    
    // Prepare notification content
    const subject = 'New Session Booking - Swan Studios';
    const textContent = `New session booking!\n\nClient: ${client.firstName} ${client.lastName} (${client.email})\nTime: ${sessionTime}\nLocation: ${session.location || 'Main Studio'}\n\nPlease check the admin dashboard for more details.`;
    
    // Send email notifications to admins
    if (adminEmails.length > 0) {
      for (const email of adminEmails) {
        await sendEmailNotification({
          to: email,
          subject,
          text: textContent,
          html: textContent.replace(/\n/g, '<br>')
        });
      }
    }
    
    // Send SMS notifications to admins
    if (adminPhones.length > 0) {
      const smsContent = `Swan Studios: New booking by ${client.firstName} ${client.lastName} for ${sessionTime}.`;
      
      for (const phone of adminPhones) {
        await sendSmsNotification({
          to: phone,
          body: smsContent
        });
      }
    }
    
    // If trainer is assigned, notify them as well
    if (session.trainerId) {
      const trainer = await User.findByPk(session.trainerId);
      if (trainer) {
        // Email trainer
        if (trainer.email && trainer.emailNotifications !== false) {
          await sendEmailNotification({
            to: trainer.email,
            subject: 'New Session Assigned - Swan Studios',
            text: `You have a new training session with ${client.firstName} ${client.lastName} on ${sessionTime}. Please check the trainer dashboard for details.`,
            html: `<p>You have a new training session with <strong>${client.firstName} ${client.lastName}</strong> on <strong>${sessionTime}</strong>.</p><p>Please check the trainer dashboard for details.</p>`
          });
        }
        
        // SMS trainer
        if (trainer.phone && trainer.smsNotifications !== false) {
          await sendSmsNotification({
            to: trainer.phone,
            body: `Swan Studios: New session assigned with ${client.firstName} ${client.lastName} on ${sessionTime}.`
          });
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Admin notification error:', error);
    return { success: false, error };
  }
};

/**
 * Send session reminder to client
 * @param {Object} session - The session to remind about
 * @param {Object} client - The client to notify
 * @param {number} hoursBeforeSession - Hours before session to send reminder
 * @returns {Promise} - Promise that resolves when notifications are sent
 */
export const sendSessionReminder = async (session, client, hoursBeforeSession = 24) => {
  try {
    if (!session || !client) {
      throw new Error('Session and client information required');
    }
    
    // Get trainer info if available
    let trainerInfo = 'your trainer';
    if (session.trainerId) {
      const trainer = await User.findByPk(session.trainerId);
      if (trainer) {
        trainerInfo = `${trainer.firstName} ${trainer.lastName}`;
      }
    }
    
    const sessionTime = getFormattedSessionTime(session.sessionDate, session.duration);
    
    // Prepare reminder content
    const subject = `Reminder: Your Personal Training Session in ${hoursBeforeSession} hours - Swan Studios`;
    const textContent = `Hi ${client.firstName},\n\nThis is a friendly reminder that you have a personal training session scheduled with ${trainerInfo} at ${sessionTime}.\n\nLocation: ${session.location || 'Main Studio'}\n\nWe look forward to seeing you!\n\nSwan Studios Team`;
    
    // Send email reminder
    if (client.email && client.emailNotifications !== false) {
      await sendEmailNotification({
        to: client.email,
        subject,
        text: textContent,
        html: textContent.replace(/\n/g, '<br>')
      });
    }
    
    // Send SMS reminder
    if (client.phone && client.smsNotifications !== false) {
      const smsContent = `Swan Studios Reminder: Your session with ${trainerInfo} is in ${hoursBeforeSession} hours at ${format(new Date(session.sessionDate), 'h:mm a')}. See you soon!`;
      
      await sendSmsNotification({
        to: client.phone,
        body: smsContent
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Session reminder error:', error);
    return { success: false, error };
  }
};

/**
 * Notify about session cancellation
 * @param {Object} session - The cancelled session
 * @param {Object} client - The client
 * @param {Object} cancelledBy - The user who cancelled the session
 * @param {string} reason - The reason for cancellation
 * @returns {Promise} - Promise that resolves when notifications are sent
 */
export const notifySessionCancelled = async (session, client, cancelledBy, reason = '') => {
  try {
    if (!session || !client) {
      throw new Error('Session and client information required');
    }
    
    const sessionTime = getFormattedSessionTime(session.sessionDate, session.duration);
    const cancellationReason = reason || 'No reason provided';
    
    // Prepare notification content
    const subject = 'Session Cancellation - Swan Studios';
    const textContent = `Hi ${client.firstName},\n\nYour personal training session scheduled for ${sessionTime} has been cancelled.\n\nReason: ${cancellationReason}\n\nPlease contact us if you would like to reschedule.\n\nThank you,\nSwan Studios Team`;
    
    // Send email notification to client
    if (client.email && client.emailNotifications !== false) {
      await sendEmailNotification({
        to: client.email,
        subject,
        text: textContent,
        html: textContent.replace(/\n/g, '<br>')
      });
    }
    
    // Send SMS notification to client
    if (client.phone && client.smsNotifications !== false) {
      const smsContent = `Swan Studios: Your session on ${format(new Date(session.sessionDate), 'MMM d, h:mm a')} has been cancelled. Please contact us to reschedule.`;
      
      await sendSmsNotification({
        to: client.phone,
        body: smsContent
      });
    }
    
    // Notify trainer if different from the canceller
    if (session.trainerId && (!cancelledBy || cancelledBy.id !== session.trainerId)) {
      const trainer = await User.findByPk(session.trainerId);
      if (trainer) {
        // Email trainer
        if (trainer.email && trainer.emailNotifications !== false) {
          await sendEmailNotification({
            to: trainer.email,
            subject: 'Session Cancellation - Swan Studios',
            text: `The session with ${client.firstName} ${client.lastName} scheduled for ${sessionTime} has been cancelled. Reason: ${cancellationReason}`,
            html: `<p>The session with <strong>${client.firstName} ${client.lastName}</strong> scheduled for <strong>${sessionTime}</strong> has been cancelled.</p><p>Reason: ${cancellationReason}</p>`
          });
        }
        
        // SMS trainer
        if (trainer.phone && trainer.smsNotifications !== false) {
          await sendSmsNotification({
            to: trainer.phone,
            body: `Swan Studios: The session with ${client.firstName} ${client.lastName} on ${format(new Date(session.sessionDate), 'MMM d, h:mm a')} has been cancelled.`
          });
        }
      }
    }
    
    // Notify admin if they didn't cancel
    if (!cancelledBy || cancelledBy.role !== 'admin') {
      const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : [];
      const adminPhones = process.env.ADMIN_PHONES ? process.env.ADMIN_PHONES.split(',') : [];
      
      // Admin email
      if (adminEmails.length > 0) {
        const adminSubject = 'Session Cancellation Alert - Swan Studios';
        const adminText = `A session has been cancelled:\n\nClient: ${client.firstName} ${client.lastName}\nTime: ${sessionTime}\nCancelled by: ${cancelledBy ? `${cancelledBy.firstName} ${cancelledBy.lastName} (${cancelledBy.role})` : 'Unknown'}\nReason: ${cancellationReason}`;
        
        for (const email of adminEmails) {
          await sendEmailNotification({
            to: email,
            subject: adminSubject,
            text: adminText,
            html: adminText.replace(/\n/g, '<br>')
          });
        }
      }
      
      // Admin SMS
      if (adminPhones.length > 0) {
        const adminSms = `Swan Studios: Session cancelled - ${client.firstName} ${client.lastName} on ${format(new Date(session.sessionDate), 'MM/dd h:mm a')}`;
        
        for (const phone of adminPhones) {
          await sendSmsNotification({
            to: phone,
            body: adminSms
          });
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Cancellation notification error:', error);
    return { success: false, error };
  }
};

/**
 * Process session deduction from available sessions
 * @param {Object} session - The session 
 * @param {Object} client - The client
 * @returns {Promise<Object>} - Result of the session deduction
 */
export const processSessionDeduction = async (session, client) => {
  try {
    if (!session || !client) {
      throw new Error('Session and client information required');
    }
    
    // Check if client has available sessions
    if (!client.availableSessions || client.availableSessions <= 0) {
      return {
        success: false,
        deducted: false,
        message: 'Client has no available sessions'
      };
    }
    
    // Check if session was already deducted
    if (session.sessionDeducted) {
      return {
        success: true,
        deducted: false,
        message: 'Session already deducted'
      };
    }
    
    // Deduct session from client's available sessions
    client.availableSessions -= 1;
    await client.save();
    
    // Mark session as deducted
    session.sessionDeducted = true;
    session.deductionDate = new Date();
    await session.save();
    
    // Notify client about session deduction
    const sessionTime = getFormattedSessionTime(session.sessionDate, session.duration);
    const subject = 'Session Deduction - Swan Studios';
    const textContent = `Hi ${client.firstName},\n\nA session has been deducted from your available sessions for your appointment on ${sessionTime}.\n\nRemaining sessions: ${client.availableSessions}\n\nThank you,\nSwan Studios Team`;
    
    if (client.email && client.emailNotifications !== false) {
      await sendEmailNotification({
        to: client.email,
        subject,
        text: textContent,
        html: textContent.replace(/\n/g, '<br>')
      });
    }
    
    return {
      success: true,
      deducted: true,
      remainingSessions: client.availableSessions
    };
  } catch (error) {
    console.error('Session deduction error:', error);
    return { success: false, error };
  }
};

/**
 * Schedule message for when client runs low on sessions
 * @param {Object} client - The client
 * @param {number} remainingSessions - Number of remaining sessions
 * @returns {Promise} - Promise that resolves when notifications are sent
 */
export const notifyLowSessionsRemaining = async (client, remainingSessions) => {
  try {
    if (!client) {
      throw new Error('Client information required');
    }
    
    // Only notify if sessions are low (3 or fewer)
    if (remainingSessions > 3) {
      return { success: true, notified: false };
    }
    
    // Prepare notification content
    const subject = 'Low Session Balance - Swan Studios';
    const textContent = `Hi ${client.firstName},\n\nThis is a friendly reminder that you have ${remainingSessions} personal training ${remainingSessions === 1 ? 'session' : 'sessions'} remaining in your package.\n\nTo ensure uninterrupted training, please consider purchasing additional sessions at your earliest convenience.\n\nThank you,\nSwan Studios Team`;
    
    // Send email notification
    if (client.email && client.emailNotifications !== false) {
      await sendEmailNotification({
        to: client.email,
        subject,
        text: textContent,
        html: textContent.replace(/\n/g, '<br>')
      });
    }
    
    // Send SMS notification
    if (client.phone && client.smsNotifications !== false) {
      const smsContent = `Swan Studios: You have ${remainingSessions} training ${remainingSessions === 1 ? 'session' : 'sessions'} remaining. Please purchase additional sessions to continue your training.`;
      
      await sendSmsNotification({
        to: client.phone,
        body: smsContent
      });
    }
    
    return { success: true, notified: true };
  } catch (error) {
    console.error('Low sessions notification error:', error);
    return { success: false, error };
  }
};

export default {
  notifySessionBooked,
  notifyAdminSessionBooked,
  sendSessionReminder,
  notifySessionCancelled,
  processSessionDeduction,
  notifyLowSessionsRemaining
};