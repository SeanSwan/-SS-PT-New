/**
 * Immigration Tracking Routes
 * ===========================
 * Admin-only mini-app for tracking Canada immigration progress.
 * Uses raw SQL queries via sequelize.query() to avoid ORM column-mismatch issues.
 *
 * Routes:
 *   GET    /dashboard     — summary stats
 *   GET    /tasks         — list tasks (filterable)
 *   PUT    /tasks/:id     — update a task
 *   GET    /documents     — list documents
 *   PUT    /documents/:id — update a document
 *   GET    /study         — list study progress
 *   POST   /study         — add study session
 *   GET    /crs           — calculate CRS score
 *   POST   /seed          — seed initial data (idempotent)
 */

import express from 'express';
import { QueryTypes } from 'sequelize';
import sequelize from '../database.mjs';
import { protect } from '../middleware/authMiddleware.mjs';
import logger from '../utils/logger.mjs';

const router = express.Router();

// ===================== AUTH: admin only =====================
router.use(protect);
router.use((req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  next();
});

// ===================== GET /dashboard =====================
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    const [tasksByStatus] = await sequelize.query(
      `SELECT status, COUNT(*)::int AS count FROM immigration_tasks WHERE user_id = :userId GROUP BY status`,
      { replacements: { userId }, type: QueryTypes.SELECT, raw: true }
    ).then(rows => [rows]);

    const [tasksByPhase] = await sequelize.query(
      `SELECT phase, COUNT(*)::int AS count FROM immigration_tasks WHERE user_id = :userId GROUP BY phase ORDER BY phase`,
      { replacements: { userId }, type: QueryTypes.SELECT, raw: true }
    ).then(rows => [rows]);

    const [docsByStatus] = await sequelize.query(
      `SELECT status, COUNT(*)::int AS count FROM immigration_documents WHERE user_id = :userId GROUP BY status`,
      { replacements: { userId }, type: QueryTypes.SELECT, raw: true }
    ).then(rows => [rows]);

    const recentStudy = await sequelize.query(
      `SELECT category, score, max_score, session_date FROM study_progress WHERE user_id = :userId ORDER BY session_date DESC LIMIT 10`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );

    const totalTasks = await sequelize.query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'completed')::int AS completed FROM immigration_tasks WHERE user_id = :userId`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );

    const totalDocs = await sequelize.query(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('received','completed'))::int AS completed FROM immigration_documents WHERE user_id = :userId`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );

    const totalCost = await sequelize.query(
      `SELECT COALESCE(SUM(cost), 0) AS total_cost, COALESCE(SUM(CASE WHEN status = 'completed' THEN cost ELSE 0 END), 0) AS spent FROM immigration_tasks WHERE user_id = :userId`,
      { replacements: { userId }, type: QueryTypes.SELECT }
    );

    res.json({
      success: true,
      data: {
        tasks: { byStatus: tasksByStatus, byPhase: tasksByPhase, ...(totalTasks[0] || {}) },
        documents: { byStatus: docsByStatus, ...(totalDocs[0] || {}) },
        study: { recent: recentStudy },
        budget: totalCost[0] || { total_cost: 0, spent: 0 }
      }
    });
  } catch (err) {
    logger.error('[Immigration] Dashboard error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// ===================== GET /tasks =====================
router.get('/tasks', async (req, res) => {
  try {
    const userId = req.user.id;
    const { phase, status, category } = req.query;

    let where = 'WHERE user_id = :userId';
    const replacements = { userId };

    if (phase !== undefined) {
      where += ' AND phase = :phase';
      replacements.phase = parseInt(phase, 10);
    }
    if (status) {
      where += ' AND status = :status';
      replacements.status = status;
    }
    if (category) {
      where += ' AND category = :category';
      replacements.category = category;
    }

    const tasks = await sequelize.query(
      `SELECT * FROM immigration_tasks ${where} ORDER BY phase, sort_order, id`,
      { replacements, type: QueryTypes.SELECT }
    );

    res.json({ success: true, data: tasks });
  } catch (err) {
    logger.error('[Immigration] Tasks list error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load tasks' });
  }
});

// ===================== PUT /tasks/:id =====================
router.put('/tasks/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = parseInt(req.params.id, 10);
    const { status, notes, completed_at, due_date, priority, description } = req.body;

    // Build dynamic SET clause
    const sets = [];
    const replacements = { userId, taskId };

    if (status !== undefined) {
      sets.push('status = :status');
      replacements.status = status;
      // Auto-set completed_at when marking completed
      if (status === 'completed' && !completed_at) {
        sets.push('completed_at = CURRENT_TIMESTAMP');
      }
    }
    if (notes !== undefined) { sets.push('notes = :notes'); replacements.notes = notes; }
    if (completed_at !== undefined) { sets.push('completed_at = :completed_at'); replacements.completed_at = completed_at; }
    if (due_date !== undefined) { sets.push('due_date = :due_date'); replacements.due_date = due_date; }
    if (priority !== undefined) { sets.push('priority = :priority'); replacements.priority = priority; }
    if (description !== undefined) { sets.push('description = :description'); replacements.description = description; }

    sets.push('updated_at = CURRENT_TIMESTAMP');

    if (sets.length === 1) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const [results] = await sequelize.query(
      `UPDATE immigration_tasks SET ${sets.join(', ')} WHERE id = :taskId AND user_id = :userId RETURNING *`,
      { replacements, type: QueryTypes.SELECT }
    ).then(rows => [rows]);

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: results[0] });
  } catch (err) {
    logger.error('[Immigration] Task update error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

// ===================== GET /documents =====================
router.get('/documents', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, status } = req.query;

    let where = 'WHERE user_id = :userId';
    const replacements = { userId };

    if (category) { where += ' AND category = :category'; replacements.category = category; }
    if (status) { where += ' AND status = :status'; replacements.status = status; }

    const docs = await sequelize.query(
      `SELECT * FROM immigration_documents ${where} ORDER BY sort_order, id`,
      { replacements, type: QueryTypes.SELECT }
    );

    res.json({ success: true, data: docs });
  } catch (err) {
    logger.error('[Immigration] Documents list error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load documents' });
  }
});

