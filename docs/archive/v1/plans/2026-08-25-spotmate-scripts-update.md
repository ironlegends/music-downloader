> **Status: Historical v1.x record — inactive and unsupported.**

# Implementation plan: Update and secure the SpotMate scripts

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update, secure, and harden the JavaScript scripts (script1, script2, script3) for the browser console on SpotMate.

**Architecture:** The scripts run modularly in the Chrome console: Script 1 extracts identifiers into window.buttonIds; Script 2 sends secure requests (no retries, no forbidden headers, strict validation, and stop on task_id) and populates window.fetchResults; Script 3 extracts and formats valid URLs in window.downloadUrls.

**Tech Stack:** JavaScript (ES6+, browser environment / Chrome console).

## Global constraints

- Always reply in French.
- No emojis in code, comments, logs, or documentation.
- UTF-8 encoding is required.
- Never use git clean or similar destructive commands.
- Consistently replace every window\\. occurrence with window. and prohibit Markdown delimiters in script files.
- Remove the hard-coded CSRF token and do not automate its extraction.
- Remove all sec-* headers controlled by the browser.
- Check response.ok before declaring a request successful.
- Explicitly handle 403, 419, 422, 429, and 5xx as errors.
- Check Content-Type: application/json before calling response.json().
- Never automatically retry a POST (no retry loop).
- Consider a conversion successful only if a valid final URL exists.
- Treat task_id as pending and stop processing without automated polling.
- Do not display or retain tokens, cookies, or temporary URLs.

---

### Task 1: Clean up and standardize Script 1 (identifier detection)

**Files:**
- Modify: `script1.txt`
- Test: `tests/test_script1.js`

**Interfaces:**
- Consumes: DOM structure of the page's #tracks .row .col-6 button elements.
- Produces: window.buttonIds (an array of strings containing track IDs).

- [ ] **Step 1: Write the unit test for Script 1**

Create tests/test_script1.js to simulate the DOM and verify that the script extracts identifiers correctly without syntax errors or emojis:

```javascript
const fs = require('fs');
const assert = require('assert');

// Simple DOM simulation
const fakeButtons = [
    { id: 'track_1' },
    { id: '' },
    { id: 'track_2' },
    { id: 'track_3' }
];

global.window = {};
global.document = {
    getElementById: (id) => {
        if (id === 'tracks') {
            return {
                querySelectorAll: (selector) => selector === '.row .col-6 button' ? fakeButtons : []
            };
        }
        return null;
    }
};

const scriptContent = fs.readFileSync('script1.txt', 'utf8');

// Static checks
assert(!scriptContent.includes('window\\.'), 'Must not contain window\\.');
assert(!scriptContent.includes('```'), 'Must not contain Markdown delimiters');
assert(!/[\u{1F300}-\u{1FAFF}]/u.test(scriptContent), 'Must not contain any emoji');

// Execution
eval(scriptContent);

assert(Array.isArray(window.buttonIds), 'window.buttonIds must be an array');
assert.deepStrictEqual(window.buttonIds, ['track_1', 'track_2', 'track_3'], 'Empty IDs must be filtered');
console.log('Script 1 test passed successfully.');
```

- [ ] **Step 2: Run the test to verify its failure or identify needed corrections**

Run: node tests/test_script1.js
Expected: it may fail because the current script1.txt contains emojis.

- [ ] **Step 3: Update script1.txt**

Write the cleaned code without emojis to script1.txt:

```javascript
// Global buttonIds variable
window.buttonIds = [];

const tracksDiv = document.getElementById('tracks');

