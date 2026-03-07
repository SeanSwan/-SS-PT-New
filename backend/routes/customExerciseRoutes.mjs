/**
 * Custom Exercise Routes (Phase 6 - Biomechanics Studio)
 * ======================================================
 * CRUD + duplicate + validate for trainer-created custom exercises.
 *
 * POST   /api/custom-exercises              Create new custom exercise
 * GET    /api/custom-exercises              List trainer's custom exercises
 * GET    /api/custom-exercises/:id          Get single custom exercise
 * PUT    /api/custom-exercises/:id          Update (creates new version)
 * DELETE /api/custom-exercises/:id          Archive a custom exercise
 * POST   /api/custom-exercises/:id/duplicate  Duplicate (fork) an exercise
 * POST   /api/custom-exercises/:id/validate   Validate mechanicsSchema
 * GET    /api/custom-exercises/templates    List built-in exercises as templates
 */
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.mjs';
import { getCustomExercise } from '../models/index.mjs';
import { Op } from 'sequelize';
import logger from '../utils/logger.mjs';

const router = express.Router();

// --- Helpers ---

/** Generate URL-safe slug from a name string. */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Check ownership: trainer owns the exercise, or user is admin. Returns 403 response if denied. */
function checkOwnership(exercise, req, res) {
  if (exercise.trainerId !== req.user.id && req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Access denied' });
    return false;
  }
  return true;
}

// All routes require authentication
router.use(protect);

// --- Built-in exercise templates (available to all authenticated users) ---