// ===================== PUT /documents/:id =====================
router.put('/documents/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const docId = parseInt(req.params.id, 10);
    const { status, score, notes, due_date, completed_at } = req.body;

    const sets = [];
    const replacements = { userId, docId };

    if (status !== undefined) {
      sets.push('status = :status');
      replacements.status = status;
      if ((status === 'received' || status === 'completed') && !completed_at) {
        sets.push('completed_at = CURRENT_TIMESTAMP');
      }
    }
    if (score !== undefined) { sets.push('score = :score'); replacements.score = score; }
    if (notes !== undefined) { sets.push('notes = :notes'); replacements.notes = notes; }
    if (due_date !== undefined) { sets.push('due_date = :due_date'); replacements.due_date = due_date; }
    if (completed_at !== undefined) { sets.push('completed_at = :completed_at'); replacements.completed_at = completed_at; }

    sets.push('updated_at = CURRENT_TIMESTAMP');

    if (sets.length === 1) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const [results] = await sequelize.query(
      `UPDATE immigration_documents SET ${sets.join(', ')} WHERE id = :docId AND user_id = :userId RETURNING *`,
      { replacements, type: QueryTypes.SELECT }
    ).then(rows => [rows]);

    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({ success: true, data: results[0] });
  } catch (err) {
    logger.error('[Immigration] Document update error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to update document' });
  }
});

