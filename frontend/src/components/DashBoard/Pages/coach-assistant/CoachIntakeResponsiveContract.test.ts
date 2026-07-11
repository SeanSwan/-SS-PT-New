import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const coachPath = (...parts: string[]) => join(process.cwd(), 'src/components/DashBoard/Pages/coach-assistant', ...parts);

const workspaceStyles = readFileSync(coachPath('CoachIntakeWorkspace.styles.ts'), 'utf8');
const bridgeMobileDockStyles = readFileSync(coachPath('CoachCommandCenter.bridgeMobileDockStyles.ts'), 'utf8');
const pageSource = readFileSync(coachPath('CoachCommandCenterPage.tsx'), 'utf8');
const plaudAudioPreview = readFileSync(join(process.cwd(), 'src/components/PlaudClipMerge/PlaudClipAudioPreview.tsx'), 'utf8');
const headerStyles = readFileSync(coachPath('CoachIntakeWorkspaceHeader.styles.ts'), 'utf8');
const queueStyles = readFileSync(coachPath('CoachIntakeWorkspaceQueue.styles.ts'), 'utf8');
const healthStyles = readFileSync(coachPath('CoachIntakeHealthStrip.styles.ts'), 'utf8');
const targetStyles = readFileSync(coachPath('CoachIntakeWorkspaceTarget.styles.ts'), 'utf8');
const reviewPathStyles = readFileSync(coachPath('CoachIntakeReviewPath.styles.ts'), 'utf8');
const queueTabs = readFileSync(coachPath('CoachIntakeQueueScopeTabs.tsx'), 'utf8');
const workspace = readFileSync(coachPath('CoachIntakeWorkspace.tsx'), 'utf8');