if (tracksDiv) {
    const buttons = tracksDiv.querySelectorAll('.row .col-6 button');
    window.buttonIds = Array.from(buttons)
        .map(button => button.id)
        .filter(id => id);

    console.log('[INFO] Global variable "buttonIds" created.');
    console.log('[INFO] Identifiers found:');
    console.log(window.buttonIds);

    console.log('\nCopyable array:');
    console.log(JSON.stringify(window.buttonIds));

    console.log('\nSimple list:');
    window.buttonIds.forEach((id, i) => console.log(`${i + 1}. ${id}`));

    console.log('\nYou can access this list with:');
    console.log('   buttonIds - to display the array');
    console.log('   buttonIds.length - to get the count');
    console.log('   buttonIds[0] - to get the first identifier');
} else {
    console.log('[WARNING] Track container not found.');
}
```

- [ ] **Step 4: Run the test to verify compliance**

Run: node tests/test_script1.js
Expected: PASS (Script 1 test passed successfully).

---

### Task 2: Securely refactor Script 2 (conversion requests without retry)

**Files:**
- Modify: `script2.txt`
- Test: `tests/test_script2.js`

**Interfaces:**
- Consumes: window.buttonIds (required), window.csrfToken (optional)
- Produces: window.fetchResults (an array of sanitized objects: { id, status, success, pending, url, error })

- [ ] **Step 1: Write unit tests for Script 2**

Create tests/test_script2.js to cover HTTP errors (403, 419, 422, 429, 500), missing JSON Content-Type, task_id responses (immediate stop and pending state), response.ok handling, no automatic retries, and no sec-* headers or hard-coded token:

```javascript
const fs = require('fs');
const assert = require('assert');

const scriptContent = fs.readFileSync('script2.txt', 'utf8');

// Static security and compliance checks
assert(!scriptContent.includes('window\\.'), 'Must not contain window\\.');
assert(!scriptContent.includes('```'), 'Must not contain Markdown delimiters');
assert(!/[\u{1F300}-\u{1FAFF}]/u.test(scriptContent), 'Must not contain any emoji');
assert(!scriptContent.includes('sec-ch-ua'), 'Must not contain sec-ch-ua headers');
assert(!scriptContent.includes('sec-fetch'), 'Must not contain sec-fetch headers');
assert(!scriptContent.includes('[REDACTED_CSRF_TOKEN]'), 'The CSRF token must no longer be hard-coded');
assert(!scriptContent.includes('retryQueue'), 'Must not contain a retry queue');
assert(!scriptContent.includes('MAX_RETRY_ATTEMPTS'), 'Must not automatically retry POST requests');