const BUILT_IN_TEMPLATES = [
  {
    key: 'squat',
    name: 'Barbell Back Squat',
    category: 'lower_body',
    mechanicsSchema: {
      primaryAngle: {
        joint: 'left_knee',
        landmarks: [23, 25, 27],
        repPhases: { startAngle: 170, bottomAngle: 90, hysteresis: 10 },
      },
      formRules: [
        {
          type: 'angle_threshold',
          name: 'Knee Depth',
          joint: 'left_knee_flexion',
          landmarks: [23, 25, 27],
          min: 70,
          max: 180,
          severity: 'info',
          cue: 'Try to reach parallel or below',
        },
        {
          type: 'angle_threshold',
          name: 'Trunk Lean',
          joint: 'trunk_lean',
          landmarks: [11, 23, 25],
          min: 0,
          max: 45,
          severity: 'warning',
          cue: 'Keep your chest up — too much forward lean',
        },
        {
          type: 'bilateral_symmetry',
          name: 'Knee Symmetry',
          leftJoint: 'left_knee_flexion',
          rightJoint: 'right_knee_flexion',
          leftLandmarks: [23, 25, 27],
          rightLandmarks: [24, 26, 28],
          maxDiff: 15,
          severity: 'warning',
          cue: 'Bend both knees evenly',
        },
        {
          type: 'landmark_deviation',
          name: 'Shoulder Level',
          landmarkA: 11,
          landmarkB: 12,
          axis: 'y',
          maxDeviation: 0.04,
          severity: 'warning',
          cue: 'Keep shoulders level — avoid tilting the bar',
        },
      ],
    },
  },
  {
    key: 'deadlift',
    name: 'Conventional Deadlift',
    category: 'compound',
    mechanicsSchema: {
      primaryAngle: {
        joint: 'left_hip',
        landmarks: [11, 23, 25],
        repPhases: { startAngle: 170, bottomAngle: 90, hysteresis: 10 },
      },
      formRules: [
        {
          type: 'angle_threshold',
          name: 'Hip Hinge Depth',
          joint: 'left_hip_flexion',
          landmarks: [11, 23, 25],
          min: 60,
          max: 180,
          severity: 'info',
          cue: 'Hinge at the hips to reach the bar',
        },
        {
          type: 'angle_threshold',
          name: 'Back Angle',
          joint: 'trunk_lean',
          landmarks: [11, 23, 25],
          min: 0,
          max: 60,
          severity: 'warning',
          cue: 'Maintain a neutral spine — avoid rounding',
        },
        {
          type: 'landmark_deviation',
          name: 'Shoulder Alignment',
          landmarkA: 11,
          landmarkB: 12,
          axis: 'y',
          maxDeviation: 0.04,
          severity: 'warning',
          cue: 'Keep both shoulders at the same height',
        },
      ],
    },
  },
  {
    key: 'overhead_press',
    name: 'Overhead Press',
    category: 'upper_body',
    mechanicsSchema: {
      primaryAngle: {
        joint: 'left_shoulder',
        landmarks: [13, 11, 23],
        repPhases: { startAngle: 40, bottomAngle: 160, hysteresis: 10 },
      },
      formRules: [
        {
          type: 'angle_threshold',
          name: 'Elbow Lock',
          joint: 'left_elbow_flexion',
          landmarks: [11, 13, 15],
          min: 160,
          max: 180,
          severity: 'info',
          cue: 'Fully extend your arms at the top',
        },
        {
          type: 'bilateral_symmetry',
          name: 'Shoulder Symmetry',
          leftJoint: 'left_shoulder_flexion',
          rightJoint: 'right_shoulder_flexion',
          leftLandmarks: [13, 11, 23],
          rightLandmarks: [14, 12, 24],
          maxDiff: 15,
          severity: 'warning',
          cue: 'Press both arms evenly',
        },
      ],
    },
  },
  {
    key: 'bicep_curl',
    name: 'Bicep Curl',
    category: 'upper_body',
    mechanicsSchema: {
      primaryAngle: {
        joint: 'left_elbow',
        landmarks: [11, 13, 15],
        repPhases: { startAngle: 160, bottomAngle: 40, hysteresis: 10 },
      },
      formRules: [
        {
          type: 'angle_threshold',
          name: 'Full Contraction',
          joint: 'left_elbow_flexion',
          landmarks: [11, 13, 15],
          min: 30,
          max: 170,
          severity: 'info',
          cue: 'Squeeze at the top of the curl',
        },
        {
          type: 'landmark_deviation',
          name: 'Elbow Stability',
          landmarkA: 13,
          landmarkB: 11,
          axis: 'x',
          maxDeviation: 0.08,
          severity: 'warning',
          cue: 'Keep your elbows pinned to your sides',
        },
      ],
    },
  },
  {
    key: 'lunge',
    name: 'Walking Lunge',
    category: 'lower_body',
    mechanicsSchema: {
      primaryAngle: {
        joint: 'left_knee',
        landmarks: [23, 25, 27],
        repPhases: { startAngle: 170, bottomAngle: 90, hysteresis: 10 },
      },
      formRules: [
        {
          type: 'angle_threshold',
          name: 'Front Knee Angle',
          joint: 'left_knee_flexion',
          landmarks: [23, 25, 27],
          min: 80,
          max: 180,
          severity: 'warning',
          cue: 'Do not let your knee go past your toes',
        },
        {
          type: 'landmark_deviation',
          name: 'Hip Level',
          landmarkA: 23,
          landmarkB: 24,
          axis: 'y',
          maxDeviation: 0.06,
          severity: 'info',
          cue: 'Keep your hips level as you lunge',
        },
      ],
    },
  },
];

// GET /templates — list built-in exercise templates
router.get('/templates', (req, res) => {
  const templates = BUILT_IN_TEMPLATES.map(t => ({
    key: t.key,
    name: t.name,
    category: t.category,
    ruleCount: t.mechanicsSchema.formRules.length,
    hasRepDetection: !!t.mechanicsSchema.primaryAngle,
  }));
  res.json({ success: true, templates });
});

// GET /templates/:key — get full template with mechanicsSchema
router.get('/templates/:key', (req, res) => {
  const template = BUILT_IN_TEMPLATES.find(t => t.key === req.params.key);
  if (!template) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }
  res.json({ success: true, template });
});

// --- CRUD Routes (trainer/admin only) ---

