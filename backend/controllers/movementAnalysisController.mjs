/**
 * Movement Analysis Controller
 * ============================
 * NASM + Squat University Guided Movement Analysis CRUD.
 * Supports prospect assessments (no userId) with auto-match linking.
 *
 * Phase 13 — Movement Analysis System
 */
import { getModel, Op } from '../models/index.mjs';
import sequelize from '../database.mjs';
import logger from '../utils/logger.mjs';

// ─── 1. Create Movement Analysis ──────────────────────────────────
export const createMovementAnalysis = async (req, res) => {
  try {
    const MovementAnalysis = getModel('MovementAnalysis');
    const User = getModel('User');

    const {
      userId, fullName, email, phone, dateOfBirth, address,
      source, parqScreening, medicalClearanceRequired,
      posturalAssessment, overheadSquatAssessment,
      squatUniversityAssessment, movementQualityAssessments,
      trainerNotes, status,
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }

    // Calculate scores if OHSA data provided
    let nasmAssessmentScore = null;
    let correctiveExerciseStrategy = null;
    let optPhaseRecommendation = null;
    let overallMovementQualityScore = null;

    if (overheadSquatAssessment) {
      nasmAssessmentScore = MovementAnalysis.calculateNASMScore(overheadSquatAssessment);
      correctiveExerciseStrategy = MovementAnalysis.generateCorrectiveStrategy(overheadSquatAssessment);
      if (nasmAssessmentScore !== null) {
        optPhaseRecommendation = MovementAnalysis.selectOPTPhase(nasmAssessmentScore);
        overallMovementQualityScore = nasmAssessmentScore;
      }
    }

    const isCompleted = status === 'completed';

    const analysis = await MovementAnalysis.create({
      userId: userId || null,
      fullName,
      email: email || null,
      phone: phone || null,
      dateOfBirth: dateOfBirth || null,
      address: address || null,
      status: status || 'draft',
      source: source || 'admin_dashboard',
      conductedBy: req.user.id,
      assessmentDate: new Date(),
      completedAt: isCompleted ? new Date() : null,
      parqScreening: parqScreening || null,
      medicalClearanceRequired: medicalClearanceRequired || false,
      posturalAssessment: posturalAssessment || null,
      overheadSquatAssessment: overheadSquatAssessment || null,
      nasmAssessmentScore,
      squatUniversityAssessment: squatUniversityAssessment || null,
      movementQualityAssessments: movementQualityAssessments || null,
      correctiveExerciseStrategy,
      optPhaseRecommendation,
      overallMovementQualityScore,
      trainerNotes: trainerNotes || null,
    });

    // Auto-match if no userId (prospect)
    if (!userId && (email || phone)) {
      await autoMatchProspect(analysis, User);
    }

    return res.status(201).json({ success: true, data: analysis });
  } catch (error) {
    logger.error('[MovementAnalysis] create error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create assessment' });
  }
};

// ─── 2. Update Movement Analysis ──────────────────────────────────
export const updateMovementAnalysis = async (req, res) => {
  try {
    const MovementAnalysis = getModel('MovementAnalysis');
    const User = getModel('User');

    const analysis = await MovementAnalysis.findByPk(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }
    if (analysis.status === 'archived') {
      return res.status(409).json({ success: false, message: 'Cannot update an archived assessment' });
    }

    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.conductedBy;
    delete updateData.createdAt;

    // Recalculate scores if OHSA data changes
    const ohsa = updateData.overheadSquatAssessment || analysis.overheadSquatAssessment;
    if (updateData.overheadSquatAssessment) {
      updateData.nasmAssessmentScore = MovementAnalysis.calculateNASMScore(ohsa);
      updateData.correctiveExerciseStrategy = MovementAnalysis.generateCorrectiveStrategy(ohsa);
      if (updateData.nasmAssessmentScore !== null) {
        updateData.optPhaseRecommendation = MovementAnalysis.selectOPTPhase(updateData.nasmAssessmentScore);
        updateData.overallMovementQualityScore = updateData.nasmAssessmentScore;
      }
    }

    // Mark as completed if status changes
    if (updateData.status === 'completed' && analysis.status !== 'completed') {
      updateData.completedAt = new Date();
    }

    const transaction = await sequelize.transaction();
    try {
      await analysis.update(updateData, { transaction });

      // Auto-match if switching from no-userId to having contact info
      if (!analysis.userId && !updateData.userId) {
        const email = updateData.email || analysis.email;
        const phone = updateData.phone || analysis.phone;
        if (email || phone) {
          const PendingMatch = getModel('PendingMovementAnalysisMatch');
          const existingMatches = await PendingMatch.count({ where: { movementAnalysisId: analysis.id }, transaction });
          if (existingMatches === 0) {
            await autoMatchProspect(analysis, User, transaction);
          }
        }
      }

      await transaction.commit();
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }

    return res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('[MovementAnalysis] update error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update assessment' });
  }
};

