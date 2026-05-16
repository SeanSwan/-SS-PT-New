# Future Features — Archived for AI Village Review

These files contain **unique features that were built but not yet wired into any route or live import chain**. They are NOT duplicates — they represent ideas and half-built features that should be reviewed by the AI Village before being integrated or discarded.

**Archived:** 2026-04-06 during dead file cleanup
**Build-verified:** These files are confirmed NOT imported anywhere — removing them did not break the build.

---

## Reports (PDF/Analytics) — 14 files

A comprehensive reporting and PDF generation suite that was never wired into admin dashboard routes.

| File | Purpose |
|------|---------|
| `ChartComponents.tsx` | Reusable chart components for reports |
| `ClientInformationPanel.tsx` | Client info display panel for reports |
| `DataVisualizationPanel.tsx` | Data visualization panel |
| `DeliveryOptionsPanel.tsx` | Report delivery/export options |
| `DetailedReportPage.tsx` | Full detailed report page |
| `EnhancedPDFGenerator.tsx` | PDF report generation engine |
| `GraphsPage.tsx` | Graphs/charts page for reports |
| `HeaderCustomization.tsx` | Report header customization |
| `MetricsVisualizationPanel.tsx` | Metrics visualization |
| `PropertyInfoPanel.tsx` | Property/metadata info panel |
| `ReportAnalyticsDashboard.tsx` | Analytics dashboard for reports |
| `ReportExport.tsx` | Report export functionality |
| `ReportsIntegration.tsx` | Integration wrapper for report system |
| `ThemeBuilder.tsx` | Theme builder for report styling |

**Status:** Complete reporting suite. Could be valuable for admin client progress reports, PDF exports for trainers, and analytics dashboards.

---

## How to Use This Archive

1. **AI Village scan:** Run validation on these files to identify which features are worth finishing
2. **Cherry-pick:** Pull individual files back into the main source when ready to implement
3. **Reference:** Use as inspiration/code reference when building similar features
4. **Clean up:** After AI Village review, delete files that are truly not needed

## Note on Other "Future" Features

Many components that appeared dead (Celebrations, FoodTracker, Charts, Messaging, etc.) turned out to be lazily imported through route files and deep dependency chains. They remain in their original locations because removing them breaks the build. They are not yet fully implemented but ARE reachable at runtime through admin routes.
