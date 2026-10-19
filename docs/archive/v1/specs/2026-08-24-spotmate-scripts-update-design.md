> **Status: Historical v1.x record — inactive and unsupported.**

# Design: Update and secure the SpotMate scripts

## 1. Context and objectives

JavaScript scripts run in the browser's developer console on https://spotmate.online/en1 to manipulate tracks from a playlist. Earlier versions of scripts 2 and 3 are obsolete and require strict alignment with security rules, browser HTTP standards, and constraints of the target service.

### Main objectives

- Ensure syntactic cleanliness (remove window\\. escapes and Markdown delimiters).
- Remove any hard-coded CSRF token without attempting to automate its extraction.
- Clean up HTTP headers by removing browser-controlled forbidden headers (sec-*).
- Strictly validate HTTP status (response.ok and specific 403, 419, 422, 429, and 5xx errors) and MIME content type (Content-Type: application/json).
- Remove all automatic retry mechanisms for POST requests.
- Handle asynchronous responses: if a task_id is returned, mark the operation as pending and stop processing without automated polling.
- Treat a conversion as successful only when a valid final URL is returned.
- Preserve privacy by neither logging nor retaining tokens, cookies, or temporary URLs.

---

## 2. Detailed script specifications

### 2.1 Script 1: Detect button identifiers (script1.txt)

- **Role:** Traverse the DOM to collect unique identifiers for buttons associated with tracks in the #tracks container.
- **Behavior:**
  - Search for button elements under #tracks .row .col-6.
  - Store non-empty IDs in the window.buttonIds global variable.
  - Print the number of IDs found and the structured list to the console.
  - Remove all extra syntax or symbols.

### 2.2 Script 2: Secure conversion requests (script2.txt)

- **Role:** Process each ID in window.buttonIds with one conversion request per ID and no retry loop.
- **Request headers:**
  - Keep only the authorized standard headers: accept: "application/json, text/plain, */*" and content-type: "application/json".
  - Strictly exclude all sec-ch-ua* and sec-fetch-* headers (the browser manages them natively).
  - CSRF token handling: no default or hard-coded value. If the user has set window.csrfToken, include it in x-csrf-token; otherwise omit the header (do not scrape it automatically).
- **Request execution:**
  - Process IDs sequentially in a single pass; never automatically retry POST.
  - Validate the response:
    - Check response.ok.
    - Explicitly handle error codes: 403 (access denied), 419 (session / CSRF expired), 422 (unprocessable entity), 429 (rate limit reached), and 500-599 (server errors).
    - Check that Content-Type contains application/json before calling response.json(). If the content type is not JSON, read response.text() and mark it as an error.
  - Parse the body:
    - If the response contains task_id, mark the state pending and stop immediately for that task without automated polling.
    - If the response contains a valid direct download URL, mark the state success.
    - In all other cases, mark the state failure.
- **Data handling and privacy:**
  - Retain in results (window.fetchResults) only the necessary fields (id, status, success, pending, url if final and valid, error).
  - Do not log or store tokens, cookies, temporary URLs, or sensitive headers.
- **Known technical limitation:**
  - SpotMate's current contract has changed, so full automation may require manual intervention or asynchronous processing that is not specified here.

### 2.3 Script 3: Extract final download URLs (script3.txt)

- **Role:** Filter and export only valid final URLs from Script 2 results.
- **Behavior:**
  - Check that window.fetchResults exists and is valid.
  - Keep results where result.success === true and a valid final URL is present (for example, one beginning with http:// or https://).
  - Store the URLs in window.downloadUrls and offer to download a text file urls.txt (using Blob/link) or copy them to the clipboard.
  - Do not display or retain authentication tokens, session identifiers, or insecure temporary URLs.

---

## 3. Verification and validation plan

- Syntax check: no window\\. escapes or Markdown tags remain in the final files.
- Script 2 compliance check: no forbidden headers, no hard-coded token, no automatic retry, strict HTTP status checks, and stop on task_id.
- Script 3 compliance check: strict filtering of valid URLs and sensitive data.
