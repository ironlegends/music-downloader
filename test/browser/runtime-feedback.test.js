import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserCore } from '../../src/browser/index.js';

function environment({ inputs = [], url = '', fetchImpl } = {}) {
  const observers = [];
  const requests = [];
  const anchors = [];
  let documentRef;
  function element(tag) {
    const listeners = new Map();
    return {
      tagName: tag.toUpperCase(), children: [], textContent: '', attributes: {},
      appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
      remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter((child) => child !== this); },
      setAttribute(key, value) { this.attributes[key] = String(value); },
      getAttribute(key) { return this.attributes[key] ?? null; },
      addEventListener(name, handler) { listeners.set(name, handler); },
      dispatch(event = { isTrusted: true }) { return listeners.get('click')?.(event); },
      focus() { documentRef.activeElement = this; },
      click() { anchors.push(this.href); },
      querySelectorAll(selector) {
        const descendants = this.children.flatMap((child) => [child, ...child.querySelectorAll('*')]);
        return selector === 'button' ? descendants.filter((child) => child.tagName === 'BUTTON') : descendants;
      }
    };
  }
  const body = element('body');
  const tracks = { inputs, querySelectorAll() { return this.inputs; } };
  const form = { submissions: 0 };
  const urlInput = { value: url, form };
  documentRef = {
    body, createElement: element,
    getElementById(id) { return body.querySelectorAll('*').find((node) => node.id === id) ?? null; },
    querySelector(selector) {
      if (selector === '#trackUrl') return urlInput;
      if (selector === '#tracks') return tracks;
      return selector.startsWith('#') ? this.getElementById(selector.slice(1)) : null;
    }
  };
  class HTMLFormElement {}
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submissions += 1;
    if (tracks.inputs.length > 0) queueMicrotask(() => {
      tracks.inputs = tracks.inputs.map((entry) => ({ ...entry }));
      for (const observer of observers) if (!observer.disconnected) observer.callback();
    });
  };
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const windowRef = {
    location: { origin: 'https://spotmate.online', pathname: '/en1' }, URL,
    HTMLFormElement, MutationObserver,
    setTimeout: (callback) => setTimeout(callback, 0), clearTimeout
  };
  const runtime = createBrowserCore({
    windowRef, documentRef, URLImpl: URL, AbortControllerImpl: AbortController,
    setTimeoutImpl: windowRef.setTimeout, clearTimeoutImpl: clearTimeout,
    fetchImpl: (...args) => {
      requests.push(args);
      return fetchImpl ? fetchImpl(...args) : Promise.resolve(response());
    }
  });
  const button = (label) => body.querySelectorAll('button').find((node) => node.textContent === label || node.getAttribute('aria-label') === label);
  return { runtime, button, body, documentRef, tracks, urlInput, form, observers, requests, anchors };
}

function response({ ok = true, status = 200 } = {}) {
  return { ok, status, headers: { get: () => 'application/json' }, json: async () => ({ url: 'https://example.invalid/ready' }) };
}

const track = { name: 'sample-track', value: 'https://open.spotify.com/track/demo' };
const allText = (node) => [node.textContent, ...node.children.map(allText)].join(' ');

test('first use explains the next action and recovers from invalid or missing input without a network request', async () => {
  const env = environment();
  assert.match(allText(env.runtime.view.panel), /paste.*Spotify.*verification/i);
  await assert.doesNotReject(async () => env.button('Load Spotify URL').dispatch());
  assert.match(env.runtime.view.status, /paste.*Spotify.*link field/i);
  await env.button('Start conversions').dispatch();
  assert.match(env.runtime.view.status, /no tracks.*load/i);
  assert.equal(env.requests.length, 0);
  assert.equal(env.form.submissions, 0);
});

test('loading remains cancellable, prevents concurrent actions and keeps the status node and keyboard focus', async () => {
  const env = environment({ url: 'https://open.spotify.com/playlist/demo' });
  const loadButton = env.button('Load Spotify URL');
  loadButton.focus();
  const statusNode = env.documentRef.getElementById('spotmate-operation-status');
  const loading = loadButton.dispatch();
  assert.match(env.runtime.view.status, /loading tracks/i);
  assert.equal(env.documentRef.activeElement, loadButton);
  assert.equal(loadButton.getAttribute('aria-disabled'), 'true');
  await loadButton.dispatch();
  await env.button('Start conversions').dispatch();
  assert.equal(env.form.submissions, 1);
  assert.equal(env.requests.length, 0);
  await env.button('Cancel').dispatch();
  await loading;
  assert.match(env.runtime.view.status, /canceled.*load/i);
  assert.equal(env.documentRef.getElementById('spotmate-operation-status'), statusNode);
  assert.equal(statusNode.getAttribute('role'), 'status');
  assert.equal(env.observers[0].disconnected, true);
  assert.equal(loadButton.getAttribute('aria-disabled'), 'false');
});

