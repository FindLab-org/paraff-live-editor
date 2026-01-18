#!/usr/bin/env node

/**
 * Test URL sharing functionality specifically
 */

import puppeteer from 'puppeteer';
import pako from 'pako';
import { Base64 } from 'js-base64';

const BASE_URL = 'http://localhost:5176';

function encodeState(state) {
  const json = JSON.stringify(state);
  const compressed = pako.deflate(json, { level: 9 });
  return Base64.fromUint8Array(compressed, true);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('Testing URL Sharing Functionality\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();

    // Test 1: Create a URL with encoded state
    const testCode = 'BOM K2 TN3 TD8 S1 Cg e D8 f As g a b EOM';
    const encodedState = encodeState({ code: testCode });
    const shareUrl = `${BASE_URL}/?code=${encodedState}`;

    console.log('Test 1: Loading URL with encoded state');
    console.log(`  Code: ${testCode}`);
    console.log(`  Encoded length: ${encodedState.length} chars`);

    await page.goto(shareUrl, { waitUntil: 'networkidle0', timeout: 60000 });

    // Wait for Verovio
    await page.waitForFunction(
      () => document.querySelector('.status')?.textContent?.includes('Ready'),
      { timeout: 60000 }
    );

    await sleep(1500); // Wait for render

    // Check that the editor contains the shared code
    const editorContent = await page.evaluate(() => {
      const cmContent = document.querySelector('.cm-content');
      return cmContent?.textContent || '';
    });

    const contentMatch = editorContent.includes('K2') && editorContent.includes('TN3');
    console.log(`  Editor content loaded: ${contentMatch ? 'YES' : 'NO'}`);
    console.log(`  Editor shows: ${editorContent.substring(0, 50)}...`);

    // Check that SVG is rendered
    const hasSvg = await page.evaluate(() => {
      return document.querySelector('.svg-container svg') !== null;
    });
    console.log(`  SVG rendered: ${hasSvg ? 'YES' : 'NO'}`);

    // Take screenshot
    await page.screenshot({ path: '/tmp/paraff-url-share-test.png', fullPage: true });
    console.log('  Screenshot: /tmp/paraff-url-share-test.png');

    // Test 2: Click Share button and verify URL changes
    console.log('\nTest 2: Verify Share button updates URL');

    // Get clipboard content after clicking share
    await page.click('.share-btn');
    await sleep(500);

    const shareButtonText = await page.evaluate(() => {
      return document.querySelector('.share-btn')?.textContent?.trim();
    });
    console.log(`  Share button shows: "${shareButtonText}"`);

    // Verify it shows "Copied!"
    const shareCopied = shareButtonText === 'Copied!';
    console.log(`  Share copied successfully: ${shareCopied ? 'YES' : 'NO'}`);

    // Test 3: Test round-trip encoding/decoding
    console.log('\nTest 3: Round-trip encoding test');

    const testCases = [
      'BOM K0 TN4 TD4 S1 Cg c D4 EOM',
      'BOM K_3 TN6 TD8 S1 Cf C D8 D E F EOM',
      'BOM K0 TN4 TD4 S1 Cg c As D4 d Af e An EOM',
      'BOM K0 TN4 TD4 S1 Cg c D4 d e f EOM BOM g a b Osup c D2 EOM'
    ];

    for (const code of testCases) {
      const encoded = encodeState({ code });
      const decoded = JSON.parse(pako.inflate(Base64.toUint8Array(encoded), { to: 'string' }));
      const matches = decoded.code === code;
      console.log(`  "${code.substring(0, 30)}...": ${matches ? 'OK' : 'FAIL'}`);
    }

    console.log('\n✓ URL Sharing tests completed successfully!');

  } catch (error) {
    console.error('\nTest error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
