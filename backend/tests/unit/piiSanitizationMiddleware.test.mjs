import { describe, expect, it, vi } from 'vitest';
import {
  sanitizeText,
  strictPiiMiddleware,
} from '../../middleware/piiSanitizationMiddleware.mjs';

function createResponse() {
  const res = {
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  };
  return res;
}

describe('piiSanitizationMiddleware name redaction', () => {
  it('redacts contextual client names in free-text prompts before AI handlers run', () => {
    const result = sanitizeText(
      "Please update Sarah Johnson's plan and ask Marcus Lee about sleep.",
    );

    expect(result.sanitized).not.toContain('Sarah Johnson');
    expect(result.sanitized).not.toContain('Marcus Lee');
    expect(result.sanitized).toContain("[NAME-REDACTED]'s plan");
    expect(result.sanitized).toContain('ask [NAME-REDACTED] about sleep');
    expect(result.detections.some((d) => d.type === 'contextual_name')).toBe(true);
    expect(result.hasCriticalPII).toBe(false);
  });

  it('uses request name hints to redact exact full and first-name references', () => {
    const req = {
      body: {
        message: 'Tell Sarah Johnson that Sarah needs a lighter shoulder day.',
        piiNameHints: ['Sarah Johnson'],
      },
      user: { id: 77 },
    };
    const res = createResponse();
    const next = vi.fn();

    strictPiiMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body.message).not.toContain('Sarah');
    expect(req.body.message).not.toContain('Johnson');
    expect(req.body.message).toBe(
      'Tell [NAME-REDACTED] that [NAME-REDACTED] needs a lighter shoulder day.',
    );
    expect(req.piiDetections.some((d) => d.type === 'name_hint')).toBe(true);
  });

  it('keeps critical identifier blocking intact', () => {
    const req = {
      body: { message: 'My SSN is 123-45-6789.' },
      user: { id: 77 },
    };
    const res = createResponse();
    const next = vi.fn();

    strictPiiMiddleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error).toBe('pii_blocked');
  });
});
