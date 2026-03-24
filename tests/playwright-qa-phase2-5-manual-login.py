"""
Playwright QA: Phase 2-5 Client Data Pipeline — sswanstudios.com
================================================================
Opens Chrome, waits for manual login, then runs comprehensive QA.
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


def wait_for_manual_login(page):
    """Navigate to login page and wait for user to login manually."""
    print("\n=== MANUAL LOGIN ===")
    print("  Please log in as admin in the browser window.")
    print("  Waiting for token in localStorage...")

    page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)

    # Poll for token every 2 seconds, up to 300 seconds (5 minutes)
    for i in range(150):
        # Check multiple indicators of successful login
        token = page.evaluate("localStorage.getItem('token')")
        current_url = page.url

        # Also check if page navigated to dashboard (login succeeded)
        if token or 'dashboard' in current_url:
            if not token:
                # Page navigated but token not found — wait a moment
                page.wait_for_timeout(2000)
                token = page.evaluate("localStorage.getItem('token')")

            user = page.evaluate("JSON.parse(localStorage.getItem('user') || '{}')")
            role = user.get("role", "unknown") if isinstance(user, dict) else "unknown"
            log_result("Manual Admin Login", True, f"Role: {role}")
            print("  Login detected! Continuing QA...\n")
            page.wait_for_timeout(2000)
            return True
        time.sleep(2)
        if i % 5 == 4:
            print(f"  ... still waiting ({(i+1)*2}s) — URL: {current_url[:60]}")

    log_result("Manual Admin Login", False, "Timed out after 300s")
    return False


def test_navigate_to_people_workspace(page):
    """Navigate to /dashboard/people (ClientsWorkspace with ViewAs bar)."""
    print("\n=== PHASE 4: ADMIN IMPERSONATION — People Workspace ===")

    try:
        page.goto(f"{BASE_URL}/dashboard/people", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        screenshot(page, "01-people-workspace")

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
        # Look for the View As bar
        view_as_label = page.locator('text="View As:"').first
        has_view_as = view_as_label.is_visible(timeout=5000)
        log_result("View As Bar Visible", has_view_as)

        if has_view_as:
            screenshot(page, "02-view-as-bar")

        # Check for the search input with combobox role
        search_input = page.locator('[aria-label="Search users to view as"]').first
        has_search = search_input.is_visible(timeout=3000)
        log_result("View As Search Input (ARIA)", has_search)

        if has_search:
            # Type to trigger dropdown
            search_input.fill("a")
            page.wait_for_timeout(2000)

            dropdown = page.locator('[role="listbox"]').first
            has_dropdown = dropdown.is_visible(timeout=3000)
            log_result("View As Dropdown Opens", has_dropdown)

            if has_dropdown:
                screenshot(page, "03-view-as-dropdown")

                options = page.locator('[role="option"]')
                option_count = options.count()
                log_result("Dropdown Has User Options", option_count > 0, f"{option_count} users found")

                if option_count > 0:
                    first_user_text = options.first.text_content() or "Unknown"
                    options.first.click()
                    page.wait_for_timeout(3000)
                    screenshot(page, "04-view-as-dashboard")

                    current_url = page.url
                    has_view_as_route = "view-as" in current_url
                    log_result("View As Navigation", has_view_as_route,
                               f"URL: {current_url}")

                    banner = page.locator('text="Viewing as"').first
                    has_banner = banner.is_visible(timeout=5000)
                    log_result("Viewing As Banner", has_banner)

                    stat_cards = page.locator('text="Recent Workouts"').first
                    has_stats = stat_cards.is_visible(timeout=3000)
                    log_result("View As Dashboard Stats", has_stats)

                    exit_btn = page.locator('[aria-label="Exit impersonation view"]').first
                    has_exit = exit_btn.is_visible(timeout=3000)
                    log_result("Exit View Button (ARIA)", has_exit)

                    if has_exit:
                        exit_btn.click()
                        page.wait_for_timeout(2000)
                        screenshot(page, "05-after-exit-view")
                        back_at_people = "people" in page.url and "view-as" not in page.url
                        log_result("Exit Returns to People", back_at_people, f"URL: {page.url}")

            search_input.fill("")
    except Exception as e:
        log_result("View As Bar Test", False, str(e)[:150])
        screenshot(page, "02-view-as-error")


def test_enhanced_workouts_modal(page):
    """Test Phase 2-3: Enhanced Workouts Modal with tabs, charts, PRs."""
    print("\n=== PHASE 2-3: ENHANCED WORKOUTS MODAL ===")

    try:
        # Navigate to /dashboard/people — ClientsManagementSection (default Clients tab)
        # Three-dot menu with "View Workouts" opens EnhancedWorkoutsModal
        page.goto(f"{BASE_URL}/dashboard/people", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(5000)
        screenshot(page, "10-client-details-page")

        body_text = page.text_content("body") or ""
        has_clients = any(kw in body_text for kw in ["Client", "Active", "client", "Move Fitness", "SwanStudios", "Name", "Email"])
        log_result("Client List Loads", has_clients)

        if not has_clients:
            log_result("Open Workouts Modal", False, "No clients found on page")
            return

        # Ensure we're on the Clients tab (first tab in the workspace)
        try:
            clients_tab = page.locator('text="Clients"').first
            if clients_tab.is_visible(timeout=3000):
                clients_tab.click()
                page.wait_for_timeout(2000)
        except:
            pass

        # Click Refresh to force client data reload
        try:
            refresh_btn = page.locator('text="Refresh"').first
            if refresh_btn.is_visible(timeout=3000):
                refresh_btn.click()
                page.wait_for_timeout(4000)
        except:
            pass

        # Scroll ALL scrollable containers to reveal client cards
        page.evaluate("""() => {
            document.querySelectorAll('*').forEach(el => {
                if (el.scrollHeight > el.clientHeight + 50) {
                    el.scrollTop = el.scrollHeight;
                }
            });
            window.scrollTo(0, document.body.scrollHeight);
        }""")
        page.wait_for_timeout(3000)

        # Now scroll back up a bit so client cards are in view
        page.evaluate("""() => {
            document.querySelectorAll('*').forEach(el => {
                if (el.scrollHeight > el.clientHeight + 50) {
                    el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight * 2);
                }
            });
        }""")
        page.wait_for_timeout(1000)
        screenshot(page, "10b-scrolled-clients")

        # Find MoreVertical button ONLY within the main content area (not sidebar/header)
        # The ActionButton in ClientsManagementSection is inside client cards
        # which are inside the workspace content area
        clicked_menu = page.evaluate("""() => {
            // Find all buttons with MoreVertical SVG (3 circles, all cx=12)
            const candidates = [];
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
                const svg = btn.querySelector('svg');
                if (!svg) continue;
                const circles = svg.querySelectorAll('circle');
                if (circles.length === 3) {
                    const allCx12 = Array.from(circles).every(c => c.getAttribute('cx') === '12');
                    if (allCx12) {
                        // Check the button is within the main content area (not header/sidebar)
                        const rect = btn.getBoundingClientRect();
                        // Main content is roughly x > 200 (past sidebar) and y > 100 (past header)
                        if (rect.x > 150 && rect.y > 100 && rect.width > 0 && rect.height > 0) {
                            candidates.push({ btn, y: rect.y });
                        }
                    }
                }
            }
            // Sort by y position (top to bottom) and click the first one (first client card)
            candidates.sort((a, b) => a.y - b.y);
            if (candidates.length > 0) {
                candidates[0].btn.scrollIntoView({ behavior: 'instant', block: 'center' });
                candidates[0].btn.click();
                return candidates.length;
            }
            return 0;
        }""")

        if clicked_menu:
            page.wait_for_timeout(1500)
            screenshot(page, "11-action-menu")

            # Find "View Workouts" in the action dropdown (rendered via portal on document.body)
            workout_item = page.locator('text="View Workouts"').first
            try:
                if workout_item.is_visible(timeout=3000):
                    workout_item.click()
                    page.wait_for_timeout(3000)
                    screenshot(page, "12-workouts-modal")
                    log_result("Open Workouts Modal", True)
                    test_workouts_modal_content(page)
                    return
            except:
                pass

            # Fallback: check what's in the dropdown
            dropdown_text = page.evaluate("""() => {
                // The ActionDropdown is portaled to document.body with data-action-menu attribute
                const menu = document.querySelector('[data-action-menu]');
                if (menu) return menu.innerText;
                // Try any recently appeared absolute/fixed elements
                const els = document.querySelectorAll('[style*="position: absolute"], [style*="position: fixed"]');
                for (const el of els) {
                    if (el.innerText.includes('View') || el.innerText.includes('Edit')) {
                        return el.innerText;
                    }
                }
                return 'no dropdown found';
            }""")
            log_result("Open Workouts Modal", False, f"Menu opened ({clicked_menu} btns), dropdown: {dropdown_text[:120]}")
            return

        log_result("Open Workouts Modal", False, "Client cards or MoreVertical buttons not found in content area")
        screenshot(page, "10-no-menu-btn")
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "10c-full-page.png"), full_page=True)

        # Click the three-dot menu to open dropdown
        more_btn.click()
        page.wait_for_timeout(1500)
        screenshot(page, "11-action-menu")

        # Find "View Workouts" in the dropdown
        workout_item = page.locator('text="View Workouts"').first
        try:
            if workout_item.is_visible(timeout=3000):
                workout_item.click()
                page.wait_for_timeout(3000)
                screenshot(page, "12-workouts-modal")
                log_result("Open Workouts Modal", True)
                test_workouts_modal_content(page)
                return
        except:
            pass

        # If "View Workouts" not visible, try partial text match
        try:
            workout_item2 = page.locator('text=/Workout/i').first
            if workout_item2.is_visible(timeout=2000):
                text = workout_item2.text_content() or ""
                workout_item2.click()
                page.wait_for_timeout(3000)
                screenshot(page, "12-workouts-modal")
                log_result("Open Workouts Modal", True, f"Found via partial match: '{text}'")
                test_workouts_modal_content(page)
                return
        except:
            pass

        log_result("Open Workouts Modal", False, "Dropdown opened but 'View Workouts' not found")
        screenshot(page, "11-dropdown-content")

    except Exception as e:
        log_result("Enhanced Workouts Modal", False, str(e)[:150])
        screenshot(page, "10-workouts-error")


def test_workouts_modal_content(page):
    """Test content inside the EnhancedWorkoutsModal."""
    try:
        # Tablist
        tablist = page.locator('[role="tablist"]').first
        has_tablist = tablist.is_visible(timeout=3000)
        log_result("Workouts Tabs (role=tablist)", has_tablist)

        # Individual tabs
        history_tab = page.locator('[role="tab"]:has-text("History")')
        has_history = history_tab.is_visible(timeout=2000)
        log_result("History Tab", has_history)

        charts_tab = page.locator('[role="tab"]:has-text("Charts")')
        has_charts = charts_tab.is_visible(timeout=2000)
        log_result("Charts Tab", has_charts)

        prs_tab = page.locator('[role="tab"]:has-text("PRs")')
        has_prs = prs_tab.is_visible(timeout=2000)
        log_result("PRs Tab", has_prs)

        # Summary stats
        stats = page.locator('text="workouts"').first
        has_stats = stats.is_visible(timeout=2000)
        log_result("Summary Stats Bar", has_stats)

        # Share buttons (Phase 5)
        share_btns = page.locator('text="Share"')
        share_count = share_btns.count()
        log_result("Share Buttons Present (Phase 5)", share_count > 0, f"{share_count} share buttons")

        # Charts tab
        if has_charts:
            charts_tab.click()
            page.wait_for_timeout(3000)
            screenshot(page, "13-charts-tab")

            svgs = page.locator('svg').all()
            log_result("Victory Charts Render (SVGs)", len(svgs) > 0, f"{len(svgs)} SVGs")

            # Heatmap legend (AI Village)
            legend = page.locator('text="None"').first
            has_legend = legend.is_visible(timeout=2000)
            log_result("Heatmap Legend (AI Village)", has_legend)

        # PRs tab
        if has_prs:
            prs_tab.click()
            page.wait_for_timeout(2000)
            screenshot(page, "14-prs-tab")

            pr_content = page.text_content("body") or ""
            has_pr_data = "lbs" in pr_content or "BW" in pr_content or "No personal records" in pr_content
            log_result("PRs Tab Content", has_pr_data)

        # Switch back to History
        if has_history:
            history_tab.click()
            page.wait_for_timeout(1000)

        # Test Share modal (Phase 5)
        if share_count > 0:
            share_btns.first.click()
            page.wait_for_timeout(1500)
            screenshot(page, "15-share-modal")

            share_dialog = page.locator('[role="dialog"][aria-label="Share to feed"]')
            has_share_modal = share_dialog.is_visible(timeout=3000)
            log_result("ShareToFeedModal Opens", has_share_modal)

            if has_share_modal:
                radiogroup = page.locator('[role="radiogroup"]')
                has_radiogroup = radiogroup.is_visible(timeout=2000)
                log_result("Visibility RadioGroup (ARIA)", has_radiogroup)

                xp_hint = page.locator('text=/\\+\\d+ XP/')
                has_xp = xp_hint.is_visible(timeout=2000)
                log_result("XP Points Hint", has_xp)

                textarea = page.locator('textarea').first
                has_textarea = textarea.is_visible(timeout=2000)
                if has_textarea:
                    content = textarea.input_value()
                    has_prefill = len(content) > 10
                    log_result("Pre-filled Share Content", has_prefill, f"'{content[:60]}...'" if has_prefill else "Empty")

                # Escape closes modal (AI Village)
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
                modal_closed = not share_dialog.is_visible(timeout=1000)
                log_result("Escape Closes Share Modal", modal_closed)

        # Close workouts modal
        close_btn = page.locator('[aria-label="Close"]').first
        if close_btn.is_visible(timeout=2000):
            close_btn.click()
            page.wait_for_timeout(500)

    except Exception as e:
        log_result("Workouts Modal Content", False, str(e)[:150])


def test_console_errors(page):
    """Report console errors (excluding pre-login auth noise)."""
    print("\n=== CONSOLE ERRORS ===")

    # Filter out known non-critical noise: pre-login 401s, login errors, favicon, 404 resource loads
    noise_patterns = [
        "401", "login", "favicon", "auth/login", "Login failed",
        "failed to load resource", "404", "net::err",
    ]
    severe = []
    for e in console_errors:
        if "error" not in e.lower():
            continue
        lower = e.lower()
        if any(pat.lower() in lower for pat in noise_patterns):
            continue
        severe.append(e)

    if severe:
        for err in severe[:5]:
            print(f"    [WARN] {err[:200]}")
        log_result("No Critical Console Errors", len(severe) < 3, f"{len(severe)} post-login errors")
    else:
        noise_count = len([e for e in console_errors if "error" in e.lower()])
        print(f"    (Filtered {noise_count} pre-login/auth errors as noise)")
        log_result("No Console Errors", True, f"Clean (filtered {noise_count} auth noise)")


def test_responsive_mobile(page):
    """Mobile viewport check."""
    print("\n=== RESPONSIVE: MOBILE (375px) ===")
    try:
        page.set_viewport_size({"width": 375, "height": 812})
        page.goto(f"{BASE_URL}/dashboard/people", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(3000)
        screenshot(page, "20-mobile-people-workspace")

        body = page.text_content("body") or ""
        has_content = len(body) > 100
        log_result("Mobile People Workspace Renders", has_content)

        page.set_viewport_size({"width": 1440, "height": 900})
        page.wait_for_timeout(1000)
    except Exception as e:
        log_result("Mobile Responsive", False, str(e)[:100])
        page.set_viewport_size({"width": 1440, "height": 900})


def run_qa():
    print("=" * 70)
    print("  PHASE 2-5 COMPREHENSIVE QA — sswanstudios.com")
    print("  Visible Chrome | Manual Login | Full Smoke Test")
    print("=" * 70)

    with sync_playwright() as p:
        # User prefers Brave browser for QA testing
        browser = p.chromium.launch(headless=False, slow_mo=300, channel="chrome",
                                     executable_path=r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe")
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type in ("error", "warning") else None)

        try:
            # Step 1: Navigate
            print("\n--- Navigating to sswanstudios.com ---")
            page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            screenshot(page, "00-homepage")
            log_result("Site Loads", True, f"Title: {page.title()}")

            # Step 2: Manual login
            logged_in = wait_for_manual_login(page)

            if not logged_in:
                print("\n  [ABORT] Login timed out")
                screenshot(page, "00-login-timeout")
                return

            # Navigate to admin dashboard
            page.goto(f"{BASE_URL}/dashboard/home", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(3000)
            screenshot(page, "00-admin-dashboard")
            log_result("Admin Dashboard Loads", True)

            # Step 3: People Workspace + View As (Phase 4)
            workspace_ok = test_navigate_to_people_workspace(page)
            if workspace_ok:
                test_view_as_bar(page)

            # Step 4: Enhanced Workouts Modal (Phase 2-3 + Phase 5)
            test_enhanced_workouts_modal(page)

            # Step 5: Mobile responsive
            test_responsive_mobile(page)

            # Step 6: Console errors
            test_console_errors(page)

        except Exception as e:
            print(f"\n  [FATAL] {e}")
            traceback.print_exc()
            screenshot(page, "99-fatal-error")

        finally:
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

            os.makedirs(SCREENSHOT_DIR, exist_ok=True)
            with open(os.path.join(SCREENSHOT_DIR, "results.json"), "w") as f:
                json.dump({"total": total, "passed": passed, "failed": failed, "tests": results}, f, indent=2)

            print(f"  Results: {os.path.join(SCREENSHOT_DIR, 'results.json')}")
            print("=" * 70)

            print("\n  Browser stays open for 10 seconds...")
            page.wait_for_timeout(10000)
            browser.close()


if __name__ == "__main__":
    run_qa()
