import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const coachPath = (...parts: string[]) => join(process.cwd(), 'src/components/DashBoard/Pages/coach-assistant', ...parts);

const workspaceStyles = readFileSync(coachPath('CoachIntakeWorkspace.styles.ts'), 'utf8');
const queueStyles = readFileSync(coachPath('CoachIntakeWorkspaceQueue.styles.ts'), 'utf8');
const healthStyles = readFileSync(coachPath('CoachIntakeHealthStrip.styles.ts'), 'utf8');
const targetStyles = readFileSync(coachPath('CoachIntakeWorkspaceTarget.styles.ts'), 'utf8');
const queueTabs = readFileSync(coachPath('CoachIntakeQueueScopeTabs.tsx'), 'utf8');
const workspace = readFileSync(coachPath('CoachIntakeWorkspace.tsx'), 'utf8');

describe('Coach intake responsive contract', () => {
  it('keeps dense intake controls wrapping instead of overlapping at phone widths', () => {
    expect(workspaceStyles).toMatch(/ActionRow[\s\S]*display:\s*grid/);
    expect(workspaceStyles).toMatch(/ActionRow[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*170px\),\s*1fr\)\)/);
    expect(workspaceStyles).toMatch(/>\s*:first-child\s*{\s*grid-column:\s*1\s*\/\s*-1/);
    expect(workspaceStyles).toMatch(/>\s*\*\s*{\s*min-width:\s*0/);
    expect(workspaceStyles).toMatch(/FirstMovePanel[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(220px,\s*0\.64fr\)/);
    expect(workspaceStyles).toMatch(/FirstMovePanel[\s\S]*@media \(max-width:\s*640px\)[\s\S]*grid-template-columns:\s*1fr/);
    expect(workspaceStyles).toMatch(/FirstMoveActions[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(workspaceStyles).toMatch(/FirstMoveActions[\s\S]*@media \(max-width:\s*520px\)[\s\S]*grid-template-columns:\s*1fr/);
    expect(workspaceStyles).toMatch(/white-space:\s*normal/);
    expect(queueStyles).toMatch(/grid-column:\s*1\s*\/\s*-1/);
    expect(queueStyles).toMatch(/repeat\(auto-fit,\s*minmax\(min\(100%,\s*124px\),\s*1fr\)\)/);
    expect(queueStyles).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(190px,\s*0\.82fr\)/);
    expect(queueStyles).toMatch(/@media \(max-width:\s*860px\)[\s\S]*grid-template-columns:\s*1fr/);
    expect(queueStyles).toMatch(/overflow-wrap:\s*anywhere/);

    expect(healthStyles).toMatch(/repeat\(auto-fit,\s*minmax\(min\(100%,\s*220px\),\s*1fr\)\)/);
    expect(healthStyles).toMatch(/overflow-wrap:\s*anywhere/);
    expect(healthStyles).toMatch(/white-space:\s*normal/);

    expect(targetStyles).toMatch(/>\s*\*\s*{\s*flex:\s*1\s+1\s+160px/);
    expect(targetStyles).toMatch(/width:\s*100%/);
    expect(targetStyles).toMatch(/TargetNotice[\s\S]*white-space:\s*normal/);

    expect(queueTabs).toMatch(/PrimaryTabs[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(queueTabs).toMatch(/MoreFiltersButton[\s\S]*min-height:\s*44px/);
    expect(queueTabs).toMatch(/SecondaryTabs[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(queueTabs).toMatch(/@media \(max-width:\s*380px\)[\s\S]*grid-template-columns:\s*1fr/);
  });

  it('keeps the work queue before summary stats in the teachable flow', () => {
    const queueIndex = workspace.indexOf('<ItemList aria-label="Coach intake work queue"');
    const summaryIndex = workspace.indexOf('<CoachIntakeSummaryStats summary={summary} />');

    expect(queueIndex).toBeGreaterThan(-1);
    expect(summaryIndex).toBeGreaterThan(-1);
    expect(queueIndex).toBeLessThan(summaryIndex);
  });

  it('adds a quick snapshot before the teach guide and work queue', () => {
    const snapshotIndex = workspace.indexOf('<CoachIntakeSummaryStats summary={summary} label="Coach intake quick snapshot" />');
    const teachIndex = workspace.indexOf('<CoachIntakeTeachMe onCommandPrompt={onCommandPrompt} />');
    const queueIndex = workspace.indexOf('<ItemList aria-label="Coach intake work queue"');

    expect(snapshotIndex).toBeGreaterThan(-1);
    expect(teachIndex).toBeGreaterThan(-1);
    expect(queueIndex).toBeGreaterThan(-1);
    expect(snapshotIndex).toBeLessThan(teachIndex);
    expect(snapshotIndex).toBeLessThan(queueIndex);
  });

  it('puts the Hive Mind intake guide before the active dossier and queue', () => {
    const teachIndex = workspace.indexOf('<CoachIntakeTeachMe onCommandPrompt={onCommandPrompt} />');
    const activeTargetIndex = workspace.indexOf('<CoachIntakeWorkspaceActiveTarget');
    const queueIndex = workspace.indexOf('<ItemList aria-label="Coach intake work queue"');

    expect(teachIndex).toBeGreaterThan(-1);
    expect(activeTargetIndex).toBeGreaterThan(-1);
    expect(queueIndex).toBeGreaterThan(-1);
    expect(teachIndex).toBeLessThan(activeTargetIndex);
    expect(teachIndex).toBeLessThan(queueIndex);
  });
});
