import { BROWSER_LIMITS, isFinalHttpsUrl, isTrustedUserEvent } from './policy.js';

const PANEL_ID = 'spotmate-download-panel';

const createDownloadAdapter = ({ documentRef, windowRef, exposeLegacyGlobals = false } = {}) => {
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
    if (exposeLegacyGlobals) windowRef.downloadUrls = items.map(({ url }) => url);
    for (let index = 0; index < items.length; index += 1) {
      if (index > 0) await sleep(BROWSER_LIMITS.downloadGapMs);
      trigger(items[index], event);
    }
  };

  const render = (results) => {
    clear();
    const successful = [];
    for (const [index, result] of (Array.isArray(results) ? results : []).entries()) {
      const url = result?.url;
      if ((result?.kind === 'success' || result?.success === true) && isFinalHttpsUrl(url)) {
        successful.push({
          id: typeof result.id === 'string' && result.id.length > 0 ? result.id : `track-${index + 1}`,
          url
        });
      }
    }
    items = successful;
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
