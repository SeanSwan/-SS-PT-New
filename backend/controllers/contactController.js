import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Validate and set SendGrid API key
if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_API_KEY.startsWith("SG.")) {
  throw new Error("Invalid or missing SENDGRID_API_KEY");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Validate Twilio credentials
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_ACCOUNT_SID.startsWith("AC")) {
  throw new Error("Invalid or missing TWILIO_ACCOUNT_SID");
}
if (!process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("Missing TWILIO_AUTH_TOKEN");
}
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * sendContactMessage:
 * Processes the contact form submission, sends an email via SendGrid and an SMS via Twilio.
 */
export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: "Please provide name, email, and message." });
    }

    // Construct email content
    const emailMsg = {
      to: process.env.CONTACT_EMAIL, // Your email address to receive messages
      from: process.env.SENDGRID_FROM_EMAIL, // Your verified sender email
      subject: `New Contact Message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage:\n${message}`,
    };

    // Send email via SendGrid
    await sgMail.send(emailMsg);

    // Construct SMS content (first 160 characters)
    const smsBody = `New contact message from ${name} (${email}): ${message.substring(0, 160)}`;
    await twilioClient.messages.create({
      body: smsBody,
      from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio number
      to: process.env.CONTACT_PHONE, // Your phone number to receive SMS
    });

    res.status(200).json({ message: "Contact message sent successfully." });
  } catch (error) {
    console.error("Error sending contact message:", error);
    res.status(500).json({ message: "Server error sending contact message." });
  }
};
