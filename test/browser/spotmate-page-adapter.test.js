import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpotmatePageAdapter } from '../../src/browser/spotmate-page-adapter.js';

const allowedLocation = { origin: 'https://spotmate.online', pathname: '/en1/' };

function input({ name, id, value, type = 'hidden' }) {
  return { name, id, value, type };
}

function makePage({ inputs = [], outsideInputs = [], url = 'https://open.spotify.com/playlist/demo' } = {}) {
  const tracks = {
    inputs,
    querySelectorAll(selector) {
      return selector === 'input[type="hidden"]'
        ? this.inputs.filter((entry) => entry.type === 'hidden')
        : [];
    }
  };
  const form = { elements: [], requestSubmit: 'clobbered' };
  const otherForm = { elements: [] };
  const urlInput = { value: url, form };
  const observers = [];
  class NativeHTMLFormElement {}
  NativeHTMLFormElement.prototype.requestSubmit = function requestSubmit() {
    this.submitCount = (this.submitCount || 0) + 1;
  };
  class MutationObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnected = false;
      observers.push(this);
    }
    observe(target, options) {
      this.target = target;
      this.options = options;
    }
    disconnect() {
      this.disconnected = true;
    }
  }
  const documentRef = {
    body: {},
    querySelector(selector) {
      if (selector === '#tracks') return tracks;
      if (selector === '#trackUrl') return urlInput;
      return null;
    }
  };
  const windowRef = {
    location: allowedLocation,
    URL,
    HTMLFormElement: NativeHTMLFormElement,
    MutationObserver
  };
  return { tracks, form, urlInput, documentRef, windowRef, observers, outsideInputs };
}

test('collectTrackInputs reads only hidden inputs in #tracks and deduplicates IDs', () => {
  const page = makePage({
    inputs: [
      input({ name: 'one', value: 'https://open.spotify.com/track/one' }),
      input({ name: 'one', value: 'https://open.spotify.com/track/duplicate' }),
      input({ name: 'outside', value: 'https://open.spotify.com/track/outside', type: 'text' }),
      input({ id: 'two', value: 'https://open.spotify.com/track/two' })
    ],
    outsideInputs: [input({ name: 'foreign', value: 'https://open.spotify.com/track/foreign' })]
  });
  const adapter = createSpotmatePageAdapter(page);

  assert.deepEqual(adapter.collectTrackInputs(), [
    { id: 'one', value: 'https://open.spotify.com/track/one' },
    { id: 'two', value: 'https://open.spotify.com/track/two' }
  ]);
});

test('collectTrackInputs fails closed on empty values and more than 100 tracks', () => {
  const empty = makePage({ inputs: [input({ name: 'empty', value: '' })] });
  assert.throws(() => createSpotmatePageAdapter(empty).collectTrackInputs(), /empty-track-value/);

  const tooMany = makePage({
    inputs: Array.from({ length: 101 }, (_, index) => input({ name: `track-${index}`, value: `v-${index}` }))
  });
  assert.throws(() => createSpotmatePageAdapter(tooMany).collectTrackInputs(), /track-limit/);
});

test('every public operation rejects pages outside the exact SpotMate /en1 location', async () => {
  const page = makePage();
  page.windowRef.location = { origin: 'https://spotmate.online', pathname: '/en1/extra' };
  const adapter = createSpotmatePageAdapter(page);

  assert.throws(() => adapter.collectTrackInputs(), /unsupported-page/);
  assert.throws(() => adapter.submitExistingSpotifyForm('https://open.spotify.com/track/demo'), /unsupported-page/);
  await assert.rejects(adapter.waitForTrackInputs(new AbortController().signal), /unsupported-page/);
});

test('submitExistingSpotifyForm validates Spotify HTTPS and calls the existing form’s native requestSubmit', () => {
  const page = makePage();
  const adapter = createSpotmatePageAdapter(page);
  adapter.submitExistingSpotifyForm('https://open.spotify.com/playlist/demo?si=x');

  assert.equal(page.urlInput.value, 'https://open.spotify.com/playlist/demo?si=x');
  assert.equal(page.form.submitCount, 1);
  assert.equal(page.form.requestSubmit, 'clobbered');
});

