import { BROWSER_LIMITS, isAllowedSpotmatePage } from './policy.js';
import { readTrackPresentation } from './track-presentation.js';

const fail = (code) => {
  throw new Error(code);
};

const assertAllowed = (windowRef) => {
  if (!isAllowedSpotmatePage(windowRef?.location)) fail('unsupported-page');
};

const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });

const readTrackInputs = (documentRef) => {
  const container = documentRef?.querySelector?.('#tracks');
  const inputs = container?.querySelectorAll?.('input[type="hidden"]') || [];
  const seen = new Set();
  const tracks = [];

  for (const input of Array.from(inputs)) {
    const id = typeof input.name === 'string' && input.name.length > 0
      ? input.name
      : input.id;
    if (typeof id !== 'string' || id.length === 0 || seen.has(id)) continue;
    const value = typeof input.value === 'string' ? input.value : '';
    if (value.trim().length === 0) fail('empty-track-value');
    seen.add(id);
    tracks.push({ id, value });
  }

  if (tracks.length > BROWSER_LIMITS.maxTracks) fail('track-limit');
  return tracks;
};

const isSpotifyUrl = (value, URLImpl) => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URLImpl(value);
    return url.protocol === 'https:' && url.hostname === 'open.spotify.com';
  } catch {
    return false;
  }
};

const createSpotmatePageAdapter = ({
  windowRef,
  documentRef,
  exposeLegacyGlobals
} = {}) => {
  if (!windowRef || typeof windowRef !== 'object') throw new TypeError('windowRef is required');
  if (!documentRef || typeof documentRef !== 'object') throw new TypeError('documentRef is required');
  if (typeof windowRef.URL !== 'function') throw new TypeError('URLImpl is required');
  if (exposeLegacyGlobals !== undefined && typeof exposeLegacyGlobals !== 'boolean') {
    throw new TypeError('exposeLegacyGlobals must be boolean');
  }
  const legacyEnabled = exposeLegacyGlobals === true;

  const collectTrackInputs = () => {
    assertAllowed(windowRef);
    return readTrackInputs(documentRef);
  };

  const collectTrackPresentation = () => {
    const tracks = collectTrackInputs();
    const inputs = Array.from(documentRef.querySelector?.('#tracks')?.querySelectorAll?.('input[type="hidden"]') || []);
    return tracks.map((track, index) => {
      const input = inputs.find(node => (node.name || node.id) === track.id);
      return { id: track.id, ...readTrackPresentation(input, index + 1, windowRef.URL) };
    });
  };

  const readCsrfToken = () => {
    assertAllowed(windowRef);
    const meta = documentRef?.querySelector?.('meta[name="csrf-token"]');
    const value = meta?.getAttribute?.('content') ?? meta?.content;
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  };

  const submitExistingSpotifyForm = (url) => {
    assertAllowed(windowRef);
    if (!isSpotifyUrl(url, windowRef.URL)) fail('invalid-spotify-url');
    const input = documentRef?.querySelector?.('#trackUrl');
    const form = input?.form;
    const formElement = windowRef?.HTMLFormElement;
    const requestSubmit = formElement?.prototype?.requestSubmit;
    if (!input || !form || typeof requestSubmit !== 'function') fail('spotify-form-missing');
    const previousInputs = Array.from(documentRef.querySelector?.('#tracks')?.querySelectorAll?.('input[type="hidden"]') || [], (node) => ({ node, value: node.value }));
    input.value = url;
    requestSubmit.call(form);
    return previousInputs;
  };

  const publishLegacyConversionResults = (results) => {
    assertAllowed(windowRef);
    if (legacyEnabled) windowRef.fetchResults = results;
  };

  const waitForTrackInputs = async (signal, previousInputs) => {
    assertAllowed(windowRef);
    if (signal?.aborted) return Promise.reject(abortError());
    const hasFreshInputs = () => {
      if (!previousInputs) return true;
      const current = Array.from(documentRef.querySelector?.('#tracks')?.querySelectorAll?.('input[type="hidden"]') || []);
      return current.length !== previousInputs.length || current.some((node, index) => node !== previousInputs[index]?.node || node.value !== previousInputs[index]?.value);
    };
    const initial = hasFreshInputs() ? collectTrackInputs() : [];
    if (initial.length > 0) return Promise.resolve(initial);

    const MutationObserverImpl = windowRef?.MutationObserver;
    if (typeof MutationObserverImpl !== 'function') return Promise.reject(new Error('mutation-observer-missing'));
    const container = documentRef?.body || documentRef?.querySelector?.('#tracks');
    if (!container) return Promise.reject(new Error('tracks-container-missing'));

    return new Promise((resolve, reject) => {
      let settled = false;
      let observer;
      const cleanup = () => {
        if (observer) observer.disconnect();
        signal?.removeEventListener?.('abort', onAbort);
      };
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback(value);
      };
      const onAbort = () => finish(reject, abortError());
      const onMutation = () => {
        try {
          if (!hasFreshInputs()) return;
          const tracks = collectTrackInputs();
          if (tracks.length > 0) finish(resolve, tracks);
        } catch (error) {
          finish(reject, error);
        }
      };

      observer = new MutationObserverImpl(onMutation);
      observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['value'] });
      signal?.addEventListener?.('abort', onAbort, { once: true });
      if (signal?.aborted) onAbort();
    });
  };

  const adapter = {
    collectTrackInputs,
    collectTrackPresentation,
    readCsrfToken,
    submitExistingSpotifyForm,
    waitForTrackInputs,
    publishLegacyConversionResults
  };
  return Object.freeze(adapter);
};

export { createSpotmatePageAdapter };
