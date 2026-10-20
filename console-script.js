// Complete SpotMate script for voluntary conversion and downloads.
(function () {
  'use strict';

  const __modules = {};
  function __require(id) {
    if (!__modules[id]) {
      throw new Error('Module not found: ' + id);
    }
    return __modules[id];
  }

  const PANEL_CSS = "/** Shared styles for the centered Music Downloader workspace and legacy panel contracts. */\n.spotmate-voluntary-panel,\n.spotmate-download-panel {\n  --spotmate-bg:#141d18; --spotmate-text:#f5eddc; --spotmate-subtext:#d3d5c6;\n  --spotmate-accent:#f1cc93; --spotmate-border:#b7bea32e; --spotmate-ready:#c2d7ad;\n  box-sizing:border-box; color:var(--spotmate-text); color-scheme:dark;\n  font:400 14px/1.5 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;\n  overflow-wrap:anywhere;\n}\n.spotmate-voluntary-panel *, .spotmate-download-panel * { box-sizing:border-box; }\n.spotmate-living-app { position:relative; display:flex; align-items:center; justify-content:center; width:100%; min-height:100svh; margin:0; padding:64px 24px; isolation:isolate; overflow:hidden; clip-path:inset(0); background:#141d18; }\n.spotmate-surface { position:relative; z-index:1; width:min(824px,100%); min-width:0; padding:28px 32px 16px; border:1px solid #c2c6a94a; border-radius:16px; background-color:rgb(28 39 30 / .54); background-image:linear-gradient(135deg,#ecdbb70b,transparent 44%,#c2d7ad04); }\n@supports ((backdrop-filter:blur(2px)) or (-webkit-backdrop-filter:blur(2px))) {\n  .spotmate-surface { background-color:rgb(28 39 30 / .34); backdrop-filter:blur(2px); -webkit-backdrop-filter:blur(2px); }\n}\n.spotmate-product-header { position:relative; text-align:center; margin-bottom:24px; }\n.spotmate-product-header h2 { display:flex; align-items:center; justify-content:center; gap:13px; margin:0; color:inherit; font:700 30px/1.2 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif; letter-spacing:-.7px; text-wrap:balance; }\n.spotmate-product-header h2::before { content:\"\"; flex:0 0 30px; width:30px; height:30px; border:1px solid var(--spotmate-accent); border-radius:50%; background:radial-gradient(circle,transparent 0 2px,#f1cc93 2px 3px,transparent 3px 9px,#f1cc9380 9px 10px,transparent 10px); }\n.spotmate-product-header p { margin:9px 0 0; color:var(--spotmate-subtext); font-size:13px; }\n.spotmate-header-links { position:absolute; top:10px; right:24px; z-index:2; display:flex; justify-content:center; align-items:center; gap:20px; font-size:11px; }\n.spotmate-voluntary-panel a { color:var(--spotmate-accent); text-decoration:underline; text-underline-offset:4px; }\n.spotmate-voluntary-panel a:focus-visible, .spotmate-voluntary-panel button:focus-visible, #spotmate-source-url:focus-visible, .spotmate-checkbox-container input:focus-visible { outline:3px solid var(--spotmate-accent); outline-offset:4px; }\n.spotmate-workspace label { display:block; margin-bottom:9px; font-size:12px; font-weight:600; }\n.spotmate-source-row { display:flex; gap:10px; }\n#spotmate-source-url { width:100%; min-width:0; min-height:48px; padding:11px 14px; border:1px solid #b7bea35e; border-radius:7px; background:#0e171a40; color:var(--spotmate-text); caret-color:var(--spotmate-accent); font:400 13px/1.5 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif; }\n#spotmate-source-url::placeholder { color:var(--spotmate-subtext); opacity:1; }\n.spotmate-help { margin:9px 0 0; color:var(--spotmate-subtext); font-size:11px; }\n.spotmate-verification { margin:8px 0 0; color:var(--spotmate-subtext); font-size:11px; }\n.spotmate-steps { display:flex; justify-content:center; gap:48px; list-style:none; margin:23px 0 28px; padding:0; }\n.spotmate-steps li { display:flex; align-items:center; gap:9px; min-width:0; color:var(--spotmate-subtext); font-size:12px; }\n.spotmate-steps strong { font-size:12px; font-weight:500; }\n.spotmate-step-number { display:grid; place-items:center; flex:0 0 25px; width:25px; height:25px; border-radius:50%; border:1px solid #a7b09d65; font-size:11px; font-variant-numeric:tabular-nums; }\n.spotmate-steps li[aria-current=\"step\"] { color:var(--spotmate-accent); }\n.spotmate-steps li[aria-current=\"step\"] .spotmate-step-number { color:#20261c; background:var(--spotmate-accent); border-color:var(--spotmate-accent); }\n.spotmate-panel-toolbar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:flex-end; }\n.spotmate-voluntary-panel button, .spotmate-download-panel button { display:inline-flex; align-items:center; justify-content:center; min-height:44px; min-width:44px; padding:10px 15px; border:1px solid #c9c8b766; border-radius:7px; background:#e8d4ab0d; color:var(--spotmate-text); font:600 12px/1.4 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif; cursor:pointer; transition:background-color .18s ease-out,border-color .18s ease-out,transform .18s cubic-bezier(.16,1,.3,1); }\n.spotmate-voluntary-panel button:hover:not(:disabled):not([aria-disabled=\"true\"]), .spotmate-download-panel button:hover:not(:disabled) { background:#d8dec414; border-color:#e0d9ba70; transform:translateY(-1px); }\n.spotmate-voluntary-panel button:active:not(:disabled):not([aria-disabled=\"true\"]) { transform:translateY(0); }\n.spotmate-voluntary-panel button[aria-disabled=\"true\"], .spotmate-voluntary-panel button:disabled, .spotmate-download-panel button:disabled { opacity:.45; cursor:default; }\n.spotmate-voluntary-panel .spotmate-primary { flex-shrink:0; color:#20261c; background:var(--spotmate-accent); border-color:var(--spotmate-accent); }\n.spotmate-voluntary-panel .spotmate-primary:hover:not(:disabled):not([aria-disabled=\"true\"]) { background:#f5d6a6; border-color:#f5d6a6; }\n.spotmate-voluntary-panel .spotmate-motion-toggle { min-height:44px; padding:8px 12px; font-size:11px; background:#161d1970; }\n.spotmate-voluntary-panel ::selection, .spotmate-download-panel ::selection { background:var(--spotmate-accent); color:#20261c; }\n.spotmate-results-heading { display:flex; justify-content:space-between; align-items:center; gap:16px; margin-bottom:18px; }\n.spotmate-results-heading h3 { margin:0; color:inherit; font:650 17px/1.4 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif; }\n.spotmate-results-heading p { margin:4px 0 0; color:var(--spotmate-subtext); font-size:11px; font-variant-numeric:tabular-nums; }\n.spotmate-column-head { display:grid; grid-template-columns:minmax(0,1fr) 104px 100px; gap:13px; padding:0 0 9px 49px; color:var(--spotmate-subtext); font-size:10px; }\n.spotmate-column-head span:last-child { text-align:center; }\n.spotmate-list-viewport { max-height:360px; overflow:auto; scrollbar-color:#65705a transparent; scrollbar-width:thin; scrollbar-gutter:stable; overscroll-behavior:contain; }\n.spotmate-results-list { list-style:none; margin:0; padding:0; }\n.spotmate-result-row { position:relative; display:grid; grid-template-columns:36px minmax(0,1fr) 104px 100px; align-items:center; gap:13px; min-height:68px; padding:11px 0; border-top:1px solid var(--spotmate-border); }\n.spotmate-result-row[data-state=\"converting\"], .spotmate-result-row[data-state=\"polling\"] { background:linear-gradient(90deg,#f1cc9314,transparent); }\n.spotmate-result-row[data-state=\"ready\"]::after { content:\"\"; position:absolute; bottom:0; left:0; right:0; height:1px; background:#c2d7ad55; pointer-events:none; }\n.spotmate-result-name strong { display:block; font-size:13px; font-weight:600; color:var(--spotmate-text); }\n.spotmate-result-name p { margin:3px 0 0; color:var(--spotmate-subtext); font-size:11px; }\n.spotmate-result-state { min-width:0; color:var(--spotmate-subtext); font-size:11px; font-weight:600; }\n.spotmate-ready { color:var(--spotmate-ready); }\n.spotmate-failed { color:#f1c29b; }\n.spotmate-result-action { width:100%; min-height:44px; display:flex; align-items:center; }\n.spotmate-result-action button { width:100%; padding:8px 10px; font-size:11px; }\n.spotmate-download-footer { display:flex; align-items:center; justify-content:space-between; gap:18px; padding:18px 0; border-top:1px solid var(--spotmate-border); }\n.spotmate-download-footer:empty { display:none; }\n.spotmate-download-note { margin:0; max-width:56ch; color:var(--spotmate-subtext); font-size:11px; }\n.spotmate-status { margin:0; padding:16px 0; border-top:1px solid var(--spotmate-border); color:var(--spotmate-text); font-size:12px; }\n.spotmate-artwork-note { margin:0; padding-top:12px; border-top:1px solid var(--spotmate-border); color:var(--spotmate-subtext); font-size:10px; }\n.spotmate-activity-rail { display:flex; align-items:center; justify-content:space-between; gap:16px; min-height:49px; border-top:1px solid var(--spotmate-border); }\n.spotmate-activity-rail p { margin:0; color:var(--spotmate-subtext); font-size:11px; }\n.spotmate-activity-rail p::before { display:inline-block; content:\"\"; width:5px; height:5px; margin-right:8px; border-radius:50%; background:var(--spotmate-ready); }\n.spotmate-activity-rail svg { width:180px; max-width:40%; height:32px; overflow:visible; }\n.spotmate-activity-rail path { fill:none; stroke:var(--spotmate-accent); stroke-width:1.2; stroke-linecap:round; }\n.spotmate-motion-field { position:fixed; left:0; top:0; z-index:0; width:100%; height:100svh; overflow:hidden; pointer-events:none; }\n.spotmate-motion-field * { pointer-events:none; }\n.spotmate-ambient-light { position:absolute; width:850px; height:850px; border-radius:50%; will-change:transform; }\n.spotmate-light-warm { left:calc(50% - 730px); top:calc(50% - 530px); background:radial-gradient(ellipse,#b77a453d,transparent 67%); }\n.spotmate-light-olive { right:calc(50% - 740px); bottom:calc(50% - 560px); background:radial-gradient(ellipse,#7e9b5b40,transparent 67%); }\n.spotmate-signal-field { position:absolute; inset:0; width:100%; height:100%; }\n.spotmate-signal-path { fill:none; stroke:#c7b07d; stroke-width:.8; opacity:.26; vector-effect:non-scaling-stroke; }\n.spotmate-signal-dot { fill:#ecd0a0; opacity:.7; }\n.spotmate-cover-layer { position:absolute; inset:0; }\n.spotmate-cover-inner { opacity:.29; }\n.spotmate-cover-outer { opacity:.78; mask-mode:luminance; }\n.spotmate-floating-cover, .spotmate-track-art { position:relative; overflow:hidden; border-radius:4px; background:radial-gradient(circle,transparent 0 8%,#e6c38a95 9% 10%,transparent 11% 26%,#d0c19260 27% 28%,transparent 29% 46%,#d0c19240 47% 48%,transparent 49%),#46513c; }\n.spotmate-floating-cover[data-tone=\"0\"], .spotmate-track-art[data-tone=\"0\"] { background-color:#6f4a2e; }\n.spotmate-floating-cover[data-tone=\"2\"], .spotmate-track-art[data-tone=\"2\"] { background-color:#615336; }\n.spotmate-floating-cover[data-tone=\"3\"], .spotmate-track-art[data-tone=\"3\"] { background-color:#334c44; }\n.spotmate-floating-cover { position:absolute; top:0; left:0; will-change:transform; box-shadow:1px 3px 8px #00000026; }\n.spotmate-track-art { width:36px; height:36px; }\n.spotmate-floating-cover img, .spotmate-track-art img { display:block; width:100%; height:100%; object-fit:cover; }\n.spotmate-living-app[data-motion=\"stopped\"] button { transition:none; }\n.spotmate-living-app[data-motion=\"stopped\"] button:hover:not(:disabled) { transform:none; }\n/* Keep the exported legacy panel usable without changing its state or action contracts. */\n.spotmate-track-list { display:flex; flex-direction:column; gap:8px; }\n.spotmate-track-row { display:grid; grid-template-columns:44px minmax(120px,2fr) minmax(100px,1fr) minmax(120px,1.5fr) auto; align-items:center; gap:16px; padding:12px; }\n.spotmate-checkbox-container { display:inline-flex; min-width:44px; min-height:44px; align-items:center; justify-content:center; }\n.spotmate-checkbox-container input, .spotmate-track-row progress { accent-color:var(--spotmate-accent); }\n.spotmate-track-row progress { width:100%; }\n.spotmate-track-status { color:var(--spotmate-subtext); }\n.spotmate-live-region { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }\n@media(max-width:767px) {\n  .spotmate-track-row { grid-template-columns:44px minmax(0,1fr); gap:8px; }\n}\n@media(max-width:700px) {\n  .spotmate-living-app { padding:72px 16px 32px; }\n  .spotmate-surface { padding:24px 20px 16px; }\n  .spotmate-product-header h2 { font-size:26px; }\n  .spotmate-panel-toolbar button { padding:8px 10px; font-size:11px; }\n  .spotmate-result-row { grid-template-columns:36px minmax(0,1fr) 76px 76px; }\n  .spotmate-column-head { grid-template-columns:minmax(0,1fr) 76px 76px; }\n}\n@media(max-width:500px) {\n  .spotmate-living-app { padding:72px 12px 24px; }\n  .spotmate-surface { padding:23px 18px 16px; }\n  .spotmate-product-header h2 { font-size:23px; gap:10px; }\n  .spotmate-product-header h2::before { flex-basis:25px; width:25px; height:25px; }\n  .spotmate-product-header p { font-size:11px; }\n  .spotmate-source-row { flex-direction:column; }\n  .spotmate-steps { gap:22px; margin:23px 0 25px; }\n  .spotmate-steps li { gap:6px; }\n  .spotmate-steps strong { font-size:11px; }\n  .spotmate-step-number { flex-basis:23px; width:23px; height:23px; }\n  .spotmate-results-heading { display:block; }\n  .spotmate-panel-toolbar { justify-content:stretch; margin-top:13px; }\n  .spotmate-panel-toolbar button { flex:1; }\n  .spotmate-column-head { grid-template-columns:minmax(0,1fr) 70px; padding-left:42px; gap:10px; }\n  .spotmate-column-head span:last-child { display:none; }\n  .spotmate-result-row { grid-template-columns:32px minmax(0,1fr) 70px; gap:5px 10px; }\n  .spotmate-track-art { width:32px; height:32px; }\n  .spotmate-result-action { grid-column:2/-1; justify-self:start; width:auto; }\n  .spotmate-result-action:empty { display:none; }\n  .spotmate-result-name strong { font-size:12px; }\n  .spotmate-result-name p { font-size:10px; }\n  .spotmate-download-footer { flex-direction:column; align-items:stretch; gap:12px; }\n  .spotmate-track-row { grid-template-columns:44px minmax(0,1fr); gap:8px; }\n}\n@media(prefers-reduced-motion:reduce) {\n  .spotmate-voluntary-panel button { transition:none; }\n  .spotmate-voluntary-panel button:hover:not(:disabled) { transform:none; }\n}";

  function __injectStyles(doc) {
    if (!doc || typeof doc.createElement !== 'function') return;
    const id = 'spotmate-panel-styles';
    if (doc.querySelector && doc.querySelector('#' + id)) return;
    if (doc.head && typeof doc.head.appendChild === 'function') {
      const style = doc.createElement('style');
      style.id = id;
      style.textContent = PANEL_CSS;
      doc.head.appendChild(style);
    }
  }

  __modules['./policy.js'] = (() => {
    /**
     * @typedef {Readonly<{
     *   origin: 'https://spotmate.online',
     *   pathnames: readonly ['/en1', '/en1/']
     * }>} SpotmatePage
     */

    const SPOTMATE_PAGE = Object.freeze({
      origin: 'https://spotmate.online',
      pathnames: Object.freeze(['/en1', '/en1/'])
    });

    /**
     * @typedef {Readonly<{
     *   maxTracks: 100,
     *   downloadGapMs: 1500,
     *   conversionGapMs: 2000,
     *   pollGapMs: 4500,
     *   pollLimit: 40
     * }>} BrowserLimits
     */

    const BROWSER_LIMITS = Object.freeze({
      maxTracks: 100,
      downloadGapMs: 1500,
      conversionGapMs: 2000,
      pollGapMs: 4500,
      pollLimit: 40
    });

    const isObjectLike = (value) => value !== null && typeof value === 'object';

    /**
     * @param {{ origin?: unknown, pathname?: unknown }|null|undefined} locationLike
     * @returns {boolean}
     */
    const isAllowedSpotmatePage = (locationLike) => (
      isObjectLike(locationLike)
      && locationLike.origin === SPOTMATE_PAGE.origin
      && SPOTMATE_PAGE.pathnames.includes(locationLike.pathname)
    );

    /**
     * @param {unknown} event
     * @returns {boolean}
     */
    const isTrustedUserEvent = (event) => isObjectLike(event) && event.isTrusted === true;

    /**
     * @param {unknown} value
     * @returns {boolean}
     */
    const isFinalHttpsUrl = (value) => {
      if (typeof value !== 'string') return false;
      try {
        return new URL(value).protocol === 'https:';
      } catch {
        return false;
      }
    };

    const DOC_PAYLOAD_LAYERS = Object.freeze([
      (value) => value,
      (value) => value?.data,
      (value) => value?.result,
      (value) => value?.data?.data,
      (value) => value?.data?.result
    ]);

    const DOC_URL_KEYS = Object.freeze(['url', 'download_url', 'downloadUrl', 'downloadURL', 'download-url']);
    const DOC_TASK_ID_KEYS = Object.freeze(['task_id', 'taskId']);
    const TERMINAL_STATES = Object.freeze(['failed', 'error', 'expired', 'cancelled']);

    const getDocumentedPayloadLayers = (payload) => DOC_PAYLOAD_LAYERS
      .map((selector) => selector(payload))
      .filter(isObjectLike);

    const findTerminalPayloadDecision = (payload, status) => {
      for (const layer of getDocumentedPayloadLayers(payload)) {
        const terminalState = [layer.status, layer.state]
          .map((entry) => (typeof entry === 'string' ? entry.trim().toLowerCase() : ''))
          .find((entry) => TERMINAL_STATES.includes(entry));
        if (terminalState) {
          return terminalState;
        }

        if (layer.error) {
          return 'payload-error';
        }
      }
      return null;
    };

    const readPayloadValue = (payload, keys) => {
      for (const layer of getDocumentedPayloadLayers(payload)) {
        for (const key of keys) {
          const candidate = layer[key];
          if (typeof candidate === 'string') {
            const trimmed = candidate.trim();
            if (trimmed.length > 0) return trimmed;
          }
        }
      }
      return null;
    };

    return { SPOTMATE_PAGE, BROWSER_LIMITS, isAllowedSpotmatePage, isTrustedUserEvent, isFinalHttpsUrl, getDocumentedPayloadLayers, findTerminalPayloadDecision, readPayloadValue };
  })();

  __modules['./track-presentation.js'] = (() => {
    const ROW_SELECTOR = 'li, article, [data-track-id], .track, .card';
    const TITLE_SELECTORS = ['[data-title]', '[data-track-title]', '.track-title', '.title', 'h1', 'h2', 'h3', 'h4'];
    const ARTIST_SELECTORS = ['[data-artist]', '.track-artist', '.artist'];
    const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/g;
    const CDN_IMAGE_URL = /^https:\/\/i\.scdn\.co\/image\/[a-f0-9]{16,80}$/i;

    const cleanText = (value, limit) => {
      if (typeof value !== 'string') return '';
      return value
        .replace(CONTROL_CHARACTERS, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, limit);
    };

    const readAttribute = (node, name, limit) => {
      try {
        return cleanText(node?.getAttribute?.(name), limit);
      } catch {
        return '';
      }
    };

    const readFirstAttribute = (node, names, limit) => {
      for (const name of names) {
        const value = readAttribute(node, name, limit);
        if (value) return value;
      }
      return '';
    };

    const readDescendantText = (row, selectors, attributeNames, limit) => {
      for (const selector of selectors) {
        let node;
        try {
          node = row?.querySelector?.(selector);
        } catch {
          continue;
        }
        if (!node) continue;

        const attributeValue = readFirstAttribute(node, attributeNames, limit);
        if (attributeValue) return attributeValue;
        const text = cleanText(node.textContent, limit);
        if (text) return text;
      }
      return '';
    };

    const readSafeArtworkUrl = (value, URLImpl) => {
      if (typeof value !== 'string' || !CDN_IMAGE_URL.test(value) || typeof URLImpl !== 'function') return '';
      try {
        const url = new URLImpl(value);
        if (
          url.protocol !== 'https:'
          || url.hostname?.toLowerCase() !== 'i.scdn.co'
          || url.username
          || url.password
          || url.port
          || url.search
          || url.hash
          || !/^\/image\/[a-f0-9]{16,80}$/i.test(url.pathname)
        ) return '';
        return url.href;
      } catch {
        return '';
      }
    };

    const readRowArtwork = (row, URLImpl) => {
      let images;
      try {
        images = Array.from(row?.querySelectorAll?.('img') || []);
      } catch {
        return '';
      }

      for (const image of images) {
        const candidates = [image?.currentSrc, readAttribute(image, 'src', 2048), image?.src];
        for (const candidate of candidates) {
          const artworkUrl = readSafeArtworkUrl(candidate, URLImpl);
          if (artworkUrl) return artworkUrl;
        }
      }
      return '';
    };

    const readUnambiguousRow = (input) => {
      let row;
      try {
        row = input?.closest?.(ROW_SELECTOR);
        if (!row) return null;
        const trackInputs = Array.from(row.querySelectorAll?.('input[type="hidden"]') || []);
        return trackInputs.length === 1 && trackInputs[0] === input ? row : null;
      } catch {
        return null;
      }
    };

    const readTrackPresentation = (input, position, URLImpl) => {
      const inputTitle = readFirstAttribute(input, ['data-title', 'data-track-title'], 160);
      const inputArtist = readAttribute(input, 'data-artist', 120);
      const row = readUnambiguousRow(input);

      const rowTitle = row
        ? readFirstAttribute(row, ['data-title', 'data-track-title'], 160)
          || readDescendantText(row, TITLE_SELECTORS, ['data-title', 'data-track-title'], 160)
        : '';
      const rowArtist = row
        ? readAttribute(row, 'data-artist', 120)
          || readDescendantText(row, ARTIST_SELECTORS, ['data-artist'], 120)
        : '';

      return {
        title: inputTitle || rowTitle || cleanText(`Track ${position}`, 160),
        artist: inputArtist || rowArtist,
        artworkUrl: row ? readRowArtwork(row, URLImpl) : ''
      };
    };

    return { readTrackPresentation };
  })();

  __modules['./motion-backdrop.js'] = (() => {
    const { isTrustedUserEvent } = __require('./policy.js');

    const createMotionBackdrop = ({ root, documentRef: doc, windowRef: win, trace } = {}) => {
      const noop = Object.freeze({ setTracks() {}, setActivity() {}, pulse() {}, refresh() {}, destroy() {} });
      if (!root || !doc?.createElementNS || !win?.requestAnimationFrame || !win?.cancelAnimationFrame) return noop;
      const make = (tag, className) => {
        const node = doc.createElement(tag);
        node.className = className;
        return node;
      };
      const svgNode = (tag, attributes = {}) => {
        const node = doc.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
        return node;
      };
      const field = make('div', 'spotmate-motion-field');
      field.setAttribute('aria-hidden', 'true');
      const warm = make('div', 'spotmate-ambient-light spotmate-light-warm');
      const olive = make('div', 'spotmate-ambient-light spotmate-light-olive');
      field.appendChild(warm); field.appendChild(olive);
      const signal = svgNode('svg', { viewBox: '0 0 1440 1020', preserveAspectRatio: 'none', class: 'spotmate-signal-field' });
      const flow = svgNode('g');
      const curves = [
        'M-90 760 C140 880 210 150 590 80 S1230 440 1530 230',
        'M-90 800 C180 950 220 210 610 120 S1260 480 1530 270',
        'M-90 410 C270 40 350 1060 880 920 S1240 690 1530 840'
      ].map(d => { const path = svgNode('path', { d, class: 'spotmate-signal-path' }); flow.appendChild(path); return path; });
      const lengths = curves.map(path => path.getTotalLength());
      const dots = curves.map((_, i) => { const dot = svgNode('circle', { r: i === 1 ? 2 : 3, class: 'spotmate-signal-dot' }); flow.appendChild(dot); return dot; });
      signal.appendChild(flow); field.appendChild(signal);
      const inner = make('div', 'spotmate-cover-layer spotmate-cover-inner');
      const outer = make('div', 'spotmate-cover-layer spotmate-cover-outer');
      field.appendChild(inner); field.appendChild(outer); root.appendChild(field);
      const pauseButton = make('button', 'spotmate-motion-toggle');
      pauseButton.type = 'button';
      const preference = win.matchMedia?.('(prefers-reduced-motion: reduce)');
      let paused = preference?.matches === true, visible = true, destroyed = false, frame = 0, previous = 0;
      let width = 1, height = 1, time = 0, tracks = [], sprites = [], activity = 'idle';
      let pointer = null, lightX = 0, lightY = 0, kick = 0;
      const removers = [];
      const listen = (target, event, callback, options) => {
        target?.addEventListener?.(event, callback, options);
        removers.push(() => target?.removeEventListener?.(event, callback, options));
      };
      const fraction = (n, base) => { let sum = 0, factor = 1 / base; while (n > 0) { sum += n % base * factor; n = Math.floor(n / base); factor /= base; } return sum; };
      const clamp = sprite => {
        const margin = sprite.size * .24 + 8;
        const right = Math.max(margin, width - sprite.size - margin), bottom = Math.max(margin, height - sprite.size - margin);
        if (sprite.x < margin) { sprite.x = margin; sprite.vx = Math.abs(sprite.vx); }
        if (sprite.x > right) { sprite.x = right; sprite.vx = -Math.abs(sprite.vx); }
        if (sprite.y < margin) { sprite.y = margin; sprite.vy = Math.abs(sprite.vy); }
        if (sprite.y > bottom) { sprite.y = bottom; sprite.vy = -Math.abs(sprite.vy); }
      };
      const artNode = (track, className) => {
        const node = make('div', className);
        node.setAttribute('data-cover', 'true');
        node.setAttribute('data-tone', String((track.position || 1) % 4));
        if (track.artworkUrl) {
          const image = make('img', 'spotmate-cover-image');
          image.alt = ''; image.referrerPolicy = 'no-referrer'; image.draggable = false;
          image.addEventListener('error', () => image.remove(), { once: true });
          image.src = track.artworkUrl;
          node.appendChild(image);
        }
        return node;
      };
      const refresh = () => {
        if (destroyed || !doc.createRange) return;
        const fieldRect = field.getBoundingClientRect();
        const rects = [];
        for (const node of root.querySelectorAll('h2,h3,p,label,.spotmate-steps li,.spotmate-result-name,.spotmate-result-state,.spotmate-column-head span')) {
          const range = doc.createRange(); range.selectNodeContents(node);
          for (const rect of range.getClientRects()) if (rect.width && rect.height) rects.push(rect);
        }
        for (const node of root.querySelectorAll('button,input,a')) rects.push(node.getBoundingClientRect());
        const holes = rects.filter(rect => rect.width && rect.height).map(rect => `<rect x="${rect.left - fieldRect.left - 10}" y="${rect.top - fieldRect.top - 10}" width="${rect.width + 20}" height="${rect.height + 20}" rx="6" fill="black" filter="url(#soft)"/>`).join('');
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><filter id="soft" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="4"/></filter></defs><rect width="100%" height="100%" fill="white"/>${holes}</svg>`;
        const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
        outer.style.display = win.CSS?.supports?.('mask-image', mask) ? '' : 'none';
        outer.style.maskImage = mask;
      };
      const paint = () => {
        for (const sprite of sprites) {
          const transform = `translate3d(${sprite.x.toFixed(2)}px,${sprite.y.toFixed(2)}px,0) rotate(${sprite.angle.toFixed(2)}deg)`;
          sprite.nodes.forEach(node => { node.style.transform = transform; });
        }
        const dx = Math.sin(time * .17) * 36 + lightX, dy = Math.cos(time * .13) * 24 + lightY;
        warm.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) scale(${(1 + kick * .08).toFixed(3)})`;
        olive.style.transform = `translate3d(${(-dx * .7).toFixed(2)}px,${(-dy * .8).toFixed(2)}px,0)`;
        flow.style.transform = `translate3d(${(lightX * .15).toFixed(2)}px,${(Math.sin(time * .2) * 8 + lightY * .1).toFixed(2)}px,0)`;
        dots.forEach((dot, i) => { const p = curves[i].getPointAtLength(((time * .026 + i * .31) % 1) * lengths[i]); dot.style.transform = `translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,0)`; });
        if (trace) {
          const busy = activity !== 'idle' && activity !== 'ready';
          const amplitude = (busy ? 9 : activity === 'ready' ? 4 : 2.8) + kick * 3;
          const points = [];
          for (let x = 0; x <= 280; x += 4) {
            const y = 17 + Math.pow(Math.sin(x / 280 * Math.PI), 1.5) * amplitude *
              (Math.sin(x * .055 - time * (busy ? 2.5 : .8)) * .65 + Math.sin(x * .11 + time * .5) * .35);
            points.push(`${x ? 'L' : 'M'}${x} ${y.toFixed(2)}`);
          }
          trace.setAttribute('d', points.join(' '));
        }
      };
      const syncTracks = () => {
        const count = Math.min(width <= 650 ? 18 : 32, tracks.length * (width <= 650 ? 3 : 5));
        // Reuse velocity and positions across workflow updates; replace art only for a new playlist.
        while (sprites.length > count) sprites.pop().nodes.forEach(node => node.remove());
        while (sprites.length < count) {
          const i = sprites.length, speed = 19 + i * 7 % 17;
          const sprite = { x: fraction(i + 1, 2) * width, y: fraction(i + 1, 3) * height,
            vx: Math.cos(i * 2.39996 + .3) * speed, vy: Math.sin(i * 2.39996 + .3) * speed,
            angle: i * 11 % 33 - 16, nodes: [], track: null };
          sprites.push(sprite);
        }
        sprites.forEach((sprite, i) => {
          sprite.size = (width <= 650 ? 30 : 43) + i * 13 % (width <= 650 ? 17 : 25);
          const track = tracks[i % tracks.length];
          if (sprite.track !== track) {
            sprite.nodes.forEach(node => node.remove());
            sprite.nodes = [inner, outer].map(layer => { const node = artNode(track, 'spotmate-floating-cover'); layer.appendChild(node); return node; });
            sprite.track = track;
          }
          sprite.nodes.forEach(node => { node.style.width = `${sprite.size}px`; node.style.height = `${sprite.size}px`; });
          clamp(sprite);
        });
        paint(); refresh();
      };
      const resize = () => {
        const rect = field.getBoundingClientRect(), oldWidth = width, oldHeight = height;
        width = Math.max(1, rect.width); height = Math.max(1, rect.height);
        sprites.forEach(sprite => { sprite.x *= width / oldWidth; sprite.y *= height / oldHeight; });
        syncTracks();
      };
      const tick = now => {
        if (destroyed || paused || doc.hidden || !visible) { frame = 0; return; }
        if (!previous || now - previous >= 32) {
          const dt = previous ? Math.min((now - previous) / 1000, .075) : .033;
          previous = now; time += dt; kick = Math.max(0, kick - dt * .8);
          const ease = 1 - Math.exp(-dt * 2.5);
          lightX += ((pointer ? (pointer.x / width - .5) * 100 : 0) - lightX) * ease;
          lightY += ((pointer ? (pointer.y / height - .5) * 80 : 0) - lightY) * ease;
          sprites.forEach((sprite, i) => {
            const dx = sprite.x + sprite.size / 2 - (pointer?.x ?? -10000), dy = sprite.y + sprite.size / 2 - (pointer?.y ?? -10000), distance = Math.hypot(dx, dy);
            if (distance > 1 && distance < 180) { const force = (1 - distance / 180) * 32 * dt; sprite.vx += dx / distance * force; sprite.vy += dy / distance * force; }
            const speed = Math.hypot(sprite.vx, sprite.vy);
            if (speed > 95) { sprite.vx *= 95 / speed; sprite.vy *= 95 / speed; }
            if (speed < 12) { sprite.vx += Math.cos(i * 2.39996 + .3) * 8 * dt; sprite.vy += Math.sin(i * 2.39996 + .3) * 8 * dt; }
            sprite.vx *= Math.pow(.996, dt * 30); sprite.vy *= Math.pow(.996, dt * 30);
            sprite.x += sprite.vx * dt; sprite.y += sprite.vy * dt;
            sprite.angle = i * 11 % 33 - 16 + Math.sin(time * .28 + i) * 3; clamp(sprite);
          });
          paint();
        }
        frame = win.requestAnimationFrame(tick);
      };
      const schedule = () => {
        win.cancelAnimationFrame(frame); frame = 0; previous = 0;
        const stopped = paused || doc.hidden || !visible;
        root.setAttribute('data-motion', stopped ? 'stopped' : 'running');
        pauseButton.textContent = paused ? 'Resume motion' : 'Pause motion';
        pauseButton.setAttribute('aria-pressed', String(paused));
        if (!stopped && !destroyed) frame = win.requestAnimationFrame(tick);
      };
      const pulse = id => {
        if (paused || doc.hidden || !visible || destroyed) return;
        kick = 1;
        for (const sprite of sprites) {
          const dx = sprite.x + sprite.size / 2 - (pointer?.x ?? width / 2), dy = sprite.y + sprite.size / 2 - (pointer?.y ?? height / 2);
          const distance = Math.max(1, Math.hypot(dx, dy));
          if (distance < 260 || sprite.track?.id === id) { sprite.vx += dx / distance * 35; sprite.vy += dy / distance * 35; }
        }
      };
      listen(pauseButton, 'click', event => { if (isTrustedUserEvent(event)) { paused = !paused; schedule(); } });
      listen(root, 'pointermove', event => { const rect = field.getBoundingClientRect(); pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }; }, { passive: true });
      listen(root, 'pointerleave', () => { pointer = null; });
      listen(root, 'pointerdown', () => pulse(), { passive: true });
      listen(root, 'scroll', refresh, { passive: true, capture: true });
      listen(win, 'resize', resize, { passive: true });
      listen(win, 'scroll', refresh, { passive: true });
      listen(doc, 'visibilitychange', schedule);
      listen(preference, 'change', event => { paused = event.matches; schedule(); });
      const resizeObserver = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(resize) : null;
      resizeObserver?.observe(root);
      const observer = typeof win.IntersectionObserver === 'function' ? new win.IntersectionObserver(entries => {
        visible = entries[0]?.isIntersecting !== false; schedule();
      }) : null;
      observer?.observe(root);
      resize(); schedule();
      return Object.freeze({
        pauseButton,
        setTracks(next) { tracks = Array.isArray(next) ? next : []; syncTracks(); },
        setActivity(next) { activity = next; }, pulse, refresh,
        destroy() { destroyed = true; win.cancelAnimationFrame(frame); removers.forEach(remove => remove()); observer?.disconnect(); resizeObserver?.disconnect(); field.remove(); pauseButton.remove(); }
      });
    };

    return { createMotionBackdrop };
  })();

  __modules['./living-workspace.js'] = (() => {
    const { isTrustedUserEvent } = __require('./policy.js');
    const { createMotionBackdrop } = __require('./motion-backdrop.js');

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

    return { createLivingWorkspace };
  })();

  __modules['./payload-parser.js'] = (() => {
    const { isFinalHttpsUrl, findTerminalPayloadDecision, readPayloadValue } = __require('./policy.js');

    const makeTerminal = (status, error) => Object.freeze({
      kind: 'terminal',
      status,
      error
    });

    const makePoll = (taskId) => Object.freeze({
      kind: 'poll',
      taskId
    });

    const makeSuccess = (url) => Object.freeze({
      kind: 'success',
      url
    });

    const URL_KEYS = Object.freeze(['url', 'download_url', 'downloadUrl', 'downloadURL', 'download-url']);
    const TASK_ID_KEYS = Object.freeze(['task_id', 'taskId']);

    const trimHeaderType = (value) => (
      typeof value === 'string'
        ? value.split(';', 1)[0].trim().toLowerCase()
        : ''
    );

    const isJsonContentType = (responseMeta) => {
      if (!responseMeta || typeof responseMeta !== 'object') return false;
      const contentTypeHeader = responseMeta.headers?.get?.('content-type');
      const fallback = responseMeta.contentType || responseMeta.headers?.get?.('Content-Type');
      return trimHeaderType(contentTypeHeader ?? fallback) === 'application/json';
    };

    const statusFromMeta = (responseMeta) => (
      Number.isInteger(responseMeta?.status) ? responseMeta.status : null
    );

    const preflight = (responseMeta) => {
      if (responseMeta && responseMeta.error !== undefined) {
        return makeTerminal('network_error', 'network-error');
      }

      const status = statusFromMeta(responseMeta);

      if (!responseMeta || typeof responseMeta !== 'object') {
        return makeTerminal('schema_error', 'schema-missing');
      }

      if (responseMeta.ok === false || (Number.isInteger(status) && (status < 200 || status >= 300))) {
        return makeTerminal(status ?? 'unknown-status', 'http-non-ok');
      }

      if (!isJsonContentType(responseMeta)) {
        return makeTerminal(status ?? 'unknown-status', 'invalid-content-type');
      }

      return null;
    };

    const findTerminalInPayload = (payload, status) => {
      const message = findTerminalPayloadDecision(payload, status);
      return message ? makeTerminal(status, message) : null;
    };

    const findUrlFromPayload = (payload) => {
      const candidate = readPayloadValue(payload, URL_KEYS);
      return candidate && isFinalHttpsUrl(candidate) ? candidate : null;
    };

    const findTaskIdFromPayload = (payload) => readPayloadValue(payload, TASK_ID_KEYS);

    /**
     * @param {Readonly<{ok?: boolean, status?: number|null, contentType?: string}>} responseMeta
     * @param {Readonly<object>|undefined} payload
     * @returns {{kind:'success',url:string}|{kind:'poll',taskId:string}|{kind:'terminal',status:(number|string),error:string}}
     */
    const parsePayload = (responseMeta, payload) => {
      const terminal = preflight(responseMeta);
      const status = statusFromMeta(responseMeta) ?? 'unknown-status';

      if (terminal) return terminal;

      const terminalPayload = findTerminalInPayload(payload, status);
      if (terminalPayload) return terminalPayload;

      const url = findUrlFromPayload(payload);
      if (url) return makeSuccess(url);

      const taskId = findTaskIdFromPayload(payload);
      if (taskId) return makePoll(taskId);

      return makeTerminal(status, 'schema-missing');
    };

    const parseConversionPayload = (responseMeta, payload) => parsePayload(responseMeta, payload);
    const parsePollingPayload = (responseMeta, payload) => parsePayload(responseMeta, payload);

    return { parseConversionPayload, parsePollingPayload };
  })();

  __modules['./spotmate-page-adapter.js'] = (() => {
    const { BROWSER_LIMITS, isAllowedSpotmatePage } = __require('./policy.js');
    const { readTrackPresentation } = __require('./track-presentation.js');

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

    return { createSpotmatePageAdapter };
  })();

  __modules['./spotmate-api-adapter.js'] = (() => {
    const { BROWSER_LIMITS, isAllowedSpotmatePage } = __require('./policy.js');
    const { parseConversionPayload, parsePollingPayload } = __require('./payload-parser.js');

    const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
    const terminal = (status, error) => Object.freeze({ kind: 'terminal', status, error });

    const assertAllowed = (location) => {
      if (!isAllowedSpotmatePage(location)) throw new Error('unsupported-page');
    };

    const isJsonResponse = (response) => {
      const contentType = response?.headers?.get?.('content-type')
        ?? response?.headers?.get?.('Content-Type');
      return typeof contentType === 'string' && contentType.split(';', 1)[0].trim().toLowerCase() === 'application/json';
    };

    const responseMeta = (response) => ({
      ok: response?.ok,
      status: response?.status,
      headers: response?.headers,
      contentType: response?.headers?.get?.('content-type')
        ?? response?.headers?.get?.('Content-Type')
    });

    const readPayload = async (response) => {
      if (!isJsonResponse(response)) return undefined;
      try {
        return await response.json();
      } catch {
        return undefined;
      }
    };

    const createDefaultSleep = (setTimeoutImpl, clearTimeoutImpl) => (delay, signal) => {
      if (signal?.aborted) return Promise.reject(abortError());
      return new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => {
          if (timer !== undefined && typeof clearTimeoutImpl === 'function') clearTimeoutImpl(timer);
          signal?.removeEventListener?.('abort', onAbort);
        };
        const onAbort = () => {
          cleanup();
          reject(abortError());
        };
        timer = setTimeoutImpl(() => {
          cleanup();
          resolve();
        }, delay);
        signal?.addEventListener?.('abort', onAbort, { once: true });
        if (signal?.aborted) onAbort();
      });
    };

    const createSpotmateApiAdapter = ({
      fetchImpl,
      location,
      readCsrfToken,
      sleep,
      URLImpl,
      setTimeoutImpl,
      clearTimeoutImpl
    } = {}) => {
      if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl is required');
      if (typeof URLImpl !== 'function') throw new TypeError('URLImpl is required');
      if (typeof setTimeoutImpl !== 'function') throw new TypeError('setTimeoutImpl is required');
      if (typeof clearTimeoutImpl !== 'function') throw new TypeError('clearTimeoutImpl is required');
      const wait = typeof sleep === 'function'
        ? sleep
        : createDefaultSleep(setTimeoutImpl, clearTimeoutImpl);

      const request = async (url, signal) => {
        if (signal?.aborted) throw abortError();
        const csrfToken = typeof readCsrfToken === 'function' ? readCsrfToken() : undefined;
        const headers = {
          accept: 'application/json',
          'content-type': 'application/json'
        };
        if (typeof csrfToken === 'string' && csrfToken.trim().length > 0) headers['X-CSRF-TOKEN'] = csrfToken;
        try {
          const response = await fetchImpl(url, { method: 'GET', credentials: 'same-origin', headers, signal });
          const payload = await readPayload(response);
          return { meta: responseMeta(response), payload };
        } catch (error) {
          if (error?.name === 'AbortError' || signal?.aborted) throw abortError();
          return { meta: { error }, payload: undefined };
        }
      };

      const convertTrack = async (track, signal) => {
        assertAllowed(location);
        if (signal?.aborted) throw abortError();
        if (!track || typeof track.value !== 'string' || track.value.trim().length === 0) {
          return terminal('input_error', 'empty-track-value');
        }
        const csrfToken = typeof readCsrfToken === 'function' ? readCsrfToken() : undefined;
        const headers = {
          accept: 'application/json',
          'content-type': 'application/json'
        };
        if (typeof csrfToken === 'string' && csrfToken.trim().length > 0) headers['X-CSRF-TOKEN'] = csrfToken;
        const url = new URLImpl('/convert', location.origin).href;
        let response;
        try {
          response = await fetchImpl(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers,
            body: JSON.stringify({ urls: track.value }),
            signal
          });
        } catch (error) {
          if (error?.name === 'AbortError' || signal?.aborted) throw abortError();
          return parseConversionPayload({ error }, undefined);
        }
        const payload = await readPayload(response);
        return parseConversionPayload(responseMeta(response), payload);
      };

      const pollTask = async (taskId, signal) => {
        assertAllowed(location);
        if (typeof taskId !== 'string' || taskId.trim().length === 0) {
          return terminal('input_error', 'empty-task-id');
        }
        let nextTaskId = taskId;
        for (let attempt = 0; attempt < BROWSER_LIMITS.pollLimit; attempt += 1) {
          await wait(BROWSER_LIMITS.pollGapMs, signal);
          if (signal?.aborted) throw abortError();
          const url = new URLImpl(`/tasks/${encodeURIComponent(nextTaskId)}`, location.origin).href;
          const result = await request(url, signal);
          const parsed = parsePollingPayload(result.meta, result.payload);
          if (parsed.kind !== 'poll') return parsed;
          nextTaskId = parsed.taskId;
        }
        return terminal('poll_limit', 'poll-limit');
      };

      return Object.freeze({ convertTrack, pollTask });
    };

    return { createSpotmateApiAdapter };
  })();

  __modules['./conversion-session.js'] = (() => {
    const { BROWSER_LIMITS } = __require('./policy.js');

    const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
    const cancelledResult = () => Object.freeze({ kind: 'terminal', status: 'cancelled', error: 'cancelled' });
    const emptyResult = () => Object.freeze({ kind: 'terminal', status: 'input_error', error: 'empty-track-value' });
    const schemaResult = () => Object.freeze({ kind: 'terminal', status: 'schema_error', error: 'schema-missing' });

    const createAbortableSleep = (setTimeoutImpl, clearTimeoutImpl) => (delay, signal) => {
      if (signal?.aborted) return Promise.reject(abortError());
      return new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => {
          clearTimeoutImpl(timer);
          signal?.removeEventListener?.('abort', onAbort);
        };
        const onAbort = () => {
          cleanup();
          reject(abortError());
        };
        timer = setTimeoutImpl(() => {
          cleanup();
          resolve();
        }, delay);
        signal?.addEventListener?.('abort', onAbort, { once: true });
        if (signal?.aborted) onAbort();
      });
    };

    const toLegacyResult = (track, result) => {
      const success = result?.kind === 'success';
      return Object.freeze({
        id: track?.id,
        status: success ? 'success' : result?.status ?? 'schema_error',
        success,
        pending: false,
        url: success ? result.url : null,
        error: success ? null : result?.error ?? 'schema-missing'
      });
    };

    const createConversionSession = ({
      pageAdapter,
      apiAdapter,
      exposeLegacyGlobals,
      AbortControllerImpl,
      setTimeoutImpl,
      clearTimeoutImpl,
      sleep,
      onTrackUpdate
    } = {}) => {
      if (!pageAdapter || typeof pageAdapter.publishLegacyConversionResults !== 'function') {
        throw new TypeError('pageAdapter is required');
      }
      if (!apiAdapter || typeof apiAdapter.convertTrack !== 'function') {
        throw new TypeError('apiAdapter is required');
      }
      if (typeof AbortControllerImpl !== 'function') throw new TypeError('AbortControllerImpl is required');
      if (typeof setTimeoutImpl !== 'function') throw new TypeError('setTimeoutImpl is required');
      if (typeof clearTimeoutImpl !== 'function') throw new TypeError('clearTimeoutImpl is required');
      if (exposeLegacyGlobals !== undefined && typeof exposeLegacyGlobals !== 'boolean') {
        throw new TypeError('exposeLegacyGlobals must be boolean');
      }
      const wait = typeof sleep === 'function'
        ? sleep
        : createAbortableSleep(setTimeoutImpl, clearTimeoutImpl);
      let activeController = null;
      const notify = (track, state) => {
        // Optional visual feedback must never alter conversion or cancellation behavior.
        try { onTrackUpdate?.(track?.id, state); } catch { /* The view may have been detached. */ }
      };

      const cancel = () => {
        activeController?.abort();
      };

      const run = async (tracks, signal) => {
        if (activeController) throw new Error('session-active');
        if (!Array.isArray(tracks)) throw new TypeError('tracks must be an array');
        if (tracks.length > BROWSER_LIMITS.maxTracks) throw new Error('track-limit');
        if (signal?.aborted) return [];

        const operationController = new AbortControllerImpl();
        activeController = operationController;
        const onAbort = () => operationController.abort();
        signal?.addEventListener?.('abort', onAbort, { once: true });
        const results = [];
        const decisions = [];
        const append = (track, result) => {
          const safeResult = result && typeof result === 'object' ? result : schemaResult();
          results.push(safeResult);
          decisions.push({ track, result: safeResult });
          notify(track, safeResult.kind === 'success' ? 'ready' : safeResult.status === 'cancelled' ? 'canceled' : 'failed');
        };
        try {
          for (let index = 0; index < tracks.length; index += 1) {
            if (operationController.signal.aborted) break;
            if (index > 0) {
              try {
                await wait(BROWSER_LIMITS.conversionGapMs, operationController.signal);
              } catch (error) {
                if (error?.name === 'AbortError' || operationController.signal.aborted) break;
                throw error;
              }
              if (operationController.signal.aborted) break;
            }

            const track = tracks[index];
            if (!track || typeof track.value !== 'string' || track.value.trim().length === 0) {
              append(track, emptyResult());
              continue;
            }
            try {
              notify(track, 'converting');
              let result = await apiAdapter.convertTrack(track, operationController.signal);
              if (operationController.signal.aborted) {
                append(track, cancelledResult());
                break;
              }
              if (result?.kind === 'poll') {
                notify(track, 'polling');
                result = await apiAdapter.pollTask(result.taskId, operationController.signal);
                if (operationController.signal.aborted) {
                  append(track, cancelledResult());
                  break;
                }
              }
              append(track, result);
            } catch (error) {
              if (error?.name === 'AbortError' || operationController.signal.aborted) {
                append(track, cancelledResult());
                break;
              }
              throw error;
            }
          }
        } finally {
          signal?.removeEventListener?.('abort', onAbort);
          if (activeController === operationController) activeController = null;
        }
        const ordered = Object.freeze(results.slice());
        if (exposeLegacyGlobals === true) {
          pageAdapter.publishLegacyConversionResults(Object.freeze(decisions.map(({ track, result }) => (
            toLegacyResult(track, result)
          ))));
        }
        return ordered;
      };

      return Object.freeze({ run, cancel });
    };

    return { createConversionSession };
  })();

  __modules['./download-adapter.js'] = (() => {
    const { BROWSER_LIMITS, isFinalHttpsUrl, isTrustedUserEvent } = __require('./policy.js');

    const PANEL_ID = 'spotmate-download-panel';

    const createDownloadAdapter = ({ documentRef, windowRef, exposeLegacyGlobals = false, guided = false, onResults = null, onRequest = null } = {}) => {
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
        const existing = typeof onResults === 'function' ? null : documentRef.getElementById?.(PANEL_ID)
          ?? documentRef.querySelector?.('#' + PANEL_ID);
        existing?.remove?.();
        panel?.remove?.();
        panel = null;
        items = [];
        if (typeof onResults === 'function') onResults([]);
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
        if (typeof onRequest === 'function') onRequest(item.id);
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
        if (typeof onResults === 'function') {
          onResults(rows.map(row => ({
            id: row.item?.id ?? (typeof results[row.position - 1]?.id === 'string' ? results[row.position - 1].id : `track-${row.position}`),
            position: row.position,
            status: row.item ? 'ready' : row.canceled ? 'canceled' : row.notStarted ? 'not_started' : 'failed'
          })));
          return items.length;
        }
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

      const downloadById = (id, event) => downloadTrack(items.find(item => item.id === id), event);
      const adapter = { clear, render, downloadTrack, downloadById, downloadAll };
      Object.defineProperty(adapter, 'panel', { enumerable: true, get: () => panel });
      return Object.freeze(adapter);
    };

    return { PANEL_ID, createDownloadAdapter };
  })();

  __modules['./track-session.js'] = (() => {
    /**
     * @fileoverview Pure playlist session model for SpotMate v1.3.
     */

    const { BROWSER_LIMITS } = __require('./policy.js');

    /**
     * @typedef {'queued' | 'converting' | 'polling' | 'success' | 'failed' | 'cancelled'} TrackState
     */

    /**
     * @type {readonly TrackState[]}
     */
    const TRACK_STATES = Object.freeze([
      'queued',
      'converting',
      'polling',
      'success',
      'failed',
      'cancelled'
    ]);

    /**
     * @type {readonly string[]}
     */
    const ERROR_CODES = Object.freeze([
      'network',
      'http',
      'schema',
      'poll_timeout',
      'input'
    ]);

    /**
     * Internal validations.
     */

    const assertTrackIds = (trackIds) => {
      if (!Array.isArray(trackIds)) {
        throw new TypeError('trackIds must be an array');
      }
      if (trackIds.length === 0) {
        throw new Error('trackIds must contain at least 1 track');
      }
      if (trackIds.length > BROWSER_LIMITS.maxTracks) {
        throw new Error(`Track limit exceeded (max ${BROWSER_LIMITS.maxTracks})`);
      }
      const seen = new Set();
      for (const id of trackIds) {
        if (typeof id !== 'string' || id.trim().length === 0) {
          throw new Error('Track id must be a non-empty string');
        }
        if (seen.has(id)) {
          throw new Error(`Duplicate track id: ${id}`);
        }
        seen.add(id);
      }
    };

    const assertTrackState = (state) => {
      if (typeof state !== 'string' || !TRACK_STATES.includes(state)) {
        throw new Error(`Invalid track state: ${state}`);
      }
    };

    const assertProgress = (progress) => {
      const num = Number(progress);
      if (Number.isNaN(num)) return 0;
      return Math.max(0, Math.min(100, Math.round(num)));
    };

    const assertErrorCode = (errorCode) => {
      if (errorCode === null || errorCode === undefined) return;
      if (typeof errorCode !== 'string' || !ERROR_CODES.includes(errorCode)) {
        throw new Error(`Invalid errorCode: ${errorCode}`);
      }
    };

    const VALID_TRANSITIONS = Object.freeze({
      queued: Object.freeze(['converting']),
      converting: Object.freeze(['polling', 'success', 'failed', 'cancelled']),
      polling: Object.freeze(['polling', 'success', 'failed', 'cancelled']),
      success: Object.freeze([]),
      failed: Object.freeze([]),
      cancelled: Object.freeze([])
    });

    /**
     * Creates a playlist conversion session.
     * @param {string[]} trackIds
     * @param {(() => string)|string} [createSessionId]
     */
    const createTrackSession = (trackIds, createSessionId) => {
      assertTrackIds(trackIds);
      let sessionId = 'session-1';
      if (typeof createSessionId === 'function') {
        sessionId = createSessionId();
      } else if (typeof createSessionId === 'string' && createSessionId.trim().length > 0) {
        sessionId = createSessionId.trim();
      } else if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        sessionId = crypto.randomUUID();
      }

      const tracks = Object.freeze(
        trackIds.map((id) => Object.freeze({
          id,
          selected: true,
          status: 'queued',
          progressPercent: 0,
          errorCode: null
        }))
      );

      return Object.freeze({
        schemaVersion: 1,
        sessionId,
        tracks,
        activeTrackId: null
      });
    };

    /**
     * Updates one track's selection immutably.
     */
    const setTrackSelected = (session, trackId, selected) => {
      if (!session || !Array.isArray(session.tracks)) return session;
      const isSelected = Boolean(selected);
      const tracks = Object.freeze(
        session.tracks.map((track) => {
          if (track.id !== trackId) return track;
          return Object.freeze({
            ...track,
            selected: isSelected
          });
        })
      );
      return Object.freeze({
        ...session,
        tracks
      });
    };

    /**
     * Updates the selection of all tracks immutably.
     */
    const setAllSelected = (session, selected) => {
      if (!session || !Array.isArray(session.tracks)) return session;
      const isSelected = Boolean(selected);
      const tracks = Object.freeze(
        session.tracks.map((track) => Object.freeze({
          ...track,
          selected: isSelected
        }))
      );
      return Object.freeze({
        ...session,
        tracks
      });
    };

    /**
     * Returns the ordered IDs of selected tracks that are queued.
     */
    const getSelectedQueuedTrackIds = (session) => {
      if (!session || !Array.isArray(session.tracks)) return [];
      return session.tracks
        .filter((track) => track.selected && track.status === 'queued')
        .map((track) => track.id);
    };

    /**
     * Returns the IDs of failed tracks.
     */
    const getFailedTrackIds = (session) => {
      if (!session || !Array.isArray(session.tracks)) return [];
      return session.tracks
        .filter((track) => track.status === 'failed')
        .map((track) => track.id);
    };

    /**
     * Returns failed tracks to the 'queued' state for manual retry.
     */
    const requeueFailedTracks = (session) => {
      if (!session || !Array.isArray(session.tracks)) return session;
      const tracks = Object.freeze(
        session.tracks.map((track) => {
          if (track.status !== 'failed') return track;
          return Object.freeze({
            ...track,
            status: 'queued',
            progressPercent: 0,
            errorCode: null
          });
        })
      );
      return Object.freeze({
        ...session,
        tracks
      });
    };

    /**
     * Transitions a track to another state.
     */
    const transitionTrack = (session, trackId, nextState, patch = {}) => {
      if (!session || !Array.isArray(session.tracks)) {
        throw new TypeError('session must be an object with tracks');
      }
      assertTrackState(nextState);

      const trackIndex = session.tracks.findIndex((t) => t.id === trackId);
      if (trackIndex === -1) {
        throw new Error(`Track with id ${trackId} not found in session`);
      }

      const track = session.tracks[trackIndex];
      const allowed = VALID_TRANSITIONS[track.status];
      if (!allowed || !allowed.includes(nextState)) {
        throw new Error(`Invalid transition from '${track.status}' to '${nextState}'`);
      }

      let progressPercent = track.progressPercent;
      if (patch.progressPercent !== undefined) {
        progressPercent = assertProgress(patch.progressPercent);
      } else if (nextState === 'success') {
        progressPercent = 100;
      } else if (nextState === 'queued') {
        progressPercent = 0;
      }

      let errorCode = null;
      if (nextState === 'failed') {
        if (patch.errorCode !== undefined) {
          assertErrorCode(patch.errorCode);
          errorCode = patch.errorCode;
        }
      }

      const updatedTrack = Object.freeze({
        ...track,
        status: nextState,
        progressPercent,
        errorCode
      });

      let activeTrackId = session.activeTrackId;
      if (patch.activeTrackId !== undefined) {
        activeTrackId = patch.activeTrackId;
      } else if (nextState === 'converting' || nextState === 'polling') {
        activeTrackId = trackId;
      } else if (nextState === 'success' || nextState === 'failed' || nextState === 'cancelled') {
        activeTrackId = null;
      }

      const tracks = Object.freeze(
        session.tracks.map((t, idx) => (idx === trackIndex ? updatedTrack : t))
      );

      return Object.freeze({
        ...session,
        tracks,
        activeTrackId
      });
    };

    /**
     * Projects the session into a safe format for persistence, without sensitive data.
     */
    const toPersistedSession = (session) => {
      if (!session || typeof session !== 'object') return null;
      return Object.freeze({
        schemaVersion: 1,
        sessionId: String(session.sessionId || ''),
        tracks: Object.freeze(
          (session.tracks || []).map((t) => Object.freeze({
            id: String(t.id),
            selected: Boolean(t.selected),
            status: t.status,
            progressPercent: assertProgress(t.progressPercent),
            errorCode: t.errorCode || null
          }))
        ),
        activeTrackId: session.activeTrackId ?? null
      });
    };

    return { TRACK_STATES, ERROR_CODES, assertTrackIds, assertTrackState, assertProgress, assertErrorCode, createTrackSession, setTrackSelected, setAllSelected, getSelectedQueuedTrackIds, getFailedTrackIds, requeueFailedTracks, transitionTrack, toPersistedSession };
  })();

  __modules['./session-storage.js'] = (() => {
    /**
     * @fileoverview Versioned session storage manager for SpotMate v1.3.
     */

    const { TRACK_STATES, ERROR_CODES, toPersistedSession } = __require('./track-session.js');
    const { BROWSER_LIMITS } = __require('./policy.js');

    const SESSION_STORAGE_KEY = 'music-converter:v1.3:playlist-session';

    /**
     * Saves the session after projecting it to a safe format.
     * @param {{ setItem: (key: string, val: string) => void }} storage
     * @param {object} session
     * @returns {boolean}
     */
    const saveSession = (storage, session) => {
      try {
        if (!storage || typeof storage.setItem !== 'function') return false;
        const persisted = toPersistedSession(session);
        if (!persisted) return false;
        const json = JSON.stringify(persisted);
        storage.setItem(SESSION_STORAGE_KEY, json);
        return true;
      } catch {
        return false;
      }
    };

    /**
     * Removes the session from storage.
     * @param {{ removeItem: (key: string) => void }} storage
     * @returns {boolean}
     */
    const clearSession = (storage) => {
      try {
        if (storage && typeof storage.removeItem === 'function') {
          storage.removeItem(SESSION_STORAGE_KEY);
        }
        return true;
      } catch {
        return false;
      }
    };

    /**
     * Loads and validates a session from storage, failing closed on invalid data.
     * @param {{ getItem: (key: string) => string|null, removeItem: (key: string) => void }} storage
     * @param {string[]} [currentTrackIds]
     * @returns {object|null}
     */
    const loadSession = (storage, currentTrackIds) => {
      if (!storage || typeof storage.getItem !== 'function') return null;

      let raw;
      try {
        raw = storage.getItem(SESSION_STORAGE_KEY);
      } catch {
        return null;
      }

      if (raw === null || raw === undefined || typeof raw !== 'string' || raw.trim().length === 0) {
        return null;
      }

      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        clearSession(storage);
        return null;
      }

      // Validate the structure and fail closed on invalid data.
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        clearSession(storage);
        return null;
      }

      if (data.schemaVersion !== 1) {
        clearSession(storage);
        return null;
      }

      if (typeof data.sessionId !== 'string' || data.sessionId.trim().length === 0) {
        clearSession(storage);
        return null;
      }

      if (!Array.isArray(data.tracks) || data.tracks.length === 0 || data.tracks.length > BROWSER_LIMITS.maxTracks) {
        clearSession(storage);
        return null;
      }

      const seenIds = new Set();
      const validTracks = [];

      for (const t of data.tracks) {
        if (!t || typeof t !== 'object') {
          clearSession(storage);
          return null;
        }
        if (typeof t.id !== 'string' || t.id.trim().length === 0) {
          clearSession(storage);
          return null;
        }
        if (seenIds.has(t.id)) {
          clearSession(storage);
          return null;
        }
        seenIds.add(t.id);

        if (typeof t.selected !== 'boolean') {
          clearSession(storage);
          return null;
        }

        if (typeof t.status !== 'string' || !TRACK_STATES.includes(t.status)) {
          clearSession(storage);
          return null;
        }

        if (typeof t.progressPercent !== 'number' || Number.isNaN(t.progressPercent) || t.progressPercent < 0 || t.progressPercent > 100) {
          clearSession(storage);
          return null;
        }

        if (t.errorCode !== null) {
          if (typeof t.errorCode !== 'string' || !ERROR_CODES.includes(t.errorCode)) {
            clearSession(storage);
            return null;
          }
        }

        validTracks.push(Object.freeze({
          id: t.id,
          selected: t.selected,
          status: t.status,
          progressPercent: t.progressPercent,
          errorCode: t.errorCode
        }));
      }

      let activeTrackId = null;
      if (data.activeTrackId !== null && data.activeTrackId !== undefined) {
        if (typeof data.activeTrackId !== 'string' || !seenIds.has(data.activeTrackId)) {
          clearSession(storage);
          return null;
        }
        activeTrackId = data.activeTrackId;
      }

      // If currentTrackIds is provided, require an exact match.
      if (Array.isArray(currentTrackIds)) {
        if (currentTrackIds.length !== validTracks.length) {
          clearSession(storage);
          return null;
        }
        for (let i = 0; i < currentTrackIds.length; i += 1) {
          if (currentTrackIds[i] !== validTracks[i].id) {
            clearSession(storage);
            return null;
          }
        }
      }

      return Object.freeze({
        schemaVersion: 1,
        sessionId: data.sessionId,
        tracks: Object.freeze(validTracks),
        activeTrackId
      });
    };

    return { SESSION_STORAGE_KEY, saveSession, loadSession, clearSession };
  })();

  __modules['./conversion-runner.js'] = (() => {
    /**
     * @fileoverview Sequential conversion runner for SpotMate v1.3.
     */

    const { BROWSER_LIMITS, isFinalHttpsUrl } = __require('./policy.js');
    const { ERROR_CODES, getSelectedQueuedTrackIds, requeueFailedTracks, transitionTrack, toPersistedSession } = __require('./track-session.js');

    const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });

    const createDefaultSleep = () => (ms, signal) => {
      if (signal?.aborted) return Promise.reject(abortError());
      return new Promise((resolve, reject) => {
        let timer;
        const cleanup = () => {
          if (timer !== undefined) clearTimeout(timer);
          signal?.removeEventListener?.('abort', onAbort);
        };
        const onAbort = () => {
          cleanup();
          reject(abortError());
        };
        timer = setTimeout(() => {
          cleanup();
          resolve();
        }, ms);
        signal?.addEventListener?.('abort', onAbort, { once: true });
        if (signal?.aborted) onAbort();
      });
    };

    const normalizeErrorCode = (code) => {
      if (typeof code !== 'string') return 'network';
      const clean = code.toLowerCase().trim();
      if (ERROR_CODES.includes(clean)) return clean;
      if (clean.startsWith('http')) return 'http';
      if (clean.startsWith('network')) return 'network';
      if (clean.startsWith('schema')) return 'schema';
      if (clean.includes('poll') || clean.includes('timeout')) return 'poll_timeout';
      if (clean.startsWith('input')) return 'input';
      return 'network';
    };

    /**
     * Creates a sequential conversion runner for a playlist session.
     *
     * @param {object} params
     * @param {object} params.session Session created by createTrackSession.
     * @param {Function} params.convertTrack Async function (track, signal, hooks) => Promise.
     * @param {Function} [params.sleep] Function (ms, signal) => Promise.
     * @param {Function} [params.onChange] Callback (snapshot) => void.
     * @param {Function} [params.onSuccess] Callback (trackId, finalAudioUrl) => void.
     */
    const createConversionRunner = ({
      session,
      convertTrack,
      sleep,
      onChange,
      onSuccess
    } = {}) => {
      if (!session || !Array.isArray(session.tracks)) {
        throw new TypeError('session is required and must have tracks array');
      }
      if (typeof convertTrack !== 'function') {
        throw new TypeError('convertTrack must be a function');
      }

      const wait = typeof sleep === 'function' ? sleep : createDefaultSleep();
      let currentSession = session;
      let activeController = null;

      const notifyChange = () => {
        if (typeof onChange === 'function') {
          onChange(toPersistedSession(currentSession));
        }
      };

      const handleCancellation = (trackId) => {
        const track = currentSession.tracks.find((t) => t.id === trackId);
        if (track && (track.status === 'converting' || track.status === 'polling')) {
          currentSession = transitionTrack(currentSession, trackId, 'cancelled', {
            activeTrackId: null
          });
          notifyChange();
        }
      };

      const cancel = () => {
        if (activeController) {
          activeController.abort();
        }
      };

      const runQueue = async () => {
        if (activeController) {
          throw new Error('runner-active');
        }

        const targetTrackIds = getSelectedQueuedTrackIds(currentSession);
        if (targetTrackIds.length === 0) {
          return currentSession;
        }

        const operationController = new AbortController();
        activeController = operationController;

        try {
          for (let index = 0; index < targetTrackIds.length; index += 1) {
            if (operationController.signal.aborted) break;

            const trackId = targetTrackIds[index];

            // Wait 2000 ms only between consecutive starts.
            if (index > 0) {
              try {
                await wait(BROWSER_LIMITS.conversionGapMs, operationController.signal);
              } catch (error) {
                if (error?.name === 'AbortError' || operationController.signal.aborted) {
                  break;
                }
                throw error;
              }
              if (operationController.signal.aborted) break;
            }

            // Transition to 'converting'.
            currentSession = transitionTrack(currentSession, trackId, 'converting', {
              activeTrackId: trackId
            });
            notifyChange();

            const onPolling = (progressPercent) => {
              if (operationController.signal.aborted) return;
              const currentTrack = currentSession.tracks.find((t) => t.id === trackId);
              if (currentTrack && (currentTrack.status === 'converting' || currentTrack.status === 'polling')) {
                currentSession = transitionTrack(currentSession, trackId, 'polling', {
                  progressPercent: progressPercent ?? 25,
                  activeTrackId: trackId
                });
                notifyChange();
              }
            };

            try {
              const trackObj = currentSession.tracks.find((t) => t.id === trackId) || { id: trackId };
              const result = await convertTrack(trackObj, operationController.signal, { onPolling });

              if (operationController.signal.aborted) {
                handleCancellation(trackId);
                break;
              }

              const finalAudioUrl = result?.finalAudioUrl ?? result?.url;
              if (isFinalHttpsUrl(finalAudioUrl)) {
                currentSession = transitionTrack(currentSession, trackId, 'success', {
                  progressPercent: 100,
                  activeTrackId: null
                });
                notifyChange();
                if (typeof onSuccess === 'function') {
                  onSuccess(trackId, finalAudioUrl);
                }
              } else {
                const errCode = normalizeErrorCode(result?.errorCode ?? result?.error ?? result?.status);
                currentSession = transitionTrack(currentSession, trackId, 'failed', {
                  errorCode: errCode,
                  activeTrackId: null
                });
                notifyChange();
              }
            } catch (error) {
              if (error?.name === 'AbortError' || operationController.signal.aborted) {
                handleCancellation(trackId);
                break;
              }
              const errCode = normalizeErrorCode(error?.code ?? error?.message);
              currentSession = transitionTrack(currentSession, trackId, 'failed', {
                errorCode: errCode,
                activeTrackId: null
              });
              notifyChange();
            }
          }
        } finally {
          if (activeController === operationController) {
            activeController = null;
          }
        }

        return currentSession;
      };

      const startSelected = () => runQueue();
      const resumeQueued = () => runQueue();

      const retryFailedTracks = () => {
        currentSession = requeueFailedTracks(currentSession);
        notifyChange();
        return currentSession;
      };

      const getSession = () => currentSession;

      return Object.freeze({
        startSelected,
        resumeQueued,
        retryFailedTracks,
        cancel,
        getSession
      });
    };

    return { createConversionRunner };
  })();

  __modules['./playlist-view.js'] = (() => {
    const { createLivingWorkspace } = __require('./living-workspace.js');
    const { isTrustedUserEvent, isFinalHttpsUrl } = __require('./policy.js');
    const { setTrackSelected, setAllSelected, getSelectedQueuedTrackIds, getFailedTrackIds, requeueFailedTracks } = __require('./track-session.js');

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

    return { PANEL_ID, LIVE_REGION_ID, LABELS, STATUS_LABELS, mountPlaylistPanel, createPlaylistView };
  })();

  __modules['./index.js'] = (() => {
    const { createConversionRunner } = __require('./conversion-runner.js');
    const { createConversionSession } = __require('./conversion-session.js');
    const { createDownloadAdapter } = __require('./download-adapter.js');
    const { mountPlaylistPanel, createPlaylistView, PANEL_ID, LIVE_REGION_ID, LABELS, STATUS_LABELS } = __require('./playlist-view.js');
    const { createSpotmateApiAdapter } = __require('./spotmate-api-adapter.js');
    const { createSpotmatePageAdapter } = __require('./spotmate-page-adapter.js');
    const { isAllowedSpotmatePage } = __require('./policy.js');
    const { TRACK_STATES, ERROR_CODES, assertTrackIds, assertTrackState, assertProgress, assertErrorCode, createTrackSession, setTrackSelected, setAllSelected, getSelectedQueuedTrackIds, getFailedTrackIds, requeueFailedTracks, transitionTrack, toPersistedSession } = __require('./track-session.js');
    const { SESSION_STORAGE_KEY, saveSession, loadSession, clearSession } = __require('./session-storage.js');

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
      if (supported && documentRef) __injectStyles(documentRef);
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

    return { isAllowedSpotmatePage, createBrowserCore, createConversionRunner, createConversionSession, createDownloadAdapter, createPlaylistView, mountPlaylistPanel, PANEL_ID, LIVE_REGION_ID, LABELS, STATUS_LABELS, createSpotmateApiAdapter, createSpotmatePageAdapter, TRACK_STATES, ERROR_CODES, assertTrackIds, assertTrackState, assertProgress, assertErrorCode, createTrackSession, setTrackSelected, setAllSelected, getSelectedQueuedTrackIds, getFailedTrackIds, requeueFailedTracks, transitionTrack, toPersistedSession, SESSION_STORAGE_KEY, saveSession, loadSession, clearSession };
  })();

  __modules['./entry.js'] = (() => {
    const { createBrowserCore } = __require('./index.js');

    const mount = ({
      windowRef = globalThis.window,
      documentRef = windowRef?.document ?? globalThis.document,
      URLImpl = windowRef?.URL ?? globalThis.URL,
      AbortControllerImpl = windowRef?.AbortController ?? globalThis.AbortController,
      setTimeoutImpl = windowRef?.setTimeout ?? globalThis.setTimeout,
      clearTimeoutImpl = windowRef?.clearTimeout ?? globalThis.clearTimeout,
      fetchImpl = windowRef?.fetch ?? globalThis.fetch
    } = {}) => createBrowserCore({
      windowRef,
      documentRef,
      URLImpl,
      AbortControllerImpl,
      setTimeoutImpl,
      clearTimeoutImpl,
      fetchImpl,
      exposeConversionGlobals: true,
      exposeDownloadGlobals: true
    });

    return { mount };
  })();

  const { mount } = __require('./entry.js');
  mount();
})();
