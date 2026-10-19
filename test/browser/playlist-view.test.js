import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaylistView } from '../../src/browser/playlist-view.js';

function createDom() {
  const body = { children: [] };
  const makeElement = (tagName) => {
    const listeners = new Map();
    const element = {
      tagName: tagName.toUpperCase(),
      id: '',
      type: '',
      textContent: '',
      disabled: false,
      children: [],
      parentNode: null,
      appendChild(child) { child.parentNode = element; element.children.push(child); return child; },
      addEventListener(name, handler) { listeners.set(name, handler); },
      dispatch(name, event = {}) { return listeners.get(name)?.({ currentTarget: element, preventDefault() {}, ...event }); },
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
    return element;
  };
  body.appendChild = (child) => { child.parentNode = body; body.children.push(child); return child; };
  const documentRef = {
    body,
    createElement: makeElement,
    querySelector(selector) { return body.children.find((child) => child.id === selector.slice(1)) || null; }
  };
  return { documentRef, body };
}

test('the visible panel uses clear English action labels without showing the final URL', () => {
  const { documentRef } = createDom();
  const view = createPlaylistView({ documentRef });
  view.mount();
  const panel = documentRef.querySelector('#spotmate-voluntary-panel');
  assert.ok(panel);
  const labels = panel.querySelectorAll('button').map((button) => button.textContent);
  assert.deepEqual(labels, [
    'Load Spotify URL',
    'Start conversions',
    'Cancel',
    'Download all'
  ]);
  assert.equal(labels.some((label) => label.includes('https://')), false);
});

test('handlers ignore untrusted events and replace the stale panel', () => {
  const { documentRef, body } = createDom();
  const calls = [];
  const view = createPlaylistView({
    documentRef,
    onLoad: () => calls.push('load'),
    onStart: () => calls.push('start'),
    onCancel: () => calls.push('cancel'),
    onDownloadAll: () => calls.push('all')
  });
  view.mount();
  const oldPanel = body.children[0];
  for (const button of oldPanel.querySelectorAll('button')) button.dispatch('click', { isTrusted: false });
  assert.deepEqual(calls, []);
  view.mount();
  assert.equal(oldPanel.removed, true);
  assert.equal(body.children.length, 1);
  const buttons = body.children[0].querySelectorAll('button');
  buttons[0].dispatch('click', { isTrusted: true });
  buttons[1].dispatch('click', { isTrusted: true });
  buttons[2].dispatch('click', { isTrusted: true });
  buttons[3].dispatch('click', { isTrusted: true });
  assert.deepEqual(calls, ['load', 'start', 'cancel', 'all']);
});
