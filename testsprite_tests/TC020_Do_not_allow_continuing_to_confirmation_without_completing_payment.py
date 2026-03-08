import asyncio
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",         # Set the browser window size
                "--disable-dev-shm-usage",        # Avoid using /dev/shm which can cause issues in containers
                "--ipc=host",                     # Use host-level IPC for better stability
                "--single-process"                # Run the browser in a single process mode
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        context.set_default_timeout(5000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Navigate to http://localhost:3000/
        await page.goto("http://localhost:3000/", wait_until="commit", timeout=10000)
        
        # -> Click on the 'Sign In' button (use element index 93).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/header/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Fill in the email and password fields in the auth modal and click the 'SIGN IN' button to log in.
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/header/div[4]/div/form/div/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('testsprite.runner@outlook.com')
        
        frame = context.pages[-1]
        # Input text
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/header/div[4]/div/form/div[2]/div/input').nth(0)
        await page.wait_for_timeout(3000); await elem.fill('TestSprite2026!Secure')
        
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/header/div[4]/div/form/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'BOOK AN INTRODUCTORY CALL' / 'Book a session' button to open the booking flow (element index 109).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/main/section/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Select a date by clicking the first available date (Sunday March 8) - element index 1146.
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/div/div/div/div/div[3]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # -> Click the 'Proceed to payment' button so the payment view opens (click element index 1158).
        frame = context.pages[-1]
        # Click element
        elem = frame.locator('xpath=/html/body/div[2]/div[2]/button').nth(0)
        await page.wait_for_timeout(3000); await elem.click(timeout=5000)
        
        # --> Assertions to verify final state
        frame = context.pages[-1]
        # Verify 'Booking confirmed' is not visible in any known elements on the page
        paths = [
            '/html/body/div[2]/div[2]/header/div[1]',
            '/html/body/div[2]/div[2]/header/div[1]/div',
            '/html/body/div[2]/div[2]/header/div[1]/div/img',
            '/html/body/div[2]/div[2]/header/div[2]/button',
            '/html/body/div[2]/div[2]/main/section[1]/div[2]/button',
            '/html/body/div[2]/div[2]/main/section[1]/div[3]',
            '/html/body/div[2]/div[2]/main/section[1]/div[3]/div/svg',
        ]
        found = False
        for p in paths:
            locator = frame.locator(f"xpath={p}").nth(0)
            try:
                text = (await locator.inner_text()).strip()
            except Exception:
                # Some elements (e.g., img or svg) may not expose inner text; treat as empty
                text = ""
            if 'Booking confirmed' in text:
                found = True
                raise AssertionError(f"Unexpectedly found 'Booking confirmed' text in element with xpath={p}")
        assert not found, "Booking confirmed text is present on the page"
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    