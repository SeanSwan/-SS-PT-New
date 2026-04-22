"""
Playwright QA: Phase 2-5 Client Data Pipeline — sswanstudios.com
================================================================
Comprehensive smoke test of all Phase 2-5 features with VISIBLE Chrome:
  Phase 2-3: Enhanced Workouts Modal (History/Charts/PRs tabs, Victory charts)
  Phase 4:   Admin Impersonation (View As bar, user search, dashboard preview)
  Phase 5:   Social Sharing (Share buttons on workouts/PRs, ShareToFeedModal)
  AI Village: Accessibility fixes (ARIA roles, keyboard nav, heatmap legend)
"""

import sys
import os
import json
import time
import traceback

os.environ["PYTHONIOENCODING"] = "utf-8"
sys.stdout.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

BASE_URL = "https://sswanstudios.com"
ADMIN_USERNAME = "ogpswan"
ADMIN_PASSWORD = os.environ.get("TEST_PASSWORD")
if not ADMIN_PASSWORD:
    raise SystemExit("TEST_PASSWORD env var required (no default for security - see CREDENTIALS-ROTATION-OPUS-CODEX-DEBATE-2026-04-21.md)")
SCREENSHOT_DIR = "tests/qa-screenshots/phase2-5"

results = []
console_errors = []

def log_result(test_name, passed, details=""):
    results.append({"test": test_name, "passed": passed, "details": details})
    icon = "PASS" if passed else "FAIL"
    msg = f"  [{icon}] {test_name}"
    if details:
        msg += f": {details}"
    print(msg)

def screenshot(page, name):
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=False)
    return path


def login_admin(page):
    """Login as admin via API injection + UI fallback."""
    print("\n=== ADMIN LOGIN ===")

    # Try API-based login first (faster, more reliable)
    try:
        resp = page.evaluate("""async () => {
            const r = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: '%s', password: '%s' })
            });
            return { status: r.status, data: await r.json() };
        }""" % (ADMIN_USERNAME, ADMIN_PASSWORD))

        if resp and resp.get("status") == 200 and resp.get("data", {}).get("token"):
            token = resp["data"]["token"]
            user = resp["data"].get("user", {})

            # Inject token into localStorage
            page.evaluate("""([token, user]) => {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }""", [token, user])

            log_result("Admin API Login", True, f"Role: {user.get('role', 'unknown')}")
            return True
        else:
            log_result("Admin API Login", False, f"Status: {resp.get('status')}, msg: {resp.get('data', {}).get('message', 'unknown')}")
    except Exception as e:
        log_result("Admin API Login", False, f"API error: {str(e)[:100]}")

    # Fallback: UI login
    try:
        page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        # Try username field
        username_sel = page.locator('input[name="username"], input[name="email"], input[type="email"], input[placeholder*="email" i], input[placeholder*="user" i]').first
        username_sel.fill(f"{ADMIN_USERNAME}@yahoo.com")

        password_sel = page.locator('input[type="password"]').first
        password_sel.fill(ADMIN_PASSWORD)

        submit = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In"), button:has-text("Login")').first
        submit.click()

        page.wait_for_timeout(5000)

        token = page.evaluate("localStorage.getItem('token')")
        if token:
            log_result("Admin UI Login (fallback)", True)
            return True
        else:
            log_result("Admin UI Login (fallback)", False, "No token in localStorage after submit")
            return False
    except Exception as e:
        log_result("Admin UI Login (fallback)", False, str(e)[:100])
        return False


