#!/usr/bin/env node

import puppeteer from 'puppeteer';

const DEV_URL = 'http://localhost:5175/';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testChordRendering() {
  console.log('=== Testing Chord Rendering ===\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();

    // Navigate to the dev server
    console.log(`Loading ${DEV_URL}...`);
    await page.goto(DEV_URL, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for Verovio initialization
    console.log('Waiting for Verovio...');
    await page.waitForFunction(
      () => document.querySelector('.status')?.textContent?.includes('Ready'),
      { timeout: 60000 }
    );
    console.log('Verovio initialized!\n');

    await sleep(1500);

    // Test 1: C major chord
    console.log('Test 1: C major chord (c e g)');
    const chordCode = 'BOM K0 TN4 TD4 S1 Cg c e g D4 EOM';

    // Clear and type the chord code
    await page.evaluate((code) => {
      const editor = document.querySelector('.cm-content');
      if (editor) {
        // Use CodeMirror dispatch to set value
        const view = editor.closest('.cm-editor')?.cmView?.view;
        if (view) {
          view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: code }
          });
        }
      }
    }, chordCode);

    // Alternative: click on editor and type
    await page.click('.cm-content');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.type(chordCode);

    await sleep(2000);

    // Check if SVG is rendered
    const hasSvg = await page.evaluate(() => {
      return document.querySelector('.svg-container svg') !== null;
    });
    console.log(`  SVG rendered: ${hasSvg ? 'YES' : 'NO'}`);

    // Get the MEI output
    await page.click('.export-btn[title*="MEI"]');
    await sleep(500);

    const meiContent = await page.evaluate(() => {
      const meiExport = document.querySelector('.mei-export') || document.querySelector('textarea');
      return meiExport ? meiExport.value || meiExport.textContent : null;
    });

    // Check for chord element in MEI
    const hasChordElement = meiContent && meiContent.includes('<chord');
    console.log(`  MEI has <chord> element: ${hasChordElement ? 'YES' : 'NO'}`);

    // Take screenshot of chord rendering
    await page.screenshot({ path: '/tmp/chord-render-1.png', fullPage: true });
    console.log('  Screenshot: /tmp/chord-render-1.png\n');

    // Test 2: Multiple chords in sequence
    console.log('Test 2: Multiple chords (C-E-G, D-F-A)');
    const multiChordCode = 'BOM K0 TN4 TD4 S1 Cg c e g D4 d f a D4 EOM';

    await page.click('.cm-content');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.type(multiChordCode);

    await sleep(2000);

    // Take screenshot
    await page.screenshot({ path: '/tmp/chord-render-2.png', fullPage: true });
    console.log('  Screenshot: /tmp/chord-render-2.png\n');

    // Test 3: Mixed notes and chords
    console.log('Test 3: Mixed notes and chords');
    const mixedCode = 'BOM K0 TN4 TD4 S1 Cg c D4 c e g D2 d D4 d f a D2 EOM';

    await page.click('.cm-content');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.type(mixedCode);

    await sleep(2000);

    await page.screenshot({ path: '/tmp/chord-render-3.png', fullPage: true });
    console.log('  Screenshot: /tmp/chord-render-3.png\n');

    // Test 4: Chord with accidental
    console.log('Test 4: Chord with accidental (c# e g)');
    const accidentalChordCode = 'BOM K0 TN4 TD4 S1 Cg c As e g D4 EOM';

    await page.click('.cm-content');
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.type(accidentalChordCode);

    await sleep(2000);

    await page.screenshot({ path: '/tmp/chord-render-4.png', fullPage: true });
    console.log('  Screenshot: /tmp/chord-render-4.png\n');

    console.log('=== All Chord Rendering Tests Completed ===');
    console.log('\nScreenshots saved to /tmp/chord-render-*.png');

  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testChordRendering();