describe('Coach intake responsive contract', () => {
  it('keeps dense intake controls wrapping instead of overlapping at phone widths', () => {
    expect(headerStyles).toMatch(/ActionRow[\s\S]*display:\s*grid/);
    expect(headerStyles).toMatch(/ActionRow[\s\S]*width:\s*min\(100%,\s*720px\)/);
    expect(headerStyles).toMatch(/>\s*\*\s*{\s*min-width:\s*0/);
    expect(headerStyles).toMatch(/Header[\s\S]*@media \(max-width:\s*1080px\)[\s\S]*flex-direction:\s*column/);
    expect(headerStyles).toMatch(/ActionRow[\s\S]*@media \(max-width:\s*1080px\)[\s\S]*width:\s*100%/);
    expect(headerStyles).toMatch(/FirstMovePanel[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(220px,\s*0\.64fr\)/);
    expect(headerStyles).toMatch(/FirstMovePanel[\s\S]*@media \(max-width:\s*640px\)[\s\S]*grid-template-columns:\s*1fr/);
    expect(headerStyles).toMatch(/FirstMoveActions[\s\S]*grid-template-columns:\s*1fr/);
    expect(headerStyles).toMatch(/FirstMoveActions[\s\S]*@media \(max-width:\s*520px\)[\s\S]*grid-template-columns:\s*1fr/);
    expect(headerStyles).toMatch(/SecondaryActionGroup[\s\S]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*150px\),\s*1fr\)\)/);
    expect(headerStyles).toMatch(/SecondaryActionGroup[\s\S]*@media \(max-width:\s*520px\)[\s\S]*grid-template-columns:\s*1fr/);
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
    expect(reviewPathStyles).toMatch(/ReviewPathGrid[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
    expect(reviewPathStyles).toMatch(/@media \(max-width:\s*900px\)[\s\S]*grid-template-columns:\s*1fr/);
    expect(reviewPathStyles).toMatch(/overflow-wrap:\s*anywhere/);

    expect(queueTabs).toMatch(/PrimaryTabs[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(queueTabs).toMatch(/MoreFiltersButton[\s\S]*min-height:\s*44px/);
    expect(queueTabs).toMatch(/SecondaryTabs[\s\S]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(queueTabs).toMatch(/@media \(max-width:\s*380px\)[\s\S]*grid-template-columns:\s*1fr/);
  });

  it('keeps mobile intake playback controls scrollable away from fixed app chrome', () => {
    // The talk-first shell renamed the tab id 'chat' → 'talk'; the CSS class
    // contract (is-chat-tab / is-workspace-tab) is unchanged.
    expect(pageSource).toContain("activeTab === 'talk' ? 'is-chat-tab' : 'is-workspace-tab'");
    expect(bridgeMobileDockStyles).toMatch(/\.bridge-shell\.is-chat-tab[\s\S]*height:\s*max\(480px,\s*calc\(100dvh - 200px - env\(safe-area-inset-bottom\)\)\)/);
    expect(bridgeMobileDockStyles).toMatch(/\.bridge-shell\.is-workspace-tab[\s\S]*height:\s*auto/);
    expect(bridgeMobileDockStyles).toMatch(/\.bridge-shell\.is-workspace-tab \.tab-content[\s\S]*flex:\s*0\s+0\s+auto/);
    expect(bridgeMobileDockStyles).toMatch(/\.bridge-shell\.is-workspace-tab \.tab-scroll[\s\S]*overflow:\s*visible/);
    expect(bridgeMobileDockStyles).toMatch(/\.tab-scroll[\s\S]*padding-bottom:\s*max\(96px,\s*calc\(env\(safe-area-inset-bottom\) \+ 96px\)\)/);
    expect(bridgeMobileDockStyles).toMatch(/\.tab-scroll[\s\S]*scroll-padding-top:\s*96px/);
    expect(bridgeMobileDockStyles).toMatch(/\.tab-scroll[\s\S]*scroll-padding-bottom:\s*max\(120px,\s*var\(--mobile-dock-space,\s*160px\)\)/);
    expect(workspaceStyles).toMatch(/Panel[\s\S]*scroll-padding-top:\s*132px/);
    expect(workspaceStyles).toMatch(/Panel[\s\S]*scroll-padding-bottom:\s*max\(132px,\s*var\(--mobile-dock-space,\s*160px\)\)/);
    expect(targetStyles).toMatch(/scroll-margin-block:\s*132px\s+max\(132px,\s*var\(--mobile-dock-space,\s*160px\)\)/);
    expect(plaudAudioPreview).toMatch(/const LoadButton[\s\S]*scroll-margin-top:\s*132px/);
    expect(plaudAudioPreview).toMatch(/const LoadButton[\s\S]*scroll-margin-bottom:\s*max\(132px,\s*var\(--mobile-dock-space,\s*160px\)\)/);
  });

  it('keeps the work queue as the only post-snapshot triage rail', () => {
    const queueIndex = workspace.indexOf('<ItemList aria-label="Coach intake work queue"');

    expect(queueIndex).toBeGreaterThan(-1);
    expect(workspace).not.toMatch(/<Grid>/);
    expect(workspace).not.toMatch(/<CoachIntakeSummaryStats summary={summary} \/>/);
  });

  it('keeps the quick snapshot before the work queue without hard-mounting Teach Me', () => {
    const snapshotIndex = workspace.indexOf('<CoachIntakeSummaryStats summary={summary} label="Coach intake quick snapshot" />');
    const queueIndex = workspace.indexOf('<ItemList aria-label="Coach intake work queue"');

    expect(snapshotIndex).toBeGreaterThan(-1);
    expect(queueIndex).toBeGreaterThan(-1);
    expect(workspace).not.toContain('<CoachIntakeTeachMe />');
    expect(workspace).not.toContain("from './CoachIntakeTeachMe'");
    expect(snapshotIndex).toBeLessThan(queueIndex);
  });

  it('puts the automatically staged dossier before the work queue and health strip', () => {
    const activeTargetIndex = workspace.indexOf('<CoachIntakeWorkspaceActiveTarget');
    const healthIndex = workspace.indexOf('<CoachIntakeHealthStrip');
    const queueIndex = workspace.indexOf('<ItemList aria-label="Coach intake work queue"');

    expect(activeTargetIndex).toBeGreaterThan(-1);
    expect(healthIndex).toBeGreaterThan(-1);
    expect(queueIndex).toBeGreaterThan(-1);
    expect(activeTargetIndex).toBeLessThan(healthIndex);
    expect(activeTargetIndex).toBeLessThan(queueIndex);
  });
});
