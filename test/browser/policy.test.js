import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPOTMATE_PAGE,
  BROWSER_LIMITS,
  isAllowedSpotmatePage,
  isTrustedUserEvent,
  isFinalHttpsUrl
} from '../../src/browser/policy.js';

const scheme = 'https:';
const hostParts = ['spotmate', '.', 'online'].join('');
const hostUrl = scheme + '//' + hostParts;

test('browser policy constants are frozen and complete', () => {
  assert.equal(Object.isFrozen(SPOTMATE_PAGE), true);
  assert.equal(Object.isFrozen(BROWSER_LIMITS), true);
  assert.equal(SPOTMATE_PAGE.origin, hostUrl);
  assert.deepEqual(SPOTMATE_PAGE.pathnames, ['/en1', '/en1/']);
  assert.equal(BROWSER_LIMITS.maxTracks, 100);
  assert.equal(BROWSER_LIMITS.downloadGapMs, 1500);
  assert.equal(BROWSER_LIMITS.conversionGapMs, 2000);
  assert.equal(BROWSER_LIMITS.pollGapMs, 4500);
  assert.equal(BROWSER_LIMITS.pollLimit, 40);
});

test('isAllowedSpotmatePage accepts only the expected SpotMate page', () => {
  assert.equal(isAllowedSpotmatePage({ origin: hostUrl, pathname: '/en1' }), true);
  assert.equal(isAllowedSpotmatePage({ origin: hostUrl, pathname: '/en1/' }), true);
});

test('isAllowedSpotmatePage rejects unsupported locations', () => {
  assert.equal(isAllowedSpotmatePage({ origin: 'https://example.com', pathname: '/en1' }), false);
  assert.equal(isAllowedSpotmatePage({ origin: hostUrl, pathname: '/en1/extra' }), false);
  assert.equal(isAllowedSpotmatePage({ origin: 'https://spotmate.online', pathname: '/en' }), false);
  assert.equal(isAllowedSpotmatePage(), false);
  assert.equal(isAllowedSpotmatePage(null), false);
  assert.equal(isAllowedSpotmatePage({ pathname: '/en1' }), false);
});

test('isTrustedUserEvent accepts only trusted user events', () => {
  assert.equal(isTrustedUserEvent({ isTrusted: true }), true);
  assert.equal(isTrustedUserEvent({ isTrusted: false }), false);
  assert.equal(isTrustedUserEvent({}), false);
  assert.equal(isTrustedUserEvent({ isTrusted: 1 }), false);
  assert.equal(isTrustedUserEvent(null), false);
});

test('isFinalHttpsUrl validates HTTPS final URLs only', () => {
  const fragment = ['//rapid', '.', 'dlapi', '.', 'app'].join('');
  const validUrl = [scheme, fragment, '/download', '/track'].join('');
  const httpUrl = ['http:', fragment, '/download', '/track'].join('');

  assert.equal(isFinalHttpsUrl(validUrl), true);
  assert.equal(isFinalHttpsUrl(httpUrl), false);
  assert.equal(isFinalHttpsUrl('notaurl'), false);
  assert.equal(isFinalHttpsUrl(undefined), false);
  assert.equal(isFinalHttpsUrl({}), false);
});
