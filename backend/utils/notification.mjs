/**
 * notifications.mjs
 * Utility functions for sending email and SMS notifications using SendGrid and Twilio.
 * This module validates critical environment variables to prevent misconfiguration.
 */

import sgMail from "@sendgrid/mail";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

// Validate SendGrid API Key
if (
  !process.env.SENDGRID_API_KEY ||
  !process.env.SENDGRID_API_KEY.startsWith("SG.")
) {
  console.error(
    "Error: Invalid SendGrid API Key. Ensure SENDGRID_API_KEY is set and starts with 'SG.' in your .env file."
  );
  process.exit(1);
}

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Validate Twilio Account SID and Auth Token
if (
  !process.env.TWILIO_ACCOUNT_SID ||
  !process.env.TWILIO_ACCOUNT_SID.startsWith("AC")
) {
  throw new Error(
    "TWILIO_ACCOUNT_SID is not properly configured in environment variables. It must start with 'AC'."
  );
}

if (!process.env.TWILIO_AUTH_TOKEN) {
  throw new Error("TWILIO_AUTH_TOKEN is missing in environment variables.");
}

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Sends an email notification for session updates.
 *
 * @param {string} toEmail - Recipient's email address.
 * @param {string} newDate - New session date/time.
 * @param {boolean} sessionDeducted - Indicates if a session was deducted.
 */
export const sendEmailNotification = async (toEmail, newDate, sessionDeducted) => {
  const msg = {
    to: toEmail,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: "Session Rescheduled",
    text: `Your session has been rescheduled to ${newDate}. ${
      sessionDeducted
        ? "A session has been deducted from your plan."
        : "Your session was retained."
    }`,
  };

  try {
    await sgMail.send(msg);
    console.log("Email sent successfully.");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

/**
 * Sends an SMS notification for session updates.
 *
 * @param {string} toPhone - Recipient's phone number.
 * @param {string} newDate - New session date/time.
 * @param {boolean} sessionDeducted - Indicates if a session was deducted.
 */
export const sendSMSNotification = async (toPhone, newDate, sessionDeducted) => {
  const message = `Your session has been rescheduled to ${newDate}. ${
    sessionDeducted ? "A session was deducted." : "Your session was retained."
  }`;

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhone,
    });
    console.log("SMS sent successfully.");
  } catch (error) {
    console.error("Error sending SMS:", error);
  }
};
