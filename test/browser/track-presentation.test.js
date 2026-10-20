import test from 'node:test';
import assert from 'node:assert/strict';
import { readTrackPresentation } from '../../src/browser/track-presentation.js';

const ROW_SELECTOR = 'li, article, [data-track-id], .track, .card';

function makeNode({ attributes = {}, textContent = '', hiddenInputs = [], images = [], descendants = {}, row = null } = {}) {
  return {
    attributes,
    textContent,
    hiddenInputs,
    images,
    descendants,
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    closest(selector) {
      assert.equal(selector, ROW_SELECTOR);
      return this.row;
    },
    querySelectorAll(selector) {
      if (selector === 'input[type="hidden"]') return this.hiddenInputs;
      if (selector === 'img') return this.images;
      return [];
    },
    querySelector(selector) {
      return this.descendants[selector] ?? null;
    },
    row
  };
}

test('reads explicit input metadata without interpreting its conversion value', () => {
  const input = makeNode({
    attributes: {
      'data-title': 'Input title',
      'data-track-title': 'Secondary title',
      'data-artist': 'Input artist'
    },
    textContent: 'https://open.spotify.com/track/id?title=must-not-be-used'
  });

  assert.deepEqual(readTrackPresentation(input, 2, URL), {
    title: 'Input title',
    artist: 'Input artist',
    artworkUrl: ''
  });
});

test('uses metadata and an existing image from the nearest row with one hidden track input', () => {
  const input = makeNode({});
  const image = makeNode({ attributes: { src: 'https://i.scdn.co/image/0123456789abcdef0123456789ABCDEF' } });
  const row = makeNode({
    attributes: {
      'data-track-title': 'Row title',
      'data-artist': 'Row artist'
    },
    hiddenInputs: [input],
    images: [image]
  });
  input.row = row;

  assert.deepEqual(readTrackPresentation(input, 1, URL), {
    title: 'Row title',
    artist: 'Row artist',
    artworkUrl: 'https://i.scdn.co/image/0123456789abcdef0123456789ABCDEF'
  });
});

test('ignores metadata and artwork from a row containing multiple hidden track inputs', () => {
  const input = makeNode({});
  const otherInput = makeNode({});
  const row = makeNode({
    attributes: { 'data-title': 'Ambiguous row title', 'data-artist': 'Wrong artist' },
    hiddenInputs: [input, otherInput],
    images: [makeNode({ attributes: { src: 'https://i.scdn.co/image/0123456789abcdef0123456789abcdef' } })]
  });
  input.row = row;

  assert.deepEqual(readTrackPresentation(input, 7, URL), {
    title: 'Track 7',
    artist: '',
    artworkUrl: ''
  });
});

test('rejects artwork URLs outside the exact Spotify CDN image form', () => {
  const invalidUrls = [
    'http://i.scdn.co/image/0123456789abcdef',
    'https://evil.example/image/0123456789abcdef',
    'https://user@i.scdn.co/image/0123456789abcdef',
    'https://i.scdn.co:443/image/0123456789abcdef',
    'https://i.scdn.co/image/0123456789abcdef?x=1',
    'https://i.scdn.co/image/0123456789abcdef#fragment',
    'https://i.scdn.co/image/not-hex',
    'data:image/png;base64,AAAA',
    'blob:https://i.scdn.co/image/0123456789abcdef'
  ];

  for (const src of invalidUrls) {
    const input = makeNode({});
    const row = makeNode({
      hiddenInputs: [input],
      images: [makeNode({ attributes: { src } })]
    });
    input.row = row;
    assert.equal(readTrackPresentation(input, 1, URL).artworkUrl, '', src);
  }
});

test('bounds metadata and strips control characters', () => {
  const input = makeNode({
    attributes: {
      'data-title': `A\u0000${'T'.repeat(170)}`,
      'data-artist': `B\u001f${'R'.repeat(130)}`
    }
  });

  const result = readTrackPresentation(input, 1, URL);
  assert.equal(result.title.length, 160);
  assert.equal(result.artist.length, 120);
  assert.equal(result.title, `A${'T'.repeat(159)}`);
  assert.equal(result.artist, `B${'R'.repeat(119)}`);
  assert.doesNotMatch(result.title + result.artist, /[\u0000-\u001f\u007f-\u009f]/);
});

test('falls back cleanly when Node fakes lack closest and getAttribute', () => {
  const input = {
    value: 'Title - Artist https://open.spotify.com/track/id'
  };

  assert.deepEqual(readTrackPresentation(input, 4, URL), {
    title: 'Track 4',
    artist: '',
    artworkUrl: ''
  });
});
