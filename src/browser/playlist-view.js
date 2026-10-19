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

/**
 * Legacy playlist view for v1.2 compatibility.
 */
const createPlaylistView = ({
  documentRef,
  onLoad,
  onStart,
  onCancel,
  onDownloadTrack,
  onDownloadAll
} = {}) => {
  if (!documentRef || typeof documentRef.createElement !== 'function' || !documentRef.body) {
    throw new TypeError('documentRef is required');
  }

  let panel = null;
  let downloadItems = [];
  let currentStatus = '';
  let activity = 'idle';
  let statusElement = null;
  let activityButtons = [];
  let sourceInput = null;
  let currentStage = 'load';
  let stageElements = [];

  const remove = () => {
    panel?.remove?.();
    panel = null;
  };

  const invoke = (callback, event, value) => {
    if (!isTrustedUserEvent(event) || typeof callback !== 'function') return undefined;
    return callback(value, event);
  };

  const makeButton = (label, callback, value, blocked = () => false) => {
    const button = documentRef.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = label === LABELS.start ? 'spotmate-button' : 'spotmate-button spotmate-button-secondary';
    button.addEventListener('click', (event) => {
      if (!blocked()) return invoke(callback, event, value);
      return undefined;
    });
    activityButtons.push({ button, blocked });
    return button;
  };

  const updateActivity = () => {
    for (const { button, blocked } of activityButtons) {
      button.setAttribute('aria-disabled', String(blocked()));
    }
    if (sourceInput) sourceInput.readOnly = activity !== 'idle';
  };

  const setStage = (stage) => {
    currentStage = stage;
    panel?.setAttribute('data-stage', stage);
    for (const { element, name } of stageElements) {
      element.setAttribute('aria-current', name === stage ? 'step' : 'false');
    }
  };

  const render = () => {
    remove();
    panel = documentRef.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'spotmate-voluntary-panel';
    panel.setAttribute('lang', 'en');
    panel.setAttribute('aria-labelledby', 'spotmate-product-title');
    activityButtons = [];

    const header = documentRef.createElement('div');
    header.className = 'spotmate-product-header';
    const heading = documentRef.createElement('h2');
    heading.id = 'spotmate-product-title';
    heading.textContent = 'Music Downloader';
    header.appendChild(heading);
    const service = documentRef.createElement('span');
    service.textContent = 'for SpotMate';
    header.appendChild(service);
    const help = documentRef.createElement('a');
    help.href = 'https://github.com/ironlegends/music-downloader#download-music';
    help.target = '_blank';
    help.rel = 'noopener noreferrer';
    help.textContent = 'Help';
    header.appendChild(help);
    panel.appendChild(header);

    const workspace = documentRef.createElement('div');
    workspace.className = 'spotmate-workspace';
    const sourceLabel = documentRef.createElement('label');
    sourceLabel.textContent = 'Spotify link';
    sourceLabel.setAttribute('for', 'spotmate-source-url');
    workspace.appendChild(sourceLabel);
    const previousUrl = sourceInput?.value;
    sourceInput = documentRef.createElement('input');
    sourceInput.id = 'spotmate-source-url';
    sourceInput.type = 'url';
    sourceInput.value = previousUrl ?? documentRef.querySelector?.('#trackUrl')?.value ?? '';
    sourceInput.placeholder = 'https://open.spotify.com/playlist/...';
    sourceInput.setAttribute('autocomplete', 'off');
    sourceInput.setAttribute('spellcheck', 'false');
    sourceInput.setAttribute('aria-describedby', 'spotmate-link-help spotmate-verification-note');
    sourceInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && activity === 'idle' && isTrustedUserEvent(event)) {
        event.preventDefault();
        return invoke(onLoad, event);
      }
      return undefined;
    });
    workspace.appendChild(sourceInput);
    const instructions = documentRef.createElement('p');
    instructions.id = 'spotmate-link-help';
    instructions.className = 'spotmate-help';
    instructions.textContent = 'Paste a Spotify track or playlist link.';
    workspace.appendChild(instructions);
    const verification = documentRef.createElement('p');
    verification.id = 'spotmate-verification-note';
    verification.className = 'spotmate-verification';
    verification.textContent = 'Complete SpotMate verification manually if prompted.';
    workspace.appendChild(verification);
    const steps = documentRef.createElement('ol');
    steps.className = 'spotmate-steps';
    steps.setAttribute('role', 'list');
    steps.setAttribute('aria-label', 'Download steps');
    stageElements = [];
    for (const [index, [name, title, detail]] of [
      ['load', 'Load Spotify URL', 'Fetch tracks from the link'],
      ['convert', 'Start conversions', 'Convert the loaded tracks'],
      ['download', 'Download all ready', 'Get your converted tracks']
    ].entries()) {
      const step = documentRef.createElement('li');
      const number = documentRef.createElement('span');
      number.className = 'spotmate-step-number';
      number.textContent = String(index + 1);
      number.setAttribute('aria-hidden', 'true');
      step.appendChild(number);
      const copy = documentRef.createElement('div');
      const label = documentRef.createElement('strong');
      label.textContent = title;
      copy.appendChild(label);
      const hint = documentRef.createElement('span');
      hint.textContent = detail;
      copy.appendChild(hint);
      step.appendChild(copy);
      steps.appendChild(step);
      stageElements.push({ element: step, name });
    }
    workspace.appendChild(steps);
    const toolbar = documentRef.createElement('div');
    toolbar.className = 'spotmate-panel-toolbar';
    toolbar.appendChild(makeButton(LABELS.load, onLoad, undefined, () => activity !== 'idle'));
    toolbar.appendChild(makeButton(LABELS.start, onStart, undefined, () => activity !== 'idle'));
    toolbar.appendChild(makeButton(LABELS.cancel, onCancel, undefined, () => activity === 'idle'));
    workspace.appendChild(toolbar);
    panel.appendChild(workspace);

    if (downloadItems.length > 0) {
      const allButton = makeButton(LABELS.downloadAll, async (_value, event) => {
        if (!isTrustedUserEvent(event) || typeof onDownloadAll !== 'function') return;
        allButton.disabled = true;
        try {
          await onDownloadAll(event);
        } finally {
          allButton.disabled = false;
        }
      });
      panel.appendChild(allButton);

      for (const item of downloadItems) {
        const id = typeof item?.id === 'string' && item.id.length > 0 ? item.id : 'track';
        panel.appendChild(makeButton(`Download ${id}`, onDownloadTrack, item));
      }
    }

    statusElement = documentRef.createElement('p');
    statusElement.id = 'spotmate-operation-status';
    statusElement.className = 'spotmate-status';
    statusElement.setAttribute('role', 'status');
    statusElement.setAttribute('aria-atomic', 'true');
    statusElement.textContent = currentStatus;
    workspace.appendChild(statusElement);

    documentRef.body.appendChild(panel);
    updateActivity();
    setStage(currentStage);
    return panel;
  };

  const setDownloadItems = (items) => {
    downloadItems = Array.isArray(items) ? items.slice() : [];
    return render();
  };

  const setStatus = (status) => {
    currentStatus = typeof status === 'string' ? status : '';
    if (statusElement) statusElement.textContent = currentStatus;
    return panel;
  };

  const setActivity = (nextActivity) => {
    activity = nextActivity;
    if (nextActivity === 'loading') setStage('load');
    if (nextActivity === 'converting') setStage('convert');
    updateActivity();
  };

  const mount = () => render();

  const getSourceUrl = () => sourceInput?.value;
  const view = { mount, render, remove, setDownloadItems, setStatus, setActivity, setStage, getSourceUrl };
  Object.defineProperty(view, 'panel', { enumerable: true, get: () => panel });
  Object.defineProperty(view, 'status', { enumerable: true, get: () => currentStatus });
  return Object.freeze(view);
};

export {
  PANEL_ID,
  LIVE_REGION_ID,
  LABELS,
  STATUS_LABELS,
  mountPlaylistPanel,
  createPlaylistView
};
