import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-exercises/hooks/useExerciseStats.ts'),
  'utf8'
);

describe('useExerciseStats data truth contract', () => {
  it('derives active exercise analytics from authenticated exercise API data instead of mock delays', () => {
    expect(SOURCE).not.toContain('TODO: Replace with actual API calls');
    expect(SOURCE).not.toContain('TODO: Replace with actual API call');
    expect(SOURCE).not.toContain('Simulate API delay');
    expect(SOURCE).not.toContain('Use mock data for now');
    expect(SOURCE).not.toContain('Mock analytics data');
    expect(SOURCE).not.toContain('MOCK_EXERCISE_STATS');
    expect(SOURCE).not.toContain('MOCK_RECENT_ACTIVITY');
    expect(SOURCE).not.toContain('MOCK_TRENDING_EXERCISES');
    expect(SOURCE).not.toContain('MOCK_PERFORMANCE_METRICS');
    expect(SOURCE).toContain('const { user, authAxios } = useAuth();');
    expect(SOURCE).toContain("authAxios.get('/api/exercises/all')");
    expect(SOURCE).toContain('buildExerciseStatsFromLibrary');
    expect(SOURCE).toContain('buildExerciseAnalyticsFromRecord');
    expect(SOURCE).toContain('authAxios.get(`/api/exercises/${exerciseId}`)');
  });

  it('exports PDF with jsPDF instead of downgrading to JSON', () => {
    expect(SOURCE).not.toContain("For PDF, we'd need a PDF generation library");
    expect(SOURCE).not.toContain('For now, just export as JSON');
    expect(SOURCE).toContain("await import('jspdf')");
    expect(SOURCE).toContain("await import('jspdf-autotable')");
    expect(SOURCE).toContain('autoTable(doc');
    expect(SOURCE).toContain("doc.save(`exercise-stats-${new Date().toISOString().split('T')[0]}.pdf`)");
  });
});
