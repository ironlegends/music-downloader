import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { generateBundle } from '../../tools/build-browser-artifacts.mjs';

test('artifact-parity: execution trace simulation', () => {
  const contentScript = generateBundle('console-script.js', process.cwd());
  const contentExt = generateBundle('extension/content-script.js', process.cwd());

  function runMock(code) {
    const trace = [];
    const mockWindow = {
      location: { origin: 'https://other.com' }
    };
    const mockDocument = {
      createElement: (tag) => { trace.push('create:' + tag); return {}; },
      querySelector: () => null,
      head: { appendChild: () => {} }
    };
    const context = {
      window: mockWindow,
      document: mockDocument,
      setTimeout: () => {},
      clearTimeout: () => {},
      fetch: () => {},
      AbortController: class {},
      URL: class {}
    };
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(code, context);
    return { trace, context };
  }

  const resScript = runMock(contentScript);
  const resExt = runMock(contentExt);

  assert.deepEqual(resScript.trace, resExt.trace);
});
