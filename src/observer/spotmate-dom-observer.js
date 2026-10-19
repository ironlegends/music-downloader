/**
 * @typedef {Readonly<{
 *   csrfPresent: boolean,
 *   turnstilePresent: boolean,
 *   trackRowCount: number,
 *   buttonIdCount: number,
 *   opaqueFieldCount: number,
 *   malformedRowCount: number,
 *   duplicateIdCount: number,
 *   anomalies: ReadonlyArray<'csrf-absent'|'turnstile-absent'|'track-row-malformed'|'duplicate-button-id'|'button-count-mismatch'|'opaque-field-count-unexpected'>
 * }>} DomObservation
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

const BOOLEAN_CAPABILITIES = Object.freeze(['csrfPresent', 'turnstilePresent']);
const COUNT_CAPABILITIES = Object.freeze([
  'trackRowCount',
  'buttonIdCount',
  'opaqueFieldCount',
  'malformedRowCount',
  'duplicateIdCount'
]);

const readCapability = (capabilities, name) => {
  const read = capabilities?.[name];
  if (typeof read !== 'function') {
    throw new TypeError(`missing capability: ${name}`);
  }
  const value = read();
  if (BOOLEAN_CAPABILITIES.includes(name) && typeof value !== 'boolean') {
    throw new TypeError(`invalid boolean capability: ${name}`);
  }
  if (
    COUNT_CAPABILITIES.includes(name)
    && (!Number.isInteger(value) || value < 0)
  ) {
    throw new TypeError(`invalid count capability: ${name}`);
  }
  return value;
};

const buildAnomalies = (observation) => {
  const anomalies = [];
  if (!observation.csrfPresent) anomalies.push('csrf-absent');
  if (!observation.turnstilePresent) anomalies.push('turnstile-absent');
  if (observation.malformedRowCount > 0) anomalies.push('track-row-malformed');
  if (observation.duplicateIdCount > 0) anomalies.push('duplicate-button-id');
  if (observation.trackRowCount !== observation.buttonIdCount) {
    anomalies.push('button-count-mismatch');
  }
  if (observation.opaqueFieldCount !== observation.trackRowCount) {
    anomalies.push('opaque-field-count-unexpected');
  }
  return Object.freeze(anomalies);
};

/**
 * @param {ReadonlyDomCapabilities} capabilities Aggregate read-only DOM capabilities.
 * @returns {DomObservation} Frozen observation containing only booleans, counts and allowlisted anomalies.
 */
export function observeSpotMateDom(capabilities) {
  const observation = {
    csrfPresent: readCapability(capabilities, 'csrfPresent'),
    turnstilePresent: readCapability(capabilities, 'turnstilePresent'),
    trackRowCount: readCapability(capabilities, 'trackRowCount'),
    buttonIdCount: readCapability(capabilities, 'buttonIdCount'),
    opaqueFieldCount: readCapability(capabilities, 'opaqueFieldCount'),
    malformedRowCount: readCapability(capabilities, 'malformedRowCount'),
    duplicateIdCount: readCapability(capabilities, 'duplicateIdCount')
  };
  observation.anomalies = buildAnomalies(observation);
  return Object.freeze(observation);
}
