import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  mountPlaylistPanel,
  createPlaylistView,
  PANEL_ID,
  LABELS,
  STATUS_LABELS
} from '../../src/browser/playlist-view.js';
import { createTrackSession, transitionTrack } from '../../src/browser/track-session.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cssPath = path.resolve(__dirname, '../../src/browser/panel.css');

function createDomMock() {
  const elementsById = new Map();
  let activeElement = null;

  const makeElement = (tagName) => {
    const listeners = new Map();
    const attributes = new Map();
    const classes = new Set();

    const element = {
      tagName: tagName.toUpperCase(),
      children: [],
      parentNode: null,
      disabled: false,
      checked: false,
      value: '',
      type: '',
      style: {},
      dataset: {},

      get id() {
        return attributes.get('id') || '';
      },
      set id(val) {
        if (attributes.get('id')) elementsById.delete(attributes.get('id'));
        if (val) {
          attributes.set('id', String(val));
          elementsById.set(String(val), element);
        } else {
          attributes.delete('id');
        }
      },

      get className() {
        return Array.from(classes).join(' ');
      },
      set className(val) {
        classes.clear();
        if (val) {
          String(val).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
        }
      },

      classList: {
        add: (...cls) => cls.forEach((c) => classes.add(c)),
        remove: (...cls) => cls.forEach((c) => classes.delete(c)),
        contains: (c) => classes.has(c)
      },

      _textContent: '',
      get textContent() {
        if (element.children.length === 0) return element._textContent;
        return element.children.map((c) => c.textContent).join('');
      },
      set textContent(val) {
        element._textContent = String(val ?? '');
        element.children = [];
      },

      setAttribute(name, value) {
        const strVal = String(value ?? '');
        attributes.set(name, strVal);
        if (name === 'id') element.id = strVal;
        if (name === 'type') element.type = strVal;
        if (name === 'value') element.value = strVal;
        if (name === 'disabled') element.disabled = true;
        if (name === 'checked') element.checked = true;
        if (name.startsWith('data-')) {
          const key = name.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
          element.dataset[key] = strVal;
        }
      },

      getAttribute(name) {
        if (name === 'id') return element.id || null;
        if (name === 'type') return element.type || null;
        if (name === 'value') return element.value || null;
        if (name === 'class') return element.className || null;
        if (name.startsWith('data-')) {
          const key = name.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
          return element.dataset[key] ?? attributes.get(name) ?? null;
        }
        return attributes.get(name) ?? null;
      },

      hasAttribute(name) {
        return attributes.has(name);
      },

      removeAttribute(name) {
        attributes.delete(name);
        if (name === 'id') element.id = '';
        if (name.startsWith('data-')) {
          const key = name.slice(5).replace(/-([a-z])/g, (_, g) => g.toUpperCase());
          delete element.dataset[key];
        }
      },

      appendChild(child) {
        if (child.parentNode) child.parentNode.removeChild(child);
        child.parentNode = element;
        element.children.push(child);
        return child;
      },

      removeChild(child) {
        const idx = element.children.indexOf(child);
        if (idx !== -1) {
          element.children.splice(idx, 1);
          child.parentNode = null;
        }
        return child;
      },

      replaceChild(newChild, oldChild) {
        const idx = element.children.indexOf(oldChild);
        if (idx !== -1) {
          if (newChild.parentNode) newChild.parentNode.removeChild(newChild);
          newChild.parentNode = element;
          oldChild.parentNode = null;
          element.children[idx] = newChild;
        }
        return oldChild;
      },

      remove() {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        if (element.id && elementsById.get(element.id) === element) {
          elementsById.delete(element.id);
        }
        element.removed = true;
      },

      addEventListener(event, handler) {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(handler);
      },

      removeEventListener(event, handler) {
        const list = listeners.get(event);
        if (list) {
          listeners.set(event, list.filter((h) => h !== handler));
        }
      },

      dispatch(event, eventInit = {}) {
        const handlers = listeners.get(event) || [];
        const evt = {
          type: event,
          target: element,
          currentTarget: element,
          isTrusted: eventInit.isTrusted ?? true,
          defaultPrevented: false,
          preventDefault() { this.defaultPrevented = true; },
          ...eventInit
        };
        for (const handler of handlers) {
          handler.call(element, evt);
        }
        return !evt.defaultPrevented;
      },

      click(eventInit = {}) {
        return element.dispatch('click', { isTrusted: true, ...eventInit });
      },

      focus() {
        activeElement = element;
      },

      blur() {
        if (activeElement === element) activeElement = null;
      },

      querySelectorAll(selector) {
        const results = [];
        const visit = (node) => {
          for (const child of node.children || []) {
            if (matchesSelector(child, selector)) {
              results.push(child);
            }
            visit(child);
          }
        };
        visit(element);
        return results;
      },

      querySelector(selector) {
        return element.querySelectorAll(selector)[0] || null;
      }
    };

    return element;
  };

  function matchesSelector(element, selector) {
    if (selector === '*') return true;
    let s = selector.trim();
    const tagMatch = s.match(/^([a-zA-Z0-9]+)/);
    if (tagMatch) {
      if (element.tagName.toLowerCase() !== tagMatch[1].toLowerCase()) return false;
      s = s.slice(tagMatch[1].length);
    }
    if (s.startsWith('#')) {
      const idMatch = s.match(/^#([a-zA-Z0-9_-]+)/);
      if (idMatch) {
        if (element.id !== idMatch[1]) return false;
        s = s.slice(idMatch[0].length);
      }
    }
    if (s.startsWith('.')) {
      const classMatch = s.match(/^\.([a-zA-Z0-9_-]+)/);
      if (classMatch) {
        if (!element.classList.contains(classMatch[1])) return false;
        s = s.slice(classMatch[0].length);
      }
    }
    const attrRegex = /\[([a-zA-Z0-9_-]+)(?:=([\"']?)(.*?)\2)?\]/g;
    let match;
    let hasAttrs = false;
    while ((match = attrRegex.exec(s)) !== null) {
      hasAttrs = true;
      const attr = match[1];
      const val = match[3];
      const attrVal = element.getAttribute(attr);
      if (val === undefined) {
        if (attrVal === null) return false;
      } else {
        if (attrVal !== val) return false;
      }
    }
    if (!tagMatch && !hasAttrs && selector.startsWith('#')) {
      return element.id === selector.slice(1);
    }
    if (!tagMatch && !hasAttrs && selector.startsWith('.')) {
      return element.classList.contains(selector.slice(1));
    }
    return true;
  }

  const body = makeElement('body');
  body.id = 'document-body';

  const documentRef = {
    body,
    createElement: makeElement,
    getElementById: (id) => elementsById.get(id) || null,
    querySelector: (selector) => {
      if (selector.startsWith('#')) return elementsById.get(selector.slice(1)) || null;
      return body.querySelector(selector);
    },
    querySelectorAll: (selector) => body.querySelectorAll(selector),
    get activeElement() {
      return activeElement;
    }
  };

  return { documentRef, body, elementsById };
}

function createMockRunner(initialSession) {
  let session = initialSession;
  const calls = [];

  return {
    calls,
    startSelected: async () => { calls.push('startSelected'); return session; },
    resumeQueued: async () => { calls.push('resumeQueued'); return session; },
    retryFailedTracks: () => { calls.push('retryFailedTracks'); return session; },
    cancel: () => { calls.push('cancel'); },
    getSession: () => session,
    setSession: (s) => { session = s; }
  };
}

test('mountPlaylistPanel adds #spotmate-voluntary-panel and #spotmate-v13-live-region', () => {
  const { documentRef, body } = createDomMock();
  const session = createTrackSession(['track-1', 'track-2']);
  const runner = createMockRunner(session);

  const panelController = mountPlaylistPanel({
    host: body,
    session,
    runner,
    documentRef
  });

  const panel = documentRef.querySelector('#spotmate-voluntary-panel');
  assert.ok(panel, 'The panel must exist in the DOM.');
  assert.equal(panel.id, PANEL_ID);

  const liveRegion = documentRef.querySelector('#spotmate-v13-live-region');
  assert.ok(liveRegion, 'The v1.3 live region must exist.');
  assert.equal(liveRegion.getAttribute('role'), 'status');
  assert.equal(liveRegion.getAttribute('aria-live'), 'polite');
  assert.equal(liveRegion.getAttribute('aria-atomic'), 'true');

  assert.ok(typeof panelController.render === 'function');
  assert.ok(typeof panelController.destroy === 'function');

  panelController.destroy();
  assert.equal(documentRef.querySelector('#spotmate-voluntary-panel'), null);
});

test('control names and live announcements use clear English', () => {
  const { documentRef, body } = createDomMock();
  let session = createTrackSession(['a']);
  const announcements = [];
  const panelController = mountPlaylistPanel({
    host: body,
    session,
    runner: createMockRunner(session),
    documentRef,
    announce: (message) => announcements.push(message)
  });

  const startButton = documentRef.querySelector('button[data-action="start"]');
  const checkbox = documentRef.querySelector('input[type="checkbox"][data-track-id="a"]');
  const trackName = documentRef.querySelector('.spotmate-track-name');
  const progress = documentRef.querySelector('progress');
  assert.equal(startButton.textContent, 'Start conversions');
  assert.equal(checkbox.getAttribute('aria-label'), 'Select track a');
  assert.equal(trackName.textContent, 'Track a');
  assert.equal(progress.getAttribute('aria-label'), 'Progress for track a');

  session = transitionTrack(session, 'a', 'converting');
  panelController.setSession(session);
  assert.equal(announcements.at(-1), 'Track a: converting');
});

test('global and individual selection require event.isTrusted === true', () => {
  const { documentRef, body } = createDomMock();
  const session = createTrackSession(['a', 'b']);
  const runner = createMockRunner(session);

  const panelController = mountPlaylistPanel({
    host: body,
    session,
    runner,
    documentRef
  });

  const btnSelectNone = documentRef.querySelector('button[data-action="select-none"]');
  const btnSelectAll = documentRef.querySelector('button[data-action="select-all"]');
  const checkboxA = documentRef.querySelector('input[type="checkbox"][data-track-id="a"]');

  assert.ok(btnSelectNone, 'The select-none button must be present.');
  assert.ok(btnSelectAll, 'The select-all button must be present.');
  assert.ok(checkboxA, 'Track a checkbox must be present.');
  assert.equal(checkboxA.checked, true);

  // Synthetic click (isTrusted: false) on select-none has no effect.
  btnSelectNone.dispatch('click', { isTrusted: false });
  assert.equal(panelController.getSession().tracks.every((t) => t.selected), true);

  // Trusted user click (isTrusted: true) on select-none deselects every track.
  btnSelectNone.dispatch('click', { isTrusted: true });
  assert.equal(panelController.getSession().tracks.every((t) => !t.selected), true);

  // Synthetic click on select-all has no effect.
  btnSelectAll.dispatch('click', { isTrusted: false });
  assert.equal(panelController.getSession().tracks.every((t) => !t.selected), true);

  // Trusted click on select-all selects every track.
  btnSelectAll.dispatch('click', { isTrusted: true });
  assert.equal(panelController.getSession().tracks.every((t) => t.selected), true);

  // Synthetic checkbox change has no effect.
  checkboxA.checked = false;
  checkboxA.dispatch('change', { isTrusted: false });
  assert.equal(panelController.getSession().tracks.find((t) => t.id === 'a').selected, true);

  // Trusted checkbox change toggles the selection.
  checkboxA.checked = false;
  checkboxA.dispatch('change', { isTrusted: true });
  assert.equal(panelController.getSession().tracks.find((t) => t.id === 'a').selected, false);
});

test('start, cancel, resume, and retry-failed controls require event.isTrusted', async () => {
  const { documentRef, body } = createDomMock();
  let session = createTrackSession(['a', 'b']);
  session = transitionTrack(session, 'a', 'converting');
  session = transitionTrack(session, 'a', 'failed', { errorCode: 'http' });

  const runner = createMockRunner(session);

  const panelController = mountPlaylistPanel({
    host: body,
    session,
    runner,
    documentRef
  });

  const btnStart = documentRef.querySelector('button[data-action="start"]');
  const btnCancel = documentRef.querySelector('button[data-action="cancel"]');
  const btnResume = documentRef.querySelector('button[data-action="resume"]');
  const btnRetry = documentRef.querySelector('button[data-action="retry-failed"]');

  assert.ok(btnStart, 'The start button must be present.');
  assert.ok(btnCancel, 'The cancel button must be present.');
  assert.ok(btnResume, 'The resume button must be present.');
  assert.ok(btnRetry, 'The retry-failed button must be present.');

  // Untrusted actions are ignored.
  btnStart.dispatch('click', { isTrusted: false });
  btnCancel.dispatch('click', { isTrusted: false });
  btnResume.dispatch('click', { isTrusted: false });
  btnRetry.dispatch('click', { isTrusted: false });
  assert.deepEqual(runner.calls, []);

  // Trusted actions run.
  await btnStart.dispatch('click', { isTrusted: true });
  await btnCancel.dispatch('click', { isTrusted: true });
  await btnResume.dispatch('click', { isTrusted: true });
  await btnRetry.dispatch('click', { isTrusted: true });
  assert.deepEqual(runner.calls, ['startSelected', 'cancel', 'resumeQueued', 'retryFailedTracks']);
});

test('progress, statuses, and accessible elements meet the contract without exposing secrets', () => {
  const { documentRef, body } = createDomMock();
  let session = createTrackSession(['t1', 't2']);
  session = transitionTrack(session, 't1', 'converting');
  session = transitionTrack(session, 't1', 'polling', { progressPercent: 45 });

  const runner = createMockRunner(session);

  const panelController = mountPlaylistPanel({
    host: body,
    session,
    runner,
    documentRef
  });

  const track1 = documentRef.querySelector('[data-track-id="t1"]');
  assert.ok(track1, 'Track t1 must be present.');

  const progress = track1.querySelector('progress');
  assert.ok(progress, 'A progress element must be present.');
  assert.equal(progress.getAttribute('max'), '100');
  assert.equal(progress.getAttribute('aria-valuemin'), '0');
  assert.equal(progress.getAttribute('aria-valuemax'), '100');
  assert.equal(progress.getAttribute('aria-valuenow'), '45');
  assert.ok(progress.getAttribute('aria-label'));

  const liveRegion = documentRef.querySelector('#spotmate-v13-live-region');
  assert.ok(liveRegion);
  assert.equal(liveRegion.getAttribute('role'), 'status');
  assert.equal(liveRegion.getAttribute('aria-live'), 'polite');
  assert.equal(liveRegion.getAttribute('aria-atomic'), 'true');

  const allElements = documentRef.querySelectorAll('*');
  for (const el of allElements) {
    const tabIndex = el.getAttribute('tabindex');
    if (tabIndex !== null) {
      const parsed = parseInt(tabIndex, 10);
      assert.ok(Number.isNaN(parsed) || parsed <= 0, `Positive tabindex is not allowed on ${el.tagName}: ${tabIndex}`);
    }
  }

  const panel = documentRef.querySelector('#spotmate-voluntary-panel');
  const panelText = panel.textContent;
  assert.equal(panelText.includes('finalAudioUrl'), false);
  assert.equal(panelText.includes('https://'), false);
  assert.equal(panelText.includes('token'), false);
});

test('focus is restored after a re-render', () => {
  const { documentRef, body } = createDomMock();
  const session = createTrackSession(['a', 'b']);
  const runner = createMockRunner(session);

  const panelController = mountPlaylistPanel({
    host: body,
    session,
    runner,
    documentRef
  });

  const btnStart = documentRef.querySelector('button[data-action="start"]');
  btnStart.focus();
  assert.equal(documentRef.activeElement, btnStart);

  // Trigger a re-render.
  panelController.render();

  const newBtnStart = documentRef.querySelector('button[data-action="start"]');
  assert.equal(documentRef.activeElement, newBtnStart, 'Focus must return to the start button.');
});

test('the CSS includes desktop and mobile rules and 44 px touch targets', () => {
  const cssContent = fs.readFileSync(cssPath, 'utf8');
  assert.match(cssContent, /@media[^{]*max-width:\s*767px/i, 'A mobile media query must target widths up to 767 px.');
  assert.match(cssContent, /min-height:\s*44px|44px/i, 'Touch targets must be at least 44 px tall.');
  assert.match(cssContent, /:focus-visible|:focus/i, 'A visible focus style must be defined.');
  assert.match(cssContent, /spotmate-voluntary-panel/i, 'The SpotMate panel must be styled.');
});

test('live-region announcements cover all six states without exposing secrets', () => {
  const { documentRef, body } = createDomMock();
  const announcements = [];
  let session = createTrackSession(['tr1']);
  const runner = createMockRunner(session);

  const panelController = mountPlaylistPanel({
    host: body,
    session,
    runner,
    documentRef,
    announce: (msg) => announcements.push(msg)
  });

  // converting
  session = transitionTrack(session, 'tr1', 'converting');
  panelController.setSession(session);
  assert.equal(announcements.some((m) => m.includes('tr1') && m.includes('converting')), true);

  // polling
  session = transitionTrack(session, 'tr1', 'polling', { progressPercent: 30 });
  panelController.setSession(session);
  assert.equal(announcements.some((m) => m.includes('tr1') && m.includes('checking status')), true);

  // success
  session = transitionTrack(session, 'tr1', 'success');
  panelController.setSession(session);
  assert.equal(announcements.some((m) => m.includes('tr1') && m.includes('successful')), true);

  // failed on second session
  let session2 = createTrackSession(['tr2']);
  session2 = transitionTrack(session2, 'tr2', 'converting');
  session2 = transitionTrack(session2, 'tr2', 'failed', { errorCode: 'http' });
  panelController.setSession(session2);
  assert.equal(announcements.some((m) => m.includes('tr2') && m.includes('failed')), true);

  // cancelled on third session
  let session3 = createTrackSession(['tr3']);
  session3 = transitionTrack(session3, 'tr3', 'converting');
  session3 = transitionTrack(session3, 'tr3', 'cancelled');
  panelController.setSession(session3);
  assert.equal(announcements.some((m) => m.includes('tr3') && m.includes('canceled')), true);

  // Announcements must not include secrets or URLs.
  for (const ann of announcements) {
    assert.equal(ann.includes('https://'), false);
    assert.equal(ann.includes('http://'), false);
    assert.equal(ann.includes('token'), false);
  }
});

test('individual and bulk download buttons work without persisting URLs', async () => {
  const { documentRef, body } = createDomMock();
  let session = createTrackSession(['t_ok']);
  session = transitionTrack(session, 't_ok', 'converting');
  session = transitionTrack(session, 't_ok', 'success');

  const downloadedTracks = [];
  let downloadedAll = false;

  const panelController = mountPlaylistPanel({
    host: body,
    session,
    documentRef,
    onDownloadTrack: async (trackId, event) => {
      if (event?.isTrusted === true) downloadedTracks.push(trackId);
    },
    onDownloadAll: async (event) => {
      if (event?.isTrusted === true) downloadedAll = true;
    }
  });

  const btnTrack = documentRef.querySelector('button[data-action="download-track"][data-track-id="t_ok"]');
  assert.ok(btnTrack, 'The download button for track t_ok must be present.');

  const btnDownloadAll = documentRef.querySelector('button[data-action="download-all"]');
  assert.ok(btnDownloadAll, 'The Download all button must be present.');

  // Untrusted clicks must not download anything.
  await btnTrack.dispatch('click', { isTrusted: false });
  await btnDownloadAll.dispatch('click', { isTrusted: false });
  assert.deepEqual(downloadedTracks, []);
  assert.equal(downloadedAll, false);

  // Trusted clicks start the downloads.
  await btnTrack.dispatch('click', { isTrusted: true });
  await btnDownloadAll.dispatch('click', { isTrusted: true });
  assert.deepEqual(downloadedTracks, ['t_ok']);
  assert.equal(downloadedAll, true);

  // URLs must not persist after the download flow.
  const panel = documentRef.querySelector('#spotmate-voluntary-panel');
  assert.equal(panel.textContent.includes('https://'), false);
  assert.equal(panel.getAttribute('href'), null);
});

test('the retry-failed button appears only when at least one track has failed', () => {
  const { documentRef, body } = createDomMock();
  const sessionOk = createTrackSession(['a', 'b']);
  const runner = createMockRunner(sessionOk);

  const panelController = mountPlaylistPanel({
    host: body,
    session: sessionOk,
    runner,
    documentRef
  });

  assert.equal(documentRef.querySelector('button[data-action="retry-failed"]'), null, 'Retry must be hidden when no track has failed.');

  let sessionWithFail = transitionTrack(sessionOk, 'a', 'converting');
  sessionWithFail = transitionTrack(sessionWithFail, 'a', 'failed', { errorCode: 'network' });
  panelController.setSession(sessionWithFail);

  const btnRetry = documentRef.querySelector('button[data-action="retry-failed"]');
  assert.ok(btnRetry, 'The retry-failed button must appear when a track has failed.');
});

test('controls are disabled appropriately while a conversion is running', () => {
  const { documentRef, body } = createDomMock();
  let session = createTrackSession(['x', 'y']);
  session = transitionTrack(session, 'x', 'converting');

  const runner = createMockRunner(session);

  mountPlaylistPanel({
    host: body,
    session,
    runner,
    documentRef
  });

  const btnStart = documentRef.querySelector('button[data-action="start"]');
  const btnSelectAll = documentRef.querySelector('button[data-action="select-all"]');
  const btnSelectNone = documentRef.querySelector('button[data-action="select-none"]');
  const btnCancel = documentRef.querySelector('button[data-action="cancel"]');
  const checkboxX = documentRef.querySelector('input[type="checkbox"][data-track-id="x"]');

  assert.equal(btnStart.disabled, true, 'Start is disabled while a run is active.');
  assert.equal(btnSelectAll.disabled, true, 'Select all is disabled while a run is active.');
  assert.equal(btnSelectNone.disabled, true, 'Deselect all is disabled while a run is active.');
  assert.equal(btnCancel.disabled, false, 'Cancel remains enabled while a run is active.');
  assert.equal(checkboxX.disabled, true, 'Track checkboxes are disabled while a run is active.');
});

test('setVolatileUrl rerenders the voluntary download button after success', () => {
  const env = createDomMock();
  const session = createTrackSession(['track-1']);
  const controller = mountPlaylistPanel({
    host: env.body,
    documentRef: env.documentRef,
    session
  });

  assert.equal(controller.panel.querySelector('[data-action="download-track"]'), null);
  const converting = transitionTrack(session, 'track-1', 'converting');
  const succeeded = transitionTrack(converting, 'track-1', 'success', { progressPercent: 100 });
  controller.setSession(succeeded);
  controller.setVolatileUrl('track-1', 'https://cdn.example.invalid/audio.mp3');
  const button = controller.panel.querySelector('[data-action="download-track"]');
  assert.ok(button);
  assert.equal(button.textContent, 'Download track-1');
});
