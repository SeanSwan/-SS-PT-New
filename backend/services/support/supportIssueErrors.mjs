/**
 * ============================================================================
 * FILE: supportIssueErrors.mjs
 * PURPOSE: Stable Report Room service errors shared by reporter and owner flows.
 * ============================================================================
 */
export class SupportIssueServiceError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "SupportIssueServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export default SupportIssueServiceError;
