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

export { readTrackPresentation };
