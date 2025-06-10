// backend/routes/contactRoutes.mjs
// ENHANCED BULLETPROOF CONTACT ROUTE - WITH SENDGRID & TWILIO SUPPORT
import express from "express";
import Contact from '../models/contact.mjs';

const router = express.Router();

// Enhanced Contact Route - Database First + Smart External Services
router.post("/", async (req, res) => {
  console.log('🔥 ENHANCED CONTACT ROUTE - Starting processing...');
  console.log('📦 Request body:', req.body);
  
  try {
    const { name, email, message, consultationType, priority } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({ 
        success: false,
        message: "Missing required fields: name, email, and message are required." 
      });
    }

    console.log('✅ Validation passed');

    // 1. PRIORITY #1: Store the contact info in the DB (THIS MUST ALWAYS WORK)
    const contactData = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      priority: priority || 'normal'
    };
    
    // Add consultation type to message for context
    if (consultationType) {
      contactData.message = `[${consultationType.replace('-', ' ').toUpperCase()}] ${message.trim()}`;
    }
    
    console.log('💾 Saving contact to database...');
    const newContact = await Contact.create(contactData);
    console.log('✅ Contact saved to database:', newContact.id);

    // 2. SMART EXTERNAL SERVICES: Try to send notifications (but don't fail if they don't work)
    const notificationResults = {
      email: { success: false, error: null, attempted: false },
      sms: { success: false, error: null, attempted: false }
    };

    // === SENDGRID EMAIL NOTIFICATIONS ===
    await tryEmailNotification(newContact, contactData, notificationResults);
    
    // === TWILIO SMS NOTIFICATIONS ===  
    await trySMSNotification(newContact, contactData, notificationResults);

    // 3. ALWAYS RETURN SUCCESS (as long as database save worked)
    console.log('🎉 Contact processing completed successfully');
    
    const response = {
      success: true,
      message: "Contact submission received and saved successfully!",
      contact: {
        id: newContact.id,
        name: newContact.name,
        email: newContact.email,
        priority: newContact.priority,
        createdAt: newContact.createdAt
      },
      notifications: notificationResults
    };

    // Add helpful status messages
    if (notificationResults.email.success && notificationResults.sms.success) {
      response.message += " Email and SMS notifications sent successfully!";
    } else if (notificationResults.email.success) {
      response.message += " Email notification sent successfully!";
    } else if (notificationResults.sms.success) {
      response.message += " SMS notification sent successfully!";
    } else if (notificationResults.email.attempted || notificationResults.sms.attempted) {
      response.message += " Contact saved successfully (notifications had issues but this is not critical).";
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('💥 CRITICAL ERROR in contact route:', error);
    console.error('💥 Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false,
      message: "Failed to process contact submission. Please try again.",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// === SENDGRID EMAIL NOTIFICATION FUNCTION ===
async function tryEmailNotification(contact, formData, results) {
  try {
    console.log('📧 Attempting SendGrid email notification...');
    results.email.attempted = true;
    
    // Check if SendGrid is properly configured
    const requiredEmailVars = ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'];
    const missingEmailVars = requiredEmailVars.filter(varName => !process.env[varName]);
    
    if (missingEmailVars.length > 0) {
      const error = `Missing environment variables: ${missingEmailVars.join(', ')}`;
      console.log(`⚠️ SendGrid skipped: ${error}`);
      results.email.error = error;
      return;
    }

    // Check for recipient emails
    const recipients = [process.env.OWNER_EMAIL, process.env.OWNER_WIFE_EMAIL].filter(Boolean);
    if (recipients.length === 0) {
      const error = 'No recipient emails configured (OWNER_EMAIL, OWNER_WIFE_EMAIL)';
      console.log(`⚠️ SendGrid skipped: ${error}`);
      results.email.error = error;
      return;
    }

    // Import and configure SendGrid
    const sgMail = await import("@sendgrid/mail");
    sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);

    // Create email message
    const emailMsg = {
      to: recipients,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `${formData.priority === 'urgent' ? '🚨 URGENT ' : formData.priority === 'high' ? '⚡ HIGH PRIORITY ' : ''}New SwanStudios Contact: ${formData.consultationType ? formData.consultationType.replace('-', ' ').toUpperCase() : 'GENERAL'}`,
      text: `🎯 NEW CONTACT SUBMISSION 🎯

Name: ${formData.name}
Email: ${formData.email}
Type: ${formData.consultationType ? formData.consultationType.replace('-', ' ').toUpperCase() : 'General Inquiry'}
Priority: ${formData.priority ? formData.priority.toUpperCase() : 'NORMAL'}

Message:
${formData.message}

Contact Details:
• Contact ID: ${contact.id}
• Submitted: ${new Date().toISOString()}
• Admin Dashboard: https://sswanstudios.com/admin

${formData.priority === 'urgent' ? '🚨 RESPOND IMMEDIATELY for URGENT requests!' : formData.priority === 'high' ? '⚡ HIGH PRIORITY - Please respond promptly!' : '📞 Please respond when convenient.'}

Your SwanStudios Contact System`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #00ffff;">${formData.priority === 'urgent' ? '🚨' : formData.priority === 'high' ? '⚡' : '🎯'} New SwanStudios Contact</h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Contact Information</h3>
          <p><strong>Name:</strong> ${formData.name}</p>
          <p><strong>Email:</strong> ${formData.email}</p>
          <p><strong>Type:</strong> ${formData.consultationType ? formData.consultationType.replace('-', ' ').toUpperCase() : 'General Inquiry'}</p>
          <p><strong>Priority:</strong> <span style="color: ${formData.priority === 'urgent' ? '#dc3545' : formData.priority === 'high' ? '#fd7e14' : '#28a745'};">${formData.priority ? formData.priority.toUpperCase() : 'NORMAL'}</span></p>
        </div>

        <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Message</h3>
          <p style="white-space: pre-wrap;">${formData.message}</p>
        </div>

        <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Contact Details</h4>
          <p><strong>Contact ID:</strong> ${contact.id}</p>
          <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
          <p><strong>Admin Dashboard:</strong> <a href="https://sswanstudios.com/admin">View in Dashboard</a></p>
        </div>

        ${formData.priority === 'urgent' 
          ? '<div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin: 20px 0;"><strong>🚨 URGENT: Please respond immediately!</strong></div>'
          : formData.priority === 'high'
          ? '<div style="background: #fff3cd; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0;"><strong>⚡ HIGH PRIORITY: Please respond promptly!</strong></div>'
          : '<div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; margin: 20px 0;"><strong>📞 Please respond when convenient.</strong></div>'
        }

        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 14px;">Your SwanStudios Contact System</p>
      </div>
      `
    };

    // Send email
    await sgMail.default.send(emailMsg);
    results.email.success = true;
    console.log('✅ SendGrid email sent successfully');
    console.log(`📧 Sent to: ${recipients.join(', ')}`);

  } catch (emailError) {
    console.log('⚠️ SendGrid email failed (non-critical):', emailError.message);
    results.email.error = emailError.message;
    
    // Log detailed error for debugging
    if (emailError.response) {
      console.log(`📊 SendGrid Error Details:`, {
        status: emailError.response.status,
        body: emailError.response.body
      });
    }
  }
}

// === TWILIO SMS NOTIFICATION FUNCTION ===
async function trySMSNotification(contact, formData, results) {
  try {
    console.log('📱 Attempting Twilio SMS notification...');
    results.sms.attempted = true;
    
    // Check if Twilio is properly configured
    const requiredSMSVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'];
    const missingSMSVars = requiredSMSVars.filter(varName => !process.env[varName]);
    
    if (missingSMSVars.length > 0) {
      const error = `Missing environment variables: ${missingSMSVars.join(', ')}`;
      console.log(`⚠️ Twilio skipped: ${error}`);
      results.sms.error = error;
      return;
    }

    // Check for recipient phone numbers
    const phoneNumbers = [process.env.OWNER_PHONE, process.env.OWNER_WIFE_PHONE].filter(Boolean);
    if (phoneNumbers.length === 0) {
      const error = 'No recipient phone numbers configured (OWNER_PHONE, OWNER_WIFE_PHONE)';
      console.log(`⚠️ Twilio skipped: ${error}`);
      results.sms.error = error;
      return;
    }

    // Import and configure Twilio
    const twilio = await import("twilio");
    const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Create SMS message
    const smsMessage = `${formData.priority === 'urgent' ? '🚨 URGENT' : formData.priority === 'high' ? '⚡ HIGH PRIORITY' : '📞'} NEW SWANSTUDIOS CLIENT!

${formData.name}
${formData.email}

Type: ${formData.consultationType ? formData.consultationType.replace('-', ' ').toUpperCase() : 'General'}

${formData.message.substring(0, 100)}${formData.message.length > 100 ? '...' : ''}

ID: ${contact.id}
Dashboard: sswanstudios.com/admin

${formData.priority === 'urgent' ? 'RESPOND NOW!' : formData.priority === 'high' ? 'Respond promptly!' : 'Respond when convenient.'}`;
    
    // Send SMS to all configured phone numbers
    let sentCount = 0;
    for (const phoneNumber of phoneNumbers) {
      try {
        await client.messages.create({
          body: smsMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phoneNumber,
        });
        sentCount++;
        console.log(`✅ SMS sent to ${phoneNumber.substring(0, 6)}...`);
      } catch (smsError) {
        console.log(`⚠️ SMS failed for ${phoneNumber.substring(0, 6)}...: ${smsError.message}`);
      }
    }
    
    if (sentCount > 0) {
      results.sms.success = true;
      console.log(`✅ Twilio SMS sent successfully to ${sentCount}/${phoneNumbers.length} recipients`);
    } else {
      results.sms.error = 'Failed to send to any recipients';
    }

  } catch (smsError) {
    console.log('⚠️ Twilio SMS failed (non-critical):', smsError.message);
    results.sms.error = smsError.message;
    
    // Log detailed error for debugging
    console.log(`📊 Twilio Error Details:`, {
      code: smsError.code,
      message: smsError.message
    });
  }
}

// Test endpoint to verify contact route is working
router.get("/test", (req, res) => {
  console.log('🧪 Contact route test endpoint called');
  res.json({
    success: true,
    message: "Enhanced contact route is operational",
    features: [
      "Database-first contact saving",
      "SendGrid email notifications (when configured)",
      "Twilio SMS notifications (when configured)",
      "Comprehensive error handling",
      "Detailed logging and diagnostics"
    ],
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check for contact system
router.get("/health", async (req, res) => {
  try {
    console.log('🏥 Contact health check called');
    
    // Test database connection
    const contactCount = await Contact.count();
    
    // Check external service configuration
    const externalServices = {
      sendgrid: {
        configured: !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL),
        recipients: [process.env.OWNER_EMAIL, process.env.OWNER_WIFE_EMAIL].filter(Boolean).length
      },
      twilio: {
        configured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
        recipients: [process.env.OWNER_PHONE, process.env.OWNER_WIFE_PHONE].filter(Boolean).length
      }
    };
    
    res.json({
      success: true,
      message: "Enhanced contact system is healthy",
      database: "connected",
      totalContacts: contactCount,
      externalServices: externalServices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('🏥 Contact health check failed:', error);
    res.status(500).json({
      success: false,
      message: "Contact system health check failed",
      error: error.message
    });
  }
});

console.log('🔥 ENHANCED Contact Routes loaded - Database first + Smart external services');

export default router;
