const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { assertNoOpaqueLiterals } = require('./secret-guard.cjs');

const source = fs.readFileSync('console-script.js', 'utf8');
const fixtureTrack = 'https://open.spotify.com/track/fixture-one';
const fixtureCsrf = 'fixture-csrf-value';

function response(status, payload, type = 'application/json; charset=utf-8') {
    return { status, ok: status >= 200 && status < 300,
        headers: { get: (name) => name.toLowerCase() === 'content-type' ? type : null },
        json: async () => payload };
}

function element(tag, props = {}) {
    const listeners = new Map();
    const node = { tagName: tag.toUpperCase(), children: [], parentNode: null,
        textContent: '', disabled: false, style: {}, ...props };
    node.appendChild = (child) => { child.parentNode = node; node.children.push(child); return child; };
    node.addEventListener = (name, handler) => listeners.set(name, handler);
    node.click = (event = {}) => Promise.resolve(listeners.get('click')?.({ currentTarget: node, preventDefault() {}, isTrusted: true, ...event }));
    node.querySelectorAll = (selector) => {
        const found = [], match = selector.match(/^input\[type="(.+)"\]$/);
        const visit = (parent) => (parent.children || []).forEach((child) => {
            if (selector === 'button' && child.tagName === 'BUTTON') found.push(child);
            if (match && child.tagName === 'INPUT' && child.type === match[1]) found.push(child);
            visit(child);
        });
        visit(node);
        return found;
    };
    node.querySelector = (selector) => node.querySelectorAll(selector)[0] || null;
    node.setAttribute = (name, value) => { node[name] = String(value); };
    node.getAttribute = (name) => node[name] || null;
    node.remove = () => { if (node.parentNode) node.parentNode.children = node.parentNode.children.filter((child) => child !== node); };
    return node;
}

