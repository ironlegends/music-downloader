import { createConversionRunner } from './conversion-runner.js';
import { createConversionSession } from './conversion-session.js';
import { createDownloadAdapter } from './download-adapter.js';
import {
  mountPlaylistPanel,
  createPlaylistView,
  PANEL_ID,
  LIVE_REGION_ID,
  LABELS,
  STATUS_LABELS
} from './playlist-view.js';
import { createSpotmateApiAdapter } from './spotmate-api-adapter.js';
import { createSpotmatePageAdapter } from './spotmate-page-adapter.js';
import { isAllowedSpotmatePage } from './policy.js';
import {
  TRACK_STATES,
  ERROR_CODES,
  assertTrackIds,
  assertTrackState,
  assertProgress,
  assertErrorCode,
  createTrackSession,
  setTrackSelected,
  setAllSelected,
  getSelectedQueuedTrackIds,
  getFailedTrackIds,
  requeueFailedTracks,
  transitionTrack,
  toPersistedSession
} from './track-session.js';
import {
  SESSION_STORAGE_KEY,
  saveSession,
  loadSession,
  clearSession
} from './session-storage.js';

const createBrowserCore = ({
  windowRef,
  documentRef,
  fetchImpl,
  URLImpl,
  AbortControllerImpl,
  setTimeoutImpl,
  clearTimeoutImpl,
  exposeConversionGlobals = false,
  exposeDownloadGlobals = false
} = {}) => {
  if (!windowRef || typeof windowRef !== 'object') throw new TypeError('windowRef is required');
  if (!documentRef || typeof documentRef !== 'object') throw new TypeError('documentRef is required');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required');
  if (typeof URLImpl !== 'function') throw new TypeError('URLImpl is required');
  if (typeof AbortControllerImpl !== 'function') throw new TypeError('AbortControllerImpl is required');
  if (typeof setTimeoutImpl !== 'function') throw new TypeError('setTimeoutImpl is required');
  if (typeof clearTimeoutImpl !== 'function') throw new TypeError('clearTimeoutImpl is required');

  let loadController = null;
  let activeOperation = null;
  let conversionCanceled = false;
  const supported = isAllowedSpotmatePage(windowRef.location);
  if (!supported) return undefined;

  const pageAdapter = createSpotmatePageAdapter({
    windowRef,
    documentRef,
    exposeLegacyGlobals: exposeConversionGlobals
  });
  const apiAdapter = createSpotmateApiAdapter({
    fetchImpl,
    location: windowRef.location,
    readCsrfToken: pageAdapter.readCsrfToken,
    URLImpl,
    setTimeoutImpl,
    clearTimeoutImpl
  });
  const session = createConversionSession({
    pageAdapter,
    apiAdapter,
    exposeLegacyGlobals: exposeConversionGlobals,
    AbortControllerImpl,
    setTimeoutImpl,
    clearTimeoutImpl,
    onTrackUpdate: (id, state) => view?.setTrackState?.(id, state)
  });
  const downloadAdapter = createDownloadAdapter({
    documentRef,
    windowRef,
    guided: true,
    exposeLegacyGlobals: exposeDownloadGlobals,
    onResults: results => view?.setResults?.(results),
    onRequest: id => view?.noteDownloadRequest?.(id)
  });

  let view = null;

  const explainInputError = (error) => {
    switch (error?.message) {
      case 'invalid-spotify-url':
        return 'Paste a Spotify track or playlist link into the Spotify link field, then choose Load Spotify URL.';
      case 'track-limit':
        return 'This playlist has more than 100 tracks. Use a smaller playlist and load it again.';
      case 'empty-track-value':
        return 'A track could not be read. Reload the Spotify link on SpotMate, then try again.';
      default:
        return 'SpotMate could not load the tracks. Reload the page, complete any verification and try again.';
    }
  };

  const onLoad = async () => {
    if (activeOperation) return;
    activeOperation = 'loading';
    loadController = new AbortControllerImpl();
    try {
      downloadAdapter.clear();
      view?.setTracks?.([]);
      view?.setActivity?.('loading');
      view?.setStatus?.("Loading tracks. Complete the site's verification if asked, or cancel to try another link.");
      const input = documentRef.querySelector?.('#trackUrl');
      const previousInputs = pageAdapter.submitExistingSpotifyForm(view?.getSourceUrl?.() ?? input?.value);
      const tracks = await pageAdapter.waitForTrackInputs(loadController.signal, previousInputs);
      view?.setTracks?.(pageAdapter.collectTrackPresentation());
      view?.setStage?.('convert');
      view?.setStatus?.(`${tracks.length} ${tracks.length === 1 ? 'track is' : 'tracks are'} loaded. Choose Start conversions.`);
    } catch (error) {
      view?.setStatus?.(error?.name === 'AbortError'
        ? 'Loading canceled. Paste another link and choose Load Spotify URL.'
        : explainInputError(error));
    } finally {
      loadController = null;
      activeOperation = null;
      view?.setActivity?.('idle');
    }
  };

  const onStart = async () => {
    if (activeOperation) return;
    activeOperation = 'converting';
    conversionCanceled = false;
    try {
      view?.setActivity?.('converting');
      const tracks = pageAdapter.collectTrackInputs();
      if (tracks.length === 0) {
        view?.setStage?.('load');
        view?.setStatus?.('No tracks found. Paste a Spotify link and choose Load Spotify URL first.');
        return undefined;
      }
      view?.setTracks?.(pageAdapter.collectTrackPresentation());
      downloadAdapter.clear();
      view?.setStatus?.(`Converting ${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'}. Keep this tab open.`);
      const results = await session.run(tracks);
      const downloadResults = tracks.map((track, index) => ({
        id: track.id,
        ...(results[index] ?? { kind: 'terminal', status: 'not_started' })
      }));
      const ready = downloadAdapter.render(downloadResults);
      view?.setStage?.(ready > 0 ? 'download' : 'convert');
      if (conversionCanceled) {
        view?.setStatus?.(ready > 0
          ? `Conversion canceled. ${ready} ${ready === 1 ? 'track is' : 'tracks are'} ready to download below.`
          : 'Conversion canceled. Choose Start conversions when you are ready to try again.');
      } else if (ready > 0) {
        const failed = tracks.length - ready;
        const summary = tracks.length === 1 ? '1 track is ready.' : `${ready} of ${tracks.length} tracks are ready.`;
        view?.setStatus?.(`${summary} Choose a download below.${failed > 0 ? ` ${failed} could not be converted. Check the site's verification and try again if needed.` : ''}`);
      } else {
        view?.setStatus?.("SpotMate could not convert these tracks. Check the site's verification and try again.");
      }
      return undefined;
    } catch (error) {
      const isKnownInputError = error?.message === 'empty-track-value' || error?.message === 'track-limit';
      const status = isKnownInputError ? 'input_error' : 'error';
      const errorMessage = isKnownInputError ? error.message : 'unexpected-error';
      const result = Object.freeze({
        id: null,
        status,
        success: false,
        pending: false,
        url: null,
        error: errorMessage
      });
      if (exposeConversionGlobals) pageAdapter.publishLegacyConversionResults([result]);
      downloadAdapter.render([]);
      view?.setStatus?.(isKnownInputError
        ? explainInputError(error)
        : "SpotMate could not convert these tracks. Reload the page, complete any verification and try again.");
      return undefined;
    } finally {
      activeOperation = null;
      view?.setActivity?.('idle');
    }
  };

  const onCancel = () => {
    if (!activeOperation) return;
    conversionCanceled = activeOperation === 'converting';
    loadController?.abort();
    session.cancel();
    view?.setStatus?.('Canceling. Wait for the current operation to stop.');
  };

  view = createPlaylistView({
    documentRef,
    windowRef,
    onLoad,
    onStart,
    onCancel,
    onDownloadTrack: (id, event) => downloadAdapter.downloadById(id, event),
    onDownloadAll: (event) => downloadAdapter.downloadAll(event)
  });

  const mount = () => {
    view.mount();
    return runtime;
  };
  const renderDownloads = (results) => downloadAdapter.render(results);
  const runtime = Object.freeze({ mount, view, session, pageAdapter, apiAdapter, downloadAdapter, renderDownloads });
  mount();
  return runtime;
};

export {
  isAllowedSpotmatePage,
  createBrowserCore,
  createConversionRunner,
  createConversionSession,
  createDownloadAdapter,
  createPlaylistView,
  mountPlaylistPanel,
  PANEL_ID,
  LIVE_REGION_ID,
  LABELS,
  STATUS_LABELS,
  createSpotmateApiAdapter,
  createSpotmatePageAdapter,
  TRACK_STATES,
  ERROR_CODES,
  assertTrackIds,
  assertTrackState,
  assertProgress,
  assertErrorCode,
  createTrackSession,
  setTrackSelected,
  setAllSelected,
  getSelectedQueuedTrackIds,
  getFailedTrackIds,
  requeueFailedTracks,
  transitionTrack,
  toPersistedSession,
  SESSION_STORAGE_KEY,
  saveSession,
  loadSession,
  clearSession
};
