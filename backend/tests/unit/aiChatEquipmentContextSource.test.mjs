import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const routeSource = readFileSync(
  resolve(process.cwd(), 'routes/aiChatRoutes.mjs'),
  'utf8',
);
const serviceSource = readFileSync(
  resolve(process.cwd(), 'services/aiChatService.mjs'),
  'utf8',
);

describe('AI chat selected equipment profile request context', () => {
  it('validates selected equipment profile context before prompting the AI', () => {
    expect(routeSource).toContain('requestContext');
    expect(routeSource).toContain('parseOptionalPositiveInteger');
    expect(routeSource).toContain('VALID_EQUIPMENT_PROFILE_ID_REQUIRED');
    expect(routeSource).toContain('buildSelectedEquipmentProfilePromptBlock');
    expect(routeSource).toMatch(/systemPrompt\s*\+=\s*await\s+buildSelectedEquipmentProfilePromptBlock/);
  });

  it('validates scheduled-session request context before prompting the AI', () => {
    expect(routeSource).toContain('hasScheduledSessionRequest');
    expect(routeSource).toContain('VALID_SCHEDULED_SESSION_ID_REQUIRED');
    expect(routeSource).toContain('buildSelectedScheduledSessionPromptBlock');
    expect(routeSource).toMatch(/systemPrompt\s*\+=\s*buildSelectedScheduledSessionPromptBlock/);
  });

  it('validates workout-date request context and forwards it to proposal parsing', () => {
    expect(routeSource).toContain('hasWorkoutDateRequest');
    expect(routeSource).toContain('VALID_WORKOUT_DATE_REQUIRED');
    expect(routeSource).toContain('buildSelectedWorkoutDatePromptBlock');
    expect(routeSource).toContain('buildCoachProposalRouteContext');
    expect(routeSource).toMatch(/systemPrompt\s*\+=\s*buildSelectedWorkoutDatePromptBlock/);
    expect(routeSource).toMatch(/routeContext:\s*coachProposalRouteContext/);
  });


  it('forwards safe route source and intent into Coach proposal parsing', () => {
    expect(routeSource).toContain('parseOptionalRouteToken');
    expect(routeSource).toContain('routeContextIntent');
    expect(routeSource).toContain('intent: routeContextIntent');
    expect(routeSource).toContain('source: routeContextSource');
  });
  it('prints equipment profile IDs in enrichment blocks so selected IDs are actionable', () => {
    expect(serviceSource).toMatch(/SELECT\s+ep\.id,\s+ep\.name,\s+ep\."locationType",\s+ep\.description/);
    expect(serviceSource).toContain('`#${e.id} ${e.name}');
    expect(serviceSource).toContain('`  #${ep.id} ${ep.name}');
  });

  it('uses EquipmentItem model fields for general equipment enrichment', () => {
    expect(serviceSource).not.toContain('"isAvailable"');
    expect(serviceSource).toMatch(/equipment_items\s+ei[\s\S]*ei\."isActive"\s+=\s+true/);
    expect(serviceSource).toMatch(/equipment_items\s+ei[\s\S]*ei\."approvalStatus"\s+=\s+'approved'/);
    expect(serviceSource).toContain("'resistanceType', ei.\"resistanceType\"");
  });
});
