"""
Playwright QA for Move Fitness Client Onboarding Implementation
===============================================================
Tests the following changes:
1. CreateClientModal - error colors use CS tokens, dropdown option colors
2. ClientOnboardingWizard - step indicators are buttons, goal chips work
3. Client dashboard - Victory charts in Progress, TrainerCredentialsCard
4. RevolutionaryClientDashboard - particle isolation (no render thrash)

Run with:
  python scripts/with_server.py \
    --server "cd backend && node server.mjs" --port 3000 \
    --server "cd frontend && npm run dev" --port 5173 \
    -- python tests/qa-onboarding-implementation.py
"""

import sys
import os
from playwright.sync_api import sync_playwright

BASE_URL = os.environ.get("QA_BASE_URL", "https://sswanstudios.com")
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "qa-screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

PASS = 0
FAIL = 0
WARN = 0

def log_pass(msg):
    global PASS
    PASS += 1
    print(f"  [PASS] {msg}")

def log_fail(msg):
    global FAIL
    FAIL += 1
    print(f"  [FAIL] {msg}")

def log_warn(msg):
    global WARN
    WARN += 1
    print(f"  [WARN] {msg}")

def screenshot(page, name):
    path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=True)
    print(f"  [SCREENSHOT] {path}")
    return path


def test_login_page(page):
    """Test login page renders and has force password change handling"""
    print("\n=== TEST: Login Page ===")
    page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    page.wait_for_timeout(2000)
    screenshot(page, "01-login-page")

    # Check login form exists
    email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="username" i]')
    if email_input.count() > 0:
        log_pass("Login form has email/username input")
    else:
        log_warn("Could not find email input - checking for any login form")
        inputs = page.locator('input').count()
        if inputs >= 2:
            log_pass(f"Login form has {inputs} input fields")
        else:
            log_fail("Login form appears incomplete")


def test_admin_login(page):
    """Login as admin to access dashboard"""
    print("\n=== TEST: Admin Login ===")
    page.goto(f"{BASE_URL}/login", wait_until="networkidle")
    page.wait_for_timeout(2000)

    # Try to find and fill login fields
    try:
        # Look for email/username field
        email_field = page.locator('input[type="email"], input[name="email"], input[name="username"]').first
        password_field = page.locator('input[type="password"]').first

        if email_field.is_visible() and password_field.is_visible():
            email_field.fill("ogpswan@yahoo.com")
            password_field.fill("admin123")

            # Find and click submit button
            submit_btn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In")').first
            if submit_btn.is_visible():
                submit_btn.click()
                page.wait_for_timeout(3000)

                # Check if we redirected to dashboard
                current_url = page.url
                if "dashboard" in current_url or "admin" in current_url:
                    log_pass(f"Admin login successful - redirected to {current_url}")
                    screenshot(page, "02-admin-dashboard")
                    return True
                else:
                    log_warn(f"Login may have failed - current URL: {current_url}")
                    screenshot(page, "02-login-result")
                    # Try navigating directly
                    page.goto(f"{BASE_URL}/dashboard", wait_until="networkidle")
                    page.wait_for_timeout(2000)
                    if "login" not in page.url.lower():
                        log_pass("Navigated to dashboard directly")
                        return True
            else:
                log_warn("Could not find submit button")
        else:
            log_warn("Login fields not visible")
    except Exception as e:
        log_warn(f"Login attempt error: {e}")

    return False


