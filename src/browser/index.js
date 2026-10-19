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
    clearTimeoutImpl
  });
  const downloadAdapter = createDownloadAdapter({
    documentRef,
    windowRef,
    exposeLegacyGlobals: exposeDownloadGlobals
  });

  let view = null;

  const onLoad = async () => {
    if (loadController) return;
    loadController = new AbortControllerImpl();
    try {
      view?.setStatus?.('');
      const input = documentRef.querySelector?.('#trackUrl');
      pageAdapter.submitExistingSpotifyForm(input?.value);
      await pageAdapter.waitForTrackInputs(loadController.signal);
    } catch (error) {
      if (error?.name !== 'AbortError') throw error;
    } finally {
      loadController = null;
    }
  };

  const onStart = async () => {
    try {
      view?.setStatus?.('');
      const tracks = pageAdapter.collectTrackInputs();
      const results = await session.run(tracks);
      const downloadResults = results.map((result, index) => ({
        id: tracks[index]?.id,
        ...result
      }));
      downloadAdapter.render(downloadResults);
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
      view?.setStatus?.(errorMessage);
      return undefined;
    }
  };

  const onCancel = () => {
    loadController?.abort();
    session.cancel();
  };

  view = createPlaylistView({
    documentRef,
    onLoad,
    onStart,
    onCancel,
    onDownloadTrack: (item, event) => downloadAdapter.downloadTrack(item, event),
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
