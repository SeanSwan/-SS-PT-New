import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = resolve(__dirname);
const pagePath = resolve(sourceRoot, './enhanced-admin-sessions-view.tsx');
const legacyBarrelPath = resolve(sourceRoot, './styled-admin-sessions.ts');
const shellStylesPath = resolve(sourceRoot, './AdminSessionsShell.styles.ts');
const statsStylesPath = resolve(sourceRoot, './AdminSessionsStats.styles.ts');
const filterStylesPath = resolve(sourceRoot, './AdminSessionsFilters.styles.ts');
const statusStylesPath = resolve(sourceRoot, './AdminSessionsStatus.styles.ts');
const dialogStylesPath = resolve(sourceRoot, './AdminSessionsDialog.styles.ts');
const tableBaseStylesPath = resolve(sourceRoot, './AdminSessionsTableBase.styles.ts');
const tableStylesPath = resolve(sourceRoot, './AdminSessionsTable.styles.ts');
const tableTokensPath = resolve(sourceRoot, './AdminSessionsTable.tokens.ts');
const calendarStylesPath = resolve(sourceRoot, './AdminSessionsCalendar.styles.ts');
const formStylesPath = resolve(sourceRoot, './AdminSessionsForm.styles.ts');
const formTokensPath = resolve(sourceRoot, './AdminSessionsForm.tokens.ts');
const viewModalPath = resolve(sourceRoot, './ViewSessionModal.tsx');
const viewModalStylesPath = resolve(sourceRoot, './ViewSessionModal.styles.ts');
const viewModalWorkoutStylesPath = resolve(sourceRoot, './ViewSessionModalWorkout.styles.ts');
const viewModalHelpersPath = resolve(sourceRoot, './ViewSessionModal.helpers.ts');
const viewModalTypesPath = resolve(sourceRoot, './ViewSessionModal.types.ts');
const sessionTestControlsPath = resolve(sourceRoot, './session-test-controls.tsx');
const sessionTestControlsStylesPath = resolve(sourceRoot, './SessionTestControls.styles.ts');
const sessionListLogicPath = resolve(sourceRoot, './AdminSessionsSessionList.logic.ts');
const mainCardPath = resolve(sourceRoot, './AdminSessionsMainCard.tsx');
const statsSummaryPath = resolve(sourceRoot, './AdminSessionsStatsSummary.tsx');
const filtersPanelPath = resolve(sourceRoot, './AdminSessionsFiltersPanel.tsx');
const tablePanelPath = resolve(sourceRoot, './AdminSessionsTablePanel.tsx');
const tableRowPath = resolve(sourceRoot, './AdminSessionsTableRow.tsx');
const trainerAssignmentSectionPath = resolve(sourceRoot, './TrainerAssignmentSection.tsx');
const trainerAssignmentCardPath = resolve(sourceRoot, './AdminSessionsTrainerAssignmentCard.tsx');
const dialogStackPath = resolve(sourceRoot, './AdminSessionsDialogStack.tsx');