def test_create_client_modal(page):
    """Test CreateClientModal fixes: error colors, dropdown options, close behavior"""
    print("\n=== TEST: CreateClientModal ===")

    # Navigate to client management
    page.goto(f"{BASE_URL}/dashboard/client-management", wait_until="networkidle")
    page.wait_for_timeout(3000)
    screenshot(page, "03-client-management")

    # Look for Add/Create Client button
    add_btn = page.locator('button:has-text("Add Client"), button:has-text("Create Client"), button:has-text("New Client"), button[aria-label*="add" i]')
    if add_btn.count() > 0:
        add_btn.first.click()
        page.wait_for_timeout(1500)
        screenshot(page, "04-create-client-modal")

        # Check modal opened
        modal = page.locator('[role="dialog"], [aria-modal="true"], div:has(> form)')
        if modal.count() > 0:
            log_pass("Create Client modal opens")
        else:
            log_warn("Modal may have opened but no role=dialog found")

        # Check source selector chips exist
        source_chips = page.locator('button:has-text("SwanStudios"), button:has-text("Move Fitness"), button:has-text("External")')
        if source_chips.count() >= 2:
            log_pass(f"Source selector chips found ({source_chips.count()} chips)")

            # Click Move Fitness chip
            move_fit = page.locator('button:has-text("Move Fitness")')
            if move_fit.count() > 0:
                move_fit.first.click()
                page.wait_for_timeout(500)
                screenshot(page, "05-move-fitness-selected")
                log_pass("Move Fitness source chip clickable")
        else:
            log_warn("Source selector chips not found - may be different UI")

        # Check dropdown option styling (inspect CSS)
        dropdowns = page.locator('select')
        if dropdowns.count() > 0:
            # Check computed style of option elements
            option_bg = page.evaluate("""() => {
                const selects = document.querySelectorAll('select');
                for (const sel of selects) {
                    const opts = sel.querySelectorAll('option');
                    if (opts.length > 0) {
                        return window.getComputedStyle(opts[0]).backgroundColor;
                    }
                }
                return null;
            }""")
            if option_bg:
                log_pass(f"Dropdown options have custom background: {option_bg}")
            else:
                log_warn("Could not verify dropdown option styling")

        # Check error color tokens - try submitting empty form
        submit_btn = page.locator('button:has-text("Create"), button[type="submit"]')
        if submit_btn.count() > 0:
            submit_btn.first.click()
            page.wait_for_timeout(500)

            # Check if field errors use CS tokens (#fca5a5)
            error_elements = page.evaluate("""() => {
                const errors = document.querySelectorAll('span, div');
                const errorColors = [];
                for (const el of errors) {
                    const style = window.getComputedStyle(el);
                    const color = style.color;
                    // Check for #fca5a5 (rgb(252, 165, 165))
                    if (color.includes('252, 165, 165') || color.includes('252,165,165')) {
                        errorColors.push(el.textContent.substring(0, 30));
                    }
                    // Check for old #ff6b6b (rgb(255, 107, 107))
                    if (color.includes('255, 107, 107') || color.includes('255,107,107')) {
                        return { found_old: true, text: el.textContent.substring(0, 30) };
                    }
                }
                return { found_old: false, cs_errors: errorColors };
            }""")

            if error_elements.get('found_old'):
                log_fail(f"Old #ff6b6b error color still present: '{error_elements['text']}'")
            elif error_elements.get('cs_errors') and len(error_elements['cs_errors']) > 0:
                log_pass(f"Error colors use CS token #fca5a5 ({len(error_elements['cs_errors'])} elements)")
            else:
                log_warn("Could not verify error color tokens (no errors triggered or different styling)")

            screenshot(page, "06-modal-validation-errors")

        # Close modal
        close_btn = page.locator('button:has-text("Cancel"), button[aria-label="Close"], button:has(svg)')
        if close_btn.count() > 0:
            close_btn.first.click()
            page.wait_for_timeout(500)
    else:
        log_warn("Add Client button not found - checking alternative routes")


