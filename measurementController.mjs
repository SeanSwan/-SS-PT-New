import { BodyMeasurement } from '../models/index.cjs';
import path from 'path';

/**
 * =============================================================================
 * 🎯 Measurement Controller
 * =============================================================================
 *
 * Purpose:
 * Handles creating and retrieving body measurement data for clients.
 *
 * =============================================================================
 */

const measurementController = {
  /**
   * @description Upload photos for a measurement.
   * @route POST /api/measurements/upload-photos
   * @access Private (Admin/Trainer)
   */
  async uploadPhotos(req, res) {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files were uploaded.' });
    }

    // In a real application, you would upload files to a cloud storage service (S3, Cloudinary, etc.)
    // For this example, we'll just return the paths as if they were uploaded.
    const photoUrls = req.files.map(file => {
      // Replace backslashes for URL compatibility
      const serverPath = path.join('/uploads/measurements', file.filename).replace(/\\/g, '/');
      return serverPath;
    });

    res.status(200).json({
      success: true,
      message: `${req.files.length} photos uploaded successfully.`,
      data: { photoUrls }
    });
  },

  /**
   * @description Create a new body measurement record for a client.
   * @route POST /api/measurements
   * @access Private (Admin/Trainer)
   */
  async createMeasurement(req, res) {
    const { userId, ...measurementData } = req.body;
    const recordedById = req.user.id; // From auth middleware

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Client User ID is required.' });
    }

    // Ensure photoUrls is an array if provided
    if (measurementData.photoUrls && !Array.isArray(measurementData.photoUrls)) {
      return res.status(400).json({ success: false, message: 'photoUrls must be an array of strings.' });
    }

    try {
      const newMeasurement = await BodyMeasurement.create({
        userId,
        recordedBy: recordedById,
        ...measurementData,
      });

      // Per the blueprint, complex logic like comparison and milestone detection
      // should be triggered here, ideally via a service or model hook.
      // e.g., const analysis = await measurementService.analyzeNewMeasurement(newMeasurement.id);

      res.status(201).json({
        success: true,
        message: 'Measurement recorded successfully.',
        data: newMeasurement,
      });
    } catch (error) {
      console.error('Error creating measurement:', error);
      res.status(500).json({ success: false, message: 'Server error while recording measurement.' });
    }
  },

  /**
   * @description Get all measurements for a specific client.
   * @route GET /api/measurements/:userId
   * @access Private (Admin/Trainer)
   */
  async getMeasurementsForUser(req, res) {
    const { userId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    try {
      const { count, rows } = await BodyMeasurement.findAndCountAll({
        where: { userId },
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        order: [['measurementDate', 'DESC']],
      });

      res.status(200).json({
        success: true,
        data: {
          measurements: rows,
          total: count,
          hasMore: (parseInt(offset, 10) + rows.length) < count,
        },
      });
    } catch (error) {
      console.error(`Error fetching measurements for user ${userId}:`, error);
      res.status(500).json({ success: false, message: 'Server error while fetching measurements.' });
    }
  },

  /**
   * @description Get the single latest measurement for a specific client.
   * @route GET /api/measurements/:userId/latest
   * @access Private (Admin/Trainer)
   */
  async getLatestMeasurement(req, res) {
    const { userId } = req.params;

    try {
      const latestMeasurement = await BodyMeasurement.findOne({
        where: { userId },
        order: [['measurementDate', 'DESC']],
      });

      if (!latestMeasurement) {
        return res.status(404).json({ success: false, message: 'No measurements found for this client.' });
      }

      res.status(200).json(latestMeasurement);
    } catch (error) {
      console.error(`Error fetching latest measurement for user ${userId}:`, error);
      res.status(500).json({ success: false, message: 'Server error while fetching latest measurement.' });
    }
  },
};

export default measurementController;