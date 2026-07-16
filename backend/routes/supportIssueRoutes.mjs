/**
 * ============================================================================
 * FILE: supportIssueRoutes.mjs
 * PURPOSE: Authenticated reporter CRUD boundary for the Report Room.
 * SECURITY: Reporter identity always comes from `protect`, never request input.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import express from "express";
import { z } from "zod";
import { protect } from "../middleware/authMiddleware.mjs";
import {
  SUPPORT_ISSUE_CATEGORIES,
  SUPPORT_ISSUE_SEVERITIES,
  SUPPORT_ISSUE_SOURCES,
} from "../domain/supportIssueConstants.mjs";
import {
  addReporterReply,
  createSupportIssue,
  getReporterIssue,
  listReporterIssues,
} from "../services/support/supportIssueService.mjs";

const router = express.Router();
router.use(protect);

const issueSelector = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9-]+$/);
const createSchema = z.object({
  category: z.enum(SUPPORT_ISSUE_CATEGORIES),
  severity: z.enum(SUPPORT_ISSUE_SEVERITIES).default("medium"),
  source: z.enum(SUPPORT_ISSUE_SOURCES).default("text"),
  title: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(8000),
  expectedBehavior: z.string().trim().max(4000).optional().default(""),
  impact: z.string().trim().max(4000).optional().default(""),
  reproductionSteps: z
    .array(z.string().trim().min(1).max(500))
    .max(12)
    .optional()
    .default([]),
  diagnostics: z.record(z.unknown()).optional().default({}),
});
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
const replySchema = z.object({ body: z.string().trim().min(1).max(8000) });

function validationFailure(res, error) {
  return res.status(422).json({
    success: false,
    code: "SUPPORT_ISSUE_VALIDATION_FAILED",
    message: "Please review the highlighted issue details.",
    fields: error.flatten().fieldErrors,
  });
}

function serviceFailure(res, error) {
  return res.status(error.statusCode || 500).json({
    success: false,
    code: error.code || "SUPPORT_ISSUE_REQUEST_FAILED",
    message: error.statusCode
      ? error.message
      : "The support request could not be completed.",
  });
}

router.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return validationFailure(res, parsed.error);
  try {
    const issue = await createSupportIssue({
      reporterUserId: req.user.id,
      input: parsed.data,
    });
    return res.status(201).json({ success: true, issue });
  } catch (error) {
    return serviceFailure(res, error);
  }
});

router.get("/", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return validationFailure(res, parsed.error);
  try {
    const result = await listReporterIssues({
      reporterUserId: req.user.id,
      query: parsed.data,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return serviceFailure(res, error);
  }
});

router.get("/:issueId", async (req, res) => {
  const parsed = issueSelector.safeParse(req.params.issueId);
  if (!parsed.success) return validationFailure(res, parsed.error);
  try {
    const issue = await getReporterIssue({
      reporterUserId: req.user.id,
      issueId: parsed.data,
    });
    return res.json({ success: true, issue });
  } catch (error) {
    return serviceFailure(res, error);
  }
});

router.post("/:issueId/replies", async (req, res) => {
  const issueId = issueSelector.safeParse(req.params.issueId);
  const body = replySchema.safeParse(req.body);
  if (!issueId.success) return validationFailure(res, issueId.error);
  if (!body.success) return validationFailure(res, body.error);
  try {
    const event = await addReporterReply({
      reporterUserId: req.user.id,
      issueId: issueId.data,
      body: body.data.body,
    });
    return res.status(201).json({ success: true, event });
  } catch (error) {
    return serviceFailure(res, error);
  }
});

export default router;