// POST / — Create new custom exercise
router.post('/', authorize('admin', 'trainer'), async (req, res) => {
  try {
    const CustomExercise = getCustomExercise();
    const { name, category, baseExerciseKey, mechanicsSchema, isPublic, description } = req.body;

    if (!name || !mechanicsSchema) {
      return res.status(400).json({
        success: false,
        error: 'name and mechanicsSchema are required',
      });
    }

    // Validate mechanicsSchema structure before storing
    const schemaValidation = validateMechanicsSchema(mechanicsSchema);
    if (!schemaValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mechanicsSchema',
        validation: schemaValidation,
      });
    }

    // Generate slug from name
    const slug = slugify(name);

    // Check for duplicate slug for this trainer
    const existing = await CustomExercise.findOne({
      where: {
        slug,
        trainerId: req.user.id,
        status: { [Op.ne]: 'archived' },
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `You already have an exercise named "${name}"`,
      });
    }

    const exercise = await CustomExercise.create({
      trainerId: req.user.id,
      name,
      slug,
      category: category || 'general',
      baseExerciseKey: baseExerciseKey || null,
      mechanicsSchema,
      description: description || null,
      isPublic: isPublic || false,
      status: 'draft',
      version: 1,
    });

    logger.info(`[CustomExercise] Created "${name}" (id=${exercise.id}) by user ${req.user.id}`);

    res.status(201).json({ success: true, exercise });
  } catch (error) {
    logger.error('[CustomExercise] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create custom exercise' });
  }
});

// GET / — List trainer's custom exercises
router.get('/', authorize('admin', 'trainer'), async (req, res) => {
  try {
    const CustomExercise = getCustomExercise();
    const { status, category, search, page = 1, limit = 50 } = req.query;

    const where = { trainerId: req.user.id };

    // Admins can see all exercises
    if (req.user.role === 'admin' && req.query.all === 'true') {
      delete where.trainerId;
    }

    if (status) {
      where.status = status;
    } else {
      where.status = { [Op.ne]: 'archived' };
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const { rows, count } = await CustomExercise.findAndCountAll({
      where,
      order: [['updatedAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    res.json({
      success: true,
      exercises: rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    logger.error('[CustomExercise] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to list custom exercises' });
  }
});

// GET /:id — Get single custom exercise
router.get('/:id', async (req, res) => {
  try {
    const CustomExercise = getCustomExercise();
    const exercise = await CustomExercise.findByPk(req.params.id);

    if (!exercise) {
      return res.status(404).json({ success: false, error: 'Exercise not found' });
    }

    // Access control: owner, admin, or public exercise
    if (
      exercise.trainerId !== req.user.id &&
      req.user.role !== 'admin' &&
      !exercise.isPublic
    ) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, exercise });
  } catch (error) {
    logger.error('[CustomExercise] Get error:', error);
    res.status(500).json({ success: false, error: 'Failed to get custom exercise' });
  }
});

// PUT /:id — Update custom exercise (append-only: creates new version)
router.put('/:id', authorize('admin', 'trainer'), async (req, res) => {
  try {
    const CustomExercise = getCustomExercise();
    const original = await CustomExercise.findByPk(req.params.id);

    if (!original) {
      return res.status(404).json({ success: false, error: 'Exercise not found' });
    }

    if (!checkOwnership(original, req, res)) return;

    const { name, category, mechanicsSchema, isPublic, status, description } = req.body;

    // Validate new schema if provided
    if (mechanicsSchema) {
      const schemaValidation = validateMechanicsSchema(mechanicsSchema);
      if (!schemaValidation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid mechanicsSchema',
          validation: schemaValidation,
        });
      }
    }

    // Append-only: create new version, archive old one
    const newVersion = await CustomExercise.create({
      trainerId: original.trainerId,
      name: name || original.name,
      slug: original.slug,
      category: category || original.category,
      baseExerciseKey: original.baseExerciseKey,
      mechanicsSchema: mechanicsSchema || original.mechanicsSchema,
      description: description !== undefined ? description : original.description,
      isPublic: isPublic !== undefined ? isPublic : original.isPublic,
      status: status || original.status,
      version: original.version + 1,
      parentVersionId: original.id,
    });

    // Archive the old version
    await original.update({ status: 'archived' });

    logger.info(
      `[CustomExercise] Updated "${newVersion.name}" v${newVersion.version} (id=${newVersion.id}, parent=${original.id})`
    );

    res.json({ success: true, exercise: newVersion });
  } catch (error) {
    logger.error('[CustomExercise] Update error:', error);
    res.status(500).json({ success: false, error: 'Failed to update custom exercise' });
  }
});