function setup({ hiddenInputs = [{ name: 'track-one', value: fixtureTrack }], outsideInputs = [], responses = {}, csrf = fixtureCsrf,
    cookie = '', location = { origin: 'https://spotmate.online', pathname: '/en1' }, holdDelays = [], cancelPoll = false, clobberedForm = false } = {}) {
    const form = element('form');
    const urlInput = element('input', { id: 'trackUrl', type: 'text', value: 'https://open.spotify.com/playlist/fixture-playlist' });
    urlInput.form = form; form.appendChild(urlInput);
    outsideInputs.forEach((input) => form.appendChild(element('input', { type: 'hidden', ...input })));
    const tracks = element('div', { id: 'tracks' });
    const addInputs = (items) => { tracks.children = []; items.forEach((input) => tracks.appendChild(element('input', { type: 'hidden', ...input }))); };
    addInputs(hiddenInputs);
    const body = element('body');
    const findById = (node, id) => {
        if (node?.id === id) return node;
        for (const child of node?.children || []) { const found = findById(child, id); if (found) return found; }
        return null;
    };
    const observers = [], calls = [], polls = [], downloaded = [], delays = [], logs = [];
    let formSubmitCount = 0, responseIndex = 0, pollCount = 0;
    class NativeForm {}
    NativeForm.prototype.requestSubmit = function () { assert.equal(this, form); formSubmitCount += 1; };
    form.requestSubmit = clobberedForm ? 'masked-submit' : NativeForm.prototype.requestSubmit;
    if (clobberedForm) form.querySelector = 'masked-query';

    const document = {
        cookie, body, createElement: (tag) => {
            const created = element(tag);
            if (created.tagName === 'A') {
                const click = created.click;
                created.click = (event = {}) => {
                    const clickEvent = { isTrusted: true, ...event };
                    if (clickEvent.isTrusted === true) {
                        downloaded.push(created.href);
                    }
                    return click.call(created, clickEvent);
                };
            }
            return created;
        },
        getElementById: (id) => id === 'tracks' ? tracks : findById(body, id),
        querySelector(selector) {
            if (selector === 'form') return form;
            if (selector === '#trackUrl') return urlInput;
            if (selector === '#tracks') return tracks;
            if (selector === 'meta[name="csrf-token"]') return csrf ? { getAttribute: () => csrf, content: csrf } : null;
            if (selector === '#spotmate-voluntary-panel') return body.children.find((child) => child.id === selector.slice(1)) || null;
            if (selector === '#spotmate-download-panel') return body.children.find((child) => child.id === selector.slice(1)) || null;
            return null;
        }
    };
    const publishHiddenInputs = (items) => { addInputs(items); observers.slice().forEach((observer) => observer.callback([])); };
    class ControlledMutationObserver {
        constructor(callback) { this.callback = callback; observers.push(this); }
        observe() {}
        disconnect() { const index = observers.indexOf(this); if (index >= 0) observers.splice(index, 1); }
    }
    const original = Object.fromEntries(['window', 'document', 'fetch', 'MutationObserver', 'setTimeout', 'clearTimeout', 'console', 'HTMLFormElement']
        .map((key) => [key, global[key]]));
    global.window = {
        location,
        document,
        URL,
        AbortController,
        DOMException: global.DOMException || class DOMException extends Error {},
        HTMLFormElement: NativeForm,
        MutationObserver: ControlledMutationObserver,
        setTimeout: (cb, d) => global.setTimeout(cb, d),
        clearTimeout: (t) => global.clearTimeout(t),
        console: global.console
    };
    global.document = document;
    global.HTMLFormElement = NativeForm;
    global.MutationObserver = ControlledMutationObserver;
    global.setTimeout = (callback, delay) => {
        delays.push(delay);
        const timer = { callback, cleared: false };
        if (!holdDelays.includes(delay)) queueMicrotask(() => { if (!timer.cleared) callback(); });
        return timer;
    };
    global.clearTimeout = (timer) => { if (timer) timer.cleared = true; };
    global.console = { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')), warn: () => {} };
    global.fetch = async (url, options = {}) => {
        url = new URL(url, 'https://hostile.invalid/base/').href; const pathname = new URL(url).pathname;
        if (pathname.startsWith('/tasks/')) {
            pollCount += 1; polls.push(url);
            if (cancelPoll) return new Promise((resolve, reject) => options.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true }));
            return (responses.poll?.[pollCount - 1] || responses.poll?.at(-1) || response(200, { data: { result: { url: 'https://example.invalid/task.mp3' } } }));
        }
        calls.push({ url, options });
        return responses.convert?.[responseIndex++] || responses.convert || response(200, { url: 'https://example.invalid/direct.mp3' });
    };
    const restore = () => Object.assign(global, original);
    const panel = () => document.querySelector('#spotmate-voluntary-panel') || document.querySelector('#spotmate-download-panel');
    const button = (label) => {
        const found = body.querySelectorAll('button').find((candidate) => candidate.textContent === label || candidate.getAttribute('data-track-id') === label);
        assert.ok(found, `Button missing: ${label}`); return found;
    };
    return { document, calls, polls, downloaded, delays, logs,
        get formSubmitCount() { return formSubmitCount; }, get observerCount() { return observers.length; }, get pollCount() { return pollCount; },
        publishHiddenInputs, click: (label, event = {}) => button(label).click(event), clickTrack: (id, event = {}) => button('Download ' + id).click(event), clickAll: (event = {}) => button('Download all').click(event), panel,
        downloadPanel: () => document.getElementById('spotmate-download-panel'),
        panelText: () => { const values = []; const visit = (node) => { values.push(node.id || '', node.textContent || '', node.value || ''); (node.children || []).forEach(visit); }; visit(body); return values.join(' '); }, restore
    };
}

async function evaluate() { return eval(`(async () => {\n${source}\n})()`); }
async function withSetup(options, callback) { const env = setup(options); try { await evaluate(); return await callback(env); } finally { env.restore(); } }
function assertNoFixtureSecret(value, label) { assert.equal(JSON.stringify(value).includes(fixtureCsrf), false, `${label} exposes the fixture secret`); }

