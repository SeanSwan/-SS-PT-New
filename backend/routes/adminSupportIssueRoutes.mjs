/**
 * ============================================================================
 * FILE: adminSupportIssueRoutes.mjs
 * PURPOSE: Sean-only Report Room inbox, triage, notes, and repair-prompt API.
 * SECURITY: `protect` plus fail-closed owner identity checks guard every route.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * ============================================================================
 */
import express from "express";
import { z } from "zod";
import { protect } from "../middleware/authMiddleware.mjs";
import { requireSupportOwner } from "../middleware/supportOwnerOnly.mjs";
import {
  SUPPORT_ISSUE_CATEGORIES,
  SUPPORT_ISSUE_SEVERITIES,
  SUPPORT_ISSUE_SOURCES,
  SUPPORT_ISSUE_STATUSES,
} from "../domain/supportIssueConstants.mjs";
import {
  addOwnerIssueEvent,
  getIssueRepairPrompt,
  getOwnerIssue,
  listOwnerIssues,
  updateOwnerIssue,
} from "../services/support/supportIssueOwnerService.mjs";

const router = express.Router();
router.use(protect, requireSupportOwner);

const issueSelector = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9-]+$/);
const optionalEnum = (values) => z.enum(values).optional();
const listSchema = z.object({
  status: optionalEnum(SUPPORT_ISSUE_STATUSES),
  severity: optionalEnum(SUPPORT_ISSUE_SEVERITIES),
  category: optionalEnum(SUPPORT_ISSUE_CATEGORIES),
  source: optionalEnum(SUPPORT_ISSUE_SOURCES),
  search: z.string().trim().min(1).max(100).optional(),
  assignedOwnerUserId: z
    .union([z.coerce.number().int().positive(), z.literal("unassigned")])
    .optional()
    .transform((value) => (value === "unassigned" ? null : value)),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
const updateSchema = z
  .object({
    status: optionalEnum(SUPPORT_ISSUE_STATUSES),
    severity: optionalEnum(SUPPORT_ISSUE_SEVERITIES),
    assignedOwnerUserId: z.number().int().positive().nullable().optional(),
    duplicateOfIssueId: z.string().uuid().nullable().optional(),
    duplicateOfReferenceCode: z
      .string()
      .trim()
      .regex(/^SWR-\d{8}-[A-F0-9]{8}$/)
      .optional(),
    resolutionSummary: z.string().trim().max(4000).nullable().optional(),
  })
  .refine(
    (value) => !(value.duplicateOfIssueId && value.duplicateOfReferenceCode),
    { message: "Choose one duplicate target." },
  )
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one triage change is required.",
  });
const noteSchema = z.object({ body: z.string().trim().min(1).max(8000) });

function validationFailure(res, error) {
  return res.status(422).json({
    success: false,
    code: "SUPPORT_ISSUE_VALIDATION_FAILED",
    message: "The issue operation is invalid.",
    fields: error.flatten?.().fieldErrors || {},
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

router.get("/", async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return validationFailure(res, parsed.error);
  try {
    const result = await listOwnerIssues({ query: parsed.data });
    return res.json({ success: true, ...result });
  } catch (error) {
    return serviceFailure(res, error);
  }
});

router.get("/:issueId", async (req, res) => {
  const parsed = issueSelector.safeParse(req.params.issueId);
  if (!parsed.success) return validationFailure(res, parsed.error);
  try {
    const issue = await getOwnerIssue({ issueId: parsed.data });
    return res.json({ success: true, issue });
  } catch (error) {
    return serviceFailure(res, error);
  }
});

router.patch("/:issueId", async (req, res) => {
  const issueId = issueSelector.safeParse(req.params.issueId);
  const changes = updateSchema.safeParse(req.body);
  if (!issueId.success) return validationFailure(res, issueId.error);
  if (!changes.success) return validationFailure(res, changes.error);
  try {
    const issue = await updateOwnerIssue({
      issueId: issueId.data,
      actorUserId: req.user.id,
      changes: changes.data,
    });
    return res.json({ success: true, issue });
  } catch (error) {
    return serviceFailure(res, error);
  }
});

router.post("/:issueId/notes", async (req, res) => {
  const issueId = issueSelector.safeParse(req.params.issueId);
  const note = noteSchema.safeParse(req.body);
  if (!issueId.success) return validationFailure(res, issueId.error);
  if (!note.success) return validationFailure(res, note.error);
  try {
    const event = await addOwnerIssueEvent({
      issueId: issueId.data,
      actorUserId: req.user.id,
      eventType: "internal_note",
      visibility: "owner",
      body: note.data.body,
    });
    return res.status(201).json({ success: true, event });
  } catch (error) {
    return serviceFailure(res, error);
  }
});

router.post("/:issueId/replies", async (req, res) => {
  const issueId = issueSelector.safeParse(req.params.issueId);
  const reply = noteSchema.safeParse(req.body);
  if (!issueId.success) return validationFailure(res, issueId.error);
  if (!reply.success) return validationFailure(res, reply.error);
  try {
    const event = await addOwnerIssueEvent({
      issueId: issueId.data,
      actorUserId: req.user.id,
      eventType: "owner_reply",
      visibility: "reporter",
      body: reply.data.body,
    });
    return res.status(201).json({ success: true, event });
  } catch (error) {
    return serviceFailure(res, error);
  }
});
router.get("/:issueId/repair-prompt", async (req, res) => {
  const parsed = issueSelector.safeParse(req.params.issueId);
  if (!parsed.success) return validationFailure(res, parsed.error);
  try {
    const result = await getIssueRepairPrompt({ issueId: parsed.data });
    return res.json({ success: true, ...result });
  } catch (error) {
    return serviceFailure(res, error);
  }
});

export default router;
