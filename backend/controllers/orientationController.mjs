// backend/controllers/orientationController.mjs
import logger from '../utils/logger.mjs';
import Orientation from '../models/Orientation.mjs';
import User from '../models/User.mjs';
import { sendAdminNotification, sendNotification } from '../services/notificationService.mjs';
import { createAdminNotification } from './notificationController.mjs';
import { successResponse, errorResponse } from '../utils/apiResponse.mjs';

/**
 * orientationSignup Controller
 *
 * This function processes the orientation signup request.
 * It expects the following fields in req.body:
 *  - fullName, email, phone, healthInfo, waiverInitials (all required)
 *  - trainingGoals, experienceLevel (optional)
 *
 * It also uses req.user (populated by the protect middleware)
 * to associate the signup with the logged-in user.
 * 
 * After saving the orientation data, it sends email and SMS notifications
 * to both the user and admin.
 */
export const orientationSignup = async (req, res) => {
  try {
    // Extract the logged-in user's id (set by protect middleware)
    const userId = req.user.id;
    logger.info(`Processing orientation signup for user ID: ${userId}`);

    // Destructure expected fields from the request body.
    const {
      fullName,
      email,
      phone,
      healthInfo,
      waiverInitials,
      trainingGoals,
      experienceLevel,
    } = req.body;

    // Basic validation: ensure required fields are provided.
    if (!fullName || !email || !phone || !healthInfo || !waiverInitials) {
      logger.warn(`Orientation signup validation failed for user ${userId}`);
      return res.status(400).json({ message: 'Please fill in all required fields.' });
    }

    // Create a new orientation record, associating it with the logged-in user.
    const orientation = await Orientation.create({
      fullName,
      email,
      phone,
      healthInfo,
      waiverInitials,
      trainingGoals: trainingGoals || null,
      experienceLevel: experienceLevel || null,
      userId,
    });

    logger.info(`Orientation record created: ${orientation.id} for user ${userId}`);

    // Prepare confirmation email for the user
    const userEmailText = `
      Thank you for completing your orientation form with Swan Studios!
      
      We have received your information and will be in touch shortly.
      
      Your details:
      - Name: ${fullName}
      - Email: ${email}
      - Phone: ${phone}
      
      If you have any questions, please don't hesitate to contact us.
      
      Best regards,
      The Swan Studios Team
    `;
    
    const userHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">Swan Studios Orientation Confirmation</h2>
        <p>Thank you for completing your orientation form with Swan Studios!</p>
        <p>We have received your information and will be in touch shortly.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #555;">Your Details:</h3>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
        </div>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>The Swan Studios Team</p>
      </div>
    `;
    
    const userSmsBody = `Thank you for your Swan Studios orientation! We've received your information and will contact you soon. -Swan Studios Team`;

    // Send notification to the user
    const userNotificationResult = await sendNotification({
      to: email,
      subject: 'Swan Studios Orientation Confirmation',
      text: userEmailText,
      html: userHtml,
      phone,
      smsBody: userSmsBody
    });
    
    // Prepare notification for admin
    const adminEmailText = `
      New Orientation Form Submission
      
      A new client has completed the orientation form:
      
      Client Details:
      - Name: ${fullName}
      - Email: ${email}
      - Phone: ${phone}
      - Experience Level: ${experienceLevel || 'Not specified'}
      
      Health Information:
      ${healthInfo}
      
      Training Goals:
      ${trainingGoals || 'Not specified'}
      
      Please log in to the admin dashboard to view the complete details.
    `;
    
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 5px;">
        <h2 style="color: #333; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Orientation Form Submission</h2>
        <p>A new client has completed the orientation form:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #555;">Client Details:</h3>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Experience Level:</strong> ${experienceLevel || 'Not specified'}</p>
        </div>
        
        <h3 style="color: #555;">Health Information:</h3>
        <p>${healthInfo}</p>
        
        <h3 style="color: #555;">Training Goals:</h3>
        <p>${trainingGoals || 'Not specified'}</p>
        
        <p>Please log in to the admin dashboard to view the complete details.</p>
      </div>
    `;
    
    const adminSmsBody = `New Swan Studios orientation from ${fullName}. Please check your email or admin dashboard for details.`;
    
    // Send notification to all admins for orientation submissions
    const adminNotificationResult = await sendAdminNotification({
      subject: 'New Swan Studios Orientation Submission',
      text: adminEmailText,
      html: adminHtml,
      smsBody: adminSmsBody,
      notificationType: 'ORIENTATION' // Specify notification type
    });
    
    // Create in-app notification for admin users
    await createAdminNotification({
      title: 'New Orientation Form Submission',
      message: `${fullName} has submitted an orientation form. Experience level: ${experienceLevel || 'Not specified'}`,
      type: 'orientation',
      link: `/dashboard/client-orientation`,
    });
    
    logger.info(`Notifications sent for orientation ${orientation.id}`, {
      userNotification: userNotificationResult,
      adminNotification: adminNotificationResult
    });

    // Return successful response
    return successResponse(res, {
      message: 'Orientation signup successful.',
      orientation,
      notifications: {
        user: userNotificationResult,
        admin: adminNotificationResult
      }
    }, 'Orientation signup successful', 201);
    
  } catch (error) {
    logger.error('Error in orientationSignup:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error during orientation signup.', 500);
  }
};

/**
 * getOrientationData Controller
 * 
 * Retrieves orientation data for a specific user (for admin or the user themselves)
 */
export const getOrientationData = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if the requesting user is either an admin or the user themselves
    const isAdmin = req.user.role === 'admin';
    const isSameUser = req.user.id === userId;
    
    if (!isAdmin && !isSameUser) {
      return errorResponse(res, 'Not authorized to access this orientation data', 403);
    }
    
    const orientation = await Orientation.findOne({
      where: { userId }
    });
    
    if (!orientation) {
      return errorResponse(res, 'Orientation data not found', 404);
    }
    
    return successResponse(res, orientation, 'Orientation data retrieved successfully');
    
  } catch (error) {
    logger.error('Error in getOrientationData:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving orientation data', 500);
  }
};

/**
 * getAllOrientations Controller
 * 
 * Retrieves all orientation data (admin only)
 */
export const getAllOrientations = async (req, res) => {
  try {
    // Only admins can access all orientations
    if (req.user.role !== 'admin') {
      return errorResponse(res, 'Not authorized to access all orientation data', 403);
    }
    
    const orientations = await Orientation.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    // Get user details for each orientation
    const orientationsWithUsers = await Promise.all(
      orientations.map(async (orientation) => {
        const user = await User.findByPk(orientation.userId, {
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone']
        });
        
        return {
          ...orientation.get({ plain: true }),
          user: user ? user.get({ plain: true }) : null
        };
      })
    );
    
    return successResponse(res, orientationsWithUsers, 'All orientation data retrieved successfully');
    
  } catch (error) {
    logger.error('Error in getAllOrientations:', error.message, { stack: error.stack });
    return errorResponse(res, 'Server error retrieving all orientation data', 500);
  }
};
