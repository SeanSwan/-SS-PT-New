"""
Comprehensive Playwright smoke test for sswanstudios.com
Tests all public pages, checks for console errors, broken layouts, 404s.
"""
import os
import sys
import json
from playwright.sync_api import sync_playwright

BASE_URL = "https://sswanstudios.com"
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "..", "qa-screenshots", "smoke-comprehensive")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

results = {
    "pages_tested": 0,
    "pages_passed": 0,
    "pages_failed": 0,
    "console_errors": [],
    "network_errors": [],
    "findings": [],
}

PUBLIC_ROUTES = [
    ("/", "homepage"),
    ("/store", "store"),
    ("/gallery", "gallery"),
    ("/about", "about"),
    ("/contact", "contact"),
    ("/login", "login"),
    ("/signup", "signup"),
    ("/video-library", "video-library"),
    ("/waiver", "waiver"),
    ("/social", "social-hub"),
]

def test_page(page, path, name, viewport_width=1920):
    """Test a single page: navigate, capture errors, screenshot."""
    url = f"{BASE_URL}{path}"
    console_errors = []
    network_failures = []

    def on_console(msg):
        if msg.type == "error":
            console_errors.append({"page": name, "text": msg.text[:200]})

    def on_response(response):
        if response.status >= 400 and not response.url.endswith((".map", ".ico")):
            network_failures.append({
                "page": name,
                "url": response.url[:120],
                "status": response.status,
            })

    page.on("console", on_console)
    page.on("response", on_response)

    try:
        page.set_viewport_size({"width": viewport_width, "height": 1080})
        resp = page.goto(url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)  # Extra settle time for animations

        status = resp.status if resp else 0
        title = page.title()

        # Screenshot
        suffix = f"-{viewport_width}w" if viewport_width != 1920 else ""
        screenshot_path = os.path.join(SCREENSHOT_DIR, f"{name}{suffix}.png")
        page.screenshot(path=screenshot_path, full_page=False)

        # Check for blank page
        body_text = page.evaluate("document.body?.innerText?.trim()?.length || 0")
        is_blank = body_text < 20

        passed = status < 400 and not is_blank
        result = {
            "page": name,
            "path": path,
            "status": status,
            "title": title,
            "viewport": viewport_width,
            "blank": is_blank,
            "console_errors": len(console_errors),
            "network_errors": len(network_failures),
            "passed": passed,
        }

        results["pages_tested"] += 1
        if passed:
            results["pages_passed"] += 1
        else:
            results["pages_failed"] += 1
            results["findings"].append(f"FAIL: {name} (status={status}, blank={is_blank})")

        results["console_errors"].extend(console_errors)
        results["network_errors"].extend(network_failures)

        icon = "PASS" if passed else "FAIL"
        print(f"  [{icon}] {name:20s} status={status} title='{title[:50]}' console_errors={len(console_errors)} net_errors={len(network_failures)}")
        return result

    except Exception as e:
        results["pages_tested"] += 1
        results["pages_failed"] += 1
        results["findings"].append(f"ERROR: {name} - {str(e)[:100]}")
        print(f"  [ERROR] {name:20s} {str(e)[:80]}")
        return {"page": name, "passed": False, "error": str(e)[:100]}

    finally:
        page.remove_listener("console", on_console)
        page.remove_listener("response", on_response)


def test_mobile_responsive(page, path, name):
    """Test page at mobile viewport (375px)."""
    return test_page(page, path, name, viewport_width=375)


def test_gallery_features(page):
    """Test gallery-specific features: event listing, access gate."""
    print("\n--- Gallery Feature Tests ---")
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.goto(f"{BASE_URL}/gallery", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)

    # Check for event cards or hero section
    body = page.content()
    has_events = "event" in body.lower() or "gallery" in body.lower()
    print(f"  Gallery page has event-related content: {has_events}")

    # Check for email gate / access form
    email_inputs = page.locator('input[type="email"], input[placeholder*="email" i]').count()
    password_inputs = page.locator('input[type="password"]').count()
    print(f"  Email inputs found: {email_inputs}, Password inputs: {password_inputs}")

    # Screenshot the gallery state
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "gallery-features.png"), full_page=True)

    if has_events:
        results["findings"].append("OK: Gallery page renders with event content")
    else:
        results["findings"].append("WARN: Gallery page may not be showing events")


def test_interactive_elements(page):
    """Test key interactive elements across the site."""
    print("\n--- Interactive Element Tests ---")

    # Test homepage navigation
    page.set_viewport_size({"width": 1920, "height": 1080})
    page.goto(f"{BASE_URL}/", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)

    # Check nav links
    nav_links = page.locator("nav a, header a").count()
    print(f"  Navigation links found: {nav_links}")

    # Check for broken images
    broken_images = page.evaluate("""
        () => {
            const imgs = document.querySelectorAll('img');
            let broken = 0;
            imgs.forEach(img => {
                if (img.naturalWidth === 0 && img.complete && img.src && !img.src.startsWith('data:')) broken++;
            });
            return { total: imgs.length, broken };
        }
    """)
    print(f"  Images: {broken_images['total']} total, {broken_images['broken']} broken")
    if broken_images["broken"] > 0:
        results["findings"].append(f"WARN: {broken_images['broken']} broken images on homepage")

    # Check buttons have min touch targets
    small_buttons = page.evaluate("""
        () => {
            const btns = document.querySelectorAll('button, a[role="button"], [role="button"]');
            let small = 0;
            btns.forEach(btn => {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) small++;
            });
            return { total: btns.length, small };
        }
    """)
    print(f"  Buttons: {small_buttons['total']} total, {small_buttons['small']} below 44px touch target")

    # Test store page loads products
    page.goto(f"{BASE_URL}/store", wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)
    store_content = page.evaluate("document.body?.innerText?.length || 0")
    print(f"  Store page content length: {store_content} chars")
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, "store-products.png"), full_page=False)


def main():
    print(f"=== Comprehensive Smoke Test: {BASE_URL} ===\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # 1. Desktop tests for all public routes
        print("--- Desktop Tests (1920px) ---")
        for path, name in PUBLIC_ROUTES:
            test_page(page, path, name)

        # 2. Mobile tests for key pages
        print("\n--- Mobile Tests (375px) ---")
        mobile_pages = [("/", "homepage"), ("/store", "store"), ("/gallery", "gallery"), ("/login", "login")]
        for path, name in mobile_pages:
            test_mobile_responsive(page, path, name)

        # 3. Gallery-specific tests
        test_gallery_features(page)

        # 4. Interactive element tests
        test_interactive_elements(page)

        browser.close()

    # Summary
    print(f"\n{'='*60}")
    print(f"RESULTS: {results['pages_passed']}/{results['pages_tested']} pages passed")
    print(f"Console errors: {len(results['console_errors'])}")
    print(f"Network errors: {len(results['network_errors'])}")

    if results["findings"]:
        print(f"\nFindings:")
        for f in results["findings"]:
            print(f"  - {f}")

    if results["console_errors"]:
        print(f"\nConsole Errors (first 10):")
        for e in results["console_errors"][:10]:
            print(f"  [{e['page']}] {e['text'][:150]}")

    if results["network_errors"]:
        print(f"\nNetwork Errors (first 10):")
        for e in results["network_errors"][:10]:
            print(f"  [{e['page']}] {e['status']} {e['url'][:100]}")

    # Write JSON report
    report_path = os.path.join(SCREENSHOT_DIR, "report.json")
    with open(report_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nReport saved: {report_path}")
    print(f"Screenshots saved: {SCREENSHOT_DIR}")

    return 0 if results["pages_failed"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
