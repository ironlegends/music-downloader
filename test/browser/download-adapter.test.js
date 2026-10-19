import test from 'node:test';
import assert from 'node:assert/strict';
import { createDownloadAdapter } from '../../src/browser/download-adapter.js';

function createDom() {
  const body = { children: [] };
  const anchors = [];
  const makeElement = (tagName) => {
    const listeners = new Map();
    const element = {
      tagName: tagName.toUpperCase(),
      id: '',
      textContent: '',
      href: '',
      target: '',
      rel: '',
      disabled: false,
      children: [],
      parentNode: null,
      appendChild(child) { child.parentNode = element; element.children.push(child); return child; },
      addEventListener(name, handler) { listeners.set(name, handler); },
      dispatch(name, event = {}) { return listeners.get(name)?.({ currentTarget: element, preventDefault() {}, ...event }); },
      click() { anchors.push(element.href); },
      remove() {
        if (element.parentNode) element.parentNode.children = element.parentNode.children.filter((child) => child !== element);
        element.removed = true;
      },
      setAttribute(name, value) { element[name] = String(value); },
      querySelectorAll(selector) {
        const found = [];
        const visit = (node) => {
          for (const child of node.children || []) {
            if (selector === 'button' && child.tagName === 'BUTTON') found.push(child);
            visit(child);
          }
        };
        visit(element);
        return found;
      },
      querySelector(selector) { return element.querySelectorAll(selector)[0] || null; }
    };
    if (element.tagName === 'A') element.click = () => anchors.push(element.href);
    return element;
  };
  body.appendChild = (child) => { child.parentNode = body; body.children.push(child); return child; };
  return {
    documentRef: {
      body,
      createElement: makeElement,
      querySelector(selector) { return body.children.find((child) => child.id === selector.slice(1)) || null; }
    },
    body,
    anchors
  };
}

function runtime(exposeLegacyGlobals = false) {
  const dom = createDom();
  const delays = [];
  const windowRef = {
    URL,
    setTimeout(callback, delay) { delays.push(delay); queueMicrotask(callback); return callback; },
    clearTimeout() {}
  };
  const adapter = createDownloadAdapter({ ...dom, windowRef, exposeLegacyGlobals });
  return { ...dom, adapter, windowRef, delays };
}

test('render filters to HTTPS successes, remains voluntary, and removes a stale panel', () => {
  const env = runtime(false);
  const first = env.adapter.render([
    { id: 'https', kind: 'success', url: 'https://example.invalid/one.mp3' },
    { id: 'http', kind: 'success', url: 'http://example.invalid/no.mp3' },
    { id: 'failed', kind: 'terminal', url: 'https://example.invalid/no.mp3' }
  ]);
  const oldPanel = env.body.children[0];
  assert.equal(first, 1);
  assert.equal(env.anchors.length, 0);
  assert.equal(env.windowRef.downloadUrls, undefined);
  assert.equal(oldPanel.querySelectorAll('button').some((button) => button.textContent.includes('https://')), false);
  env.adapter.render([]);
  assert.equal(oldPanel.removed, true);
  assert.equal(env.body.children.length, 0);
  assert.equal(env.anchors.length, 0);
});

test('a trusted click downloads one item and bulk download waits 1500 ms', async () => {
  const env = runtime(true);
  env.adapter.render([
    { id: 'one', kind: 'success', url: 'https://example.invalid/one.mp3' },
    { id: 'two', kind: 'success', url: 'https://example.invalid/two.mp3' }
  ]);
  const buttons = env.body.children[0].querySelectorAll('button');
  const allButton = buttons.find((b) => b.textContent === 'Download all');
  const track1Button = buttons.find((b) => b.textContent === 'Download one');

  assert.ok(allButton, 'The Download all button must be present.');
  assert.ok(track1Button, 'The individual download button must be present.');

  // Rendering must not populate windowRef.downloadUrls.
  assert.equal(env.windowRef.downloadUrls, undefined);

  await track1Button.dispatch('click', { isTrusted: false });
  assert.deepEqual(env.anchors, []);
  assert.equal(env.windowRef.downloadUrls, undefined);

  await track1Button.dispatch('click', { isTrusted: true });
  assert.deepEqual(env.anchors, ['https://example.invalid/one.mp3']);
  assert.deepEqual(env.windowRef.downloadUrls, [
    'https://example.invalid/one.mp3',
    'https://example.invalid/two.mp3'
  ]);

  const pending = allButton.dispatch('click', { isTrusted: true });
  assert.equal(allButton.disabled, true);
  await pending;
  assert.equal(allButton.disabled, false);
  assert.deepEqual(env.anchors, [
    'https://example.invalid/one.mp3',
    'https://example.invalid/one.mp3',
    'https://example.invalid/two.mp3'
  ]);
  assert.deepEqual(env.delays, [1500]);
  assert.deepEqual(env.windowRef.downloadUrls, [
    'https://example.invalid/one.mp3',
    'https://example.invalid/two.mp3'
  ]);

  // clear() must remove items and delete the global.
  env.adapter.clear();
  assert.equal(env.windowRef.downloadUrls, undefined);
  await env.adapter.downloadAll({ isTrusted: true });
  // No additional anchor should be added.
  assert.equal(env.anchors.length, 3);
});
