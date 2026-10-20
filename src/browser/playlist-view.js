import { createLivingWorkspace } from './living-workspace.js';
import { isTrustedUserEvent, isFinalHttpsUrl } from './policy.js';
import {
  setTrackSelected,
  setAllSelected,
  getSelectedQueuedTrackIds,
  getFailedTrackIds,
  requeueFailedTracks
} from './track-session.js';

const PANEL_ID = 'spotmate-voluntary-panel';
const LIVE_REGION_ID = 'spotmate-v13-live-region';

const LABELS = Object.freeze({
  load: 'Load Spotify URL',
  start: 'Start conversions',
  cancel: 'Cancel',
  downloadAll: 'Download all',
  selectAll: 'Select all',
  selectNone: 'Deselect all',
  resume: 'Resume',
  retryFailed: 'Retry failed'
});

const STATUS_LABELS = Object.freeze({
  queued: 'Queued',
  converting: 'Converting',
  polling: 'Checking status',
  success: 'Successful',
  failed: 'Failed',
  cancelled: 'Canceled'
});

/**
 * Mounts or updates the SpotMate v1.3 playlist panel.
 */
const mountPlaylistPanel = ({
  host,
  session = null,
  runner = null,
  documentRef = null,
  document = null,
  announce = null,
  onDownloadTrack = null,
  onDownloadAll = null
} = {}) => {
  const doc = documentRef || document || host?.ownerDocument || globalThis.document;
  if (!doc || typeof doc.createElement !== 'function') {
    throw new TypeError('documentRef is required');
  }

  const targetHost = host || doc.body;
  let currentSession = session || runner?.getSession?.() || null;
  let volatileDownloads = new Map();
  const previousTrackStates = new Map();
  let panel = null;
  let liveRegion = null;

  const getLiveRegion = () => {
    let region = doc.getElementById(LIVE_REGION_ID);
    if (!region) {
      region = doc.createElement('div');
      region.id = LIVE_REGION_ID;
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      region.className = 'spotmate-live-region';
      targetHost.appendChild(region);
    }
    return region;
  };

  const publishAnnouncement = (message) => {
    if (!message) return;
    const region = getLiveRegion();
    if (region) {
      region.textContent = message;
    }
    if (typeof announce === 'function') {
      announce(message);
    }
  };

  const syncStateAnnouncements = () => {
    if (!currentSession || !Array.isArray(currentSession.tracks)) return;
    const messages = [];
    for (const track of currentSession.tracks) {
      const prevState = previousTrackStates.get(track.id);
      if (prevState !== track.status) {
        previousTrackStates.set(track.id, track.status);
        if (prevState !== undefined || track.status !== 'queued') {
          const statusLabel = STATUS_LABELS[track.status] || track.status;
          messages.push(`Track ${track.id}: ${statusLabel.toLowerCase()}`);
        }
      }
    }
    if (messages.length > 0) {
      publishAnnouncement(messages.join('. '));
    }
  };

  const getActiveFocusKey = () => {
    const active = doc.activeElement;
    if (!active || !panel) return null;
    const action = active.getAttribute?.('data-action');
    const trackId = active.getAttribute?.('data-track-id');
    const tagName = active.tagName;
    if (action || trackId) {
      return { action, trackId, tagName };
    }
    return null;
  };

  const restoreFocusKey = (key) => {
    if (!key || !panel) return;
    if (key.action) {
      const match = panel.querySelector(`[data-action="${key.action}"]`);
      if (match && typeof match.focus === 'function') {
        match.focus();
        return;
      }
    }
    if (key.trackId) {
      const elements = panel.querySelectorAll ? panel.querySelectorAll('[data-track-id]') : [];
      if (key.tagName) {
        const expectedTag = String(key.tagName).toUpperCase();
        for (const el of elements) {
          if (
            el.tagName === expectedTag &&
            el.getAttribute?.('data-track-id') === key.trackId &&
            typeof el.focus === 'function'
          ) {
            el.focus();
            return;
          }
        }
      }
      for (const el of elements) {
        if (el.getAttribute?.('data-track-id') === key.trackId && typeof el.focus === 'function') {
          el.focus();
          return;
        }
      }
    }
  };

  const destroy = () => {
    if (panel) {
      panel.remove?.();
      panel = null;
    }
    const region = doc.getElementById(LIVE_REGION_ID);
    if (region) {
      region.remove?.();
      liveRegion = null;
    }
  };

  const invokeTrusted = (handler, event) => {
    if (!isTrustedUserEvent(event) || typeof handler !== 'function') return undefined;
    return handler(event);
  };

  const makeButton = ({ label, action, onClick, disabled = false, trackId = null }) => {
    const button = doc.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = `spotmate-button spotmate-button-${action}`;
    button.setAttribute('data-action', action);
    if (trackId) {
      button.setAttribute('data-track-id', trackId);
    }
    if (disabled) {
      button.disabled = true;
      button.setAttribute('disabled', 'true');
    }
    button.addEventListener('click', (event) => invokeTrusted(onClick, event));
    return button;
  };

  const updateSession = (newSession) => {
    currentSession = newSession;
    if (runner?.setSession) {
      runner.setSession(newSession);
    }
  };

  const render = () => {
    const focusKey = getActiveFocusKey();

    // Remove the previous panel, if present.
    const existing = doc.getElementById(PANEL_ID);
    if (existing) {
      existing.remove?.();
    }

    panel = doc.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'spotmate-voluntary-panel';

    liveRegion = getLiveRegion();

    const isRunning = currentSession?.tracks?.some(
      (t) => t.status === 'converting' || t.status === 'polling'
    );
    const hasQueued = (getSelectedQueuedTrackIds(currentSession) || []).length > 0;
    const hasFailed = (getFailedTrackIds(currentSession) || []).length > 0;

    // Toolbar and global actions.
    const toolbar = doc.createElement('div');
    toolbar.className = 'spotmate-panel-toolbar';

    toolbar.appendChild(
      makeButton({
        label: LABELS.selectAll,
        action: 'select-all',
        disabled: isRunning,
        onClick: () => {
          if (currentSession) {
            updateSession(setAllSelected(currentSession, true));
            render();
          }
        }
      })
    );

    toolbar.appendChild(
      makeButton({
        label: LABELS.selectNone,
        action: 'select-none',
        disabled: isRunning,
        onClick: () => {
          if (currentSession) {
            updateSession(setAllSelected(currentSession, false));
            render();
          }
        }
      })
    );

    toolbar.appendChild(
      makeButton({
        label: LABELS.start,
        action: 'start',
        disabled: isRunning || !hasQueued,
        onClick: async () => {
          if (runner?.startSelected) {
            const updated = await runner.startSelected();
            if (updated) currentSession = updated;
            render();
          }
        }
      })
    );

    toolbar.appendChild(
      makeButton({
        label: LABELS.cancel,
        action: 'cancel',
        disabled: !isRunning,
        onClick: () => {
          if (runner?.cancel) {
            runner.cancel();
            if (runner?.getSession) currentSession = runner.getSession();
            render();
          }
        }
      })
    );

    toolbar.appendChild(
      makeButton({
        label: LABELS.resume,
        action: 'resume',
        disabled: isRunning || !hasQueued,
        onClick: async () => {
          if (runner?.resumeQueued) {
            const updated = await runner.resumeQueued();
            if (updated) currentSession = updated;
            render();
          }
        }
      })
    );

    if (hasFailed) {
      toolbar.appendChild(
        makeButton({
          label: LABELS.retryFailed,
          action: 'retry-failed',
          disabled: isRunning,
          onClick: () => {
            if (runner?.retryFailedTracks) {
              const updated = runner.retryFailedTracks();
              if (updated) currentSession = updated;
            } else if (currentSession) {
              updateSession(requeueFailedTracks(currentSession));
            }
            render();
          }
        })
      );
    }

    if (volatileDownloads.size > 0 || typeof onDownloadAll === 'function') {
      toolbar.appendChild(
        makeButton({
          label: LABELS.downloadAll,
          action: 'download-all',
          disabled: isRunning,
          onClick: async (event) => {
            if (typeof onDownloadAll === 'function') {
              await onDownloadAll(event);
            }
          }
        })
      );
    }

    panel.appendChild(toolbar);

    // Track list.
    if (currentSession && Array.isArray(currentSession.tracks) && currentSession.tracks.length > 0) {
      const trackList = doc.createElement('div');
      trackList.className = 'spotmate-track-list';

      for (const track of currentSession.tracks) {
        const row = doc.createElement('div');
        row.className = `spotmate-track-row spotmate-track-${track.status}`;
        row.setAttribute('data-track-id', track.id);

        // Track selection checkbox.
        const checkboxLabel = doc.createElement('label');
        checkboxLabel.className = 'spotmate-checkbox-container';

        const checkbox = doc.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.setAttribute('type', 'checkbox');
        checkbox.setAttribute('data-track-id', track.id);
        checkbox.setAttribute('aria-label', `Select track ${track.id}`);
        checkbox.checked = Boolean(track.selected);
        if (track.selected) {
          checkbox.setAttribute('checked', 'true');
        }
        if (isRunning) {
          checkbox.disabled = true;
          checkbox.setAttribute('disabled', 'true');
        }

        checkbox.addEventListener('change', (event) => {
          if (!isTrustedUserEvent(event)) {
            event.preventDefault?.();
            checkbox.checked = Boolean(track.selected);
            return;
          }
          currentSession = setTrackSelected(currentSession, track.id, checkbox.checked);
          render();
        });

        checkboxLabel.appendChild(checkbox);
        row.appendChild(checkboxLabel);

        // Track name.
        const nameSpan = doc.createElement('span');
        nameSpan.className = 'spotmate-track-name';
        nameSpan.textContent = `Track ${track.id}`;
        row.appendChild(nameSpan);

        // Text status.
        const statusSpan = doc.createElement('span');
        statusSpan.className = 'spotmate-track-status';
        statusSpan.setAttribute('data-status', track.status);
        statusSpan.textContent = STATUS_LABELS[track.status] || track.status;
        row.appendChild(statusSpan);

        // Accessible progress bar.
        const progress = doc.createElement('progress');
        const progressVal = String(track.progressPercent || 0);
        progress.setAttribute('max', '100');
        progress.setAttribute('value', progressVal);
        progress.setAttribute('aria-label', `Progress for track ${track.id}`);
        progress.setAttribute('aria-valuemin', '0');
        progress.setAttribute('aria-valuemax', '100');
        progress.setAttribute('aria-valuenow', progressVal);
        progress.value = track.progressPercent || 0;
        row.appendChild(progress);

        // Show an individual download button when a successful result has a URL.
        const volatileUrl = volatileDownloads.get(track.id);
        if (track.status === 'success' && (volatileUrl || typeof onDownloadTrack === 'function')) {
          const downloadBtn = makeButton({
            label: `Download ${track.id}`,
            action: 'download-track',
            trackId: track.id,
            onClick: async (event) => {
              if (typeof onDownloadTrack === 'function') {
                await onDownloadTrack(track.id, event);
              } else if (volatileUrl && isFinalHttpsUrl(volatileUrl)) {
                const a = doc.createElement('a');
                a.href = volatileUrl;
                a.download = `${track.id}.mp3`;
                a.style.display = 'none';
                targetHost.appendChild(a);
                a.click();
                a.remove();
              }
            }
          });
          row.appendChild(downloadBtn);
        }

        trackList.appendChild(row);
      }

      panel.appendChild(trackList);
    }

    targetHost.appendChild(panel);
    syncStateAnnouncements();
    restoreFocusKey(focusKey);

    return panel;
  };

  const getSession = () => currentSession;

  const setSession = (newSession) => {
    currentSession = newSession;
    if (currentSession && Array.isArray(currentSession.tracks)) {
      const activeIds = new Set(currentSession.tracks.map((t) => t.id));
      for (const id of previousTrackStates.keys()) {
        if (!activeIds.has(id)) {
          previousTrackStates.delete(id);
        }
      }
      for (const id of volatileDownloads.keys()) {
        if (!activeIds.has(id)) {
          volatileDownloads.delete(id);
        }
      }
    } else {
      previousTrackStates.clear();
      volatileDownloads.clear();
    }
    return render();
  };

  const setVolatileUrl = (trackId, url) => {
    if (typeof trackId === 'string' && typeof url === 'string') {
      volatileDownloads.set(trackId, url);
      render();
    }
  };

  // Initial render
  render();

  const controller = {
    render,
    destroy,
    getSession,
    setSession,
    setVolatileUrl,
    announce: publishAnnouncement
  };

  Object.defineProperty(controller, 'panel', { enumerable: true, get: () => panel });
  Object.defineProperty(controller, 'liveRegion', { enumerable: true, get: () => liveRegion });

  return Object.freeze(controller);
};

const createPlaylistView = options => createLivingWorkspace({ ...options, labels: LABELS, panelId: PANEL_ID });

export {
  PANEL_ID,
  LIVE_REGION_ID,
  LABELS,
  STATUS_LABELS,
  mountPlaylistPanel,
  createPlaylistView
};
