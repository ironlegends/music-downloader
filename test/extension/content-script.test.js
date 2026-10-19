import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contentScriptPath = path.join(rootDir, 'extension', 'content-script.js');

test('content-script: isolated execution, passive mounting, and domain filtering', () => {
  assert.ok(fs.existsSync(contentScriptPath), 'content-script.js must exist');
  const code = fs.readFileSync(contentScriptPath, 'utf8');

  // The content script must use a strict IIFE.
  assert.match(code, /\(function\s*\(\)\s*\{\s*['"]use strict['"];/);

  // On an unauthorized domain, it must stay passive without throwing.
  const unauthWindow = {
    location: {
      origin: 'https://example.com',
      pathname: '/some-page',
      href: 'https://example.com/some-page'
    }
  };
  const unauthDoc = {
    querySelector: () => null,
    querySelectorAll: () => [],
    head: { appendChild: () => {} },
    body: { appendChild: () => {} }
  };
  const unauthContext = {
    window: unauthWindow,
    document: unauthDoc,
    setTimeout: () => {},
    clearTimeout: () => {},
    fetch: () => {},
    AbortController: class {},
    URL: class { constructor(u) { return new URL(u, 'https://example.com'); } }
  };
  unauthContext.globalThis = unauthContext;
  vm.createContext(unauthContext);

  assert.doesNotThrow(() => {
    vm.runInContext(code, unauthContext);
  });

  // It must not pollute the global scope.
  assert.equal(unauthContext.createBrowserCore, undefined);
  assert.equal(unauthContext.mountPlaylistPanel, undefined);
});
