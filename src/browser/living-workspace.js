import { isTrustedUserEvent } from './policy.js';
import { createMotionBackdrop } from './motion-backdrop.js';

const createLivingWorkspace = ({ documentRef: doc, windowRef = doc?.defaultView, labels, panelId,
  onLoad, onStart, onCancel, onDownloadTrack, onDownloadAll } = {}) => {
  if (!doc?.createElement || !doc.body) throw new TypeError('documentRef is required');
  let panel = null, surface = null, sourceInput = null, statusElement = null, resultsHost = null;
  let summary = null, resultsTitle = null, list = null, footer = null, activityLabel = null, motion = null;
  let currentStatus = '', activity = 'idle', stage = 'load', tracks = [], requests = 0;
  let buttons = [], steps = [], rows = new Map(), requestedIds = new Set();
  const stateLabels = { loaded: 'Loaded', converting: 'Converting', polling: 'Checking status',
    ready: 'Ready', failed: 'Failed', canceled: 'Canceled', not_started: 'Not started' };
  const make = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const makeButton = (label, callback, blocked = () => false, primary = false) => {
    const button = make('button', `spotmate-button${primary ? ' spotmate-primary' : ''}`, label);
    button.type = 'button';
    button.addEventListener('click', event => {
      if (isTrustedUserEvent(event) && !blocked() && !button.disabled) return callback?.(event);
      return undefined;
    });
    buttons.push({ button, blocked });
    return button;
  };
  const updateActivity = () => {
    for (const { button, blocked } of buttons) button.setAttribute('aria-disabled', String(blocked()));
    if (sourceInput) sourceInput.readOnly = activity !== 'idle';
    panel?.setAttribute('data-activity', activity);
    const ready = tracks.filter(track => track.state === 'ready').length;
    if (activityLabel) activityLabel.textContent = activity === 'loading' ? 'Loading tracks' :
      activity === 'converting' ? 'Preparing your tracks' : ready ? 'Ready to download' : tracks.length ? 'Playlist loaded' : 'Waiting for your link';
    motion?.setActivity(activity === 'idle' && ready ? 'ready' : activity);
    motion?.refresh();
  };
  const setStage = next => {
    stage = next; panel?.setAttribute('data-stage', stage);
    for (const item of steps) item.element.setAttribute('aria-current', item.name === stage ? 'step' : 'false');
  };
  const updateSummary = () => {
    const ready = tracks.filter(track => track.state === 'ready').length;
    const failed = tracks.filter(track => track.state === 'failed').length;
    const canceled = tracks.filter(track => track.state === 'canceled').length;
    const pending = tracks.filter(track => track.state === 'not_started').length;
    if (summary) summary.textContent = `${tracks.length} tracks · ${ready} ready${failed ? ` · ${failed} failed` : ''}${canceled ? ` · ${canceled} canceled` : ''}${pending ? ` · ${pending} not started` : ''} · ${requests} requests started`;
    updateActivity();
  };
  const updateRow = track => {
    const row = rows.get(track.id);
    if (!row) return;
    row.entry.setAttribute('data-state', track.state);
    row.state.textContent = requestedIds.has(track.id) ? 'Requested' : stateLabels[track.state] || 'Loaded';
    row.state.className = `spotmate-result-state ${track.state === 'ready' ? 'spotmate-ready' : track.state === 'failed' ? 'spotmate-failed' : ''}`;
    row.detail.textContent = requestedIds.has(track.id) ? 'Request started. Check your browser for the file.' :
      track.state === 'failed' ? 'Conversion failed. Check verification and try again.' :
      track.state === 'canceled' ? 'Conversion canceled. Start conversions when you are ready.' :
      track.state === 'not_started' ? 'Not started. Start conversions when you are ready.' : track.artist || '';
    if (track.state === 'ready' && !row.download) {
      row.download = makeButton('Download', event => onDownloadTrack?.(track.id, event), () => activity !== 'idle');
      row.download.setAttribute('aria-label', `Download Track ${track.position}`);
      buttons[buttons.length - 1].trackButton = true;
      row.action.appendChild(row.download);
    } else if (track.state !== 'ready' && row.download) {
      buttons = buttons.filter(item => item.button !== row.download);
      row.download.remove(); row.download = null;
    }
  };
  const updateFooter = () => {
    if (!footer) return;
    while (footer.children?.length) footer.children[0].remove();
    buttons = buttons.filter(item => !item.resultFooter);
    const ready = tracks.filter(track => track.state === 'ready').length;
    if (!ready) return;
    let busy = false;
    const button = makeButton('Download all ready', async event => {
      busy = true; button.disabled = true;
      try { await onDownloadAll?.(event); } finally { busy = false; button.disabled = false; updateActivity(); }
    }, () => activity !== 'idle' || busy, true);
    buttons[buttons.length - 1].resultFooter = true;
    const note = make('p', 'spotmate-download-note', `${ready} ${ready === 1 ? 'track is' : 'tracks are'} ready. Your browser handles saving the files.`);
    footer.appendChild(note); footer.appendChild(button);
  };
  const renderRows = () => {
    if (!list) return;
    for (const row of rows.values()) row.entry.remove();
    rows = new Map();
    buttons = buttons.filter(item => !item.trackButton);
    for (const track of tracks) {
      const entry = make('li', 'spotmate-result-row');
      entry.setAttribute('data-track-id', track.id);
      const art = make('div', 'spotmate-track-art');
      art.setAttribute('aria-hidden', 'true');
      art.setAttribute('data-tone', String(track.position % 4));
      if (track.artworkUrl) {
        const image = make('img'); image.alt = ''; image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', () => image.remove(), { once: true }); image.src = track.artworkUrl; art.appendChild(image);
      }
      entry.appendChild(art);
      const name = make('div', 'spotmate-result-name');
      name.appendChild(make('strong', '', track.title));
      const detail = make('p'); name.appendChild(detail); entry.appendChild(name);
      const state = make('span', 'spotmate-result-state'); entry.appendChild(state);
      const action = make('div', 'spotmate-result-action'); entry.appendChild(action);
      list.appendChild(entry); rows.set(track.id, { entry, state, detail, action, download: null });
      const before = buttons.length; updateRow(track);
      if (buttons.length > before) buttons[buttons.length - 1].trackButton = true;
    }
    if (resultsTitle) resultsTitle.textContent = `Tracks (${tracks.length})`;
    updateFooter(); updateSummary();
  };
  const remove = () => { motion?.destroy(); motion = null; panel?.remove?.(); panel = null; };
  const mount = () => {
    const previousUrl = sourceInput?.value;
    remove(); buttons = []; steps = []; rows = new Map();
    panel = make('section', 'spotmate-voluntary-panel spotmate-living-app'); panel.id = panelId;
    panel.setAttribute('lang', 'en'); panel.setAttribute('aria-labelledby', 'spotmate-product-title');
    surface = make('div', 'spotmate-surface'); panel.appendChild(surface);
    const header = make('header', 'spotmate-product-header');
    const heading = make('h2', '', 'Music Downloader'); heading.id = 'spotmate-product-title'; header.appendChild(heading);
    header.appendChild(make('p', '', 'Your music sets the background in motion.'));
    const links = make('div', 'spotmate-header-links');
    const help = make('a', '', 'Help'); help.href = 'https://github.com/ironlegends/music-downloader#download-music'; help.target = '_blank'; help.rel = 'noopener noreferrer'; links.appendChild(help);
    panel.appendChild(links); surface.appendChild(header);
    const workspace = make('div', 'spotmate-workspace');
    const label = make('label', '', 'Spotify link'); label.setAttribute('for', 'spotmate-source-url'); workspace.appendChild(label);
    const sourceRow = make('div', 'spotmate-source-row');
    sourceInput = make('input'); sourceInput.id = 'spotmate-source-url'; sourceInput.type = 'url';
    sourceInput.value = previousUrl ?? doc.querySelector?.('#trackUrl')?.value ?? '';
    sourceInput.placeholder = 'https://open.spotify.com/playlist/...';
    sourceInput.setAttribute('autocomplete', 'off'); sourceInput.setAttribute('spellcheck', 'false');
    sourceInput.setAttribute('aria-describedby', 'spotmate-link-help spotmate-verification-note');
    sourceInput.addEventListener('keydown', event => {
      if (event.key === 'Enter' && activity === 'idle' && isTrustedUserEvent(event)) { event.preventDefault(); return onLoad?.(undefined, event); }
      return undefined;
    });
    sourceRow.appendChild(sourceInput);
    sourceRow.appendChild(makeButton(labels.load, event => onLoad?.(undefined, event), () => activity !== 'idle', true));
    workspace.appendChild(sourceRow);
    const instructions = make('p', 'spotmate-help', 'Paste a Spotify track or playlist link.'); instructions.id = 'spotmate-link-help'; workspace.appendChild(instructions);
    const verification = make('p', 'spotmate-verification', 'Complete SpotMate verification manually if prompted. '); verification.id = 'spotmate-verification-note';
    const original = make('a', '', 'Open SpotMate form'); original.href = '#trackUrl';
    original.addEventListener('click', event => {
      if (!isTrustedUserEvent(event)) return;
      const input = doc.querySelector?.('#trackUrl');
      input?.scrollIntoView?.({ block: 'center', behavior: 'instant' }); input?.focus?.({ preventScroll: true });
    });
    verification.appendChild(original); workspace.appendChild(verification);
    const rail = make('ol', 'spotmate-steps'); rail.setAttribute('role', 'list'); rail.setAttribute('aria-label', 'Download steps');
    ['load', 'convert', 'download'].forEach((name, i) => {
      const element = make('li'); const number = make('span', 'spotmate-step-number', String(i + 1)); number.setAttribute('aria-hidden', 'true'); element.appendChild(number);
      element.appendChild(make('strong', '', ['Load', 'Convert', 'Download'][i])); rail.appendChild(element); steps.push({ name, element });
    });
    workspace.appendChild(rail); surface.appendChild(workspace);
    resultsHost = make('section', 'spotmate-download-panel spotmate-guided-results'); resultsHost.id = 'spotmate-download-panel';
    resultsHost.setAttribute('aria-labelledby', 'spotmate-results-title');
    const resultsHeading = make('div', 'spotmate-results-heading');
    const titleBlock = make('div'); resultsTitle = make('h3', '', `Tracks (${tracks.length})`); resultsTitle.id = 'spotmate-results-title'; titleBlock.appendChild(resultsTitle);
    summary = make('p'); titleBlock.appendChild(summary); resultsHeading.appendChild(titleBlock);
    const actions = make('div', 'spotmate-panel-toolbar');
    actions.appendChild(makeButton(labels.start, event => onStart?.(undefined, event), () => activity !== 'idle'));
    actions.appendChild(makeButton(labels.cancel, event => onCancel?.(undefined, event), () => activity === 'idle'));
    resultsHeading.appendChild(actions); resultsHost.appendChild(resultsHeading);
    const viewport = make('div', 'spotmate-list-viewport');
    const columns = make('div', 'spotmate-column-head'); columns.setAttribute('aria-hidden', 'true');
    ['Track / Artist', 'Status', 'Download'].forEach(text => columns.appendChild(make('span', '', text))); viewport.appendChild(columns);
    list = make('ol', 'spotmate-results-list'); list.setAttribute('role', 'list'); viewport.appendChild(list); resultsHost.appendChild(viewport);
    footer = make('div', 'spotmate-download-footer'); resultsHost.appendChild(footer); surface.appendChild(resultsHost);
    const activityRail = make('div', 'spotmate-activity-rail'); activityLabel = make('p'); activityRail.appendChild(activityLabel);
    let trace = null;
    if (doc.createElementNS) {
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 280 34'); svg.setAttribute('aria-hidden', 'true');
      trace = doc.createElementNS('http://www.w3.org/2000/svg', 'path'); trace.setAttribute('d', 'M0 17H280'); svg.appendChild(trace); activityRail.appendChild(svg);
    }
    surface.appendChild(activityRail);
    statusElement = make('p', 'spotmate-status', currentStatus || 'Paste a Spotify link, then load your tracks.'); statusElement.id = 'spotmate-operation-status';
    statusElement.setAttribute('role', 'status'); statusElement.setAttribute('aria-atomic', 'true'); surface.appendChild(statusElement);
    surface.appendChild(make('p', 'spotmate-artwork-note', 'Move your pointer to shape the light and covers.'));
    if (typeof doc.body.insertBefore === 'function') doc.body.insertBefore(panel, doc.body.firstChild);
    else doc.body.appendChild(panel);
    motion = createMotionBackdrop({ root: panel, documentRef: doc, windowRef, trace });
    if (motion.pauseButton) links.appendChild(motion.pauseButton);
    renderRows(); motion.setTracks(tracks); updateActivity(); setStage(stage);
    return panel;
  };
  const setTracks = next => {
    tracks = (Array.isArray(next) ? next : []).map((track, index) => ({ id: track.id, position: index + 1,
      title: track.title || `Track ${index + 1}`, artist: track.artist || '', artworkUrl: track.artworkUrl || '', state: 'loaded' }));
    requests = 0; requestedIds = new Set(); renderRows(); motion?.setTracks(tracks);
  };
  const setTrackState = (id, state) => { const track = tracks.find(item => item.id === id); if (track) { track.state = state; updateRow(track); updateSummary(); } };
  const setResults = results => {
    if (!results.length) { tracks.forEach(track => { track.state = 'loaded'; }); requestedIds.clear(); requests = 0; }
    for (const result of results) {
      let track = tracks.find(item => item.id === result.id);
      if (!track) { track = { id: result.id, position: result.position, title: `Track ${result.position}`, artist: '', artworkUrl: '' }; tracks.push(track); }
      track.state = result.status;
    }
    renderRows(); motion?.setTracks(tracks);
  };
  const noteDownloadRequest = id => {
    requests++; requestedIds.add(id); const track = tracks.find(item => item.id === id);
    if (track) updateRow(track); updateSummary(); motion?.pulse(id);
    setStatus(`${requests} download ${requests === 1 ? 'request' : 'requests'} started. Check your browser for the files.`);
  };
  const setStatus = status => { currentStatus = typeof status === 'string' ? status : ''; if (statusElement) statusElement.textContent = currentStatus; motion?.refresh(); return panel; };
  const setActivity = next => { activity = next; if (next === 'loading') setStage('load'); if (next === 'converting') setStage('convert'); updateActivity(); };
  const view = { mount, render: mount, remove, setTracks, setTrackState, setResults, noteDownloadRequest, setStatus,
    setActivity, setStage, getSourceUrl: () => sourceInput?.value,
    setDownloadItems(items) { const values = Array.isArray(items) ? items : []; setTracks(values); setResults(values.map((item, index) => ({ id: item.id, position: index + 1, status: 'ready' }))); return panel; } };
  Object.defineProperty(view, 'panel', { enumerable: true, get: () => panel });
  Object.defineProperty(view, 'status', { enumerable: true, get: () => currentStatus });
  return Object.freeze(view);
};

export { createLivingWorkspace };
