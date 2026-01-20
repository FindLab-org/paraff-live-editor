import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage();

const logs = [];
page.on('console', msg => logs.push('[' + msg.type() + '] ' + msg.text()));
page.on('pageerror', err => logs.push('[ERROR] ' + err.message));

try {
  console.log('=== Testing paraff-live-editor ===\n');

  await page.goto('http://localhost:4173/paraff-live-editor', { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForSelector('.app', { timeout: 10000 });

  // Wait for audio to load (up to 30s)
  console.log('Waiting for audio to load...');
  await page.waitForFunction(() => {
    const loadingText = document.querySelector('.loading-text');
    const errorText = document.querySelector('.error-text');
    return !loadingText || errorText;
  }, { timeout: 30000 });

  // Check state after audio load
  const state = await page.evaluate(() => ({
    loadingText: document.querySelector('.loading-text')?.textContent,
    errorText: document.querySelector('.error-text')?.textContent,
    playBtnDisabled: document.querySelector('.play-btn')?.disabled,
    playBtnExists: !!document.querySelector('.play-btn')
  }));
  console.log('State after audio load:', state);

  if (state.errorText) {
    console.log('Audio load error detected:', state.errorText);
  }

  if (!state.playBtnDisabled) {
    console.log('\nClicking play...');
    await page.click('.play-btn');

    // Check multiple times
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 500));
      const playState = await page.evaluate(() => ({
        time: document.querySelector('.time')?.textContent,
        isPlaying: !!document.querySelector('.pause-btn'),
        highlighted: document.querySelectorAll('.verovio-highlight').length
      }));
      console.log(`After ${(i+1)*500}ms:`, playState);
      if (playState.isPlaying) break;
    }
  }

  console.log('\n=== All Console logs ===');
  logs.forEach(l => console.log(l));

} catch (error) {
  console.error('Test error:', error.message);
  console.log('\n=== Console logs ===');
  logs.forEach(l => console.log(l));
}

await browser.close();
