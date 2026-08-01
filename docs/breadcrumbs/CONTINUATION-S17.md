# S17/S18 SHIPPED — chain closed through S18 (Fable, 2026-07-31)

Pushed to main `dce965656..a2f673f83`: S2-S5 + S13-S18. All PLANNER_IA_V2 work is DARK (flag off).
S17 `9eafd0af6` (mobile tabs, Rolodex sheet, SaveBar via resolveSaveBar, PlannerSkeleton/Empty/Error).
S18 `a2f673f83` (Rolodex V2: filters sheet, 150ms debounced search-first, Plan tab, 5s add-Undo).

Open items for the flag-flip QA pass (recorded, not silently cut):
- Live axe run + S13 Playwright snapshot re-run at 375/1280 with PLANNER_IA_V2 on AND off.
- Rolodex deferrals: row media previews, NASM movement-pattern facet, pain-excluded-with-reason
  (needs Cortex exclusions surfaced into the rolodex feed — backend slice).
- SaveBar unavailable items: Save as template (S24), Assign/Schedule (schedule link-up), Discard.

Next JARVIS slices: FINISHER S6-S10 (voice pipeline), S12, S19 (lens registry) — Fable/Opus lane.