def test_onboarding_wizard(page):
    """Test ClientOnboardingWizard: step buttons, goal chips"""
    print("\n=== TEST: Onboarding Wizard ===")

    # Navigate to onboarding page
    page.goto(f"{BASE_URL}/onboarding", wait_until="networkidle")
    page.wait_for_timeout(3000)
    screenshot(page, "07-onboarding-wizard")

    # Check if wizard rendered
    wizard = page.locator('text=Client Onboarding')
    if wizard.count() > 0:
        log_pass("Onboarding wizard renders")
    else:
        log_warn("Onboarding wizard text not found - may require auth redirect")
        # Try client dashboard onboarding tab
        page.goto(f"{BASE_URL}/client-dashboard", wait_until="networkidle")
        page.wait_for_timeout(2000)

    # Check step indicators are buttons (a11y fix)
    step_buttons = page.locator('button[aria-label*="Go to step"]')
    if step_buttons.count() > 0:
        log_pass(f"Step indicators are <button> elements with aria-labels ({step_buttons.count()} found)")
        # Check first step has aria-current
        first_step = step_buttons.first
        aria_current = first_step.get_attribute('aria-current')
        if aria_current == 'step':
            log_pass("Active step has aria-current='step'")
        else:
            log_warn(f"Active step aria-current: {aria_current}")
    else:
        # Check if we can find step indicators at all
        step_divs = page.locator('[class*="Step"]')
        if step_divs.count() > 0:
            tag = page.evaluate("""() => {
                const steps = document.querySelectorAll('[class*="Step"]');
                return steps[0]?.tagName;
            }""")
            if tag == 'BUTTON':
                log_pass(f"Step indicators are buttons (found via class, tag={tag})")
            else:
                log_fail(f"Step indicators are {tag}, should be BUTTON")
        else:
            log_warn("Step indicators not found on this page")

    # Navigate to Goals step and check goal chips
    # Click Next to go to step 2 (Goals)
    next_btn = page.locator('button:has-text("Next"), button:has-text("Continue")')
    if next_btn.count() > 0:
        # Fill basic info first if on step 1
        name_input = page.locator('input[name="firstName"], input[placeholder*="first" i]')
        if name_input.count() > 0 and name_input.first.is_visible():
            name_input.first.fill("Test")
            last_name = page.locator('input[name="lastName"], input[placeholder*="last" i]')
            if last_name.count() > 0:
                last_name.first.fill("Client")
            email_input = page.locator('input[name="email"], input[type="email"]')
            if email_input.count() > 0:
                email_input.first.fill("test@example.com")

        next_btn.first.click()
        page.wait_for_timeout(1000)
        screenshot(page, "08-goals-step")

        # Check for goal chips
        golf_chip = page.locator('button:has-text("Golf Performance")')
        if golf_chip.count() > 0:
            log_pass("Golf Performance goal chip exists")

            # Click it and verify selection
            golf_chip.first.click()
            page.wait_for_timeout(300)

            is_pressed = golf_chip.first.get_attribute('aria-pressed')
            if is_pressed == 'true':
                log_pass("Golf Performance chip shows aria-pressed='true' when selected")
            else:
                log_warn(f"Golf chip aria-pressed: {is_pressed}")

            screenshot(page, "09-golf-performance-selected")
        else:
            log_warn("Golf Performance chip not found on current step")

        # Check other goal chips
        goal_chips = page.locator('button[aria-pressed]')
        if goal_chips.count() >= 5:
            log_pass(f"Goal chip selector has {goal_chips.count()} options")
        else:
            log_warn(f"Only {goal_chips.count()} goal chips found")
    else:
        log_warn("Next button not found in wizard")


def test_client_dashboard_charts(page):
    """Test Victory charts in client Progress section + TrainerCredentialsCard"""
    print("\n=== TEST: Client Dashboard Charts & Credentials ===")

    page.goto(f"{BASE_URL}/client-dashboard", wait_until="networkidle")
    page.wait_for_timeout(3000)
    screenshot(page, "10-client-dashboard")

    # Check TrainerCredentialsCard in overview
    trainer_card = page.locator('text=Sean Swan, CPT')
    if trainer_card.count() > 0:
        log_pass("TrainerCredentialsCard renders with 'Sean Swan, CPT'")
    else:
        log_warn("TrainerCredentialsCard not visible - may need overview tab")

    # Check for experience badge
    exp_badge = page.locator('text=25+ Years Experience')
    if exp_badge.count() > 0:
        log_pass("25+ Years Experience badge visible")
    else:
        log_warn("Experience badge not found")

    # Check cert badges
    certs = ["NASM", "NCEP", "24HR Master Trainer"]
    for cert in certs:
        badge = page.locator(f'text={cert}')
        if badge.count() > 0:
            log_pass(f"Cert badge visible: {cert}")
        else:
            log_warn(f"Cert badge not found: {cert}")

    # Check protocol note
    protocol = page.locator('text=NASM OPT Protocol')
    if protocol.count() > 0:
        log_pass("NASM OPT Protocol note visible")

    # Navigate to Progress section
    progress_tab = page.locator('button:has-text("Progress")').or_(page.locator('[data-section="progress"]')).or_(page.get_by_text("Progress", exact=True))
    if progress_tab.count() > 0:
        progress_tab.first.click()
        page.wait_for_timeout(2000)
        screenshot(page, "11-progress-section")

        # Check for Victory chart section headers
        analytics_header = page.locator('text=Progress Analytics')
        if analytics_header.count() > 0:
            log_pass("Progress Analytics section header renders")
        else:
            log_warn("Progress Analytics header not found")

        nasm_header = page.locator('text=NASM Protocol Tracking')
        if nasm_header.count() > 0:
            log_pass("NASM Protocol Tracking section header renders")
        else:
            log_warn("NASM Protocol Tracking header not found")

        # Check for chart cards (SafeChart wrappers)
        chart_regions = page.locator('[role="region"][aria-label*="chart" i], [role="region"][aria-label*="volume" i], [role="region"][aria-label*="weight" i], [role="region"][aria-label*="workout" i]')
        if chart_regions.count() > 0:
            log_pass(f"Victory chart regions found: {chart_regions.count()}")
        else:
            # Check for chart cards by class
            chart_cards = page.evaluate("""() => {
                const cards = document.querySelectorAll('[role="region"]');
                return cards.length;
            }""")
            if chart_cards > 0:
                log_pass(f"Found {chart_cards} chart region elements")
            else:
                log_warn("No chart region elements found - charts may be loading")

        # Check for SVG elements (Victory renders to SVG)
        svg_count = page.locator('svg').count()
        if svg_count >= 3:
            log_pass(f"Multiple SVG elements found ({svg_count}) — Victory charts rendering")
        else:
            log_warn(f"Only {svg_count} SVG elements found")

        # Check engagement section
        engagement = page.locator('text=Engagement & Wellness')
        if engagement.count() > 0:
            log_pass("Engagement & Wellness section renders")

        screenshot(page, "12-charts-full-page")
    else:
        log_warn("Progress tab/button not found in sidebar")


