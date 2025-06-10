// backend/routes/contactRoutes.mjs
import express from "express";
import Contact from '../models/contact.mjs';
import sgMail from "@sendgrid/mail";
import twilio from "twilio";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = express.Router();

// Determine if we use a dynamic template
const useDynamicTemplate = process.env.SENDGRID_USE_DYNAMIC_TEMPLATE === "true";

router.post("/", async (req, res) => {
  try {
    const { name, email, message, consultationType, priority } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // 1. Store the contact info in the DB with priority
    const contactData = {
      name,
      email,
      message,
      priority: priority || 'normal'
    };
    
    // Add consultation type to message for context
    if (consultationType) {
      contactData.message = `[${consultationType.replace('-', ' ').toUpperCase()}] ${message}`;
    }
    
    const newContact = await Contact.create(contactData);

    // 2. Prepare the email message via SendGrid
    let emailMsg;
    if (useDynamicTemplate) {
      if (!process.env.SENDGRID_TEMPLATE_ID) {
        throw new Error("SENDGRID_TEMPLATE_ID is not defined in environment variables.");
      }
      emailMsg = {
        to: [process.env.OWNER_EMAIL, process.env.OWNER_WIFE_EMAIL],
        from: process.env.SENDGRID_FROM_EMAIL, // Verified sender
        templateId: process.env.SENDGRID_TEMPLATE_ID,
        dynamic_template_data: {
          subject: "New Contact Form Submission",
          name,
          email,
          message,
        },
      };
    } else {
      emailMsg = {
        to: [process.env.OWNER_EMAIL, process.env.OWNER_WIFE_EMAIL],
        from: process.env.SENDGRID_FROM_EMAIL,
        replyTo: process.env.CONTACT_EMAIL, // Optional: where replies should go
        subject: `${priority === 'urgent' ? '🚨 URGENT ' : priority === 'high' ? '⚡ HIGH PRIORITY ' : ''}New Contact: ${consultationType ? consultationType.replace('-', ' ').toUpperCase() : 'GENERAL'}`,
        text: `🎯 CONSULTATION REQUEST 🎯\n\nName: ${name}\nEmail: ${email}\nType: ${consultationType ? consultationType.replace('-', ' ').toUpperCase() : 'General Inquiry'}\nPriority: ${priority ? priority.toUpperCase() : 'NORMAL'}\n\nMessage:\n${message}\n\n📞 RESPOND IMMEDIATELY for ${priority === 'urgent' ? 'URGENT' : 'HIGH PRIORITY'} requests!`,
      };
    }

    // Send email via SendGrid
    await sgMail.send(emailMsg);

    // 3. Send SMS via Twilio
    // Check Twilio configuration
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      throw new Error("Twilio configuration is missing in environment variables.");
    }
    if (!process.env.OWNER_PHONE || !process.env.OWNER_WIFE_PHONE) {
      throw new Error("Owner phone numbers are missing in environment variables.");
    }
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Create SMS message with priority indicators
    const smsMessage = `${priority === 'urgent' ? '🚨 URGENT' : priority === 'high' ? '⚡ HIGH PRIORITY' : '📞'} NEW CLIENT!\n\n${name}\n${email}\n\nType: ${consultationType ? consultationType.replace('-', ' ').toUpperCase() : 'General'}\n\n${message.substring(0, 100)}${message.length > 100 ? '...' : ''}\n\nCheck admin dashboard NOW!`;
    
    // Send SMS to owner
    await client.messages.create({
      body: smsMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.OWNER_PHONE,
    });

    // Send SMS to owner's wife
    await client.messages.create({
      body: smsMessage,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.OWNER_WIFE_PHONE,
    });

    res.json({
      message: "Contact info stored and notifications sent successfully.",
      contact: newContact,
    });
  } catch (error) {
    console.error("Error in /api/contact route:", error);
    if (error.response && error.response.body) {
      console.error("Detailed error response:", error.response.body);
    }
    res.status(500).json({ message: "Internal server error." });
  }
});

export default router;
