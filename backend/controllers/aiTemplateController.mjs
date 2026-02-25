/**
 * AI Template Controller
 * ======================
 * Express handlers for NASM template registry endpoints.
 *
 * Phase 4A — Template Registry + Structured Schema Integration
 *
 * Endpoints:
 *   GET /api/ai/templates      — List templates (all authenticated roles)
 *   GET /api/ai/templates/:id  — Get template by ID (trainer/admin only)
 */
import {
  getAllTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByFramework,
  getTemplatesByStatus,
  REGISTRY_VERSION,
} from '../services/ai/nasmTemplateRegistry.mjs';

/**
 * Strip schema from a template entry (metadata-only response).
 */
function toMetadata(template) {
  const { schema, ...metadata } = template;
  return metadata;
}

/**
 * GET /api/ai/templates
 *
 * List templates with optional filters.
 * Query params: category, status (default: active), framework, includeSchema (default: false)
 *
 * RBAC: All authenticated roles can access.
 * includeSchema=true is silently ignored for client role (returns metadata-only).
 */
export function listTemplates(req, res) {
  try {
    const { category, status, framework, includeSchema } = req.query;
    const userRole = req.user?.role;

    let templates;

    // Apply filters
    if (category) {
      templates = getTemplatesByCategory(category);
    } else if (framework) {
      templates = getTemplatesByFramework(framework);
    } else {
      templates = getAllTemplates();
    }

    // Status filter (default: active)
    const statusFilter = status || 'active';
    if (statusFilter !== 'all') {
      templates = templates.filter(t => t.status === statusFilter);
    }

    // includeSchema guard: only trainer/admin can see schemas
    const canSeeSchema = includeSchema === 'true' && userRole !== 'client';

    const responseTemplates = canSeeSchema
      ? templates
      : templates.map(toMetadata);

    return res.status(200).json({
      success: true,
      templates: responseTemplates,
      count: responseTemplates.length,
      registryVersion: REGISTRY_VERSION,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to list templates',
    });
  }
}

/**
 * GET /api/ai/templates/:id
 *
 * Get a single template by ID (full entry with schema).
 * RBAC: trainer/admin only. Client role gets 403.
 */
export function getTemplate(req, res) {
  try {
    const userRole = req.user?.role;

    if (userRole === 'client') {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view template details',
      });
    }

    const template = getTemplateById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Template not found: ${req.params.id}`,
      });
    }

    // Set deprecation header if applicable
    if (template.status === 'deprecated') {
      res.set('X-Template-Deprecated', 'true');
    }

    return res.status(200).json({
      success: true,
      template,
      registryVersion: REGISTRY_VERSION,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get template',
    });
  }
}