// ─── 3. List Movement Analyses ────────────────────────────────────
export const listMovementAnalyses = async (req, res) => {
  try {
    const MovementAnalysis = getModel('MovementAnalysis');

    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where = {};
    if (status) where.status = status;
    if (search) {
      const sanitized = String(search).trim().substring(0, 100);
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${sanitized}%` } },
        { email: { [Op.iLike]: `%${sanitized}%` } },
        { phone: { [Op.iLike]: `%${sanitized}%` } },
      ];
    }

    const { rows, count } = await MovementAnalysis.findAndCountAll({
      where,
      include: [
        { association: 'client', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { association: 'conductor', attributes: ['id', 'firstName', 'lastName'] },
        { association: 'pendingMatches', where: { status: 'pending_review' }, required: false },
      ],
      order: [['assessmentDate', 'DESC']],
      limit: Number(limit),
      offset,
      distinct: true,
    });

    return res.json({
      success: true,
      data: {
        analyses: rows,
        pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / Number(limit)) },
      },
    });
  } catch (error) {
    logger.error('[MovementAnalysis] list error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assessments' });
  }
};

// ─── 4. Get Movement Analysis Detail ──────────────────────────────
export const getMovementAnalysisDetail = async (req, res) => {
  try {
    const MovementAnalysis = getModel('MovementAnalysis');

    const analysis = await MovementAnalysis.findByPk(req.params.id, {
      include: [
        { association: 'client', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
        { association: 'conductor', attributes: ['id', 'firstName', 'lastName'] },
        {
          association: 'pendingMatches',
          include: [{ association: 'candidateUser', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }],
        },
      ],
    });

    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    return res.json({ success: true, data: analysis });
  } catch (error) {
    logger.error('[MovementAnalysis] detail error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch assessment' });
  }
};

// ─── 5. Get Client Movement History ───────────────────────────────
export const getClientMovementHistory = async (req, res) => {
  try {
    const MovementAnalysis = getModel('MovementAnalysis');

    const analyses = await MovementAnalysis.findAll({
      where: { userId: req.params.userId },
      include: [
        { association: 'conductor', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['assessmentDate', 'DESC']],
    });

    return res.json({ success: true, data: analyses });
  } catch (error) {
    logger.error('[MovementAnalysis] client history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch client history' });
  }
};

// ─── 6. Approve Match ─────────────────────────────────────────────
export const approveMatch = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const PendingMatch = getModel('PendingMovementAnalysisMatch');
    const MovementAnalysis = getModel('MovementAnalysis');

    const match = await PendingMatch.findByPk(req.params.matchId, {
      include: [{ association: 'movementAnalysis' }],
      transaction,
    });

    if (!match) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    if (match.status !== 'pending_review') {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: `Match already resolved (${match.status})` });
    }
    if (!match.candidateUserId) {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: 'Cannot approve match with no candidate user' });
    }
    if (match.movementAnalysis.status === 'archived') {
      await transaction.rollback();
      return res.status(409).json({ success: false, message: 'Cannot approve match — analysis is archived' });
    }

    // Approve match
    await match.update(
      { status: 'approved', reviewedByUserId: req.user.id, reviewedAt: new Date() },
      { transaction },
    );

    // Link analysis to user
    await MovementAnalysis.update(
      { userId: match.candidateUserId, status: 'linked' },
      { where: { id: match.movementAnalysisId }, transaction },
    );

    // Reject siblings
    await PendingMatch.update(
      { status: 'rejected', reviewedByUserId: req.user.id, reviewedAt: new Date() },
      {
        where: {
          movementAnalysisId: match.movementAnalysisId,
          id: { [Op.ne]: match.id },
          status: 'pending_review',
        },
        transaction,
      },
    );

    await transaction.commit();
    logger.info(`[MovementAnalysis] Match ${match.id} approved by admin ${req.user.id}`);
    return res.json({ success: true, message: 'Match approved and analysis linked' });
  } catch (error) {
    await transaction.rollback();
    logger.error('[MovementAnalysis] approveMatch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve match' });
  }
};

// ─── 7. Reject Match ──────────────────────────────────────────────
export const rejectMatch = async (req, res) => {
  try {
    const PendingMatch = getModel('PendingMovementAnalysisMatch');
    const match = await PendingMatch.findByPk(req.params.matchId);

    if (!match) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }
    if (match.status !== 'pending_review') {
      return res.status(409).json({ success: false, message: `Match already resolved (${match.status})` });
    }

    await match.update({ status: 'rejected', reviewedByUserId: req.user.id, reviewedAt: new Date() });
    return res.json({ success: true, message: 'Match rejected' });
  } catch (error) {
    logger.error('[MovementAnalysis] rejectMatch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject match' });
  }
};

// ─── 8. Attach User (Manual Admin Link) ───────────────────────────
export const attachUser = async (req, res) => {
  try {
    const MovementAnalysis = getModel('MovementAnalysis');
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const analysis = await MovementAnalysis.findByPk(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, message: 'Assessment not found' });
    }

    await analysis.update({ userId, status: 'linked' });
    return res.json({ success: true, message: 'User linked to assessment', data: analysis });
  } catch (error) {
    logger.error('[MovementAnalysis] attachUser error:', error);
    return res.status(500).json({ success: false, message: 'Failed to attach user' });
  }
};

// ─── Auto-Match Helper ────────────────────────────────────────────
async function autoMatchProspect(analysis, User, transaction = null) {
  try {
    const PendingMatch = getModel('PendingMovementAnalysisMatch');
    const matches = [];
    const opts = transaction ? { transaction } : {};

    if (analysis.email) {
      const emailMatch = await User.findOne({
        where: { email: { [Op.iLike]: analysis.email } },
        attributes: ['id'],
        ...opts,
      });
      if (emailMatch) {
        matches.push({ candidateUserId: emailMatch.id, confidenceScore: 0.95, matchMethod: 'email_exact' });
      }
    }

    if (analysis.phone) {
      const phoneMatch = await User.findOne({
        where: { phone: analysis.phone },
        attributes: ['id'],
        ...opts,
      });
      if (phoneMatch && !matches.some((m) => m.candidateUserId === phoneMatch.id)) {
        matches.push({ candidateUserId: phoneMatch.id, confidenceScore: 0.85, matchMethod: 'phone_exact' });
      }
    }

    for (const m of matches) {
      await PendingMatch.create({
        movementAnalysisId: analysis.id,
        ...m,
        status: 'pending_review',
      }, opts);
    }

    if (matches.length > 0) {
      logger.info(`[MovementAnalysis] Auto-matched ${matches.length} candidate(s) for analysis ${analysis.id}`);
    }
  } catch (error) {
    logger.error('[MovementAnalysis] autoMatchProspect error:', error);
  }
}