test('loaded tracks produce a ready state with a concrete next action', async () => {
  const env = environment({ url: 'https://open.spotify.com/playlist/demo' });
  const loading = env.button('Load Spotify URL').dispatch();
  env.tracks.inputs = [track];
  env.observers[0].callback();
  await loading;
  assert.match(env.runtime.view.status, /1 track.*start conversions/i);
  assert.equal(env.requests.length, 0);
});

test('conversion shows progress, blocks duplicate work and keeps downloads voluntary', async () => {
  let finish;
  const env = environment({ inputs: [track], fetchImpl: () => new Promise((resolve) => { finish = resolve; }) });
  const conversion = env.button('Start conversions').dispatch();
  assert.match(env.runtime.view.status, /converting 1 track/i);
  await env.button('Start conversions').dispatch();
  await env.button('Load Spotify URL').dispatch();
  assert.equal(env.requests.length, 1);
  assert.equal(env.form.submissions, 0);
  finish(response());
  await conversion;
  assert.match(env.runtime.view.status, /1.*ready.*download/i);
  assert.equal(env.anchors.length, 0);
  assert.equal(env.body.querySelectorAll('button').filter((node) => node.textContent === 'Download all ready').length, 1);
  await env.button('Download all ready').dispatch({ isTrusted: false });
  assert.equal(env.anchors.length, 0);
  await env.button('Download all ready').dispatch();
  assert.equal(env.anchors.length, 1);
});

test('failed conversion explains recovery without exposing internal errors or creating downloads', async () => {
  const env = environment({ inputs: [track], fetchImpl: async () => response({ ok: false, status: 500 }) });
  await env.button('Start conversions').dispatch();
  assert.match(env.runtime.view.status, /could not.*convert.*try again/i);
  assert.doesNotMatch(env.runtime.view.status, /http_error|schema-missing|unexpected-error|https:/);
  assert.equal(env.button('Download all'), undefined);
  assert.equal(env.requests.length, 1);
  assert.equal(env.anchors.length, 0);
});

test('canceling a conversion stops the request and permits a later user-started conversion', async () => {
  let canceled = false;
  let attempt = 0;
  const env = environment({ inputs: [track, { ...track, name: 'two' }, { ...track, name: 'three' }], fetchImpl: (_url, { signal }) => ++attempt > 1 ? Promise.resolve(response()) : new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      canceled = true;
      reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    }, { once: true });
  }) });
  const conversion = env.button('Start conversions').dispatch();
  await env.button('Cancel').dispatch();
  await conversion;
  assert.equal(canceled, true);
  assert.match(env.runtime.view.status, /conversion canceled.*start conversions/i);
  assert.equal(env.requests.length, 1);
  assert.equal(env.anchors.length, 0);
  const canceledResults = env.documentRef.getElementById('spotmate-download-panel');
  assert.match(allText(canceledResults), /Tracks \(3\).*1 canceled.*2 not started/);
  assert.equal(env.button('Start conversions').getAttribute('aria-disabled'), 'false');
  await env.button('Start conversions').dispatch();
  assert.equal(env.requests.length, 4);
  assert.match(env.runtime.view.status, /3 of 3 tracks are ready/i);
});

test('partial conversion preserves successful downloads and explains the failed count', async () => {
  let count = 0;
  const env = environment({
    inputs: [track, { ...track, name: 'second-track' }],
    fetchImpl: async () => response(++count === 1 ? {} : { ok: false, status: 500 })
  });
  await env.button('Start conversions').dispatch();
  assert.match(env.runtime.view.status, /1 of 2 tracks are ready.*1 could not be converted/i);
  assert.equal(env.requests.length, 2);
  assert.equal(env.anchors.length, 0);
  assert.ok(env.button('Download Track 1'));
  assert.equal(env.button('Download Track 2'), undefined);
});

test('the guided URL field submits through the original site form only after a trusted action', async () => {
  const env = environment({ inputs: [track] });
  const field = env.documentRef.getElementById('spotmate-source-url');
  assert.ok(field, 'The guided panel must include its own labeled URL field.');
  field.value = 'https://open.spotify.com/playlist/demo';
  await env.button('Load Spotify URL').dispatch({ isTrusted: false });
  assert.equal(env.form.submissions, 0);
  await env.button('Load Spotify URL').dispatch();
  assert.equal(env.form.submissions, 1);
  assert.equal(env.urlInput.value, field.value);
  assert.equal(env.requests.length, 0);
});

test('guided stages follow loading, conversion and available downloads without exposing result URLs', async () => {
  const env = environment({ inputs: [track], url: 'https://open.spotify.com/playlist/demo' });
  const stage = () => env.runtime.view.panel.getAttribute('data-stage');
  assert.equal(stage(), 'load');
  await env.button('Load Spotify URL').dispatch();
  assert.equal(stage(), 'convert');
  await env.button('Start conversions').dispatch();
  assert.equal(stage(), 'download');
  const results = env.documentRef.getElementById('spotmate-download-panel');
  assert.match(allText(results), /Tracks.*Track 1.*Ready/);
  assert.doesNotMatch(allText(results), /https:|sample-track/);
});