test('the voluntary flow preserves direct and task conversion without clicking at startup', async () => {
    const env = setup({ hiddenInputs: [], responses: { convert: [response(200, { url: 'https://example.invalid/direct.mp3' }), response(200, { task_id: 'fixture-task' })],
        poll: [response(200, { data: { result: { download_url: 'https://example.invalid/task.mp3' } } })] } });
    try {
        await evaluate(); assert.equal(env.calls.length, 0); assert.equal(env.downloaded.length, 0);
        const loading = env.click('Load Spotify URL'); await Promise.resolve();
        assert.equal(env.formSubmitCount, 1); assert.equal(env.observerCount, 1); assert.equal(env.calls.length, 0);
        env.publishHiddenInputs([{ name: 'one', value: fixtureTrack }, { name: 'two', value: 'https://open.spotify.com/track/fixture-two' }]);
        await loading; await env.click('Start conversions');
        assert.deepEqual(env.calls.map((call) => call.url), ['https://spotmate.online/convert', 'https://spotmate.online/convert']); assert.deepEqual(env.calls.map((call) => JSON.parse(call.options.body).urls), [fixtureTrack, 'https://open.spotify.com/track/fixture-two']);
        assert.deepEqual(Object.keys(JSON.parse(env.calls[0].options.body)), ['urls']); assert.equal(env.calls[0].options.headers['X-CSRF-TOKEN'], fixtureCsrf);
        assert.equal(window.downloadUrls, undefined);
        assert.deepEqual(env.polls, ['https://spotmate.online/tasks/fixture-task']); assert.equal(env.delays.filter((delay) => delay === 4500).length, 1); assert.equal(env.delays.includes(2000), true);
        assert.equal(env.downloaded.length, 0); await env.clickTrack('one');
        assert.deepEqual(window.downloadUrls, ['https://example.invalid/direct.mp3', 'https://example.invalid/task.mp3']);
        await env.clickAll();
        assert.deepEqual(env.downloaded, ['https://example.invalid/direct.mp3', 'https://example.invalid/direct.mp3', 'https://example.invalid/task.mp3']);
        assert.equal(env.delays.includes(1500), true);
    } finally { env.restore(); }
});

test('foreign pages, out-of-scope #tracks, and fallback behavior are rejected', async () => {
    await withSetup({ location: { origin: 'https://evil.invalid', pathname: '/en1' } }, async (env) => assert.equal(env.panel(), null));
    await withSetup({ location: { origin: 'https://spotmate.online', pathname: '/en1/' }, hiddenInputs: [], outsideInputs: [{ name: 'outside', value: fixtureTrack }], responses: { convert: response(200, { url: 'https://example.invalid/nope.mp3' }) } }, async (env) => {
        await env.click('Start conversions'); assert.equal(env.calls.length, 0); assert.deepEqual(window.downloadUrls, undefined); assert.equal(source.includes('https://open.spotify.com/track/'), false);
    });
});

for (const taskField of ['task_id', 'taskId']) {
    test(`${taskField} waits up to 40 polls with a 4500 ms delay before each request`, async () => {
        const pending = Array.from({ length: 39 }, () => response(200, { task_id: 'fixture-task', data: { status: 'processing' } }));
        pending.push(response(200, { data: { result: { download_url: 'https://example.invalid/task.mp3' } } }));
        await withSetup({ responses: { convert: response(200, { [taskField]: 'fixture-task' }), poll: pending } }, async (env) => {
            await env.click('Start conversions'); assert.equal(env.pollCount, 40); assert.equal(env.polls.every((url) => url === 'https://spotmate.online/tasks/fixture-task'), true); assert.equal(env.delays.filter((delay) => delay === 4500).length, 40); assert.equal(window.fetchResults[0].success, true);
        });
    });
}

test('a source.url lure does not override the real task_id', async () => {
    await withSetup({ responses: {
        convert: response(200, { status: 'processing', source: { url: 'https://example.invalid/lure.mp3' }, task_id: 'fixture-task' }),
        poll: [response(200, { result: { downloadUrl: 'https://example.invalid/task.mp3' } })]
    } }, async (env) => {
        await env.click('Start conversions'); assert.equal(env.pollCount, 1);
        assert.equal(window.fetchResults[0].url, 'https://example.invalid/task.mp3');
        assert.equal(window.downloadUrls, undefined);
        await env.clickTrack('track-one');
        assert.deepEqual(window.downloadUrls, ['https://example.invalid/task.mp3']);
    });
});

