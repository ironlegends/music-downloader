export function assertChromeTarget(browser) {
  if (typeof browser !== 'string' || browser.toLowerCase() !== 'chrome') {
    throw new Error('Unsupported browser target: only "chrome" is supported.');
  }

  return 'chrome';
}