// DELETE /:id — Archive a custom exercise (soft delete)
router.delete('/:id', authorize('admin', 'trainer'), async (req, res) => {
  try {
    const CustomExercise = getCustomExercise();
    const exercise = await CustomExercise.findByPk(req.params.id);

    if (!exercise) {
      return res.status(404).json({ success: false, error: 'Exercise not found' });
    }

    if (!checkOwnership(exercise, req, res)) return;

    await exercise.update({ status: 'archived' });

    logger.info(`[CustomExercise] Archived "${exercise.name}" (id=${exercise.id})`);

    res.json({ success: true, message: 'Exercise archived' });
  } catch (error) {
    logger.error('[CustomExercise] Delete error:', error);
    res.status(500).json({ success: false, error: 'Failed to archive custom exercise' });
  }
});

// POST /:id/duplicate — Fork/duplicate an exercise
router.post('/:id/duplicate', authorize('admin', 'trainer'), async (req, res) => {
  try {
    const CustomExercise = getCustomExercise();
    const source = await CustomExercise.findByPk(req.params.id);

    if (!source) {
      return res.status(404).json({ success: false, error: 'Exercise not found' });
    }

    // Can duplicate own exercises, public exercises, or admin can duplicate any
    if (source.trainerId !== req.user.id && !source.isPublic && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const newName = req.body.name || `${source.name} (Copy)`;
    const slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const duplicate = await CustomExercise.create({
      trainerId: req.user.id,
      name: newName,
      slug,
      category: source.category,
      baseExerciseKey: source.baseExerciseKey,
      mechanicsSchema: source.mechanicsSchema,
      description: source.description,
      isPublic: false,
      status: 'draft',
      version: 1,
      parentVersionId: source.id,
    });

    logger.info(
      `[CustomExercise] Duplicated "${source.name}" -> "${newName}" (id=${duplicate.id}) by user ${req.user.id}`
    );

    res.status(201).json({ success: true, exercise: duplicate });
  } catch (error) {
    logger.error('[CustomExercise] Duplicate error:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate exercise' });
  }
});

// POST /from-template/:key — Create from built-in template
router.post('/from-template/:key', authorize('admin', 'trainer'), async (req, res) => {
  try {
    const template = BUILT_IN_TEMPLATES.find(t => t.key === req.params.key);
    if (!template) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const CustomExercise = getCustomExercise();
    const newName = req.body.name || `${template.name} (Custom)`;
    const slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const exercise = await CustomExercise.create({
      trainerId: req.user.id,
      name: newName,
      slug,
      category: template.category,
      baseExerciseKey: template.key,
      mechanicsSchema: template.mechanicsSchema,
      isPublic: false,
      status: 'draft',
      version: 1,
    });

    logger.info(
      `[CustomExercise] Created from template "${template.key}" -> "${newName}" (id=${exercise.id})`
    );

    res.status(201).json({ success: true, exercise });
  } catch (error) {
    logger.error('[CustomExercise] From template error:', error);
    res.status(500).json({ success: false, error: 'Failed to create from template' });
  }
});

