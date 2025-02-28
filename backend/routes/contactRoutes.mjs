// backend/routes/contactRoutes.mjs
import express from "express";
import Contact from "../models/Contact.js";
import sgMail from "@sendgrid/mail";
import twilio from "twilio";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const router = express.Router();

// Determine if we use a dynamic template
const useDynamicTemplate = process.env.SENDGRID_USE_DYNAMIC_TEMPLATE === "true";

router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // 1. Store the contact info in the DB
    const newContact = await Contact.create({ name, email, message });

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
        subject: "New Contact Form Submission",
        text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
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

    // Send SMS to owner
    await client.messages.create({
      body: `New Contact from ${name}, email: ${email}\n${message}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.OWNER_PHONE,
    });

    // Send SMS to owner's wife
    await client.messages.create({
      body: `New Contact from ${name}, email: ${email}\n${message}`,
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
