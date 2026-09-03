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
import { protect, rateLimiter } from "../middleware/authMiddleware.mjs";
import { supportIssueCreateSchema } from "@swan/schemas";
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
// The create contract is defined ONCE, in @swan/schemas, and the Report Room
// form imports the same object — so the rule that rejects a submission here is
// the rule that warned the user before they sent it (SWA-225 EX-5). The local
// name is kept so nothing downstream in this file changes.
const createSchema = supportIssueCreateSchema;
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});
const replySchema = z.object({ body: z.string().trim().min(1).max(8000) });
const supportIssueCreateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many support reports were sent. Please wait and try again.",
});
const supportIssueReplyLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many follow-up messages were sent. Please wait and try again.",
});

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

router.post("/", supportIssueCreateLimiter, async (req, res) => {
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

router.post("/:issueId/replies", supportIssueReplyLimiter, async (req, res) => {
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