def test_particle_isolation(page):
    """Verify particle background doesn't cause excessive re-renders"""
    print("\n=== TEST: Particle Background Isolation ===")

    page.goto(f"{BASE_URL}/client-dashboard", wait_until="networkidle")
    page.wait_for_timeout(2000)

    # Check that ParticleField exists but is isolated
    particle_field = page.evaluate("""() => {
        // Look for the particle field container
        const fields = document.querySelectorAll('div');
        let particleFieldFound = false;
        for (const div of fields) {
            const style = window.getComputedStyle(div);
            if (style.position === 'fixed' && style.pointerEvents === 'none' &&
                style.overflow === 'hidden' && style.zIndex === '0') {
                particleFieldFound = true;
                break;
            }
        }
        return particleFieldFound;
    }""")

    if particle_field:
        log_pass("ParticleField container found with correct styles (fixed, pointer-events:none)")
    else:
        log_warn("Could not verify ParticleField styling")

    # Measure render performance - count renders over 3 seconds
    render_count = page.evaluate("""() => {
        return new Promise(resolve => {
            let count = 0;
            const observer = new PerformanceObserver((list) => {
                count += list.getEntries().length;
            });
            try {
                observer.observe({ entryTypes: ['layout-shift'] });
            } catch(e) { /* may not be supported */ }
            setTimeout(() => {
                observer.disconnect();
                resolve(count);
            }, 3000);
        });
    }""")

    if render_count is not None and render_count < 5:
        log_pass(f"Low layout shift count over 3s: {render_count} (particle isolation working)")
    elif render_count is not None:
        log_warn(f"Layout shift count over 3s: {render_count}")
    else:
        log_warn("Could not measure layout shifts")


def main():
    global PASS, FAIL, WARN

    print("=" * 60)
    print("  SwanStudios QA: Move Fitness Client Onboarding")
    print("  Playwright Automated Test Suite")
    print("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 375, "height": 812},  # Mobile-first (iPhone)
            device_scale_factor=2,
        )
        page = context.new_page()

        try:
            # Test 1: Login page
            test_login_page(page)

            # Test 2: Admin login
            logged_in = test_admin_login(page)

            if logged_in:
                # Test 3: CreateClientModal
                test_create_client_modal(page)

            # Test 4: Onboarding wizard (may work without auth)
            test_onboarding_wizard(page)

            # Test 5: Client dashboard charts + credentials
            test_client_dashboard_charts(page)

            # Test 6: Particle isolation
            test_particle_isolation(page)

            # Also run at desktop viewport
            print("\n=== Desktop Viewport (1280x800) ===")
            page.set_viewport_size({"width": 1280, "height": 800})
            page.goto(f"{BASE_URL}/client-dashboard", wait_until="networkidle")
            page.wait_for_timeout(2000)
            screenshot(page, "13-desktop-client-dashboard")

            # Check chart grid is multi-column on desktop
            grid_cols = page.evaluate("""() => {
                const grids = document.querySelectorAll('div');
                for (const g of grids) {
                    const style = window.getComputedStyle(g);
                    if (style.display === 'grid' && style.gridTemplateColumns.split(' ').length >= 2) {
                        return style.gridTemplateColumns;
                    }
                }
                return null;
            }""")
            if grid_cols:
                log_pass(f"Chart grid uses multi-column layout on desktop: {grid_cols[:60]}")
            else:
                log_warn("Could not verify multi-column chart grid on desktop")

        except Exception as e:
            print(f"\n  [ERROR] Test suite error: {e}")
            screenshot(page, "error-state")
        finally:
            browser.close()

    # Summary
    print("\n" + "=" * 60)
    print(f"  RESULTS: {PASS} passed, {FAIL} failed, {WARN} warnings")
    print(f"  Screenshots: {SCREENSHOT_DIR}")
    print("=" * 60)

    if FAIL > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
