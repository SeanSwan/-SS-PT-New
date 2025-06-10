// backend/routes/contactRoutes.mjs
// BULLETPROOF CONTACT ROUTE - ALWAYS WORKS
import express from "express";
import Contact from '../models/contact.mjs';

const router = express.Router();

// BULLETPROOF Contact Route - Database First, Notifications Optional
router.post("/", async (req, res) => {
  console.log('🔥 CONTACT ROUTE CALLED - Starting processing...');
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

    // 1. PRIORITY #1: Store the contact info in the DB (THIS MUST WORK)
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

    // 2. OPTIONAL: Try to send notifications (but don't fail if they don't work)
    const notificationResults = {
      email: { success: false, error: null },
      sms: { success: false, error: null }
    };

    // Try email notification (non-blocking)
    try {
      console.log('📧 Attempting email notification...');
      
      // Only try if environment variables are available
      if (process.env.SENDGRID_API_KEY && 
          process.env.SENDGRID_FROM_EMAIL && 
          (process.env.OWNER_EMAIL || process.env.OWNER_WIFE_EMAIL)) {
        
        const sgMail = await import("@sendgrid/mail");
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY);

        const emailMsg = {
          to: [process.env.OWNER_EMAIL, process.env.OWNER_WIFE_EMAIL].filter(Boolean),
          from: process.env.SENDGRID_FROM_EMAIL,
          subject: `${priority === 'urgent' ? '🚨 URGENT ' : priority === 'high' ? '⚡ HIGH PRIORITY ' : ''}New Contact: ${consultationType ? consultationType.replace('-', ' ').toUpperCase() : 'GENERAL'}`,
          text: `🎯 NEW CONTACT SUBMISSION 🎯\n\nName: ${name}\nEmail: ${email}\nType: ${consultationType ? consultationType.replace('-', ' ').toUpperCase() : 'General Inquiry'}\nPriority: ${priority ? priority.toUpperCase() : 'NORMAL'}\n\nMessage:\n${message}\n\nContact ID: ${newContact.id}\nSubmitted: ${new Date().toISOString()}`,
        };

        await sgMail.default.send(emailMsg);
        notificationResults.email.success = true;
        console.log('✅ Email notification sent successfully');
      } else {
        console.log('⚠️ Email notification skipped - missing environment variables');
        notificationResults.email.error = 'Missing email configuration';
      }
    } catch (emailError) {
      console.log('⚠️ Email notification failed (non-critical):', emailError.message);
      notificationResults.email.error = emailError.message;
    }

    // Try SMS notification (non-blocking)
    try {
      console.log('📱 Attempting SMS notification...');
      
      // Only try if environment variables are available
      if (process.env.TWILIO_ACCOUNT_SID && 
          process.env.TWILIO_AUTH_TOKEN && 
          process.env.TWILIO_PHONE_NUMBER &&
          (process.env.OWNER_PHONE || process.env.OWNER_WIFE_PHONE)) {
        
        const twilio = await import("twilio");
        const client = twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

        const smsMessage = `${priority === 'urgent' ? '🚨 URGENT' : priority === 'high' ? '⚡ HIGH PRIORITY' : '📞'} NEW CLIENT!\n\n${name}\n${email}\n\nType: ${consultationType ? consultationType.replace('-', ' ').toUpperCase() : 'General'}\n\n${message.substring(0, 100)}${message.length > 100 ? '...' : ''}\n\nID: ${newContact.id}`;
        
        // Send to available phone numbers
        const phoneNumbers = [process.env.OWNER_PHONE, process.env.OWNER_WIFE_PHONE].filter(Boolean);
        
        for (const phoneNumber of phoneNumbers) {
          await client.messages.create({
            body: smsMessage,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber,
          });
        }
        
        notificationResults.sms.success = true;
        console.log('✅ SMS notification(s) sent successfully');
      } else {
        console.log('⚠️ SMS notification skipped - missing environment variables');
        notificationResults.sms.error = 'Missing SMS configuration';
      }
    } catch (smsError) {
      console.log('⚠️ SMS notification failed (non-critical):', smsError.message);
      notificationResults.sms.error = smsError.message;
    }

    // 3. ALWAYS RETURN SUCCESS (as long as database save worked)
    console.log('🎉 Contact processing completed successfully');
    
    res.status(200).json({
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
    });

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

// Test endpoint to verify contact route is working
router.get("/test", (req, res) => {
  console.log('🧪 Contact route test endpoint called');
  res.json({
    success: true,
    message: "Contact route is operational",
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
    
    res.json({
      success: true,
      message: "Contact system is healthy",
      database: "connected",
      totalContacts: contactCount,
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

console.log('🔥 BULLETPROOF Contact Routes loaded - Database first, notifications optional');

export default router;