test('submitExistingSpotifyForm rejects non-HTTPS URLs and hosts outside open.spotify.com', () => {
  const page = makePage();
  const adapter = createSpotmatePageAdapter(page);
  for (const url of ['http://open.spotify.com/track/x', 'https://evil.example/track/x', 'malformed']) {
    assert.throws(() => adapter.submitExistingSpotifyForm(url), /spotify-url/);
  }
  assert.equal(page.form.submitCount, undefined);
});

test('submitExistingSpotifyForm rejects a detached #trackUrl even when another form exists', () => {
  const page = makePage();
  page.urlInput.form = undefined;
  page.documentRef.querySelector = (selector) => {
    if (selector === '#trackUrl') return page.urlInput;
    if (selector === 'form') return { elements: [] };
    return selector === '#tracks' ? page.tracks : null;
  };
  const adapter = createSpotmatePageAdapter(page);

  assert.throws(() => adapter.submitExistingSpotifyForm('https://open.spotify.com/track/detached'), /spotify-form-missing/);
});

test('publishLegacyConversionResults returns a boolean and publishes volatile results only after run', async () => {
  const disabled = makePage();
  const disabledAdapter = createSpotmatePageAdapter({ ...disabled, exposeLegacyGlobals: false });
  disabledAdapter.publishLegacyConversionResults([{ id: 'one' }]);
  assert.equal(disabled.windowRef.fetchResults, undefined);

  const enabled = makePage();
  const enabledAdapter = createSpotmatePageAdapter({ ...enabled, exposeLegacyGlobals: true });
  assert.equal(enabled.windowRef.fetchResults, undefined);
  enabledAdapter.publishLegacyConversionResults([{ id: 'one', success: true }]);
  assert.deepEqual(enabled.windowRef.fetchResults, [{ id: 'one', success: true }]);
});

test('the page factory fails clearly when windowRef.URL is missing', () => {
  const page = makePage();
  page.windowRef.URL = undefined;
  assert.throws(() => createSpotmatePageAdapter(page).submitExistingSpotifyForm('https://open.spotify.com/track/x'), /URLImpl/);
});

test('waitForTrackInputs observes a mutation and cleans up on resolution or cancellation', async () => {
  const page = makePage({ inputs: [] });
  const adapter = createSpotmatePageAdapter(page);
  const pending = adapter.waitForTrackInputs(new AbortController().signal);
  await Promise.resolve();
  assert.equal(page.observers.length, 1);
  page.tracks.inputs.push(input({ name: 'loaded', value: 'https://open.spotify.com/track/loaded' }));
  page.observers[0].callback();
  assert.deepEqual(await pending, [{ id: 'loaded', value: 'https://open.spotify.com/track/loaded' }]);
  assert.equal(page.observers[0].disconnected, true);

  const abortedPage = makePage({ inputs: [] });
  const abortedAdapter = createSpotmatePageAdapter(abortedPage);
  const controller = new AbortController();
  const aborted = abortedAdapter.waitForTrackInputs(controller.signal);
  controller.abort();
  await assert.rejects(aborted, (error) => error.name === 'AbortError');
  assert.equal(abortedPage.observers[0].disconnected, true);
});

test('submitting another link waits for fresh track inputs instead of reusing the old list', async () => {
  const page = makePage({ inputs: [input({ name: 'old', value: 'https://open.spotify.com/track/old' })] });
  const adapter = createSpotmatePageAdapter(page);
  const previous = adapter.submitExistingSpotifyForm('https://open.spotify.com/playlist/new');
  const pending = adapter.waitForTrackInputs(new AbortController().signal, previous);
  await Promise.resolve();
  assert.equal(page.observers.length, 1, 'Existing tracks must not resolve the new load.');
  page.tracks.inputs = [input({ name: 'new', value: 'https://open.spotify.com/track/new' })];
  page.observers[0].callback();
  assert.deepEqual(await pending, [{ id: 'new', value: 'https://open.spotify.com/track/new' }]);
  assert.equal(page.observers[0].disconnected, true);
});
