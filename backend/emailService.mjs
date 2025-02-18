// backend/emailService.mjs
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // e.g., smtp.example.com
  port: process.env.EMAIL_PORT, // e.g., 465 for secure or 587 for TLS
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Sends an email with the provided options.
 * @param {Object} options - The email options.
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.text - Email body text.
 */
export async function sendEmail({ to, subject, text }) {
  const mailOptions = {
    from: process.env.EMAIL_FROM, // your verified sender email
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}