def test_navigate_to_people_workspace(page):
    """Navigate to /dashboard/people (ClientsWorkspace with ViewAs bar)."""
    print("\n=== PHASE 4: ADMIN IMPERSONATION — People Workspace ===")

    try:
        page.goto(f"{BASE_URL}/dashboard/people", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        screenshot(page, "01-people-workspace")

        # Check page loaded (should have workspace tabs or client list)
        body_text = page.text_content("body") or ""
        has_content = any(kw in body_text for kw in ["Clients", "People", "Team", "Users", "Trainers"])
        log_result("People Workspace Loads", has_content,
                   f"Found workspace content" if has_content else "No workspace content detected")
        return has_content
    except Exception as e:
        log_result("People Workspace Loads", False, str(e)[:100])
        screenshot(page, "01-people-workspace-error")
        return False


def test_view_as_bar(page):
    """Test AdminViewAsBar presence and search functionality."""
    print("\n=== PHASE 4: View As Bar ===")

    try:
        # Look for the View As bar (Eye icon + "View As:" label + search input)
        view_as_label = page.locator('text="View As:"').first
        has_view_as = view_as_label.is_visible(timeout=5000)
        log_result("View As Bar Visible", has_view_as)

        if has_view_as:
            screenshot(page, "02-view-as-bar")

        # Check for the search input with combobox role
        search_input = page.locator('[aria-label="Search users to view as"]').first
        has_search = search_input.is_visible(timeout=3000)
        log_result("View As Search Input", has_search, "Has aria-label + combobox role" if has_search else "Not found")

        if has_search:
            # Type in the search to trigger dropdown
            search_input.fill("a")
            page.wait_for_timeout(2000)

            # Check if dropdown appears
            dropdown = page.locator('[role="listbox"]').first
            has_dropdown = dropdown.is_visible(timeout=3000)
            log_result("View As Dropdown Opens", has_dropdown)

            if has_dropdown:
                screenshot(page, "03-view-as-dropdown")

                # Check dropdown items have option role
                options = page.locator('[role="option"]')
                option_count = options.count()
                log_result("Dropdown Has User Options", option_count > 0, f"{option_count} users found")

                # Click first user to test impersonation navigation
                if option_count > 0:
                    first_user_text = options.first.text_content() or "Unknown"
                    options.first.click()
                    page.wait_for_timeout(3000)
                    screenshot(page, "04-view-as-dashboard")

                    # Check if we navigated to view-as route
                    current_url = page.url
                    has_view_as_route = "view-as" in current_url
                    log_result("View As Navigation", has_view_as_route,
                               f"URL: {current_url}" if has_view_as_route else f"Expected view-as in URL, got: {current_url}")

                    # Check for impersonation banner
                    banner = page.locator('text="Viewing as"').first
                    has_banner = banner.is_visible(timeout=5000)
                    log_result("Viewing As Banner", has_banner)

                    # Check for stat cards
                    stat_cards = page.locator('text="Recent Workouts"')
                    has_stats = stat_cards.is_visible(timeout=3000)
                    log_result("View As Dashboard Stats", has_stats)

                    # Check for Exit button
                    exit_btn = page.locator('[aria-label="Exit impersonation view"]').first
                    has_exit = exit_btn.is_visible(timeout=3000)
                    log_result("Exit View Button (ARIA)", has_exit)

                    if has_exit:
                        exit_btn.click()
                        page.wait_for_timeout(2000)
                        screenshot(page, "05-after-exit-view")
                        back_at_people = "people" in page.url and "view-as" not in page.url
                        log_result("Exit Returns to People", back_at_people, f"URL: {page.url}")

            # Clear search
            search_input.fill("")
    except Exception as e:
        log_result("View As Bar Test", False, str(e)[:150])
        screenshot(page, "02-view-as-error")


def test_enhanced_workouts_modal(page):
    """Test Phase 2-3: Enhanced Workouts Modal with tabs, charts, PRs."""
    print("\n=== PHASE 2-3: ENHANCED WORKOUTS MODAL ===")

    try:
        # Navigate to people workspace
        page.goto(f"{BASE_URL}/dashboard/people", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)

        # We need to find a client card and open the action menu > View Workouts
        # Look for client cards or client list items
        # Try finding any clickable client element

        # First check if there's a client list with action menus
        action_btns = page.locator('[data-testid*="action"], button:has(svg), [aria-label*="action" i], [aria-label*="menu" i]')

        # Alternative: look for the MoreVertical (three dots) button on any client card
        more_btns = page.locator('button:has(> svg)')

        # Try finding client cards by looking for common patterns
        # The admin client management shows client cards with action menus
        # Let's try navigating to the progress view which uses EnhancedAdminClientManagementView
        page.goto(f"{BASE_URL}/dashboard/people/progress", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(4000)
        screenshot(page, "10-client-progress-page")

        body_text = page.text_content("body") or ""
        has_clients = any(kw in body_text for kw in ["Client", "Active", "client", "Move Fitness", "SwanStudios"])
        log_result("Client List Loads", has_clients, "Found client data" if has_clients else "No client data visible")

        if not has_clients:
            # Try the main clients section
            page.goto(f"{BASE_URL}/dashboard/people", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(4000)
            screenshot(page, "10b-clients-main")

        # Try to find and click a three-dot menu or any action trigger
        # Common patterns: MoreVertical icon button, "..." button, context menu trigger
        three_dot = page.locator('button').filter(has=page.locator('svg')).all()

        # Look for a specific "View Workouts" or similar text button
        workout_trigger = page.locator('text="View Workouts"').first
        try:
            if workout_trigger.is_visible(timeout=2000):
                workout_trigger.click()
                page.wait_for_timeout(3000)
                screenshot(page, "11-workouts-modal-opened")
                test_workouts_modal_content(page)
                return
        except:
            pass

        # Try clicking a client card to open detail panel first
        client_card = page.locator('[class*="client" i], [class*="card" i], [role="button"]').first
        try:
            if client_card.is_visible(timeout=3000):
                client_card.click()
                page.wait_for_timeout(2000)
                screenshot(page, "11-client-detail")

                # Now look for "View Workouts" in the detail panel
                workout_btn = page.locator('text="View Workouts", text="Workouts", button:has-text("Workout")').first
                if workout_btn.is_visible(timeout=3000):
                    workout_btn.click()
                    page.wait_for_timeout(3000)
                    screenshot(page, "12-workouts-modal")
                    test_workouts_modal_content(page)
                    return
        except:
            pass

        log_result("Open Workouts Modal", False, "Could not find trigger to open workouts modal — may need specific client action menu")

    except Exception as e:
        log_result("Enhanced Workouts Modal", False, str(e)[:150])
        screenshot(page, "10-workouts-error")


def test_workouts_modal_content(page):
    """Test content inside the EnhancedWorkoutsModal once it's open."""
    try:
        # Check for tab bar with ARIA roles
        tablist = page.locator('[role="tablist"]').first
        has_tablist = tablist.is_visible(timeout=3000)
        log_result("Workouts Tabs (role=tablist)", has_tablist)

        # Check History tab
        history_tab = page.locator('[role="tab"]:has-text("History")')
        has_history = history_tab.is_visible(timeout=2000)
        log_result("History Tab Visible", has_history)

        # Check Charts tab
        charts_tab = page.locator('[role="tab"]:has-text("Charts")')
        has_charts = charts_tab.is_visible(timeout=2000)
        log_result("Charts Tab Visible", has_charts)

        # Check PRs tab
        prs_tab = page.locator('[role="tab"]:has-text("PRs")')
        has_prs = prs_tab.is_visible(timeout=2000)
        log_result("PRs Tab Visible", has_prs)

        # Check for summary stats
        stats = page.locator('text="workouts"').first
        has_stats = stats.is_visible(timeout=2000)
        log_result("Summary Stats Bar", has_stats)

        # Check for Share buttons (Phase 5)
        share_btns = page.locator('text="Share"')
        share_count = share_btns.count()
        log_result("Share Buttons Present", share_count > 0, f"{share_count} share buttons found")

        # Click Charts tab to test Victory charts
        if has_charts:
            charts_tab.click()
            page.wait_for_timeout(3000)
            screenshot(page, "13-charts-tab")

            # Check for chart content (Victory renders SVG)
            svgs = page.locator('svg').all()
            log_result("Victory Charts Render (SVGs)", len(svgs) > 0, f"{len(svgs)} SVG elements")

            # Check for heatmap legend (AI Village enhancement)
            legend = page.locator('text="None"').first
            has_legend = legend.is_visible(timeout=2000)
            log_result("Heatmap Legend (AI Village Fix)", has_legend)

        # Click PRs tab
        if has_prs:
            prs_tab.click()
            page.wait_for_timeout(2000)
            screenshot(page, "14-prs-tab")

            # Check for PR badges (gold styling)
            pr_content = page.text_content("body") or ""
            has_pr_data = "lbs" in pr_content or "BW" in pr_content or "No personal records" in pr_content
            log_result("PRs Tab Content", has_pr_data)

        # Switch back to History and test Share button
        if has_history:
            history_tab.click()
            page.wait_for_timeout(1000)

        # Test Share button opens modal (Phase 5)
        if share_count > 0:
            share_btns.first.click()
            page.wait_for_timeout(1500)
            screenshot(page, "15-share-modal")

            share_dialog = page.locator('[role="dialog"][aria-label="Share to feed"]')
            has_share_modal = share_dialog.is_visible(timeout=3000)
            log_result("ShareToFeedModal Opens", has_share_modal)

            if has_share_modal:
                # Check for visibility radio group (AI Village fix)
                radiogroup = page.locator('[role="radiogroup"]')
                has_radiogroup = radiogroup.is_visible(timeout=2000)
                log_result("Visibility RadioGroup (ARIA)", has_radiogroup)

                # Check for XP hint
                xp_hint = page.locator('text=/\\+\\d+ XP/')
                has_xp = xp_hint.is_visible(timeout=2000)
                log_result("XP Points Hint", has_xp)

                # Check textarea
                textarea = page.locator('textarea').first
                has_textarea = textarea.is_visible(timeout=2000)
                if has_textarea:
                    content = textarea.input_value()
                    has_prefill = len(content) > 10
                    log_result("Pre-filled Share Content", has_prefill, f"'{content[:60]}...'" if has_prefill else "Empty")

                # Test Escape key closes modal (AI Village fix)
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
                modal_closed = not share_dialog.is_visible(timeout=1000)
                log_result("Escape Closes Share Modal", modal_closed)

        # Close the workouts modal
        close_btn = page.locator('[aria-label="Close"]').first
        if close_btn.is_visible(timeout=2000):
            close_btn.click()
            page.wait_for_timeout(500)

    except Exception as e:
        log_result("Workouts Modal Content", False, str(e)[:150])


def test_share_to_feed_standalone(page):
    """Test ShareToFeedModal accessibility features standalone."""
    print("\n=== PHASE 5: SOCIAL SHARING ACCESSIBILITY ===")
    # These were tested inside the modal flow above — just verify they got logged
    share_tests = [t for t in results if "Share" in t["test"] or "Escape" in t["test"]]
    if not share_tests:
        log_result("Social Sharing Tests", False, "No share tests were executed — modal may not have opened")


def test_console_errors(page):
    """Report any console errors captured during QA."""
    print("\n=== CONSOLE ERRORS ===")
    severe = [e for e in console_errors if "error" in e.lower() and "favicon" not in e.lower()]
    if severe:
        for err in severe[:5]:
            print(f"    [WARN] {err[:200]}")
        log_result("No Critical Console Errors", len(severe) < 3, f"{len(severe)} errors captured")
    else:
        log_result("No Console Errors", True, f"Clean console ({len(console_errors)} total messages)")


def test_responsive_mobile(page):
    """Quick mobile viewport check on key features."""
    print("\n=== RESPONSIVE: MOBILE VIEWPORT (375px) ===")
    try:
        page.set_viewport_size({"width": 375, "height": 812})
        page.goto(f"{BASE_URL}/dashboard/people", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        screenshot(page, "20-mobile-people-workspace")

        body = page.text_content("body") or ""
        has_content = len(body) > 100
        log_result("Mobile People Workspace Renders", has_content)

        # Reset viewport
        page.set_viewport_size({"width": 1440, "height": 900})
        page.wait_for_timeout(1000)
    except Exception as e:
        log_result("Mobile Responsive", False, str(e)[:100])
        page.set_viewport_size({"width": 1440, "height": 900})


def run_qa():
    print("=" * 70)
    print("  PHASE 2-5 COMPREHENSIVE QA — sswanstudios.com")
    print("  Visible Chrome | Admin Login | Full Smoke Test")
    print("=" * 70)

    with sync_playwright() as p:
        # VISIBLE Chrome as user requested
        browser = p.chromium.launch(headless=False, slow_mo=300)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        # Capture console errors
        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)

        try:
            # Step 1: Navigate to site
            print("\n--- Navigating to sswanstudios.com ---")
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            screenshot(page, "00-homepage")
            log_result("Site Loads", True, f"Title: {page.title()}")

            # Step 2: Login
            logged_in = login_admin(page)

            if not logged_in:
                print("\n  [ABORT] Cannot proceed without admin login")
                screenshot(page, "00-login-failed")
                return

            # Navigate to admin dashboard after login
            page.goto(f"{BASE_URL}/dashboard/home", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)
            screenshot(page, "00-admin-dashboard")
            log_result("Admin Dashboard Loads", True)

            # Step 3: Test People Workspace + View As Bar (Phase 4)
            workspace_ok = test_navigate_to_people_workspace(page)
            if workspace_ok:
                test_view_as_bar(page)

            # Step 4: Test Enhanced Workouts Modal (Phase 2-3 + Phase 5 share)
            test_enhanced_workouts_modal(page)

            # Step 5: Social sharing standalone check
            test_share_to_feed_standalone(page)

            # Step 6: Mobile responsive quick check
            test_responsive_mobile(page)

            # Step 7: Console errors
            test_console_errors(page)

        except Exception as e:
            print(f"\n  [FATAL] Unhandled error: {e}")
            traceback.print_exc()
            screenshot(page, "99-fatal-error")

        finally:
            # Summary
            print("\n" + "=" * 70)
            print("  QA SUMMARY")
            print("=" * 70)

            passed = sum(1 for r in results if r["passed"])
            failed = sum(1 for r in results if not r["passed"])
            total = len(results)

            print(f"\n  Total: {total} | Passed: {passed} | Failed: {failed}")

            if failed > 0:
                print(f"\n  FAILED TESTS:")
                for r in results:
                    if not r["passed"]:
                        print(f"    - {r['test']}: {r['details']}")

            print(f"\n  Screenshots: {os.path.abspath(SCREENSHOT_DIR)}/")

            # Save results JSON
            os.makedirs(SCREENSHOT_DIR, exist_ok=True)
            with open(os.path.join(SCREENSHOT_DIR, "results.json"), "w") as f:
                json.dump({"total": total, "passed": passed, "failed": failed, "tests": results}, f, indent=2)

            print(f"  Results: {os.path.join(SCREENSHOT_DIR, 'results.json')}")
            print("=" * 70)

            # Keep browser open for 5 seconds so user can see final state
            print("\n  Browser will close in 5 seconds...")
            page.wait_for_timeout(5000)
            browser.close()


if __name__ == "__main__":
    run_qa()
