import React, { useState } from "react";
import { jsPDF } from "jspdf"; // Library for creating PDFs
import axios from "axios"; // For making API calls

/**
 * WeeklyReportForm Component
 * @param {string} companyLogo - Path or URL to the company logo
 * @param {string} clientLogo - Path or URL to the client logo
 * @param {string} headerBackground - Path or URL to the header background image
 * @param {object} reportData - Data to be included in the report (key-value pairs)
 * @param {string} clientEmail - Client's email address for sending the report
 * @param {string} uploadEndpoint - API endpoint for uploading the generated PDF
 * @param {string} emailEndpoint - API endpoint for sending the email
 */
const WeeklyReportForm = ({
  companyLogo,
  clientLogo,
  headerBackground,
  reportData,
  clientEmail,
  uploadEndpoint,
  emailEndpoint,
}) => {
  // State to manage loading status
  const [loading, setLoading] = useState(false);

  /**
   * Function to generate the weekly report PDF
   * @returns {jsPDF} - The generated PDF instance
   */
  const generatePDF = async () => {
    const doc = new jsPDF();

    // Adding the header background
    doc.addImage(headerBackground, "JPEG", 0, 0, 210, 30); // Dimensions in mm for A4 size

    // Adding the company and client logos
    doc.addImage(companyLogo, "PNG", 10, 5, 30, 20); // Company logo
    doc.addImage(clientLogo, "PNG", 170, 5, 30, 20); // Client logo

    // Adding a title
    doc.setFontSize(16);
    doc.text("Weekly Report", 10, 40); // Title at the specified position

    // Dynamically inserting report data
    let yOffset = 50; // Initial vertical offset
    doc.setFontSize(12); // Smaller font for report details
    for (const [key, value] of Object.entries(reportData)) {
      doc.text(`${key}: ${value}`, 10, yOffset); // Format: "Key: Value"
      yOffset += 10; // Move to the next line
    }

    return doc; // Return the generated PDF
  };

  /**
   * Function to handle email sending process
   */
  const handleSendEmail = async () => {
    try {
      setLoading(true); // Indicate loading state

      // Step 1: Generate the PDF
      const doc = await generatePDF();
      const pdfBlob = doc.output("blob"); // Convert the PDF to a Blob for upload

      // Step 2: Upload the PDF to the server
      const formData = new FormData();
      formData.append("file", pdfBlob, "weekly-report.pdf");
      const uploadResponse = await axios.post(uploadEndpoint, formData);

      // Ensure your backend returns the PDF URL (e.g., { url: "https://..." })
      const pdfUrl = uploadResponse.data.url; // Extract the URL from the response

      // Step 3: Send the email via API
      await axios.post(emailEndpoint, {
        email: clientEmail,
        pdfUrl, // Attach the uploaded PDF URL
        subject: "Your Weekly Report", // Email subject
        message: `Your weekly report is ready. You can view it here: ${pdfUrl}`, // Email body
      });

      // Show success feedback
      alert("Report emailed successfully!");
    } catch (error) {
      console.error("Error sending email:", error); // Log errors for debugging
      alert("Failed to send the email. Please try again later.");
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="p-6 bg-gray-100 rounded-lg shadow-md">
      {/* Header Section */}
      <div
        className="flex justify-between items-center bg-cover p-4"
        style={{ backgroundImage: `url(${headerBackground})` }}
      >
        <img src={companyLogo} alt="Company Logo" className="w-20 h-20" />
        <img src={clientLogo} alt="Client Logo" className="w-20 h-20" />
      </div>

      {/* Button to Send the Report */}
      <button
        onClick={handleSendEmail}
        disabled={loading}
        className={`mt-6 px-4 py-2 rounded ${
          loading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-700"
        } text-white`}
      >
        {loading ? "Sending..." : "Send Report via Email"}
      </button>
    </div>
  );
};

export default WeeklyReportForm;