import { BROWSER_LIMITS, isFinalHttpsUrl, isTrustedUserEvent } from './policy.js';

const PANEL_ID = 'spotmate-download-panel';

const createDownloadAdapter = ({ documentRef, windowRef, exposeLegacyGlobals = false, guided = false } = {}) => {
  if (!documentRef || typeof documentRef.createElement !== 'function' || !documentRef.body) {
    throw new TypeError('documentRef is required');
  }
  if (!windowRef || typeof windowRef !== 'object') throw new TypeError('windowRef is required');
  if (typeof windowRef.URL !== 'function') throw new TypeError('URLImpl is required');
  if (typeof windowRef.setTimeout !== 'function') throw new TypeError('setTimeoutImpl is required');
  if (typeof windowRef.clearTimeout !== 'function') throw new TypeError('clearTimeoutImpl is required');
  if (typeof exposeLegacyGlobals !== 'boolean') throw new TypeError('exposeLegacyGlobals must be boolean');

  let panel = null;
  let items = [];

  const clear = () => {
    const existing = documentRef.getElementById?.(PANEL_ID)
      ?? documentRef.querySelector?.('#' + PANEL_ID);
    existing?.remove?.();
    panel?.remove?.();
    panel = null;
    items = [];
    if (exposeLegacyGlobals) delete windowRef.downloadUrls;
  };

  const sleep = (delay) => new Promise((resolve) => {
    windowRef.setTimeout(resolve, delay);
  });

  const trigger = (item, event) => {
    if (!isTrustedUserEvent(event) || !item || !isFinalHttpsUrl(item.url)) return;
    const anchor = documentRef.createElement('a');
    anchor.href = item.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.click();
  };

  const downloadTrack = (item, event) => {
    if (!isTrustedUserEvent(event)) return;
    if (exposeLegacyGlobals) windowRef.downloadUrls = items.map(({ url }) => url);
    trigger(item, event);
  };

  const downloadAll = async (event) => {
    if (!isTrustedUserEvent(event)) return;
    const batch = items.slice();
    if (exposeLegacyGlobals) windowRef.downloadUrls = items.map(({ url }) => url);
    for (let index = 0; index < batch.length; index += 1) {
      if (index > 0) await sleep(BROWSER_LIMITS.downloadGapMs);
      trigger(batch[index], event);
    }
  };

  const render = (results) => {
    clear();
    const successful = [];
    const rows = [];
    for (const [index, result] of (Array.isArray(results) ? results : []).entries()) {
      const url = result?.url;
      if ((result?.kind === 'success' || result?.success === true) && isFinalHttpsUrl(url)) {
        const item = {
          id: typeof result.id === 'string' && result.id.length > 0 ? result.id : `track-${index + 1}`,
          url
        };
        successful.push(item);
        rows.push({ item, position: index + 1, canceled: false });
      } else {
        rows.push({ item: null, position: index + 1, canceled: result?.status === 'cancelled', notStarted: result?.status === 'not_started' });
      }
    }
    items = successful;
    if (guided) {
      if (rows.length === 0) return 0;
      panel = documentRef.createElement('section');
      panel.id = PANEL_ID;
      panel.className = 'spotmate-download-panel spotmate-guided-results';
      panel.setAttribute('lang', 'en');
      panel.setAttribute('aria-labelledby', 'spotmate-results-title');
      const header = documentRef.createElement('div');
      header.className = 'spotmate-results-heading';
      const title = documentRef.createElement('h2');
      title.id = 'spotmate-results-title';
      title.textContent = `Tracks (${rows.length})`;
      header.appendChild(title);
      const summary = documentRef.createElement('p');
      const canceled = rows.filter((row) => row.canceled).length;
      const notStarted = rows.filter((row) => row.notStarted).length;
      summary.textContent = `${items.length} ready · ${rows.length - items.length - canceled - notStarted} failed${canceled ? ` · ${canceled} canceled` : ''}${notStarted ? ` · ${notStarted} not started` : ''}`;
      header.appendChild(summary);
      panel.appendChild(header);
      const list = documentRef.createElement('ol');
      list.className = 'spotmate-results-list';
      list.setAttribute('role', 'list');
      for (const row of rows) {
        const entry = documentRef.createElement('li');
        entry.className = 'spotmate-result-row';
        const number = documentRef.createElement('span');
        number.className = 'spotmate-result-number';
        number.textContent = String(row.position);
        number.setAttribute('aria-hidden', 'true');
        entry.appendChild(number);
        const name = documentRef.createElement('strong');
        name.textContent = `Track ${row.position}`;
        entry.appendChild(name);
        const status = documentRef.createElement('span');
        status.className = `spotmate-result-state ${row.item ? 'spotmate-ready' : row.notStarted ? 'spotmate-pending' : 'spotmate-failed'}`;
        status.textContent = row.item ? 'Ready' : row.canceled ? 'Canceled' : row.notStarted ? 'Not started' : 'Failed';
        entry.appendChild(status);
        const detail = documentRef.createElement('p');
        detail.textContent = row.item ? 'Conversion completed.' : row.notStarted
          ? 'Not started. Start conversions when you are ready.' : row.canceled
          ? 'Conversion canceled. Start conversions when you are ready.'
          : 'Conversion failed. Reload the link and start conversions to try again.';
        entry.appendChild(detail);
        if (row.item) {
          const button = documentRef.createElement('button');
          button.type = 'button';
          button.textContent = 'Download';
          button.setAttribute('aria-label', `Download Track ${row.position}`);
          button.addEventListener('click', (event) => downloadTrack(row.item, event));
          entry.appendChild(button);
        }
        list.appendChild(entry);
      }
      panel.appendChild(list);
      if (items.length > 0) {
        const footer = documentRef.createElement('div');
        footer.className = 'spotmate-download-footer';
        const allButton = documentRef.createElement('button');
        allButton.type = 'button';
        allButton.textContent = 'Download all ready';
        allButton.addEventListener('click', async (event) => {
          if (!isTrustedUserEvent(event) || allButton.disabled) return;
          allButton.disabled = true;
          try { await downloadAll(event); } finally { allButton.disabled = false; }
        });
        footer.appendChild(allButton);
        const detail = documentRef.createElement('p');
        detail.textContent = `This will download the ${items.length} ready ${items.length === 1 ? 'track' : 'tracks'} from this batch.`;
        footer.appendChild(detail);
        panel.appendChild(footer);
      }
      documentRef.body.appendChild(panel);
      return items.length;
    }
    if (successful.length === 0) return 0;

    panel = documentRef.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'spotmate-download-panel';

    const allButton = documentRef.createElement('button');
    allButton.type = 'button';
    allButton.textContent = 'Download all';
    allButton.addEventListener('click', async (event) => {
      if (!isTrustedUserEvent(event)) return;
      allButton.disabled = true;
      try {
        await downloadAll(event);
      } finally {
        allButton.disabled = false;
      }
    });
    panel.appendChild(allButton);

    for (const item of successful) {
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.textContent = `Download ${item.id}`;
      button.setAttribute('data-track-id', item.id);
      button.addEventListener('click', (event) => downloadTrack(item, event));
      panel.appendChild(button);
    }
    documentRef.body.appendChild(panel);
    return successful.length;
  };

  const adapter = { clear, render, downloadTrack, downloadAll };
  Object.defineProperty(adapter, 'panel', { enumerable: true, get: () => panel });
  return Object.freeze(adapter);
};

export { PANEL_ID, createDownloadAdapter };
