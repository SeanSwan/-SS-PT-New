"""
Playwright QA: Social Media & User Dashboard — Pre-Enhancement Baseline
========================================================================
Captures screenshots and audits the current state of:
1. User dashboard (logged in as client/user)
2. Social feed, post creation, profile page
3. Gamification badges, level-up visibility
4. Theme toggle behavior
5. Mobile responsiveness (375px, 430px, 768px, 1280px)
6. Video gallery / library section
7. Workout logger accessibility from dashboard
8. Create-a-post modal UX
9. Edit profile depth
10. Friend suggestions, messaging, community features

Output: screenshots in tests/qa-screenshots/social-dashboard-baseline/
"""

import os
import sys
import json
import time
import io
from datetime import datetime
from playwright.sync_api import sync_playwright

# Fix Windows console encoding for unicode
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_URL = "https://sswanstudios.com"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "qa-screenshots", "social-dashboard-baseline")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# Viewports to test
VIEWPORTS = {
    "mobile-375": {"width": 375, "height": 812},
    "mobile-430": {"width": 430, "height": 932},
    "tablet-768": {"width": 768, "height": 1024},
    "desktop-1280": {"width": 1280, "height": 900},
    "desktop-1920": {"width": 1920, "height": 1080},
}

findings = []

def log_finding(category, severity, description, screenshot_path=None):
    finding = {
        "category": category,
        "severity": severity,
        "description": description,
        "screenshot": screenshot_path,
        "timestamp": datetime.now().isoformat()
    }
    findings.append(finding)
    icon = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢", "INFO": "ℹ️"}.get(severity, "❓")
    print(f"  {icon} [{severity}] {category}: {description}")

def screenshot(page, name, full_page=True):
    path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    page.screenshot(path=path, full_page=full_page)
    return path

def login(page, email="ogpswan@yahoo.com", password="Seanking1!"):
    """Attempt login — adjust credentials as needed"""
    page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)

    # Try to find login form
    email_input = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first
    password_input = page.locator('input[type="password"], input[name="password"]').first

    if email_input.is_visible() and password_input.is_visible():
        email_input.fill(email)
        password_input.fill(password)

        submit_btn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In"), button:has-text("Log In")').first
        if submit_btn.is_visible():
            submit_btn.click()
            page.wait_for_timeout(3000)
            page.wait_for_load_state("networkidle", timeout=15000)
            return True
    return False

def audit_page(page, page_name, url_path):
    """Comprehensive audit of a single page across viewports"""
    page.goto(f"{BASE_URL}{url_path}", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)

    # Console errors
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    for vp_name, vp_size in VIEWPORTS.items():
        page.set_viewport_size(vp_size)
        page.wait_for_timeout(1000)

        path = screenshot(page, f"{page_name}-{vp_name}")

        # Check for overflow issues
        has_horizontal_scroll = page.evaluate("document.body.scrollWidth > window.innerWidth")
        if has_horizontal_scroll:
            log_finding("RESPONSIVE", "HIGH",
                       f"{page_name} has horizontal scroll at {vp_name} ({vp_size['width']}px)",
                       path)

        # Check touch targets on mobile
        if vp_size["width"] < 768:
            small_buttons = page.evaluate("""
                () => {
                    const elements = document.querySelectorAll('button, a, [role="button"], [tabindex="0"]');
                    const small = [];
                    elements.forEach(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
                            small.push({
                                tag: el.tagName,
                                text: el.textContent?.slice(0, 30),
                                width: Math.round(rect.width),
                                height: Math.round(rect.height)
                            });
                        }
                    });
                    return small;
                }
            """)
            if small_buttons:
                log_finding("TOUCH_TARGETS", "MEDIUM",
                           f"{page_name} at {vp_name}: {len(small_buttons)} elements below 44px touch target",
                           path)
                for btn in small_buttons[:5]:
                    log_finding("TOUCH_TARGETS", "LOW",
                               f"  → <{btn['tag']}> '{btn['text']}' = {btn['width']}x{btn['height']}px")

    return console_errors

