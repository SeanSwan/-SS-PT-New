# Unmounted Admin Demo Panels Archive

Archived during the 2026-05-15 cleanup pass.

## Why These Files Moved

These admin panels were not mounted in the verified admin route tree and contained placeholder, mock, or demo fallback data that could mislead future AI work into treating them as production surfaces.

## Files

- `AdminSettingsPanel.tsx`
- `BusinessIntelligenceDashboard.tsx`
- `BusinessIntelligence/`
- `ContentModerationPanel.tsx`
- `DemoDataBanner.tsx`
- `NASMCompliancePanel.tsx`
- `NotificationSettingsList.tsx`
- `NotificationTester.tsx`
- `orientation-dashboard-view.tsx`
- `PerformanceReportsPanel.tsx`
- `SecurityMonitoringPanel.tsx`
- `SocialClientDashboard.tsx`
- `SocialMediaCommand/`
- `SystemHealthPanel.tsx`
- `UserAnalyticsPanel.tsx`

## Restore Rule

Restore only after a route receipt proves the panel is needed and after replacing mock/demo data with real, empty, loading, and error states.
