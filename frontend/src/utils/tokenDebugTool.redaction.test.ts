/**
 * ============================================================================
 * FILE: tokenDebugTool.redaction.test.ts
 * PURPOSE: Lock the development token debugger to metadata-only output.
 * ============================================================================
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './tokenDebugTool.ts'), 'utf8');

describe('token debug privacy contract', () => {
  it('returns storage presence metadata instead of credential values', () => {
    expect(source).toContain("tokens[key] = { present: true, length: value.length }");
    expect(source).not.toMatch(/tokens\[key\]\s*=\s*value\s*;/);
  });

  it('redacts subject identifiers and raw token info', () => {
    expect(source).toContain('const redactTokenInfo');
    expect(source).toContain('hasSubject: Boolean(info.subject ?? info.userId)');
    expect(source).toContain('redactTokenInfo(tokenCleanup.getTokenInfo())');
    expect(source).not.toMatch(/logger\.(?:log|debug|table)\([^)]*tokenCleanup\.getTokenInfo\(\)/);
  });

  it('reports request authorization presence without returning the header', () => {
    expect(source).toContain(
      'hasAuthorizationHeader: Boolean(apiService.getAuthorizationHeader())',
    );
    expect(source).not.toMatch(/return\s+authHeader\b/);
    expect(source).not.toMatch(/logger\.(?:log|debug)\([^)]*authHeader/);
  });

  it('never logs raw JWT prefixes, decoded claims, or token values', () => {
    expect(source).not.toMatch(/testToken\.substring|token\.substring/);
    expect(source).not.toMatch(
      /logger\.(?:log|debug|table)\([^,\n]+,\s*(?:payload|header|authHeader|testToken|token)\b/,
    );
    expect(source).not.toContain("logger.log('Token:'");
    expect(source).not.toContain("logger.log('Payload:'");
    expect(source).not.toContain("logger.log('Header:'");
  });
});
