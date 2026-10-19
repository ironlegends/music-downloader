import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const consoleScriptPath = path.join(rootDir, 'console-script.js');
const extensionScriptPath = path.join(rootDir, 'extension/content-script.js');

function createEnvironment({ locationHref = 'https://spotmate.online/en1', tracks = ['track_1', 'track_2'] } = {}) {
  const requests = [];
  const events = [];

  const documentRef = {
    head: {
      appendChild(el) { this.children.push(el); },
      children: []
    },
    body: {
      appendChild(el) { this.children.push(el); },
      removeChild(el) { this.children = this.children.filter((c) => c !== el); },
      children: []
    },
    createElement(tag) {
      const listeners = {};
      const attrs = {};
      const el = {
        tagName: tag.toUpperCase(),
        className: '',
        id: '',
        textContent: '',
        disabled: false,
        checked: true,
        children: [],
        appendChild(child) { this.children.push(child); },
        setAttribute(name, value) { attrs[name] = String(value); },
        getAttribute(name) { return attrs[name] ?? null; },
        addEventListener(event, fn) {
          if (!listeners[event]) listeners[event] = [];
          listeners[event].push(fn);
        },
        dispatchEvent(event) {
          if (listeners[event.type]) {
            for (const fn of listeners[event.type]) fn(event);
          }
        },
        click() {
          this.dispatchEvent({ type: 'click', isTrusted: true });
        },
        remove() {}
      };
      return el;
    },
    getElementById(id) {
      const search = (node) => {
        if (!node) return null;
        if (node.id === id) return node;
        for (const child of node.children || []) {
          const res = search(child);
          if (res) return res;
        }
        return null;
      };
      return search(this.body);
    },
    querySelector(sel) {
      if (sel === '#tracks') {
        return {
          querySelectorAll(s) {
            return tracks.map((id) => ({
              tagName: 'INPUT',
              name: id,
              id,
              value: `spotify:track:${id}`,
              type: 'hidden'
            }));
          }
        };
      }
      return null;
    }
  };

  const parsedUrl = new URL(locationHref);
  const windowRef = {
    location: {
      href: locationHref,
      origin: parsedUrl.origin,
      hostname: parsedUrl.hostname,
      pathname: parsedUrl.pathname
    },
    document: documentRef,
    URL: globalThis.URL,
    AbortController: globalThis.AbortController,
    setTimeout: (fn, ms) => {
      events.push({ type: 'timer', delayMs: ms });
      return setTimeout(fn, 1);
    },
    clearTimeout: (id) => clearTimeout(id),
    fetch: async (url, options = {}) => {
      const reqPath = new URL(url, 'https://spotmate.online').pathname;
      requests.push({ method: options.method || 'GET', path: reqPath });
      events.push({ type: 'fetch', path: reqPath });
      return {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'application/json']]),
        json: async () => ({ status: 'success', result: 'https://cdn.example.invalid/audio.mp3' }),
        text: async () => JSON.stringify({ status: 'success', result: 'https://cdn.example.invalid/audio.mp3' })
      };
    },
    sessionStorage: {
      store: new Map(),
      getItem(k) { return this.store.get(k) || null; },
      setItem(k, v) { this.store.set(k, String(v)); },
      removeItem(k) { this.store.delete(k); },
      clear() { this.store.clear(); }
    }
  };

  return { windowRef, documentRef, requests, events };
}

test('surface parity: the console script and extension keep isolated runtime bundles', () => {
  const consoleScript = fs.readFileSync(consoleScriptPath, 'utf8');
  const extension = fs.readFileSync(extensionScriptPath, 'utf8');

  // Both bundles must use strict mode and remain self-contained.
  assert.match(consoleScript, /['"]use strict['"]/);
  assert.match(extension, /['"]use strict['"]/);

  // The extension must not duplicate the shared core.
  const coreSource = fs.readFileSync(path.join(rootDir, 'src/browser/index.js'), 'utf8');
  const matchCount = (extension.match(/createBrowserCore/g) || []).length;
  assert.ok(matchCount >= 1 && matchCount <= 10, 'The extension must not duplicate the core.');
});

test('trace parity: both bundles refuse unauthorized pages', () => {
  for (const scriptPath of [consoleScriptPath, extensionScriptPath]) {
    const code = fs.readFileSync(scriptPath, 'utf8');
    const env = createEnvironment({ locationHref: 'https://evil.invalid/page' });

    const sandbox = {
      window: env.windowRef,
      document: env.documentRef,
      URL: globalThis.URL,
      AbortController: globalThis.AbortController,
      setTimeout: env.windowRef.setTimeout,
      clearTimeout: env.windowRef.clearTimeout,
      fetch: env.windowRef.fetch,
      console
    };
    sandbox.globalThis = sandbox;
    sandbox.window.window = sandbox.window;

    const context = vm.createContext(sandbox);
    vm.runInContext(code, context);

    // No network request or panel should be created.
    assert.equal(env.requests.length, 0);
    assert.equal(env.documentRef.body.children.length, 0);
  }
});

test('the extension bundle contains no secrets, tokens, or raw audio URLs', () => {
  const extension = fs.readFileSync(extensionScriptPath, 'utf8');
  assert.equal(/sessionStorage[^\n]*(password|token|secret)/i.test(extension), false);
  assert.equal(/https:\/\/[^\s'"]+\.mp3/i.test(extension), false);
});
