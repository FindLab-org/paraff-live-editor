import puppeteer from 'puppeteer';

async function testParaffLiveEditor() {
    console.log('Starting browser test...');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Collect console messages
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Collect errors
    const errors = [];
    page.on('pageerror', err => {
        errors.push(err.message);
    });

    try {
        console.log('Navigating to http://localhost:5176/...');
        await page.goto('http://localhost:5176/', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        console.log('Page loaded. Waiting for Verovio initialization...');

        // Wait for Verovio to initialize (check for "Ready" status)
        await page.waitForFunction(
            () => document.body.innerText.includes('Ready') || document.body.innerText.includes('Verovio'),
            { timeout: 15000 }
        );

        // Wait a bit more for rendering
        await new Promise(r => setTimeout(r, 3000));

        // Check for SVG in preview
        const hasSvg = await page.evaluate(() => {
            const svgContainer = document.querySelector('.svg-container svg');
            return svgContainer !== null;
        });

        // Get page title
        const title = await page.title();

        // Get status text
        const statusText = await page.evaluate(() => {
            const status = document.querySelector('.status');
            return status ? status.textContent : 'N/A';
        });

        // Check if editor has content
        const editorContent = await page.evaluate(() => {
            const cmContent = document.querySelector('.cm-content');
            return cmContent ? cmContent.textContent : 'N/A';
        });

        console.log('\n=== Test Results ===');
        console.log(`Page Title: ${title}`);
        console.log(`Status: ${statusText}`);
        console.log(`Editor Content: ${editorContent.substring(0, 100)}...`);
        console.log(`SVG Rendered: ${hasSvg ? 'YES' : 'NO'}`);

        console.log('\n=== Console Logs ===');
        consoleLogs.forEach(log => console.log(log));

        if (errors.length > 0) {
            console.log('\n=== Page Errors ===');
            errors.forEach(err => console.log(`ERROR: ${err}`));
        }

        // Take screenshot
        await page.screenshot({ path: '/tmp/paraff-live-editor-test.png', fullPage: true });
        console.log('\nScreenshot saved to /tmp/paraff-live-editor-test.png');

        // Overall result
        console.log('\n=== Summary ===');
        if (hasSvg && statusText.includes('Ready')) {
            console.log('TEST PASSED: Application is working correctly!');
        } else if (errors.length > 0) {
            console.log('TEST FAILED: Errors detected');
        } else {
            console.log('TEST PARTIAL: Page loaded but SVG not rendered');
        }

    } catch (err) {
        console.error('Test error:', err.message);

        // Take screenshot on error
        await page.screenshot({ path: '/tmp/paraff-live-editor-error.png', fullPage: true });
        console.log('Error screenshot saved to /tmp/paraff-live-editor-error.png');

        console.log('\n=== Console Logs ===');
        consoleLogs.forEach(log => console.log(log));

        if (errors.length > 0) {
            console.log('\n=== Page Errors ===');
            errors.forEach(err => console.log(`ERROR: ${err}`));
        }
    } finally {
        await browser.close();
    }
}

testParaffLiveEditor().catch(console.error);