// ===================== GET /study =====================
router.get('/study', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.query;

    let where = 'WHERE user_id = :userId';
    const replacements = { userId };

    if (category) { where += ' AND category = :category'; replacements.category = category; }

    const entries = await sequelize.query(
      `SELECT * FROM study_progress ${where} ORDER BY session_date DESC, id DESC`,
      { replacements, type: QueryTypes.SELECT }
    );

    res.json({ success: true, data: entries });
  } catch (err) {
    logger.error('[Immigration] Study list error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to load study progress' });
  }
});

// ===================== POST /study =====================
router.post('/study', async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, score, max_score, session_date, notes } = req.body;

    if (!category || !session_date) {
      return res.status(400).json({ success: false, error: 'category and session_date are required' });
    }

    const validCategories = [
      'ielts_reading', 'ielts_writing', 'ielts_listening', 'ielts_speaking',
      'tef_reading', 'tef_writing', 'tef_listening', 'tef_speaking',
      'french_vocab', 'cert_ibm', 'cert_aws_ai', 'cert_azure', 'cert_aws_ml', 'cert_google'
    ];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ success: false, error: `Invalid category. Must be one of: ${validCategories.join(', ')}` });
    }

    const [inserted] = await sequelize.query(
      `INSERT INTO study_progress (user_id, category, score, max_score, session_date, notes, created_at, updated_at)
       VALUES (:userId, :category, :score, :max_score, :session_date, :notes, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      {
        replacements: {
          userId,
          category,
          score: score ?? null,
          max_score: max_score ?? null,
          session_date,
          notes: notes ?? null
        },
        type: QueryTypes.SELECT
      }
    ).then(rows => [rows]);

    res.status(201).json({ success: true, data: inserted[0] });
  } catch (err) {
    logger.error('[Immigration] Study add error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to add study session' });
  }
});

// ===================== GET /crs =====================
router.get('/crs', async (req, res) => {
  try {
    // CRS Calculator based on Express Entry point system
    // Query params: age, education, clb_first, clb_second, canadian_exp, foreign_exp, has_spouse_clb, spouse_clb, spouse_education
    const {
      age = 30,
      education = 'bachelors',        // high_school, one_year, two_year, bachelors, masters, phd
      clb_first = 7,                  // CLB level for first official language
      clb_second = 0,                 // CLB level for second official language
      canadian_exp = 0,               // years of Canadian work experience
      foreign_exp = 3,                // years of foreign work experience
      has_spouse_clb = false,
      spouse_clb = 0,
      spouse_education = 'bachelors'
    } = req.query;

    let coreHuman = 0;
    let skill = 0;
    let additional = 0;

    // --- Age (max 110 for single, 100 with spouse) ---
    const ageNum = parseInt(age, 10);
    if (ageNum >= 20 && ageNum <= 29) coreHuman += 110;
    else if (ageNum === 30) coreHuman += 105;
    else if (ageNum === 31) coreHuman += 99;
    else if (ageNum === 32) coreHuman += 93;
    else if (ageNum === 33) coreHuman += 87;
    else if (ageNum === 34) coreHuman += 81;
    else if (ageNum === 35) coreHuman += 75;
    else if (ageNum >= 36 && ageNum <= 44) coreHuman += Math.max(0, 75 - (ageNum - 35) * 11);
    // 45+ = 0

    // --- Education (max 150 single) ---
    const eduScores = {
      high_school: 30, one_year: 90, two_year: 98, bachelors: 120, masters: 135, phd: 150
    };
    coreHuman += eduScores[education] || 30;

    // --- First language CLB (max 136) ---
    const clb1 = parseInt(clb_first, 10);
    const langScore = clb1 >= 10 ? 34 : clb1 === 9 ? 31 : clb1 === 8 ? 23 : clb1 === 7 ? 17 : clb1 === 6 ? 9 : clb1 === 5 ? 6 : 0;
    coreHuman += langScore * 4; // 4 skills

    // --- Second language CLB (max 24) ---
    const clb2 = parseInt(clb_second, 10);
    if (clb2 >= 7) coreHuman += 24;
    else if (clb2 >= 5) coreHuman += 4 * (clb2 >= 7 ? 6 : clb2 >= 5 ? 1 : 0);

    // --- Canadian work experience (max 80) ---
    const canExp = parseInt(canadian_exp, 10);
    if (canExp >= 5) coreHuman += 80;
    else if (canExp >= 3) coreHuman += 64;
    else if (canExp >= 2) coreHuman += 53;
    else if (canExp >= 1) coreHuman += 40;

    // --- Skill Transferability (simplified, max 100) ---
    // Education + Language combo
    if ((eduScores[education] || 0) >= 120 && clb1 >= 9) skill += 50;
    else if ((eduScores[education] || 0) >= 90 && clb1 >= 7) skill += 25;

    // Foreign work + Language combo
    const forExp = parseInt(foreign_exp, 10);
    if (forExp >= 3 && clb1 >= 9) skill += 50;
    else if (forExp >= 1 && clb1 >= 7) skill += 25;

    skill = Math.min(skill, 100);

    // --- Additional points ---
    // French bonus (second language)
    if (clb2 >= 7) additional += 50;
    else if (clb2 >= 5) additional += 25;

    // Spouse factors (simplified)
    if (has_spouse_clb === 'true' || has_spouse_clb === true) {
      const spClb = parseInt(spouse_clb, 10);
      if (spClb >= 9) additional += 20;
      else if (spClb >= 5) additional += 10;

      const spEdu = eduScores[spouse_education] || 0;
      if (spEdu >= 120) additional += 10;
      else if (spEdu >= 90) additional += 5;
    }

    const total = coreHuman + skill + additional;

    res.json({
      success: true,
      data: {
        total,
        breakdown: {
          core_human_capital: coreHuman,
          skill_transferability: skill,
          additional: additional
        },
        inputs: { age: ageNum, education, clb_first: clb1, clb_second: clb2, canadian_exp: canExp, foreign_exp: forExp },
        note: 'Simplified CRS calculator. Official scores may vary. See ircc.canada.ca for exact calculation.'
      }
    });
  } catch (err) {
    logger.error('[Immigration] CRS calc error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to calculate CRS score' });
  }
});

// ===================== POST /seed =====================
router.post('/seed', async (req, res) => {
  try {
    const userId = req.user.id;

    // Track how many items were created vs skipped
    let tasksCreated = 0;
    let tasksSkipped = 0;
    let docsCreated = 0;
    let docsSkipped = 0;

    // ===================== SEED TASKS =====================
    const tasks = [
      // Phase 0 — Immediate
      { phase: 0, sort_order: 1, category: 'marriage', title: 'Complete online marriage application at ocweddings.ocrecorder.com', owner: 'both', priority: 'P0', cost: 0 },
      { phase: 0, sort_order: 2, category: 'tribal', title: "Search Dawes Rolls on Ancestry.com for grandfather/father's name + roll number", owner: 'sean', priority: 'P0' },
      { phase: 0, sort_order: 3, category: 'marriage', title: 'Get married at Anaheim OC Clerk-Recorder (222 S. Harbor Blvd)', owner: 'both', priority: 'P0', cost: 89 },
      { phase: 0, sort_order: 4, category: 'marriage', title: 'Get 3+ certified marriage certificate copies ($17 each)', owner: 'both', priority: 'P0', cost: 51 },
      { phase: 0, sort_order: 5, category: 'tribal', title: 'Call Chickasaw TGS: (580) 436-7250 — request CDIB application', owner: 'sean', priority: 'P0' },
      { phase: 0, sort_order: 6, category: 'vital_records', title: "Order long-form birth certificates (yours + father's)", owner: 'sean', priority: 'P0' },
      { phase: 0, sort_order: 7, category: 'vital_records', title: "Order father's death certificate (if applicable)", owner: 'sean', priority: 'P1' },
      { phase: 0, sort_order: 8, category: 'language', title: 'Take free IELTS practice test at takeielts.britishcouncil.org', owner: 'both', priority: 'P1', resource_url: 'https://takeielts.britishcouncil.org' },
      { phase: 0, sort_order: 9, category: 'language', title: 'Start Duolingo French + Pimsleur French (30 min each daily)', owner: 'both', priority: 'P1' },

      // Phase 1 — Months 1-3
      { phase: 1, sort_order: 10, category: 'tribal', title: 'Submit CDIB application + all vital records to Chickasaw Nation', owner: 'sean', priority: 'P0' },
      { phase: 1, sort_order: 11, category: 'language', title: 'Book IELTS tests for both', owner: 'both', priority: 'P0' },
      { phase: 1, sort_order: 12, category: 'certification', title: 'Start IBM GenAI Engineering Certificate on Coursera ($49/mo)', owner: 'sean', priority: 'P1', cost: 294, notes: '0 CRS points - personal growth only. Does not contribute to Express Entry score but strengthens tech portfolio.' },
      { phase: 1, sort_order: 13, category: 'language', title: 'Take IELTS test', owner: 'both', priority: 'P0', cost: 300 },
      { phase: 1, sort_order: 14, category: 'immigration', title: 'Get GED', owner: 'sean', priority: 'P0' },
      { phase: 1, sort_order: 15, category: 'immigration', title: "Submit wife's ECA for college degree", owner: 'wife', priority: 'P0' },
      { phase: 1, sort_order: 16, category: 'certification', title: 'Take AWS AI Practitioner exam ($100)', owner: 'sean', priority: 'P1', cost: 100, notes: '0 CRS points - personal growth only. Demonstrates AI competency for job market, not scored by IRCC.' },
      { phase: 1, sort_order: 17, category: 'certification', title: 'Complete IBM GenAI cert', owner: 'sean', priority: 'P1', notes: '0 CRS points - personal growth only. Completion milestone for IBM GenAI Engineering Certificate.' },
      { phase: 1, sort_order: 18, category: 'immigration', title: 'Wife submits Express Entry as principal applicant', owner: 'both', priority: 'P0' },
      // Wife MEd Pathway — Phase 1
      { phase: 1, sort_order: 19, category: 'immigration', title: 'Research Canadian MEd programs (McGill, UBC, UofT, Concordia)', owner: 'wife', priority: 'P0', cost: 0 },
      { phase: 1, sort_order: 20, category: 'immigration', title: "Submit wife's Educational Credential Assessment (ECA)", owner: 'wife', priority: 'P0', cost: 200 },

      // Phase 2 — Months 4-6
      { phase: 2, sort_order: 21, category: 'certification', title: 'Start Azure AI-102 prep (free Microsoft Learn)', owner: 'sean', priority: 'P1', notes: '0 CRS points - personal growth only. Free prep through Microsoft Learn, exam fee separate.' },
      { phase: 2, sort_order: 22, category: 'immigration', title: 'Apply Ontario HCP + BC Tech PNP', owner: 'wife', priority: 'P1' },
      { phase: 2, sort_order: 23, category: 'language', title: 'Add iTalki French tutoring 2-3x/week', owner: 'both', priority: 'P1' },
      { phase: 2, sort_order: 24, category: 'tribal', title: 'Apply for Chickasaw citizenship once CDIB arrives', owner: 'sean', priority: 'P0' },
      { phase: 2, sort_order: 25, category: 'certification', title: 'Take Azure AI-102 exam ($165)', owner: 'sean', priority: 'P1', cost: 165, notes: '0 CRS points - personal growth only. Azure certification for job competitiveness, not IRCC scored.' },
      { phase: 2, sort_order: 26, category: 'tribal', title: 'Schedule ETC interview if citizenship card received', owner: 'sean', priority: 'P1' },
      // Wife MEd Pathway — Phase 2
      { phase: 2, sort_order: 27, category: 'immigration', title: 'Wife applies to Canadian MEd programs', owner: 'wife', priority: 'P0', cost: 200 },
      { phase: 2, sort_order: 28, category: 'immigration', title: 'Apply for Ontario HCP + BC Tech PNP as backup', owner: 'both', priority: 'P1', cost: 0 },
      // Self-Employed Program — Phase 2
      { phase: 2, sort_order: 29, category: 'pt_market', title: 'Begin documenting PT business for Self-Employed file', owner: 'sean', priority: 'P1', cost: 0 },
      { phase: 2, sort_order: 30, category: 'pt_market', title: 'Gather 5+ years tax returns showing PT income', owner: 'sean', priority: 'P1', cost: 0 },

      // Phase 3 — Months 7-12
      { phase: 3, sort_order: 31, category: 'certification', title: 'AWS ML Specialty prep + exam', owner: 'sean', priority: 'P1', cost: 300 },
      { phase: 3, sort_order: 32, category: 'language', title: 'Intensive French practice', owner: 'both', priority: 'P1' },
      { phase: 3, sort_order: 33, category: 'immigration', title: 'Monitor IRCC Indigenous mobility updates', owner: 'sean', priority: 'P2' },
      { phase: 3, sort_order: 34, category: 'language', title: 'Book TEF Canada test', owner: 'both', priority: 'P1' },
      { phase: 3, sort_order: 35, category: 'language', title: 'Take French practice exams', owner: 'both', priority: 'P1' },
      { phase: 3, sort_order: 36, category: 'language', title: 'Take TEF Canada', owner: 'both', priority: 'P0' },
      { phase: 3, sort_order: 37, category: 'immigration', title: 'Update Express Entry with French scores (+50 CRS)', owner: 'both', priority: 'P0' },
      { phase: 3, sort_order: 38, category: 'tribal', title: 'Evaluate Indigenous pathway status', owner: 'sean', priority: 'P1' },
      // Wife MEd Pathway — Phase 3
      { phase: 3, sort_order: 39, category: 'immigration', title: 'Wife accepted to MEd — apply for study permit', owner: 'wife', priority: 'P0', cost: 150 },
      { phase: 3, sort_order: 40, category: 'immigration', title: 'Apply for spousal Open Work Permit (OWP)', owner: 'sean', priority: 'P0', cost: 255 },
      { phase: 3, sort_order: 41, category: 'immigration', title: 'Enroll 4 kids in Canadian public school (free K-12)', owner: 'both', priority: 'P0', cost: 0 },
      { phase: 3, sort_order: 42, category: 'immigration', title: 'Apply for grandma Super Visa', owner: 'both', priority: 'P1', cost: 175 },
      // Self-Employed Program — Phase 3
      { phase: 3, sort_order: 43, category: 'pt_market', title: 'Write business plan for Canadian PT market', owner: 'sean', priority: 'P1', cost: 0 },
      { phase: 3, sort_order: 44, category: 'pt_market', title: 'Collect client testimonials and NASM documentation (26 years)', owner: 'sean', priority: 'P1', cost: 0 },
      { phase: 3, sort_order: 45, category: 'immigration', title: 'Monitor Self-Employed Persons Program for 2027 reopen', owner: 'sean', priority: 'P2', cost: 0 },

      // Phase 4 — Months 13-24
      { phase: 4, sort_order: 46, category: 'pt_market', title: 'Build Canadian work experience (PT clients + SwanStudios)', owner: 'sean', priority: 'P0', cost: 0 },
      { phase: 4, sort_order: 47, category: 'immigration', title: 'Wife completes MEd program', owner: 'wife', priority: 'P0', cost: 0 },
      { phase: 4, sort_order: 48, category: 'immigration', title: 'Wife gets Post-Graduation Work Permit (PGWP)', owner: 'wife', priority: 'P0', cost: 255 },
      { phase: 4, sort_order: 49, category: 'immigration', title: 'Apply for PR through Canadian Experience Class', owner: 'both', priority: 'P0', cost: 1325 },
      { phase: 4, sort_order: 50, category: 'immigration', title: 'Establish 3-year income for grandma PGP sponsorship', owner: 'both', priority: 'P1', cost: 0 },
      { phase: 4, sort_order: 51, category: 'immigration', title: 'Apply for permanent residency', owner: 'both', priority: 'P0', cost: 0 },
      { phase: 4, sort_order: 52, category: 'pt_market', title: 'Network with PT clients in target neighborhoods', owner: 'sean', priority: 'P1', cost: 0 },
      { phase: 4, sort_order: 53, category: 'certification', title: 'Get Canadian PT credentials (CSEP/canfitpro equivalency)', owner: 'sean', priority: 'P1', cost: 500 },
    ];

    for (const t of tasks) {
      // Idempotent upsert by title — skip if task already exists for this user
      const existingTask = await sequelize.query(
        `SELECT id FROM immigration_tasks WHERE user_id = :userId AND title = :title LIMIT 1`,
        { replacements: { userId, title: t.title }, type: QueryTypes.SELECT }
      );

      if (existingTask.length > 0) {
        // Update notes if provided (for honest framing updates on existing cert tasks)
        if (t.notes) {
          await sequelize.query(
            `UPDATE immigration_tasks SET notes = :notes, sort_order = :sort_order, updated_at = CURRENT_TIMESTAMP WHERE id = :id`,
            { replacements: { notes: t.notes, sort_order: t.sort_order, id: existingTask[0].id } }
          );
        }
        tasksSkipped++;
        continue;
      }

      await sequelize.query(
        `INSERT INTO immigration_tasks (user_id, phase, category, title, owner, priority, cost, resource_url, sort_order, status, notes, created_at, updated_at)
         VALUES (:userId, :phase, :category, :title, :owner, :priority, :cost, :resource_url, :sort_order, 'not_started', :notes, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          replacements: {
            userId,
            phase: t.phase,
            category: t.category,
            title: t.title,
            owner: t.owner || 'both',
            priority: t.priority || 'P1',
            cost: t.cost ?? null,
            resource_url: t.resource_url ?? null,
            sort_order: t.sort_order,
            notes: t.notes ?? null
          }
        }
      );
      tasksCreated++;
    }

    // ===================== SEED DOCUMENTS =====================
    const documents = [
      // Vital Records
      { name: "Sean's long-form birth certificate", category: 'vital_records', sort_order: 1 },
      { name: "Father's long-form birth certificate", category: 'vital_records', sort_order: 2 },
      { name: "Father's death certificate", category: 'vital_records', sort_order: 3 },
      { name: "Grandfather's birth/death certificates", category: 'vital_records', sort_order: 4 },
      { name: 'Marriage certificate (3 copies)', category: 'vital_records', sort_order: 5 },
      // Tribal
      { name: 'CDIB Card', category: 'tribal', sort_order: 6 },
      { name: 'Chickasaw Citizenship Card', category: 'tribal', sort_order: 7 },
      { name: 'Enhanced Tribal Citizenship ID (ETC)', category: 'tribal', sort_order: 8 },
      // Language
      { name: 'IELTS Results (Sean)', category: 'language', sort_order: 9 },
      { name: 'IELTS Results (Wife)', category: 'language', sort_order: 10 },
      { name: 'TEF Canada Results (Sean)', category: 'language', sort_order: 11 },
      { name: 'TEF Canada Results (Wife)', category: 'language', sort_order: 12 },
      // Immigration
      { name: "Wife's ECA (degree evaluation)", category: 'immigration', sort_order: 13 },
      { name: "Sean's GED", category: 'immigration', sort_order: 14 },
      // Certifications
      { name: 'IBM GenAI Certificate', category: 'certification', sort_order: 15 },
      { name: 'AWS AI Practitioner', category: 'certification', sort_order: 16 },
      { name: 'Azure AI-102', category: 'certification', sort_order: 17 },
      { name: 'AWS ML Specialty', category: 'certification', sort_order: 18 },
      { name: 'Google Professional ML Engineer', category: 'certification', sort_order: 19 },
      // Immigration Applications
      { name: 'Express Entry Profile', category: 'immigration', sort_order: 20 },
      { name: 'Ontario HCP Application', category: 'immigration', sort_order: 21 },
      { name: 'BC Tech PNP Application', category: 'immigration', sort_order: 22 },

      // Wife MEd Documents
      { name: "Wife's Educational Credential Assessment (ECA)", category: 'immigration', sort_order: 23 },
      { name: "Wife's College Transcripts (for MEd application)", category: 'immigration', sort_order: 24 },
      { name: 'MEd Program Acceptance Letter', category: 'immigration', sort_order: 25 },
      { name: "Wife's Study Permit Application", category: 'immigration', sort_order: 26 },

      // Spousal/Family Documents
      { name: 'Spousal Open Work Permit Application', category: 'immigration', sort_order: 27 },
      { name: 'Relationship Proof Package (photos, joint accounts, etc.)', category: 'marriage', sort_order: 28 },
      { name: 'Kids Birth Certificates (4 copies)', category: 'marriage', sort_order: 29 },
      { name: 'Kids Immunization Records', category: 'marriage', sort_order: 30 },
      { name: 'Kids School Records/Transcripts', category: 'marriage', sort_order: 31 },
      { name: 'Grandma Super Visa Application', category: 'immigration', sort_order: 32 },
      { name: 'Grandma Medical Exam Results', category: 'immigration', sort_order: 33 },
      { name: 'Grandma Private Health Insurance (min $100K coverage)', category: 'immigration', sort_order: 34 },

      // Self-Employed Documents
      { name: 'NASM Certification (26 years documentation)', category: 'certification', sort_order: 35 },
      { name: 'Business Plan for Canadian PT Market', category: 'pt_market', sort_order: 36 },
      { name: '5+ Years Notice of Assessments (NOAs/Tax Returns)', category: 'pt_market', sort_order: 37 },
      { name: 'Client Contracts and Invoices', category: 'pt_market', sort_order: 38 },
      { name: 'SwanStudios Platform Documentation', category: 'pt_market', sort_order: 39 },
      { name: 'Client Testimonials and References', category: 'pt_market', sort_order: 40 },
      { name: 'Bank Statements (self-employment income proof)', category: 'pt_market', sort_order: 41 },
    ];

    for (const d of documents) {
      // Idempotent upsert by name — skip if document already exists for this user
      const existingDoc = await sequelize.query(
        `SELECT id FROM immigration_documents WHERE user_id = :userId AND name = :name LIMIT 1`,
        { replacements: { userId, name: d.name }, type: QueryTypes.SELECT }
      );

      if (existingDoc.length > 0) {
        docsSkipped++;
        continue;
      }

      await sequelize.query(
        `INSERT INTO immigration_documents (user_id, name, category, status, sort_order, created_at, updated_at)
         VALUES (:userId, :name, :category, 'not_started', :sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        {
          replacements: {
            userId,
            name: d.name,
            category: d.category,
            sort_order: d.sort_order
          }
        }
      );
      docsCreated++;
    }

    logger.info(`[Immigration] Seed complete for user ${userId}: ${tasksCreated} tasks created (${tasksSkipped} skipped), ${docsCreated} docs created (${docsSkipped} skipped)`);

    res.json({
      success: true,
      message: `Seeded ${tasksCreated} tasks and ${docsCreated} documents (${tasksSkipped} tasks and ${docsSkipped} docs already existed)`,
      seeded: tasksCreated > 0 || docsCreated > 0,
      counts: { tasks_created: tasksCreated, tasks_skipped: tasksSkipped, docs_created: docsCreated, docs_skipped: docsSkipped }
    });
  } catch (err) {
    logger.error('[Immigration] Seed error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to seed immigration data' });
  }
});

export default router;
