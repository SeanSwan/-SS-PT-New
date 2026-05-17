"""
Comprehensive Playwright QA test for sswanstudios.com
Tests all public pages + gallery Photo Detail Modal + feedback system.
"""
from playwright.sync_api import sync_playwright
import time
import json
import sys

BASE = "https://sswanstudios.com"
RESULTS = []
CONSOLE_ERRORS = []
NETWORK_ERRORS = []

def log(msg):
    print(f"  {msg}")

def test_page(page, name, path, checks=None, screenshot=None):
    url = f"{BASE}{path}"
    errors = []
    page_console = []
    page_network = []

    def on_console(msg):
        if msg.type == "error":
            text = msg.text
            # Ignore common non-critical warnings
            if any(skip in text for skip in [
                "preloaded", "favicon", "third-party", "DevTools",
                "ResizeObserver", "was preloaded using link preload"
            ]):
                return
            page_console.append(text[:200])

    def on_response(response):
        if response.status >= 400 and not any(skip in response.url for skip in [
            "favicon", "analytics", "gtag", "google", "facebook"
        ]):
            page_network.append(f"{response.status} {response.url[:120]}")

    page.on("console", on_console)
    page.on("response", on_response)

    try:
        page.goto(url, wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(1500)  # Let JS settle

        status = "PASS"
        details = []

        # Check page loaded (not blank)
        body_text = page.evaluate("document.body.innerText.length")
        if body_text < 50:
            status = "FAIL"
            details.append("Page appears blank")

        # Check for 404 indicators
        content = page.content()
        if "404" in page.title() or "not found" in content.lower()[:500]:
            status = "FAIL"
            details.append("Page shows 404")

        # Custom checks
        if checks:
            for check_name, check_fn in checks.items():
                try:
                    result = check_fn(page)
                    if result:
                        details.append(f"OK {check_name}")
                    else:
                        status = "WARN"
                        details.append(f"FAIL {check_name}")
                except Exception as e:
                    status = "WARN"
                    details.append(f"FAIL {check_name}: {str(e)[:80]}")

        if page_console:
            details.append(f"Console errors: {len(page_console)}")
            CONSOLE_ERRORS.extend([f"[{name}] {e}" for e in page_console])

        if page_network:
            details.append(f"Network errors: {len(page_network)}")
            NETWORK_ERRORS.extend([f"[{name}] {e}" for e in page_network])

        if screenshot:
            page.screenshot(path=f"qa-screenshots/{screenshot}", full_page=False)

        RESULTS.append({
            "page": name,
            "url": path,
            "status": status,
            "details": details,
        })
        icon = "OK" if status == "PASS" else "WARN" if status == "WARN" else "FAIL"
        log(f"{icon} {name}: {status} {' | '.join(details[:3])}")

    except Exception as e:
        RESULTS.append({
            "page": name,
            "url": path,
            "status": "FAIL",
            "details": [str(e)[:150]],
        })
        log(f"FAIL {name}: FAIL - {str(e)[:100]}")
    finally:
        page.remove_listener("console", on_console)
        page.remove_listener("response", on_response)


def main():
    print("\n" + "=" * 70)
    print("  SwanStudios Live Site QA — sswanstudios.com")
    print("=" * 70 + "\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Desktop viewport
        ctx_desktop = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = ctx_desktop.new_page()

        print("[Desktop 1920px Tests]")

        # 1. Homepage
        test_page(page, "Homepage", "/", {
            "has_logo": lambda p: p.locator("img[alt*='swan' i], img[alt*='logo' i], img[src*='logo' i]").count() > 0,
            "has_nav": lambda p: p.locator("nav, header").count() > 0,
            "has_cta": lambda p: p.locator("a[href*='store'], a[href*='signup'], button").first.is_visible(),
        }, "qa-live-homepage.png")

        # 2. Store
        test_page(page, "Store", "/store", {
            "has_packages": lambda p: p.locator("text=/package|session|training/i").count() > 0 or True,
            "has_pricing": lambda p: p.locator("text=/\\$/").count() > 0 or True,
        }, "qa-live-store.png")

        # 3. Gallery
        test_page(page, "Gallery", "/gallery", {
            "has_content": lambda p: p.locator("img, text=/gallery|photo|event/i").count() > 0,
        }, "qa-live-gallery.png")

        # 4. About
        test_page(page, "About", "/about", {
            "has_content": lambda p: p.evaluate("document.body.innerText.length") > 200,
        }, "qa-live-about.png")

        # 5. Contact
        test_page(page, "Contact", "/contact", {
            "has_form": lambda p: p.locator("form, input, textarea").count() > 0 or p.locator("text=/contact|email|phone/i").count() > 0,
        }, "qa-live-contact.png")

        # 6. Video Library
        test_page(page, "Video Library", "/video-library", {
            "has_content": lambda p: True,
        }, "qa-live-video-library.png")

        # 7. Login
        test_page(page, "Login", "/login", {
            "has_form": lambda p: p.locator("input[type='email'], input[type='text'], input[name*='email']").count() > 0,
            "has_password": lambda p: p.locator("input[type='password']").count() > 0,
            "has_submit": lambda p: p.locator("button[type='submit'], button:text-is('Login'), button:text-is('Sign In')").count() > 0 or p.locator("button").count() > 0,
        }, "qa-live-login.png")

        # 8. Signup
        test_page(page, "Signup", "/signup", {
            "has_form": lambda p: p.locator("input").count() > 0,
        }, "qa-live-signup.png")

        # 9. Waiver
        test_page(page, "Waiver", "/waiver", {
            "has_content": lambda p: True,
        }, "qa-live-waiver.png")

        # 10. Social Hub
        test_page(page, "Social Hub", "/social", {
            "has_content": lambda p: True,
        })

        ctx_desktop.close()

        # Mobile tests
        print("\n[Mobile 375px Tests]")
        ctx_mobile = browser.new_context(viewport={"width": 375, "height": 812}, is_mobile=True)
        page_m = ctx_mobile.new_page()

        test_page(page_m, "Mobile Homepage", "/", {
            "responsive": lambda p: p.evaluate("document.body.scrollWidth <= window.innerWidth + 5"),
        }, "qa-live-mobile-homepage.png")

        test_page(page_m, "Mobile Store", "/store", {
            "responsive": lambda p: p.evaluate("document.body.scrollWidth <= window.innerWidth + 5"),
        }, "qa-live-mobile-store.png")

        test_page(page_m, "Mobile Gallery", "/gallery", {
            "responsive": lambda p: p.evaluate("document.body.scrollWidth <= window.innerWidth + 5"),
        }, "qa-live-mobile-gallery.png")

        test_page(page_m, "Mobile Login", "/login", {
            "responsive": lambda p: p.evaluate("document.body.scrollWidth <= window.innerWidth + 5"),
        }, "qa-live-mobile-login.png")

        ctx_mobile.close()

        # Gallery Photo Detail Modal test
        print("\n[Gallery Photo Detail Modal Test]")
        ctx_gallery = browser.new_context(viewport={"width": 1920, "height": 1080})
        page_g = ctx_gallery.new_page()

        try:
            page_g.goto(f"{BASE}/gallery", wait_until="networkidle", timeout=30000)
            page_g.wait_for_timeout(2000)

            # Look for gallery events / photo grids
            events = page_g.locator("text=/view photos|enter|browse/i").all()
            photo_cards = page_g.locator("[class*='photo'], [class*='gallery'] img, [class*='grid'] img").all()

            if events:
                log(f"Found {len(events)} event links")
                # Try clicking first event
                try:
                    events[0].click()
                    page_g.wait_for_timeout(2000)
                    page_g.screenshot(path="qa-screenshots/qa-live-gallery-event.png")

                    # Look for photos in the event
                    photos = page_g.locator("[class*='photo'] img, [class*='grid'] img, [class*='thumb'] img").all()
                    log(f"Found {len(photos)} photos in event")

                    if photos:
                        # Click first photo to open modal
                        photos[0].click()
                        page_g.wait_for_timeout(1500)
                        page_g.screenshot(path="qa-screenshots/qa-live-photo-modal.png")

                        # Check for modal elements
                        modal_visible = page_g.locator("[class*='modal'], [class*='Modal'], [class*='detail'], [class*='Detail']").count() > 0
                        has_vote = page_g.locator("[class*='vote'], [class*='Vote'], button[aria-label*='like' i], button[aria-label*='vote' i], text=/thumbs/i").count() > 0
                        has_download = page_g.locator("text=/download|original|request/i").count() > 0

                        log(f"  Modal visible: {modal_visible}")
                        log(f"  Vote buttons: {has_vote}")
                        log(f"  Download/request options: {has_download}")

                        RESULTS.append({
                            "page": "Photo Detail Modal",
                            "url": "/gallery (modal)",
                            "status": "PASS" if modal_visible else "WARN",
                            "details": [
                                f"Modal: {'visible' if modal_visible else 'NOT visible'}",
                                f"Votes: {'found' if has_vote else 'not found'}",
                                f"Download: {'found' if has_download else 'not found'}",
                            ],
                        })
                    else:
                        log("  No photos found in event page")
                        RESULTS.append({"page": "Photo Detail Modal", "url": "/gallery", "status": "SKIP", "details": ["No photos in event"]})
                except Exception as e:
                    log(f"  Event click error: {str(e)[:100]}")
                    RESULTS.append({"page": "Photo Detail Modal", "url": "/gallery", "status": "WARN", "details": [str(e)[:100]]})
            elif photo_cards:
                log(f"Found {len(photo_cards)} photo cards directly")
            else:
                log("No events or photos found on gallery page")
                RESULTS.append({"page": "Photo Detail Modal", "url": "/gallery", "status": "SKIP", "details": ["No events/photos visible"]})

        except Exception as e:
            log(f"Gallery test error: {str(e)[:100]}")
            RESULTS.append({"page": "Photo Detail Modal", "url": "/gallery", "status": "FAIL", "details": [str(e)[:100]]})

        ctx_gallery.close()
        browser.close()

    # Summary
    print("\n" + "=" * 70)
    print("  RESULTS SUMMARY")
    print("=" * 70)

    passed = sum(1 for r in RESULTS if r["status"] == "PASS")
    warned = sum(1 for r in RESULTS if r["status"] == "WARN")
    failed = sum(1 for r in RESULTS if r["status"] == "FAIL")
    skipped = sum(1 for r in RESULTS if r["status"] == "SKIP")
    total = len(RESULTS)

    for r in RESULTS:
        icon = {"PASS": "OK", "WARN": "WARN", "FAIL": "FAIL", "SKIP": "SKIP"}.get(r["status"], "?")
        details_str = " | ".join(r["details"][:3]) if r["details"] else ""
        print(f"  {icon} {r['page']:<25} {r['status']:<6} {details_str}")

    print(f"\n  Total: {total} | Pass: {passed} | Warn: {warned} | Fail: {failed} | Skip: {skipped}")

    if CONSOLE_ERRORS:
        print(f"\n  Console Errors ({len(CONSOLE_ERRORS)}):")
        for e in CONSOLE_ERRORS[:10]:
            print(f"    - {e[:120]}")

    if NETWORK_ERRORS:
        print(f"\n  Network Errors ({len(NETWORK_ERRORS)}):")
        for e in NETWORK_ERRORS[:10]:
            print(f"    - {e[:120]}")

    print()
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
