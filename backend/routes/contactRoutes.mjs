import express from "express";
import { Op } from 'sequelize';
import Contact from '../models/contact.mjs';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { contactLimiter } from '../middleware/rateLimiter.mjs';
import sequelize from '../database.mjs';
import { createAdminNotification } from '../controllers/notificationController.mjs';
import { captureLeadFromContact } from '../services/leadCaptureService.mjs';

const router = express.Router();
let contactsPriorityColumnPromise = null;

const hasContactsPriorityColumn = async () => {
  if (!contactsPriorityColumnPromise) {
    contactsPriorityColumnPromise = sequelize
      .getQueryInterface()
      .describeTable('contacts')
      .then((columns) => Boolean(columns?.priority))
      .catch(() => false);
  }
  return contactsPriorityColumnPromise;
};

// ADMIN: Get contacts list with pagination
// Fixed sort: createdAt DESC, id DESC — sortBy/sortOrder params removed (admin-only endpoint)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    console.log('📋 Admin fetching contacts list');

    const rawLimit = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;
    const rawOffset = parseInt(req.query.offset, 10);
    const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? rawOffset : 0;

    const includePriority = await hasContactsPriorityColumn();
    const attributes = ['id', 'name', 'email', 'message', 'createdAt', 'updatedAt'];
    if (includePriority) {
      attributes.push('priority');
    }

    const contacts = await Contact.findAll({
      limit,
      offset,
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      attributes
    });

    const totalContacts = await Contact.count();

    console.log(`✅ Returning ${contacts.length} contacts (total: ${totalContacts})`);

    res.json({
      success: true,
      contacts: includePriority
        ? contacts
        : contacts.map((contact) => ({
            ...contact.toJSON(),
            priority: 'normal',
          })),
      pagination: {
        total: totalContacts,
        limit,
        offset,
        hasMore: offset + limit < totalContacts
      }
    });
  } catch (error) {
    console.error('💥 Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: 'Internal server error'
    });
  }
});

// Enhanced Contact Route - Database First + Smart External Services
// PUBLIC. contactLimiter caps abuse: each accepted submission costs real
// Twilio/SendGrid spend and creates a CRM lead. See middleware/rateLimiter.mjs.
router.post("/", contactLimiter, async (req, res) => {
  console.log('🔥 ENHANCED CONTACT ROUTE - Starting processing...');
  
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

    // Validate email FORMAT here → return a clean 400. Without this, a malformed email reaches Contact.create,
    // the model's isEmail validator throws SequelizeValidationError, and the catch-all below returns a generic
    // 500 — a server-error status for what is really a client input error (the v-next form sets noValidate, so
    // the browser check doesn't run there either). Mirrors the frontend EMAIL_RE.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email).trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    console.log('✅ Validation passed');

    // 1. PRIORITY #1: Store the contact info in the DB (THIS MUST ALWAYS WORK)
    const includePriority = await hasContactsPriorityColumn();
    const contactData = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim()
    };
    if (includePriority) {
      contactData.priority = priority || 'normal';
    }
    
    // Add consultation type to message for context
    if (consultationType) {
      contactData.message = `[${consultationType.replace('-', ' ').toUpperCase()}] ${message.trim()}`;
    }
    
    console.log('💾 Saving contact to database...');
    const newContact = await Contact.create(contactData);
    console.log('✅ Contact saved to database:', newContact.id);

    // Notification trigger: New contact form submission for admins
    try {
      await createAdminNotification({
        title: 'New Contact Form Submission',
        message: `${name.trim()} (${email.trim()}) sent: "${message.trim().substring(0, 100)}"`,
        type: 'admin'
      });
    } catch (notifErr) {
      console.log('⚠️ Admin notification failed (non-critical):', notifErr.message);
    }

    // === CRM LEAD CAPTURE (non-critical, never breaks submission) ===
    // Closes the funnel hole: a contact submission now enters the Lead pipeline.
    const leadCaptureResult = await captureLeadFromContact({
      contact: newContact,
      formData: contactData,
      consultationType,
      attribution: {
        utmSource: req.body?.utmSource,
        utmMedium: req.body?.utmMedium,
        utmCampaign: req.body?.utmCampaign,
        referrer: req.body?.referrer,
      },
    });
    if (leadCaptureResult?.error) {
      console.log('CRM lead capture failed (non-critical):', leadCaptureResult.error);
    }

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
        priority: includePriority ? newContact.priority : (priority || 'normal'),
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
      name: error.name
    });
    
    res.status(500).json({ 
      success: false,
      message: "Failed to process contact submission. Please try again.",
      error: 'Internal server error'
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

/**
 * GLOBAL SMS COST CEILING.
 *
 * Per-IP rate limiting (contactLimiter) is necessary but NOT sufficient:
 *   1. express-rate-limit uses an in-memory store, and this backend runs on
 *      MULTIPLE Render instances — each keeps its own counter, so the real cap
 *      is ~max × instances, not `max`. (Verified in prod: ratelimit-remaining
 *      bounces instead of counting down.)
 *   2. NO per-IP limit survives IP rotation. Redis would not fix that either.
 *
 * Twilio bills per message, so the only thing that truly bounds spend is a cap
 * on the expensive action itself. This counts recent Contact rows (shared
 * Postgres = shared across every instance, and IP-agnostic) and suppresses the
 * paid SMS fan-out above the ceiling.
 *
 * IMPORTANT: this suppresses ONLY the SMS. The Contact row, the admin
 * notification, the email, and the CRM lead still happen — a real lead is NEVER
 * dropped, the owner just doesn't get texted a thousand times.
 *
 * FAILS OPEN: if the count query errors we send anyway. A diagnostic hiccup must
 * never silence a genuine lead alert.
 */
const SMS_HOURLY_CAP = Number(process.env.CONTACT_SMS_HOURLY_CAP || 25);

async function smsBudgetExhausted() {
  try {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await Contact.count({ where: { createdAt: { [Op.gte]: since } } });
    return { exhausted: recent > SMS_HOURLY_CAP, recent };
  } catch (err) {
    console.log('⚠️ SMS budget check failed (non-critical) — allowing send:', err.message);
    return { exhausted: false, recent: null };
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

    // Hard cost ceiling — bounds Twilio spend even under a distributed flood.
    const budget = await smsBudgetExhausted();
    if (budget.exhausted) {
      const error = `Global SMS cap reached (${budget.recent} contacts in the last hour > ${SMS_HOURLY_CAP}). SMS suppressed to bound Twilio spend; the contact, email, and CRM lead were still saved.`;
      console.log(`🛑 Twilio suppressed: ${error}`);
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
router.get("/test", protect, adminOnly, (req, res) => {
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
    timestamp: new Date().toISOString()
  });
});

// Health check for contact system
router.get("/health", protect, adminOnly, async (req, res) => {
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
      error: "Internal server error"
    });
  }
});

console.log('🔥 ENHANCED Contact Routes loaded - Database first + Smart external services');

export default router;