test('a missing CSRF value stays out of the header and the body contains only urls', async () => {
    await withSetup({ csrf: null, cookie: '', responses: { convert: response(200, { url: 'https://example.invalid/audio.mp3' }) } }, async (env) => {
        await env.click('Start conversions'); const { options } = env.calls[0];
        assert.deepEqual(Object.keys(JSON.parse(options.body)), ['urls']); assert.equal(options.headers['X-CSRF-TOKEN'], undefined);
    });
});

for (const state of ['failed', 'error', 'expired', 'cancelled']) {
    test(`state ${state} is terminal before any URL`, async () => {
        await withSetup({ responses: { convert: response(200, { data: { status: state, message: 'terminal', result: { url: 'https://example.invalid/bad.mp3' } } }) } }, async (env) => {
            await env.click('Start conversions'); assert.equal(window.fetchResults[0].success, false); assert.equal(window.fetchResults[0].url, null); assert.equal(window.downloadUrls, undefined); assert.equal(env.calls.length, 1);
        });
    });
}

for (const [label, terminalState] of [['failed', { status: 'failed' }], ['processing+failed', { status: 'processing', state: 'failed' }]]) for (const sourceName of ['direct', 'polling']) {
    test(`${sourceName}: result ${label} stays terminal before result.url`, async () => {
        const terminal = { result: { ...terminalState, message: 'failed result', url: 'https://example.invalid/bad.mp3' } };
        const responses = sourceName === 'direct'
            ? { convert: response(200, terminal) }
            : { convert: response(200, { task_id: 'fixture-task' }), poll: [response(200, { data: terminal })] };
        await withSetup({ responses }, async (env) => {
            await env.click('Start conversions'); assert.equal(window.fetchResults[0].success, false);
            assert.equal(window.fetchResults[0].url, null); assert.equal(window.fetchResults[0].error, 'failed');
        });
    });
}

test('non-OK, non-JSON, and payload.error responses are terminal without polling or retry', async () => {
    for (const result of [response(503, {}), response(200, { url: 'https://example.invalid/nope.mp3' }, 'text/plain'), response(200, { url: 'https://example.invalid/nope.mp3' }, 'application/jsonanything'), response(200, { error: true, message: 'payload terminal' })]) {
        await withSetup({ responses: { convert: result } }, async (env) => { await env.click('Start conversions'); assert.equal(env.calls.length, 1); assert.equal(env.polls.length, 0); assert.equal(window.fetchResults[0].success, false); });
    }
});

test('a run without a successful result removes the previous panel and handlers', async () => {
    await withSetup({ responses: { convert: [
        response(200, { url: 'https://example.invalid/first.mp3' }),
        response(200, { status: 'failed', message: 'second run terminal' })
    ] } }, async (env) => {
        await env.click('Start conversions'); assert.ok(env.downloadPanel());
        assert.equal(window.downloadUrls, undefined);
        await env.clickTrack('track-one');
        assert.deepEqual(window.downloadUrls, ['https://example.invalid/first.mp3']);
        await env.click('Start conversions'); assert.equal(env.downloadPanel(), null);
        assert.equal(window.downloadUrls, undefined); assert.throws(() => env.clickTrack('track-one'), /Button missing/);
        assert.equal(env.downloaded.length, 1);
    });
});

test('invalid local input removes previous downloads without starting a conversion', async () => {
    await withSetup({ responses: { convert: response(200, { url: 'https://example.invalid/first.mp3' }) } }, async (env) => {
        await env.click('Start conversions'); assert.ok(env.downloadPanel());
        assert.equal(window.downloadUrls, undefined);
        await env.clickTrack('track-one');
        assert.deepEqual(window.downloadUrls, ['https://example.invalid/first.mp3']);
        env.publishHiddenInputs([{ name: 'track-one', value: '' }]);
        await env.click('Start conversions'); assert.equal(env.calls.length, 1);
        assert.equal(window.fetchResults[0].error, 'empty-track-value');
        assert.equal(env.downloadPanel(), null); assert.equal(window.downloadUrls, undefined);
        assert.throws(() => env.clickTrack('track-one'), /Button missing/); assert.equal(env.downloaded.length, 1);
    });
});