const readSource = (path: string) => readFileSync(path, 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('Admin sessions local style extraction', () => {
  it('keeps the canonical admin sessions page focused on behavior instead of local styled declarations', () => {
    const source = readSource(pagePath);

    expect(source).toContain("from './AdminSessionsShell.styles'");
    expect(source).toContain("from './AdminSessionsMainCard'");
    expect(source).toContain("from './AdminSessionsTrainerAssignmentCard'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toContain('const BulkActionsBar = styled');
    expect(source).not.toContain('const CalendarViewWrapper = styled');
    expect(source).not.toContain('const FormGrid = styled');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps extracted admin session style modules below the project file cap', () => {
    const styleModules = [
      ['AdminSessionsShell.styles.ts', shellStylesPath],
      ['AdminSessionsStats.styles.ts', statsStylesPath],
      ['AdminSessionsFilters.styles.ts', filterStylesPath],
      ['AdminSessionsStatus.styles.ts', statusStylesPath],
      ['AdminSessionsDialog.styles.ts', dialogStylesPath],
      ['AdminSessionsTableBase.styles.ts', tableBaseStylesPath],
      ['AdminSessionsTable.styles.ts', tableStylesPath],
      ['AdminSessionsCalendar.styles.ts', calendarStylesPath],
      ['AdminSessionsForm.styles.ts', formStylesPath],
    ] as const;

    styleModules.forEach(([label, path]) => {
      expect(existsSync(path), `${label} should exist`).toBe(true);
    });

    const legacyBarrel = readSource(legacyBarrelPath);
    const tableStyles = readSource(tableStylesPath);
    const calendarStyles = readSource(calendarStylesPath);
    const formStyles = readSource(formStylesPath);

    expect(legacyBarrel).not.toMatch(/styled\./);
    expect(legacyBarrel).not.toContain('keyframes');
    expect(tableStyles).toContain('export const BulkActionsBar');
    expect(tableStyles).toContain('export {');
    expect(calendarStyles).toContain('export const CalendarViewWrapper');
    expect(formStyles).toContain('export const FormGrid');
    expect(formStyles).toContain('export const SessionSelectIcon');

    expect(lineCount(legacyBarrel)).toBeLessThanOrEqual(80);
    styleModules.forEach(([label, path]) => {
      expect(lineCount(readSource(path)), `${label} should stay focused`).toBeLessThanOrEqual(300);
    });
  });

  it('keeps active admin session table chrome on theme tokens', () => {
    const tableStyles = readSource(tableStylesPath);
    const tableBaseStyles = readSource(tableBaseStylesPath);
    const tableTokens = readSource(tableTokensPath);

    expect(tableStyles).toContain('tokens.BULK_ACTION_SURFACE');
    expect(tableStyles).toContain('tokens.FIELD_BORDER');
    expect(tableStyles).not.toContain('rgba(');
    expect(tableBaseStyles).not.toContain('rgba(');
    expect(tableTokens).not.toContain('rgba(');
  });

  it('keeps active admin session form chrome on theme tokens', () => {
    const formStyles = readSource(formStylesPath);
    const formTokens = readSource(formTokensPath);

    expect(formStyles).toContain('TEXT_SECONDARY');
    expect(formStyles).toContain('FIELD_SURFACE');
    expect(formStyles).toContain('FIELD_BORDER');
    expect(formStyles).toContain('FOCUS_BORDER');
    expect(formStyles).toContain('FOCUS_SHADOW');
    expect(formStyles).not.toContain('rgba(');
    expect(formTokens).not.toContain('rgba(');
  });

  it('keeps the view session modal behavior-only with extracted styles and helpers', () => {
    const source = readSource(viewModalPath);
    const pageSource = readSource(pagePath);
    const stackSource = readSource(dialogStackPath);

    expect(existsSync(viewModalStylesPath), 'ViewSessionModal.styles.ts should exist').toBe(true);
    expect(existsSync(viewModalWorkoutStylesPath), 'ViewSessionModalWorkout.styles.ts should exist').toBe(true);
    expect(existsSync(viewModalHelpersPath), 'ViewSessionModal.helpers.ts should exist').toBe(true);
    expect(existsSync(viewModalTypesPath), 'ViewSessionModal.types.ts should exist').toBe(true);
    expect(source).toContain("from './ViewSessionModal.styles'");
    expect(source).toContain("from './ViewSessionModalWorkout.styles'");
    expect(source).toContain("from './ViewSessionModal.helpers'");
    expect(source).toContain("from './ViewSessionModal.types'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toContain("from './styled-admin-sessions'");
    expect(source).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(stackSource).toContain("import ViewSessionModal from './ViewSessionModal'");
    expect(stackSource).toContain('<ViewSessionModal');
    expect(pageSource).not.toContain('{/* View Session Dialog */}');
    expect(pageSource).not.toContain('<span>Session Details</span>');
    expect(lineCount(source)).toBeLessThanOrEqual(300);
    expect(lineCount(readSource(viewModalStylesPath))).toBeLessThanOrEqual(300);
    expect(lineCount(readSource(viewModalWorkoutStylesPath))).toBeLessThanOrEqual(220);
    expect(lineCount(readSource(viewModalHelpersPath))).toBeLessThanOrEqual(120);
    expect(lineCount(readSource(viewModalTypesPath))).toBeLessThanOrEqual(120);
  });

  it('keeps development-only session test controls split and out of the production import path', () => {
    const pageSource = readSource(pagePath);
    const mainCardSource = readSource(mainCardPath);
    const controlsSource = readSource(sessionTestControlsPath);

    expect(existsSync(sessionTestControlsStylesPath), 'SessionTestControls.styles.ts should exist').toBe(true);
    expect(pageSource).not.toContain("import SessionTestControls from './session-test-controls'");
    expect(mainCardSource).toContain("import.meta.env.DEV ? React.lazy(() => import('./session-test-controls')) : null");
    expect(mainCardSource).toContain("SessionTestControls && viewMode === 'table'");
    expect(mainCardSource).toContain('<React.Suspense fallback={null}>');
    expect(controlsSource).toContain("from './SessionTestControls.styles'");
    expect(controlsSource).not.toContain("import styled from 'styled-components'");
    expect(controlsSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(controlsSource).toContain('createTestClient');
    expect(controlsSource).toContain('addSessionsToTestClient');
    expect(lineCount(controlsSource)).toBeLessThanOrEqual(300);
    expect(lineCount(readSource(sessionTestControlsStylesPath))).toBeLessThanOrEqual(300);
  });

  it('keeps admin session stats summary extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const mainCardSource = readSource(mainCardPath);
    const statsSource = readSource(statsSummaryPath);

    expect(existsSync(statsSummaryPath), 'AdminSessionsStatsSummary.tsx should exist').toBe(true);
    expect(mainCardSource).toContain("import AdminSessionsStatsSummary from './AdminSessionsStatsSummary'");
    expect(mainCardSource).toContain('<AdminSessionsStatsSummary');
    expect(pageSource).not.toContain('<StatsGridContainer>');
    expect(statsSource).toContain("from './AdminSessionsStats.styles'");
    expect(statsSource).toContain('Sessions Today');
    expect(statsSource).toContain('Completion Rate');
    expect(statsSource).not.toContain("import styled from 'styled-components'");
    expect(statsSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(statsSource)).toBeLessThanOrEqual(160);
  });

  it('keeps admin session filters extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const mainCardSource = readSource(mainCardPath);
    const filtersSource = readSource(filtersPanelPath);

    expect(existsSync(filtersPanelPath), 'AdminSessionsFiltersPanel.tsx should exist').toBe(true);
    expect(mainCardSource).toContain("import AdminSessionsFiltersPanel from './AdminSessionsFiltersPanel'");
    expect(mainCardSource).toContain('<AdminSessionsFiltersPanel');
    expect(pageSource).not.toContain('<FilterContainer');
    expect(pageSource).not.toContain('getStatusFilterLabel');
    expect(filtersSource).toContain("from './AdminSessionsFilters.styles'");
    expect(filtersSource).toContain("from './AdminSessionsForm.styles'");
    expect(filtersSource).toContain('Filter sessions by');
    expect(filtersSource).not.toContain("import styled from 'styled-components'");
    expect(filtersSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(filtersSource)).toBeLessThanOrEqual(180);
  });

  it('keeps admin session table row rendering extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const panelSource = readSource(tablePanelPath);
    const rowSource = readSource(tableRowPath);

    expect(existsSync(tableRowPath), 'AdminSessionsTableRow.tsx should exist').toBe(true);
    expect(panelSource).toContain("import AdminSessionsTableRow from './AdminSessionsTableRow'");
    expect(panelSource).toContain('<AdminSessionsTableRow');
    expect(pageSource).not.toContain('const clientSessionSignal = session.client ? getClientSessionSignal(session.client) : null;');
    expect(pageSource).not.toContain('<SessionCountChip');
    expect(rowSource).toContain('getClientSessionSignal');
    expect(rowSource).toContain('View Details');
    expect(rowSource).toContain('Edit Session');
    expect(rowSource).toContain('Delete Session');
    expect(rowSource).not.toContain("import styled from 'styled-components'");
    expect(rowSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(rowSource)).toBeLessThanOrEqual(220);
  });

  it('keeps admin session table panel rendering extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const mainCardSource = readSource(mainCardPath);
    const panelSource = readSource(tablePanelPath);

    expect(existsSync(tablePanelPath), 'AdminSessionsTablePanel.tsx should exist').toBe(true);
    expect(mainCardSource).toContain("import AdminSessionsTablePanel from './AdminSessionsTablePanel'");
    expect(mainCardSource).toContain('<AdminSessionsTablePanel');
    expect(pageSource).not.toContain('<BulkActionsBar');
    expect(pageSource).not.toContain('<NativeTable');
    expect(pageSource).not.toContain('<PaginationContainer');
    expect(pageSource).not.toContain('{/* Pagination for Table View */}');
    expect(panelSource).toContain("from './AdminSessionsTable.styles'");
    expect(panelSource).toContain("from './AdminSessionsTableRow'");
    expect(panelSource).toContain('adminSessionRowItems');
    expect(panelSource).toContain('Delete Selected');
    expect(panelSource).toContain('Schedule New Slot');
    expect(panelSource).not.toContain("import styled from 'styled-components'");
    expect(panelSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(panelSource)).toBeLessThanOrEqual(300);
  });

  it('keeps the admin sessions main card extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const mainCardSource = readSource(mainCardPath);

    expect(existsSync(mainCardPath), 'AdminSessionsMainCard.tsx should exist').toBe(true);
    expect(pageSource).toContain("import AdminSessionsMainCard from './AdminSessionsMainCard'");
    expect(pageSource).toContain('<AdminSessionsMainCard');
    expect(pageSource).not.toContain('Training Sessions Management');
    expect(pageSource).not.toContain('<AdminSessionsStatsSummary');
    expect(pageSource).not.toContain('<AdminSessionsFiltersPanel');
    expect(pageSource).not.toContain('<AdminSessionsTablePanel');
    expect(pageSource).not.toContain('<UnifiedCalendar');
    expect(mainCardSource).toContain('Training Sessions Management');
    expect(mainCardSource).toContain("from './AdminSessionsStatsSummary'");
    expect(mainCardSource).toContain("from './AdminSessionsFiltersPanel'");
    expect(mainCardSource).toContain("from './AdminSessionsTablePanel'");
    expect(mainCardSource).toContain("from '../../../Schedule/schedule'");
    expect(mainCardSource).not.toContain("import styled from 'styled-components'");
    expect(mainCardSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(mainCardSource)).toBeLessThanOrEqual(300);
  });

  it('keeps admin session list derivation and CSV export in tested logic helpers', () => {
    const pageSource = readSource(pagePath);
    const logicSource = readSource(sessionListLogicPath);

    expect(existsSync(sessionListLogicPath), 'AdminSessionsSessionList.logic.ts should exist').toBe(true);
    expect(pageSource).toContain("from './AdminSessionsSessionList.logic'");
    expect(pageSource).not.toContain('const filteredSessions = sessions.filter');
    expect(pageSource).not.toContain('sortableItems.sort');
    expect(pageSource).not.toContain("const headers = ['Session ID'");
    expect(logicSource).toContain('filterAdminSessions');
    expect(logicSource).toContain('sortAdminSessions');
    expect(logicSource).toContain('calculateAdminSessionStats');
    expect(logicSource).toContain('buildAdminSessionsCsv');
    expect(lineCount(logicSource)).toBeLessThanOrEqual(240);
  });

  it('keeps trainer assignment behavior extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const assignmentSource = readSource(trainerAssignmentSectionPath);
    const assignmentCardSource = readSource(trainerAssignmentCardPath);

    expect(existsSync(trainerAssignmentSectionPath), 'TrainerAssignmentSection.tsx should exist').toBe(true);
    expect(existsSync(trainerAssignmentCardPath), 'AdminSessionsTrainerAssignmentCard.tsx should exist').toBe(true);
    expect(pageSource).toContain("import AdminSessionsTrainerAssignmentCard from './AdminSessionsTrainerAssignmentCard'");
    expect(pageSource).toContain('<AdminSessionsTrainerAssignmentCard');
    expect(pageSource).not.toContain("import TrainerAssignmentSection from './TrainerAssignmentSection'");
    expect(pageSource).not.toContain('<TrainerAssignmentSection');
    expect(assignmentCardSource).toContain("import TrainerAssignmentSection from './TrainerAssignmentSection'");
    expect(assignmentCardSource).toContain('<TrainerAssignmentSection');
    expect(pageSource).not.toContain('const TrainerAssignmentSection: React.FC');
    expect(pageSource).not.toContain('interface TrainerAssignmentSectionProps');
    expect(pageSource).not.toContain('Assignment Quick Actions');
    expect(pageSource).not.toContain('Bulk Selection Dialog');
    expect(assignmentSource).toContain('assignTrainerToClient');
    expect(assignmentSource).toContain('removeTrainerAssignment');
    expect(assignmentSource).toContain('getClientSessionSignal');
    expect(assignmentSource).not.toContain("import styled from 'styled-components'");
    expect(assignmentSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(assignmentSource)).toBeLessThanOrEqual(300);
  });

});
