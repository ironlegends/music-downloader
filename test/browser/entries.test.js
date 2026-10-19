import test from 'node:test';
import assert from 'node:assert/strict';
import { bootstrapExtensionContent } from '../../src/browser/entries/extension.js';
import { mount as mountConsoleScript } from '../../src/browser/entries/console-script.js';

test('entries: bootstrapExtensionContent stays inert on an unauthorized URL', () => {
  const mockWindow = {
    location: {
      origin: 'https://other-domain.com',
      pathname: '/home',
      href: 'https://other-domain.com/home'
    },
    URL: globalThis.URL
  };
  const mockDoc = {
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const res = bootstrapExtensionContent({
    windowRef: mockWindow,
    documentRef: mockDoc,
    URLImpl: globalThis.URL
  });

  // createBrowserCore returns undefined on an unauthorized page.
  assert.equal(res, undefined);
});

test('entries: mountConsoleScript enables the console compatibility flags', () => {
  const mockWindow = {
    location: {
      origin: 'https://spotmate.online',
      pathname: '/en1',
      href: 'https://spotmate.online/en1'
    },
    URL: globalThis.URL,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout
  };
  const mockDoc = {
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
      appendChild: () => {},
      setAttribute: () => {},
      addEventListener: () => {},
      classList: { add: () => {} },
      style: {}
    }),
    head: { appendChild: () => {} },
    body: { appendChild: () => {} }
  };

  const res = mountConsoleScript({
    windowRef: mockWindow,
    documentRef: mockDoc,
    URLImpl: globalThis.URL
  });

  assert.ok(res);
  assert.equal(typeof res.mount, 'function');
  assert.ok(res.view);
  assert.ok(res.pageAdapter);
  assert.ok(res.apiAdapter);
  assert.ok(res.downloadAdapter);
});