def audit_social_feed(page):
    """Audit the social feed page"""
    print("\n📋 AUDITING: Social Feed")
    page.goto(f"{BASE_URL}/social", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)

    screenshot(page, "social-feed-initial")

    # Check if feed loads
    posts = page.locator('[class*="post" i], [class*="card" i], [data-testid*="post"]').all()
    if len(posts) == 0:
        log_finding("SOCIAL_FEED", "HIGH", "No posts visible on social feed page")
    else:
        log_finding("SOCIAL_FEED", "INFO", f"Found {len(posts)} post-like elements on feed")

    # Check create post button
    create_btn = page.locator('button:has-text("Create"), button:has-text("Post"), [class*="create" i], [class*="fab" i]')
    if create_btn.count() > 0:
        log_finding("CREATE_POST", "INFO", f"Create post button found ({create_btn.count()} elements)")
        try:
            create_btn.first.click()
            page.wait_for_timeout(1500)
            screenshot(page, "create-post-modal")

            # Check modal content
            modal = page.locator('[role="dialog"], [class*="modal" i], [class*="drawer" i]')
            if modal.count() > 0:
                log_finding("CREATE_POST", "INFO", "Create post modal opens successfully")

                # Check for text input, media upload, post type selection
                text_input = page.locator('textarea, [contenteditable="true"], input[type="text"]')
                if text_input.count() == 0:
                    log_finding("CREATE_POST", "HIGH", "No text input found in create post modal")

                media_upload = page.locator('input[type="file"], button:has-text("Upload"), button:has-text("Photo"), button:has-text("Video")')
                if media_upload.count() == 0:
                    log_finding("CREATE_POST", "MEDIUM", "No media upload option in create post modal")

                # Close modal
                close_btn = page.locator('button:has-text("Close"), button:has-text("Cancel"), [aria-label="Close"], button:has-text("×")')
                if close_btn.count() > 0:
                    close_btn.first.click()
                    page.wait_for_timeout(500)
                else:
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(500)
            else:
                log_finding("CREATE_POST", "HIGH", "Create post modal did not appear after click")
        except Exception as e:
            log_finding("CREATE_POST", "MEDIUM", f"Error testing create post: {str(e)}")
    else:
        log_finding("CREATE_POST", "CRITICAL", "No create post button found on social feed")

def audit_user_profile(page):
    """Audit user profile page"""
    print("\n📋 AUDITING: User Profile")

    # Try multiple profile URLs
    for url in ["/social/profile", "/profile", "/dashboard/profile"]:
        page.goto(f"{BASE_URL}{url}", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)

        # Check if we landed on a real page (not redirect to login/404)
        current_url = page.url
        if "/login" not in current_url and "404" not in page.title().lower():
            screenshot(page, f"user-profile-{url.replace('/', '-')}")
            log_finding("PROFILE", "INFO", f"Profile page accessible at {url}")
            break

    # Check profile elements
    banner = page.locator('[class*="banner" i], [class*="cover" i], [class*="hero" i]')
    if banner.count() == 0:
        log_finding("PROFILE", "HIGH", "No banner/cover photo area found on profile")
    else:
        # Check banner sizing
        banner_box = banner.first.bounding_box()
        if banner_box:
            viewport_width = page.viewport_size["width"]
            if banner_box["width"] < viewport_width * 0.9:
                log_finding("PROFILE", "MEDIUM",
                           f"Banner does not utilize full screen width: {banner_box['width']}px vs {viewport_width}px viewport")

    avatar = page.locator('[class*="avatar" i], [class*="profile-pic" i], img[alt*="profile" i]')
    if avatar.count() == 0:
        log_finding("PROFILE", "HIGH", "No profile picture/avatar found")

    # Check for edit profile button
    edit_btn = page.locator('button:has-text("Edit Profile"), button:has-text("Edit"), a:has-text("Edit Profile")')
    if edit_btn.count() > 0:
        log_finding("PROFILE", "INFO", "Edit profile button found")
        try:
            edit_btn.first.click()
            page.wait_for_timeout(1500)
            screenshot(page, "edit-profile-modal")

            # Check edit form depth
            form_fields = page.locator('input, textarea, select').all()
            field_labels = []
            for field in form_fields:
                label = field.get_attribute("placeholder") or field.get_attribute("name") or field.get_attribute("aria-label") or ""
                if label:
                    field_labels.append(label)

            log_finding("PROFILE_EDIT", "INFO", f"Edit profile has {len(form_fields)} form fields: {', '.join(field_labels[:10])}")

            if len(form_fields) < 5:
                log_finding("PROFILE_EDIT", "HIGH", "Edit profile form seems shallow — fewer than 5 fields")

            # Check for city/location field
            location_field = page.locator('input[name*="city" i], input[name*="location" i], input[placeholder*="city" i], input[placeholder*="location" i]')
            if location_field.count() == 0:
                log_finding("PROFILE_EDIT", "MEDIUM", "No city/location field in edit profile")

            page.keyboard.press("Escape")
            page.wait_for_timeout(500)
        except Exception as e:
            log_finding("PROFILE_EDIT", "MEDIUM", f"Error testing edit profile: {str(e)}")
    else:
        log_finding("PROFILE", "MEDIUM", "No edit profile button found")

    # Check for Victory charts on profile
    charts = page.locator('[class*="chart" i], [class*="victory" i], svg.VictoryContainer')
    log_finding("PROFILE_CHARTS", "INFO" if charts.count() > 0 else "HIGH",
               f"Found {charts.count()} chart elements on profile page")

    # Check for badges/achievements on profile
    badges = page.locator('[class*="badge" i], [class*="achievement" i], [class*="gamification" i]')
    log_finding("PROFILE_BADGES", "INFO" if badges.count() > 0 else "HIGH",
               f"Found {badges.count()} badge/achievement elements on profile page")

