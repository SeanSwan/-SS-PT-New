import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
import { getPackage } from '../models/index.mjs';

const router = express.Router();

/**
 * @route   POST /api/packages
 * @desc    Create a new package
 * @access  Private (Admin)
 */
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const Package = getPackage();
    const { name, description, price, frequency, features } = req.body;

    // Validation
    if (!name || !price || !features || features.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, price, and at least one feature'
      });
    }

    const newPackage = await Package.create({
      name,
      description,
      price,
      frequency,
      features,
      createdBy: req.user.id,
      isActive: true
    });

    res.status(201).json({
      success: true,
      message: 'Package created successfully',
      data: newPackage
    });
  } catch (error) {
    console.error('Error creating package:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating package',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/packages
 * @desc    Get all active packages
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const Package = getPackage();
    
    const packages = await Package.findAll({
      where: { isActive: true },
      order: [['price', 'ASC']]
    });

    res.status(200).json({
      success: true,
      data: packages
    });
  } catch (error) {
    console.error('Error fetching packages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching packages'
    });
  }
});

/**
 * @route   GET /api/packages/:id
 * @desc    Get single package
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const Package = getPackage();
    const { id } = req.params;

    const pkg = await Package.findByPk(id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    res.status(200).json({
      success: true,
      data: pkg
    });
  } catch (error) {
    console.error('Error fetching package:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching package'
    });
  }
});

/**
 * @route   PUT /api/packages/:id
 * @desc    Update package
 * @access  Private (Admin)
 */
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const Package = getPackage();
    const { id } = req.params;
    const { name, description, price, frequency, features, isActive } = req.body;

    const pkg = await Package.findByPk(id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Update fields
    if (name) pkg.name = name;
    if (description !== undefined) pkg.description = description;
    if (price) pkg.price = price;
    if (frequency) pkg.frequency = frequency;
    if (features) pkg.features = features;
    if (isActive !== undefined) pkg.isActive = isActive;

    await pkg.save();

    res.status(200).json({
      success: true,
      message: 'Package updated successfully',
      data: pkg
    });
  } catch (error) {
    console.error('Error updating package:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating package'
    });
  }
});

/**
 * @route   DELETE /api/packages/:id
 * @desc    Soft delete package (set isActive to false)
 * @access  Private (Admin)
 */
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const Package = getPackage();
    const { id } = req.params;

    const pkg = await Package.findByPk(id);

    if (!pkg) {
      return res.status(404).json({
        success: false,
        message: 'Package not found'
      });
    }

    // Soft delete
    pkg.isActive = false;
    await pkg.save();

    res.status(200).json({
      success: true,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting package:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting package'
    });
  }
});

export default router;