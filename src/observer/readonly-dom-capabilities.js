/**
 * @typedef {Readonly<{
 *   csrf: string,
 *   turnstile: string,
 *   trackRows: string,
 *   buttons: string,
 *   opaqueFields: string,
 *   expectedTrackCellCount: number
 * }>} DomSelectors
 *
 * @typedef {Readonly<{
 *   querySelector: (selector: string) => object|null,
 *   querySelectorAll: (selector: string) => ArrayLike<Readonly<{getAttribute: (name: string) => unknown, children: Readonly<{length: number}>}>>
 * }>} ReadonlyDomRoot
 *
 * @typedef {Readonly<{
 *   csrfPresent: () => boolean,
 *   turnstilePresent: () => boolean,
 *   trackRowCount: () => number,
 *   buttonIdCount: () => number,
 *   opaqueFieldCount: () => number,
 *   malformedRowCount: () => number,
 *   duplicateIdCount: () => number
 * }>} ReadonlyDomCapabilities
 */

const countNodesWithId = (root, selector) => {
  const nodes = root.querySelectorAll(selector);
  let count = 0;
  for (let index = 0; index < nodes.length; index += 1) {
    if (nodes[index].getAttribute('id') !== null) count += 1;
  }
  return count;
};

const countDuplicateIds = (root, selector) => {
  const nodes = root.querySelectorAll(selector);
  const seen = new Set();
  const duplicates = new Set();
  for (let index = 0; index < nodes.length; index += 1) {
    const id = nodes[index].getAttribute('id');
    if (id === null) continue;
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return duplicates.size;
};

const countMalformedRows = (root, selector, expectedCellCount) => {
  const rows = root.querySelectorAll(selector);
  let count = 0;
  for (let index = 0; index < rows.length; index += 1) {
    if (rows[index].children.length !== expectedCellCount) count += 1;
  }
  return count;
};

/**
 * @param {ReadonlyDomRoot} root Read-only DOM root.
 * @param {DomSelectors} selectors Structural selectors without concrete IDs.
 * @returns {ReadonlyDomCapabilities} Synchronous aggregate capability readers.
 */
export function createReadonlyDomCapabilities(root, selectors) {
  return Object.freeze({
    csrfPresent: () => root.querySelector(selectors.csrf) !== null,
    turnstilePresent: () => root.querySelector(selectors.turnstile) !== null,
    trackRowCount: () => root.querySelectorAll(selectors.trackRows).length,
    buttonIdCount: () => countNodesWithId(root, selectors.buttons),
    opaqueFieldCount: () => root.querySelectorAll(selectors.opaqueFields).length,
    malformedRowCount: () => countMalformedRows(
      root,
      selectors.trackRows,
      selectors.expectedTrackCellCount
    ),
    duplicateIdCount: () => countDuplicateIds(root, selectors.buttons)
  });
}