def audit_gamification(page):
    """Audit gamification visibility across dashboards"""
    print("\n📋 AUDITING: Gamification & Badges")

    for url, name in [
        ("/dashboard/default", "admin-dashboard"),
        ("/dashboard/client-dashboard", "client-dashboard"),
    ]:
        page.goto(f"{BASE_URL}{url}", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(2000)
        screenshot(page, f"gamification-{name}")

        badges = page.locator('[class*="badge" i], [class*="achievement" i], [class*="level" i], [class*="xp" i], [class*="gamif" i]')
        log_finding("GAMIFICATION", "INFO" if badges.count() > 0 else "HIGH",
                   f"{name}: Found {badges.count()} gamification elements")

        # Check for level-up animations
        animations = page.locator('[class*="particle" i], [class*="confetti" i], [class*="celebrate" i], [class*="level-up" i]')
        if animations.count() == 0:
            log_finding("GAMIFICATION", "MEDIUM", f"{name}: No level-up animation elements found in DOM")

def audit_theme_toggle(page):
    """Audit theme toggle functionality"""
    print("\n📋 AUDITING: Theme Toggle")

    page.goto(f"{BASE_URL}/dashboard/default", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(2000)

    theme_btn = page.locator('button[class*="theme" i], button[aria-label*="theme" i], [class*="theme-toggle" i], button:has-text("Theme")')
    if theme_btn.count() > 0:
        log_finding("THEME", "INFO", f"Theme toggle button found ({theme_btn.count()} elements)")
        screenshot(page, "theme-before-toggle")

        try:
            theme_btn.first.click()
            page.wait_for_timeout(1500)
            screenshot(page, "theme-after-toggle")
            log_finding("THEME", "INFO", "Theme toggle clicked — check screenshots for visual change")
        except Exception as e:
            log_finding("THEME", "MEDIUM", f"Error clicking theme toggle: {str(e)}")
    else:
        log_finding("THEME", "HIGH", "No theme toggle button found in header/dashboard")

def audit_video_library(page):
    """Audit video gallery / library"""
    print("\n📋 AUDITING: Video Library")

    for url in ["/dashboard/video-studio", "/dashboard/videos", "/videos", "/social/videos"]:
        page.goto(f"{BASE_URL}{url}", wait_until="networkidle", timeout=10000)
        page.wait_for_timeout(1500)

        if "/login" not in page.url:
            screenshot(page, f"video-library-{url.replace('/', '-')}")
            log_finding("VIDEO", "INFO", f"Video section accessible at {url}")

            videos = page.locator('video, iframe[src*="youtube" i], [class*="video" i]')
            log_finding("VIDEO", "INFO" if videos.count() > 0 else "MEDIUM",
                       f"Found {videos.count()} video elements at {url}")
            break
    else:
        log_finding("VIDEO", "HIGH", "No accessible video library/gallery section found")

def audit_workout_logger_access(page):
    """Check if workout logger is accessible from user dashboard"""
    print("\n📋 AUDITING: Workout Logger Access from Dashboard")

    page.goto(f"{BASE_URL}/dashboard/default", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(2000)

    workout_links = page.locator('a:has-text("Workout"), button:has-text("Log Workout"), a:has-text("Log"), [href*="workout" i]')
    if workout_links.count() > 0:
        log_finding("WORKOUT_LOGGER", "INFO", f"Found {workout_links.count()} workout-related links/buttons on dashboard")
    else:
        log_finding("WORKOUT_LOGGER", "HIGH", "No workout logger link/button found on user dashboard")

def audit_friend_suggestions(page):
    """Check for friend/people suggestions"""
    print("\n📋 AUDITING: Friend Suggestions & Discovery")

    page.goto(f"{BASE_URL}/social", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(2000)

    suggestions = page.locator('[class*="suggest" i], [class*="discover" i], [class*="people-you-may-know" i], :text("People you may know"), :text("Suggested")')
    if suggestions.count() > 0:
        log_finding("FRIENDS", "INFO", "Friend suggestion section found")
    else:
        log_finding("FRIENDS", "HIGH", "No friend/people suggestion section found on social page")

    # Check messaging
    msg_links = page.locator('a:has-text("Message"), button:has-text("Message"), [class*="messag" i], [href*="message" i]')
    if msg_links.count() > 0:
        log_finding("MESSAGING", "INFO", f"Found {msg_links.count()} messaging elements")
    else:
        log_finding("MESSAGING", "MEDIUM", "No messaging UI elements found")

def audit_community(page):
    """Audit community section"""
    print("\n📋 AUDITING: Community Section")

    for url in ["/dashboard/community", "/social/community", "/community"]:
        page.goto(f"{BASE_URL}{url}", wait_until="networkidle", timeout=10000)
        page.wait_for_timeout(1500)

        if "/login" not in page.url:
            screenshot(page, f"community-{url.replace('/', '-')}")
            log_finding("COMMUNITY", "INFO", f"Community page accessible at {url}")
            break
    else:
        log_finding("COMMUNITY", "HIGH", "No accessible community section found")

def audit_logo_in_posts(page):
    """Check logo size in posts without media"""
    print("\n📋 AUDITING: Logo/Placeholder in Posts")

    page.goto(f"{BASE_URL}/social", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(2000)

    # Look for logo images inside post cards
    post_logos = page.locator('[class*="post" i] img[src*="logo" i], [class*="post" i] img[src*="swan" i], [class*="card" i] img[src*="logo" i]')
    if post_logos.count() > 0:
        for i in range(min(post_logos.count(), 3)):
            box = post_logos.nth(i).bounding_box()
            if box:
                log_finding("POST_LOGO", "MEDIUM" if box["width"] < 60 else "INFO",
                           f"Logo in post #{i+1}: {box['width']}x{box['height']}px {'(too small, should be bigger + centered)' if box['width'] < 60 else ''}")

def audit_promotions_area(page):
    """Check for promotional/sponsor area"""
    print("\n📋 AUDITING: Promotions/Sponsor Area")

    promo = page.locator('[class*="promo" i], [class*="sponsor" i], [class*="ad-" i], [class*="supplement" i]')
    if promo.count() > 0:
        log_finding("PROMOTIONS", "INFO", f"Found {promo.count()} promotion-related elements")
    else:
        log_finding("PROMOTIONS", "HIGH", "No promotions/sponsor area found — needed for AG1, supplements")

def main():
    print("=" * 70)
    print("SwanStudios Social Media & User Dashboard — Playwright QA Baseline")
    print(f"Target: {BASE_URL}")
    print(f"Screenshots: {SCREENSHOT_DIR}")
    print(f"Started: {datetime.now().isoformat()}")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport=VIEWPORTS["desktop-1280"],
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # Collect console errors
        all_console_errors = []
        page.on("console", lambda msg: all_console_errors.append({"type": msg.type, "text": msg.text}) if msg.type == "error" else None)

        # === PHASE 1: Unauthenticated audit ===
        print("\n" + "=" * 50)
        print("PHASE 1: Unauthenticated Pages")
        print("=" * 50)

        # Homepage
        print("\n📋 AUDITING: Homepage")
        page.goto(BASE_URL, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)
        screenshot(page, "homepage-desktop")
        page.set_viewport_size(VIEWPORTS["mobile-375"])
        page.wait_for_timeout(500)
        screenshot(page, "homepage-mobile-375")
        page.set_viewport_size(VIEWPORTS["desktop-1280"])

        # Login page
        print("\n📋 AUDITING: Login Page")
        page.goto(f"{BASE_URL}/login", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(1500)
        screenshot(page, "login-page")

        # === PHASE 2: Attempt Login ===
        print("\n" + "=" * 50)
        print("PHASE 2: Authentication")
        print("=" * 50)

        logged_in = login(page)
        if logged_in:
            screenshot(page, "post-login-landing")
            log_finding("AUTH", "INFO", f"Login successful — landed on {page.url}")
        else:
            log_finding("AUTH", "CRITICAL", "Could not log in — remaining tests will be limited")
            # Try with different URL patterns anyway

        # === PHASE 3: Social Media Audit ===
        print("\n" + "=" * 50)
        print("PHASE 3: Social Media Features")
        print("=" * 50)

        audit_social_feed(page)
        audit_user_profile(page)
        audit_logo_in_posts(page)
        audit_friend_suggestions(page)
        audit_community(page)

        # === PHASE 4: Dashboard & Gamification ===
        print("\n" + "=" * 50)
        print("PHASE 4: Dashboard & Gamification")
        print("=" * 50)

        audit_gamification(page)
        audit_theme_toggle(page)
        audit_workout_logger_access(page)
        audit_video_library(page)
        audit_promotions_area(page)

        # === PHASE 5: Responsive Audit on Key Pages ===
        print("\n" + "=" * 50)
        print("PHASE 5: Responsive Audit")
        print("=" * 50)

        key_pages = [
            ("/social", "social-feed"),
            ("/dashboard/default", "admin-dashboard"),
        ]

        for url_path, page_name in key_pages:
            print(f"\n📋 RESPONSIVE AUDIT: {page_name}")
            errors = audit_page(page, page_name, url_path)
            if errors:
                log_finding("CONSOLE", "HIGH", f"{page_name}: {len(errors)} console errors detected")
                for err in errors[:5]:
                    log_finding("CONSOLE", "MEDIUM", f"  → {err[:100]}")

        # === PHASE 6: Console Error Summary ===
        error_count = len([e for e in all_console_errors if e["type"] == "error"])
        if error_count > 0:
            log_finding("CONSOLE", "HIGH", f"Total console errors across session: {error_count}")

        browser.close()

    # === Generate Report ===
    print("\n" + "=" * 70)
    print("QA FINDINGS SUMMARY")
    print("=" * 70)

    severity_counts = {}
    for f in findings:
        severity_counts[f["severity"]] = severity_counts.get(f["severity"], 0) + 1

    for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
        count = severity_counts.get(sev, 0)
        if count > 0:
            print(f"  {sev}: {count}")

    print(f"\n  Total findings: {len(findings)}")
    print(f"  Screenshots saved to: {SCREENSHOT_DIR}")

    # Save findings JSON
    report_path = os.path.join(SCREENSHOT_DIR, "qa-findings.json")
    with open(report_path, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "target": BASE_URL,
            "total_findings": len(findings),
            "severity_counts": severity_counts,
            "findings": findings
        }, f, indent=2)

    print(f"  Report saved to: {report_path}")

    # Save markdown report
    md_path = os.path.join(SCREENSHOT_DIR, "QA-REPORT.md")
    with open(md_path, "w") as f:
        f.write("# SwanStudios Social Media & User Dashboard — QA Baseline Report\n\n")
        f.write(f"**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write(f"**Target:** {BASE_URL}\n\n")

        f.write("## Severity Summary\n\n")
        f.write("| Severity | Count |\n|----------|-------|\n")
        for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"]:
            count = severity_counts.get(sev, 0)
            if count > 0:
                f.write(f"| {sev} | {count} |\n")

        f.write(f"\n## All Findings ({len(findings)} total)\n\n")
        for cat in sorted(set(f["category"] for f in findings)):
            cat_findings = [f for f in findings if f["category"] == cat]
            f.write(f"\n### {cat}\n\n")
            for finding in cat_findings:
                icon = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢", "INFO": "ℹ️"}.get(finding["severity"], "❓")
                f.write(f"- {icon} **{finding['severity']}**: {finding['description']}\n")
                if finding.get("screenshot"):
                    f.write(f"  - Screenshot: `{os.path.basename(finding['screenshot'])}`\n")

    print(f"  Markdown report: {md_path}")
    print("\n✅ QA Baseline capture complete!")

    # Return exit code based on findings
    critical_count = severity_counts.get("CRITICAL", 0)
    high_count = severity_counts.get("HIGH", 0)
    if critical_count > 0:
        print(f"\n⚠️  {critical_count} CRITICAL findings detected!")
        return 1
    return 0

if __name__ == "__main__":
    sys.exit(main())