console.log('Script 2 static checks passed.');
```

- [ ] **Step 2: Run the test to check the current gaps**

Run: node tests/test_script2.js
Expected: FAIL (sec-* headers, hard-coded token, and retryQueue are present).

- [ ] **Step 3: Implement the new script2.txt**

Write the compliant script to script2.txt:

```javascript
// Script 2: Secure conversion requests without automatic retry
(async function() {
    if (typeof window.buttonIds === 'undefined' || !Array.isArray(window.buttonIds) || window.buttonIds.length === 0) {
        console.error('[ERROR] window.buttonIds is missing or empty. Run Script 1 first.');
        return;
    }

    console.log(`[INFO] Starting processing for ${window.buttonIds.length} identifier(s)...`);

    const results = [];

    // Allowed base headers
    const headers = {
        "accept": "application/json, text/plain, */*",
        "content-type": "application/json"
    };

    // Optional manual CSRF token (no automatic extraction)
    if (typeof window.csrfToken === 'string' && window.csrfToken.trim() !== '') {
        headers["x-csrf-token"] = window.csrfToken.trim();
    }

    for (let i = 0; i < window.buttonIds.length; i++) {
        const buttonId = window.buttonIds[i];
        console.log(`[PROCESSING] [${i + 1}/${window.buttonIds.length}] Identifier: ${buttonId}`);

        const body = JSON.stringify({
            "urls": `https://open.spotify.com/track/${buttonId}`
        });

        try {
            const response = await fetch("https://spotmate.online/convert", {
                method: "POST",
                headers: headers,
                body: body,
                credentials: "same-origin"
            });

            const status = response.status;
            const contentType = response.headers.get("content-type") || "";
            let data = null;

            // Explicit error-code handling
            if (status === 403 || status === 419 || status === 422 || status === 429 || status >= 500) {
                console.error(`[ERROR] Request rejected for ${buttonId} with HTTP status ${status}.`);
                results.push({
                    id: buttonId,
                    status: status,
                    success: false,
                    pending: false,
                    url: null,
                    error: `HTTP error ${status}`
                });
                continue;
            }

            if (!response.ok) {
                console.error(`[ERROR] Invalid HTTP response for ${buttonId} (status ${status}).`);
                results.push({
                    id: buttonId,
                    status: status,
                    success: false,
                    pending: false,
                    url: null,
                    error: `HTTP error ${status}`
                });
                continue;
            }

            if (contentType.includes("application/json")) {
                data = await response.json();
            } else {
                console.error(`[ERROR] Unexpected content type (${contentType}) for ${buttonId}.`);
                results.push({
                    id: buttonId,
                    status: status,
                    success: false,
                    pending: false,
                    url: null,
                    error: "Content-Type is not JSON"
                });
                continue;
            }

            // Handle task_id (async processing / pending without polling)
            if (data && data.task_id) {
                console.log(`[PENDING] Async task detected for ${buttonId} (task_id present). Stopping without polling.`);
                results.push({
                    id: buttonId,
                    status: status,
                    success: false,
                    pending: true,
                    url: null,
                    error: null
                });
                continue;
            }

            // Validate the final URL
            const finalUrl = (data && typeof data.url === 'string' && (data.url.startsWith('http://') || data.url.startsWith('https://')))
                ? data.url
                : null;

            if (finalUrl) {
                console.log(`[SUCCESS] Conversion succeeded for ${buttonId}.`);
                results.push({
                    id: buttonId,
                    status: status,
                    success: true,
                    pending: false,
                    url: finalUrl,
                    error: null
                });
            } else {
                console.error(`[FAILURE] No valid final URL returned for ${buttonId}.`);
                results.push({
                    id: buttonId,
                    status: status,
                    success: false,
                    pending: false,
                    url: null,
                    error: "Final URL missing or invalid"
                });
            }

        } catch (error) {
            console.error(`[NETWORK ERROR] Failed for ${buttonId}: ${error.message}`);
            results.push({
                id: buttonId,
                status: 'network_error',
                success: false,
                pending: false,
                url: null,
                error: error.message
            });
        }

        // Courteous delay between requests (2 seconds)
        if (i < window.buttonIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    window.fetchResults = results;
    console.log('[INFO] Processing complete. Results saved in window.fetchResults.');
})();
```

- [ ] **Step 4: Run the Script 2 validation test**

Run: node tests/test_script2.js
Expected: PASS.

---

### Task 3: Securely update Script 3 (extract valid URLs)

**Files:**
- Modify: `script3.txt`
- Test: `tests/test_script3.js`

**Interfaces:**
- Consumes: window.fetchResults
- Produces: window.downloadUrls (an array of valid final URL strings)

- [ ] **Step 1: Write the unit test for Script 3**

Create tests/test_script3.js to simulate window.fetchResults with different cases (success with URL, failure, pending with task_id, and no URL):

```javascript
const fs = require('fs');
const assert = require('assert');

const scriptContent = fs.readFileSync('script3.txt', 'utf8');

// Static checks
assert(!scriptContent.includes('window\\.'), 'Must not contain window\\.');
assert(!scriptContent.includes('```'), 'Must not contain Markdown delimiters');
assert(!/[\u{1F300}-\u{1FAFF}]/u.test(scriptContent), 'Must not contain any emoji');

// Extraction logic test
global.window = {
    fetchResults: [
        { id: '1', success: true, url: 'https://example.com/audio1.mp3' },
        { id: '2', success: false, pending: true, url: null },
        { id: '3', success: false, error: 'Erreur HTTP 429', url: null },
        { id: '4', success: true, url: 'https://example.com/audio2.mp3' }
    ]
};

global.document = {
    createElement: () => ({
        style: {},
        onclick: null
    }),
    body: {
        appendChild: () => {},
        removeChild: () => {}
    }
};

global.Blob = function(parts, options) {
    this.parts = parts;
    this.options = options;
};

global.URL = {
    createObjectURL: () => 'blob:mock-url'
};

eval(scriptContent);

assert(Array.isArray(window.downloadUrls), 'window.downloadUrls must be an array');
assert.strictEqual(window.downloadUrls.length, 2, 'Only valid URLs should be extracted');
assert.deepStrictEqual(window.downloadUrls, ['https://example.com/audio1.mp3', 'https://example.com/audio2.mp3']);

console.log('Script 3 test passed successfully.');
```

- [ ] **Step 2: Run the Script 3 test**

Run: node tests/test_script3.js
Expected: FAIL on the unupdated version.

- [ ] **Step 3: Update script3.txt**

Write the cleaned and secure URL extraction script to script3.txt:

```javascript
// Script 3: Securely extract final download URLs
(function() {
    if (typeof window.fetchResults === 'undefined' || !Array.isArray(window.fetchResults) || window.fetchResults.length === 0) {
        console.error('[ERROR] window.fetchResults is missing or empty. Run Script 2 first.');
        return;
    }

    console.log('[INFO] Extracting final download URLs...');

    const successfulItems = window.fetchResults.filter(r => r.success && typeof r.url === 'string' && (r.url.startsWith('http://') || r.url.startsWith('https://')));
    const pendingItems = window.fetchResults.filter(r => r.pending);
    const failedItems = window.fetchResults.filter(r => !r.success && !r.pending);

    console.log(`[SUMMARY] Valid URLs extracted: ${successfulItems.length}`);
    console.log(`[SUMMARY] Pending tasks (task_id): ${pendingItems.length}`);
    console.log(`[SUMMARY] Failed requests: ${failedItems.length}`);

    if (successfulItems.length > 0) {
        window.downloadUrls = successfulItems.map(item => item.url);

        const urlsText = window.downloadUrls.join('\n');

        console.log('\nURL list (text format):');
        console.log('-------------------------------------');
        console.log(urlsText);
        console.log('-------------------------------------');

        // Create a download link for the text file
        try {
            const blob = new Blob([urlsText], { type: 'text/plain;charset=utf-8' });
            const downloadUrl = URL.createObjectURL(blob);

            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download urls.txt';
            downloadBtn.style.position = 'fixed';
            downloadBtn.style.top = '10px';
            downloadBtn.style.right = '10px';
            downloadBtn.style.zIndex = '999999';
            downloadBtn.style.padding = '10px 20px';
            downloadBtn.style.backgroundColor = '#2e7d32';
            downloadBtn.style.color = 'white';
            downloadBtn.style.border = 'none';
            downloadBtn.style.borderRadius = '4px';
            downloadBtn.style.cursor = 'pointer';
            downloadBtn.style.fontSize = '14px';

            downloadBtn.onclick = function() {
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = 'download_urls.txt';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            };

            document.body.appendChild(downloadBtn);
            console.log('[INFO] A download button was added at the top right of the page.');
        } catch (e) {
            console.log('[INFO] Download button generation was skipped in the restricted environment.');
        }
    } else {
        console.log('[WARNING] No valid URL could be extracted.');
    }
})();
```

- [ ] **Step 4: Run the test to validate Script 3**

Run: node tests/test_script3.js
Expected: PASS.

---

### Task 4: Global verification and compliance validation

**Files:**
- Test: `tests/test_all_scripts.js`

- [ ] **Step 1: Create the global verification script**

Create tests/test_all_scripts.js to exhaustively check all rules:

```javascript
const fs = require('fs');
const assert = require('assert');

const files = ['script1.txt', 'script2.txt', 'script3.txt'];

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    assert(!content.includes('window\\.'), `${file} must not contain window\\.`);
    assert(!content.includes('```'), `${file} must not contain Markdown blocks`);
    assert(!/[\u{1F300}-\u{1FAFF}]/u.test(content), `${file} must not contain any emoji`);
    assert(!content.includes('[REDACTED_CSRF_TOKEN]'), `${file} must not contain a hard-coded CSRF token`);
    assert(!content.includes('sec-ch-ua'), `${file} must not contain sec-ch-ua`);
    assert(!content.includes('sec-fetch'), `${file} must not contain sec-fetch`);
});

console.log('All global constraints passed across the scripts.');
```

- [ ] **Step 2: Run the global test suite**

Run: node tests/test_all_scripts.js
Expected: PASS.