// POST /:id/validate — Validate mechanicsSchema without saving
router.post('/:id/validate', authorize('admin', 'trainer'), async (req, res) => {
  try {
    const CustomExercise = getCustomExercise();
    const exercise = await CustomExercise.findByPk(req.params.id);

    if (!exercise) {
      return res.status(404).json({ success: false, error: 'Exercise not found' });
    }

    if (!checkOwnership(exercise, req, res)) return;

    // Client-side validation (mirrors DynamicRuleEngine.validate_schema)
    const schema = exercise.mechanicsSchema || {};
    const validation = validateMechanicsSchema(schema);

    // Store validation result
    await exercise.update({ validationResult: validation });

    res.json({ success: true, validation });
  } catch (error) {
    logger.error('[CustomExercise] Validate error:', error);
    res.status(500).json({ success: false, error: 'Failed to validate exercise' });
  }
});

// POST /validate-schema — Validate a mechanicsSchema without an exercise record
router.post('/validate-schema', authorize('admin', 'trainer'), (req, res) => {
  const { mechanicsSchema } = req.body;
  if (!mechanicsSchema) {
    return res.status(400).json({ success: false, error: 'mechanicsSchema is required' });
  }
  const validation = validateMechanicsSchema(mechanicsSchema);
  res.json({ success: true, validation });
});

/**
 * Validate mechanicsSchema structure (JS mirror of DynamicRuleEngine.validate_schema).
 */
function validateMechanicsSchema(schema) {
  const errors = [];
  const warnings = [];
  const primary = schema.primaryAngle;
  const formRules = schema.formRules || [];

  // Validate primaryAngle
  if (primary) {
    const lm = primary.landmarks || [];
    if (lm.length !== 3) {
      errors.push('primaryAngle.landmarks must have exactly 3 indices');
    } else {
      for (const idx of lm) {
        if (!Number.isInteger(idx) || idx < 0 || idx > 32) {
          errors.push(`primaryAngle.landmarks contains invalid index: ${idx}`);
        }
      }
    }
    const phases = primary.repPhases || {};
    if (!phases.startAngle && !phases.bottomAngle) {
      errors.push('primaryAngle.repPhases is required for rep detection');
    } else if (phases.startAngle <= phases.bottomAngle) {
      warnings.push(
        `startAngle (${phases.startAngle}) should be > bottomAngle (${phases.bottomAngle}) for standard exercises`
      );
    }
  } else {
    warnings.push('No primaryAngle defined — rep detection will not work');
  }

  // Validate formRules
  const validTypes = new Set(['angle_threshold', 'landmark_deviation', 'bilateral_symmetry']);
  const ruleNames = new Set();

  for (let i = 0; i < formRules.length; i++) {
    const rule = formRules[i];
    const rtype = rule.type || '';
    const rname = rule.name || `Rule ${i}`;

    if (!validTypes.has(rtype)) {
      errors.push(`Rule '${rname}': unknown type '${rtype}'`);
    }

    if (ruleNames.has(rname)) {
      warnings.push(`Duplicate rule name: '${rname}'`);
    }
    ruleNames.add(rname);

    if (!rule.cue) {
      warnings.push(`Rule '${rname}': missing coaching cue text`);
    }

    if (rtype === 'angle_threshold') {
      if ((rule.landmarks || []).length !== 3) {
        errors.push(`Rule '${rname}': angle_threshold needs 3 landmarks`);
      }
      if ((rule.min || 0) >= (rule.max || 180)) {
        errors.push(`Rule '${rname}': min must be < max`);
      }
    } else if (rtype === 'landmark_deviation') {
      if (rule.landmarkA == null || rule.landmarkB == null) {
        errors.push(`Rule '${rname}': landmark_deviation needs landmarkA and landmarkB`);
      }
      if (rule.axis && !['x', 'y', 'z'].includes(rule.axis)) {
        errors.push(`Rule '${rname}': axis must be x, y, or z`);
      }
    } else if (rtype === 'bilateral_symmetry') {
      if ((rule.leftLandmarks || []).length !== 3) {
        errors.push(`Rule '${rname}': bilateral_symmetry needs 3 leftLandmarks`);
      }
      if ((rule.rightLandmarks || []).length !== 3) {
        errors.push(`Rule '${rname}': bilateral_symmetry needs 3 rightLandmarks`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    ruleCount: formRules.length,
    hasRepDetection: !!primary,
  };
}

export default router;