test('double Load shares one submit and observer, and Cancel clears the wait', async () => {
    const env = setup({ hiddenInputs: [] });
    try {
        await evaluate(); const first = env.click('Load Spotify URL'); const second = env.click('Load Spotify URL'); await Promise.resolve();
        assert.equal(env.formSubmitCount, 1); assert.equal(env.observerCount, 1); await env.click('Cancel'); await Promise.all([first, second]); assert.equal(env.observerCount, 0); assert.equal(env.calls.length, 0);
    } finally { env.restore(); }
});

test('Load resists form querySelector and requestSubmit clobbering', async () => {
    const env = setup({ hiddenInputs: [], clobberedForm: true });
    try {
        await evaluate(); const loading = env.click('Load Spotify URL'); await Promise.resolve();
        assert.equal(env.formSubmitCount, 1); assert.equal(env.observerCount, 1);
        env.publishHiddenInputs([{ name: 'track-one', value: fixtureTrack }]); await loading;
        assert.equal(env.observerCount, 0); assert.equal(env.calls.length, 0);
    } finally { env.restore(); }
});

test('Cancel during polling or between tracks preserves results and stops the remaining work', async () => {
    const polling = setup({ responses: { convert: response(200, { task_id: 'fixture-task' }) }, cancelPoll: true });
    try { await evaluate(); const run = polling.click('Start conversions'); for (let i = 0; i < 5 && polling.pollCount === 0; i += 1) await Promise.resolve(); await polling.click('Cancel'); await run; assert.equal(polling.calls.length, 1); assert.equal(window.fetchResults.length, 1); assert.equal(window.fetchResults[0].status, 'cancelled'); assert.equal(polling.polls.length, 0); } finally { polling.restore(); }
    const between = setup({ hiddenInputs: [{ name: 'one', value: fixtureTrack }, { name: 'two', value: 'https://open.spotify.com/track/fixture-two' }], holdDelays: [2000] });
    try { await evaluate(); const run = between.click('Start conversions'); for (let i = 0; i < 5 && !between.delays.includes(2000); i += 1) await Promise.resolve(); await between.click('Cancel'); await run; assert.equal(between.calls.length, 1); assert.equal(window.fetchResults.length, 1); assert.equal(window.fetchResults[0].success, true); } finally { between.restore(); }
});

test('more than 100 hidden track fields are rejected without conversion', async () => {
    const inputs = Array.from({ length: 101 }, (_, index) => ({ name: `track-${index}`, value: `https://open.spotify.com/track/${index}` }));
    await withSetup({ hiddenInputs: inputs }, async (env) => { await env.click('Start conversions'); assert.equal(env.calls.length, 0); assert.equal(window.fetchResults[0].error, 'track-limit'); });
});

test('an untrusted click (isTrusted: false) triggers no conversion or download', async () => {
    await withSetup({ responses: { convert: response(200, { url: 'https://example.invalid/audio.mp3' }) } }, async (env) => {
        await env.click('Start conversions', { isTrusted: false });
        assert.equal(env.calls.length, 0);
        assert.equal(window.fetchResults, undefined);

        await env.click('Start conversions', { isTrusted: true });
        assert.equal(env.calls.length, 1);

        await env.clickTrack('track-one', { isTrusted: false });
        assert.equal(env.downloaded.length, 0);
    });
});

test('outputs, panel text, and logs do not expose the CSRF value or an audio URL', async () => {
    await withSetup({ responses: { convert: response(200, { url: 'https://example.invalid/audio.mp3' }) } }, async (env) => {
        await env.click('Start conversions'); assertNoFixtureSecret(window.fetchResults, 'fetchResults'); assertNoFixtureSecret(env.panelText(), 'panel'); assertNoFixtureSecret(env.logs, 'logs');
        assert.equal(env.logs.some((line) => /https?:\/\//.test(line)), false); assert.equal(source.includes('iframe'), false);
    });
});

test('static guards reject opaque secrets, legacy retries, forbidden headers, and Markdown fences', () => {
    assert.equal(source.includes('```'), false); assert.equal(source.includes('retryRemainingTracks'), false); assert.equal(source.includes('retryQueue'), false);
    assert.equal(source.toLowerCase().includes('sec-fetch'), false); assert.equal(source.toLowerCase().includes('sec-ch-ua'), false); assertNoOpaqueLiterals(source, 'console-script.js');
});
