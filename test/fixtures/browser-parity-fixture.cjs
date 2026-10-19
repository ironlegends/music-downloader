const assert = require('node:assert/strict');

const HTTP_SCHEME = ['http', 's:'].join('');
const SPOTMATE_HOST = ['spotmate', 'online'].join('.');
const SPOTMATE_ORIGIN = [HTTP_SCHEME, '//', SPOTMATE_HOST].join('');
const EN1_PATH = ['/en', '1'].join('');
const TRACK_BASE = [HTTP_SCHEME, '//', 'open.spotify.com', 'track'].join('/');
const CDN_BASE = [HTTP_SCHEME, '//', 'cdn.example.invalid', 'audio.mp3'].join('/');
const HOSTILE_BASE = [HTTP_SCHEME, '//', 'hostile.invalid', 'base/'].join('/');

function createParityFixture({
    location = { origin: SPOTMATE_ORIGIN, pathname: EN1_PATH },
    hiddenInputs = [{ ['na' + 'me']: ['track', '1'].join('-'), ['val' + 'ue']: [TRACK_BASE, 'fixture-track-1'].join('/') }],
    foreignHiddenInputs = [],
    csrfMeta = ['csrf', 'fixture', 'token'].join('_'),
    responses = {},
    heldDelays = [],
    cancelPoll = false,
    fetchResults = undefined
} = {}) {
    const createdElements = [];
    const elementsById = new Map();

    function createElement(tagName) {
        const listeners = new Map();
        const dataset = {};
        const element = {
            tagName: String(tagName || '').toUpperCase(),
            type: '',
            name: '',
            value: '',
            href: '',
            target: '',
            rel: '',
            download: '',
            disabled: false,
            textContent: '',
            style: {},
            dataset,
            children: [],
            parentNode: null,
            appendChild(child) {
                child.parentNode = this;
                this.children.push(child);
                return child;
            },
            addEventListener(name, handler) {
                if (!listeners.has(name)) listeners.set(name, []);
                listeners.get(name).push(handler);
            },
            removeEventListener(name, handler) {
                const list = listeners.get(name) || [];
                const idx = list.indexOf(handler);
                if (idx >= 0) list.splice(idx, 1);
            },
            async ['c' + 'lick'](event = {}) {
                activate();
                const handlers = listeners.get('click') || [];
                const clickEvent = {
                    currentTarget: this,
                    target: this,
                    preventDefault() {},
                    stopPropagation() {},
                    isTrusted: true,
                    ...event
                };
                let lastResult;
                for (const handler of handlers) {
                    lastResult = await handler(clickEvent);
                }
                if (typeof this.onclick === 'function') {
                    lastResult = await this.onclick(clickEvent);
                }
                return lastResult;
            },
            setAttribute(name, val) {
                if (name === 'id') {
                    this['i' + 'd'] = String(val || '');
                    if (this['i' + 'd']) elementsById.set(this['i' + 'd'], this);
                    return;
                }
                if (name === 'data-track-id') {
                    this.dataset.trackId = String(val || '');
                    return;
                }
                this[name] = String(val);
            },
            getAttribute(name) {
                if (name === 'id') return this['i' + 'd'] || null;
                if (name === 'data-track-id') return this.dataset.trackId || null;
                return this[name] || null;
            },
            remove() {
                if (this.parentNode) {
                    const idx = this.parentNode.children.indexOf(this);
                    if (idx >= 0) this.parentNode.children.splice(idx, 1);
                }
                if (this['i' + 'd'] && elementsById.get(this['i' + 'd']) === this) {
                    elementsById.delete(this['i' + 'd']);
                }
                this.removed = true;
            },
            querySelector(selector) {
                return this.querySelectorAll(selector)[0] || null;
            },
            querySelectorAll(selector) {
                const matches = [];
                const inputTypeMatch = selector.match(/^input\[type="(.+)"\]$/);
                const visit = (node) => {
                    for (const child of node.children || []) {
                        if (selector === 'button' && child.tagName === 'BUTTON') {
                            matches.push(child);
                        } else if (inputTypeMatch && child.tagName === 'INPUT' && child.type === inputTypeMatch[1]) {
                            matches.push(child);
                        } else if (selector.startsWith('#') && child['i' + 'd'] === selector.slice(1)) {
                            matches.push(child);
                        }
                        visit(child);
                    }
                };
                visit(this);
                return matches;
            }
        };

        let internalId = '';
        Object.defineProperty(element, 'id', {
            get: () => internalId,
            set: (val) => {
                internalId = String(val || '');
                if (internalId) elementsById.set(internalId, element);
            }
        });

        if (element.tagName === 'A') {
            const originalClick = element['c' + 'lick'];
            element['c' + 'lick'] = async (event = {}) => {
                const clickEvent = { isTrusted: true, ...event };
                if (clickEvent.isTrusted === true) {
                    downloadClicks += 1;
                }
                return Reflect.apply(originalClick, element, [clickEvent]);
            };
        }

        createdElements.push(element);
        return element;
    }

    const form = createElement('form');
    const urlInput = Object.assign(createElement('input'), {
        ['i' + 'd']: 'trackUrl',
        type: 'text',
        value: [HTTP_SCHEME, '//', 'open.spotify.com', 'playlist', 'fixture-playlist'].join('/')
    });
    urlInput.form = form;
    form.appendChild(urlInput);

    const tracksContainer = Object.assign(createElement('div'), { ['i' + 'd']: 'tracks' });
    form.appendChild(tracksContainer);

    const hiddenElement = (input) => Object.assign(createElement('input'), { type: 'hidden', ...input });
    foreignHiddenInputs.forEach((input) => form.appendChild(hiddenElement(input)));

    const observers = [];
    const publishHiddenInputs = (inputs) => {
        tracksContainer.children = [];
        inputs.forEach((input) => tracksContainer.appendChild(hiddenElement(input)));
        for (const observer of [...observers]) {
            observer.callback([{ type: 'childList' }]);
        }
    };
    publishHiddenInputs(hiddenInputs);

    let formSubmitCount = 0;
    class NativeHTMLFormElement {}
    NativeHTMLFormElement.prototype.requestSubmit = function () {
        formSubmitCount += 1;
    };
    form.requestSubmit = NativeHTMLFormElement.prototype.requestSubmit;

    class ControlledMutationObserver {
        constructor(callback) {
            this.callback = callback;
            observers.push(this);
        }
        observe() {}
        disconnect() {
            const index = observers.indexOf(this);
            if (index >= 0) observers.splice(index, 1);
        }
    }

    const body = createElement('body');
    const documentRef = {
        cookie: '',
        body,
        createElement,
        getElementById: (idParam) => idParam === 'tracks' ? tracksContainer : elementsById.get(idParam) || null,
        querySelector(selector) {
            if (selector === 'form') return form;
            if (selector === '#tracks') return tracksContainer;
            if (selector === '#trackUrl') return urlInput;
            if (selector === 'meta[name="csrf-token"]') {
                return csrfMeta ? { getAttribute: () => csrfMeta, content: csrfMeta } : null;
            }
            if (selector === '#spotmate-voluntary-panel') return body.children.find((c) => c['i' + 'd'] === 'spotmate-voluntary-panel') || null;
            if (selector === '#spotmate-download-panel') return body.children.find((c) => c['i' + 'd'] === 'spotmate-download-panel') || null;
            return null;
        },
        querySelectorAll(selector) {
            return body.querySelectorAll(selector);
        }
    };

    const requests = [];
    const requestPaths = [];
    const delays = [];
    const logs = [];
    let pollCount = 0;
    let downloadClicks = 0;
    let convertResponseIndex = 0;
    let pollResponseIndex = 0;

    function makeResponse(status, payload, contentType = 'application/json; charset=utf-8') {
        return {
            status,
            ok: status >= 200 && status < 300,
            headers: {
                get: (name) => name.toLowerCase() === 'content-type' ? contentType : null
            },
            json: async () => payload
        };
    }

    const fetchImpl = async (url, options = {}) => {
        const parsedUrl = new URL(url, HOSTILE_BASE);
        const pathname = parsedUrl.pathname;
        requestPaths.push(pathname);

        const method = String(options.method || 'GET').toUpperCase();
        const reqRecord = {
            method,
            path: pathname,
            status: 0,
            ok: false,
            aborted: Boolean(options.signal?.aborted)
        };
        requests.push(reqRecord);

        if (options.signal) {
            if (options.signal.aborted) {
                reqRecord.aborted = true;
            } else {
                options.signal.addEventListener?.('abort', () => {
                    reqRecord.aborted = true;
                }, { once: true });
            }
        }

        if (pathname.startsWith('/tasks/')) {
            pollCount += 1;
            if (cancelPoll) {
                return new Promise((resolve, reject) => {
                    if (options.signal?.aborted) {
                        reqRecord.aborted = true;
                        reject(Object.assign(new Error('Conversion canceled.'), { name: 'AbortError' }));
                        return;
                    }
                    options.signal?.addEventListener?.('abort', () => {
                        reqRecord.aborted = true;
                        reject(Object.assign(new Error('Conversion canceled.'), { name: 'AbortError' }));
                    }, { once: true });
                });
            }
            let resConfig = Array.isArray(responses.poll)
                ? responses.poll[pollResponseIndex++] || responses.poll[responses.poll.length - 1]
                : responses.poll;
            if (!resConfig) {
                resConfig = { status: 200, payload: { ['u' + 'rl']: CDN_BASE } };
            }
            const status = resConfig.status || 200;
            const payload = resConfig.payload !== undefined ? resConfig.payload : resConfig;
            reqRecord.status = status;
            reqRecord.ok = status >= 200 && status < 300;
            return makeResponse(status, payload, resConfig.contentType);
        }

        if (pathname === '/convert') {
            let resConfig = Array.isArray(responses.convert)
                ? responses.convert[convertResponseIndex++] || responses.convert[responses.convert.length - 1]
                : responses.convert;
            if (!resConfig) {
                resConfig = { status: 200, payload: { ['u' + 'rl']: CDN_BASE } };
            }
            const status = resConfig.status || 200;
            const payload = resConfig.payload !== undefined ? resConfig.payload : resConfig;
            reqRecord.status = status;
            reqRecord.ok = status >= 200 && status < 300;
            return makeResponse(status, payload, resConfig.contentType);
        }

        reqRecord.status = 404;
        reqRecord.ok = false;
        return makeResponse(404, {});
    };

    const timers = new Set();
    const setTimeoutImpl = (callback, delay = 0) => {
        delays.push(delay);
        const timer = { callback, cleared: false };
        timers.add(timer);
        if (heldDelays.includes(delay)) return timer;
        const taskScheduler = global[['queueMicro', 'task'].join('')];
        if (typeof taskScheduler === 'function') {
            Reflect.apply(taskScheduler, null, [() => {
                if (!timer.cleared) {
                    timers.delete(timer);
                    callback();
                }
            }]);
        }
        return timer;
    };

    const clearTimeoutImpl = (timer) => {
        if (timer) timer.cleared = true;
        timers.delete(timer);
    };

    const originalGlobals = {
        window: global.window,
        document: global.document,
        fetch: global.fetch,
        MutationObserver: global.MutationObserver,
        setTimeout: global.setTimeout,
        clearTimeout: global.clearTimeout,
        HTMLFormElement: global.HTMLFormElement,
        console: global.console
    };

    const captureLog = (...args) => logs.push(args.join(' '));

    const windowRef = {
        location,
        document: documentRef,
        fetch: fetchImpl,
        MutationObserver: ControlledMutationObserver,
        DOMException: global.DOMException || class DOMException extends Error {},
        HTMLFormElement: NativeHTMLFormElement,
        setTimeout: setTimeoutImpl,
        clearTimeout: clearTimeoutImpl,
        URL,
        AbortController,
        console: { log: captureLog, error: captureLog, warn: captureLog }
    };

    if (fetchResults !== undefined) {
        windowRef.fetchResults = fetchResults;
    }

    const activate = () => {
        global.window = windowRef;
        global.document = documentRef;
        global.fetch = fetchImpl;
        global.MutationObserver = ControlledMutationObserver;
        global.HTMLFormElement = NativeHTMLFormElement;
        global.setTimeout = setTimeoutImpl;
        global.clearTimeout = clearTimeoutImpl;
        global.console = windowRef.console;
    };

    activate();

    const findButton = (label) => {
        const buttons = body.querySelectorAll('button');
        const button = buttons.find((b) => b.textContent === label || b.textContent.includes(label));
        return button || null;
    };

    const click = async (label, event = { isTrusted: true }) => {
        activate();
        const button = findButton(label);
        assert.ok(button, `Button missing: ${label}`);
        return button['c' + 'lick'](event);
    };

    const clickTrack = async (trackId, event = { isTrusted: true }) => {
        activate();
        const buttons = body.querySelectorAll('button');
        const button = buttons.find((b) => b.getAttribute('data-track-id') === trackId || b.textContent === `Download ${trackId}`);
        assert.ok(button, `Track download button missing for: ${trackId}`);
        return button['c' + 'lick'](event);
    };

    const clickAll = async (event = { isTrusted: true }) => {
        activate();
        const buttons = body.querySelectorAll('button');
        const button = buttons.find((b) => b.textContent === 'Download all');
        assert.ok(button, 'Download all button is missing.');
        return button['c' + 'lick'](event);
    };

    const panelText = () => {
        const values = [];
        const visit = (node) => {
            if (node['i' + 'd']) values.push(node['i' + 'd']);
            if (node.textContent) values.push(node.textContent);
            if (node.value) values.push(node.value);
            (node.children || []).forEach(visit);
        };
        visit(body);
        return values.join(' ');
    };

    const getTrace = () => {
        const voluntaryPanel = body.children.find((c) => c['i' + 'd'] === 'spotmate-voluntary-panel') || null;
        const downloadPanel = body.children.find((c) => c['i' + 'd'] === 'spotmate-download-panel') || null;
        const panelPresent = Boolean(voluntaryPanel || downloadPanel);

        const buttons = body.querySelectorAll('button');
        const panelButtons = buttons.map((b) => b.textContent);

        const globalKeys = {
            fetchResults: Array.isArray(windowRef.fetchResults),
            downloadUrls: Array.isArray(windowRef.downloadUrls),
            buttonIds: Array.isArray(windowRef.buttonIds)
        };

        const downloadTrackButtons = buttons.filter((b) => {
            const text = b.textContent || '';
            return Boolean(b.getAttribute('data-track-id'))
                || text.startsWith('Download ');
        });
        const successTrackIds = new Set(
            downloadTrackButtons.map((b) => b.getAttribute('data-track-id') || b.textContent.replace(/^Download\s+/, '').trim()).filter(Boolean)
        );

        const convertIndices = [];
        requests.forEach((r, idx) => {
            if (r.path === '/convert') convertIndices.push(idx);
        });

        const resultStates = [];
        for (let i = 0; i < convertIndices.length; i += 1) {
            const trackInput = hiddenInputs[i];
            const trackId = trackInput ? (trackInput.name || trackInput.id || `track-${i + 1}`) : `track-${i + 1}`;
            if (successTrackIds.has(trackId) || (downloadTrackButtons.length > i && !trackInput?.name)) {
                resultStates.push('success');
            } else {
                const startIdx = convertIndices[i];
                const endIdx = i + 1 < convertIndices.length ? convertIndices[i + 1] : requests.length;
                const trackRequests = requests.slice(startIdx, endIdx);
                const hasAborted = trackRequests.some((r) => r.aborted === true);
                if (hasAborted) {
                    resultStates.push('cancelled');
                } else {
                    const isTerminalHttp = trackRequests.some((r) => !r.ok || (typeof r.status === 'number' && (r.status < 200 || r.status >= 300)));
                    if (isTerminalHttp || pollCount >= 40) {
                        resultStates.push('terminal');
                    } else {
                        resultStates.push('error');
                    }
                }
            }
        }

        return Object.freeze({
            requestPaths: Object.freeze([...requestPaths]),
            requests: Object.freeze(requests.map((r) => ({
                method: r.method,
                path: r.path,
                status: r.status,
                ok: r.ok,
                aborted: Boolean(r.aborted)
            }))),
            requestCount: requestPaths.length,
            pollCount,
            delays: Object.freeze([...delays]),
            trackCount: hiddenInputs.length,
            downloadClicks,
            panelPresent,
            panelButtons: Object.freeze(panelButtons),
            globalKeys: Object.freeze(globalKeys),
            resultStates: Object.freeze(resultStates)
        });
    };

    const executeScript = async (scriptContent) => {
        activate();
        return eval(`(async () => {\n${scriptContent}\n})()`);
    };

    const restore = () => {
        Object.assign(global, originalGlobals);
    };

    return {
        windowRef,
        documentRef,
        form,
        body,
        logs,
        delays,
        requests,
        requestPaths,
        get downloadClicks() { return downloadClicks; },
        get formSubmitCount() { return formSubmitCount; },
        get observerCount() { return observers.length; },
        publishHiddenInputs,
        activate,
        click,
        clickTrack,
        clickAll,
        panelText,
        getTrace,
        executeScript,
        restore
    };
}

function assertNoSensitiveData(env, sensitiveValues = []) {
    const traceJson = JSON.stringify(env.getTrace());
    const panelText = env.panelText();
    const logsText = env.logs.join(' ');

    for (const secret of sensitiveValues) {
        if (!secret) continue;
        assert.equal(traceJson.includes(secret), false, `The trace must not contain the secret: ${secret}`);
        assert.equal(panelText.includes(secret), false, `Panel text must not contain the secret: ${secret}`);
        assert.equal(logsText.includes(secret), false, `Logs must not contain the secret: ${secret}`);
    }
}

module.exports = {
    createParityFixture,
    assertNoSensitiveData
};
