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
 *   status: number|null,
 *   bodyKind: 'json'|'html'|'empty'|'unknown',
 *   errorFlag: boolean|null,
 *   hasDirectUrl: boolean,
 *   hasTaskId: boolean
 * }>} ResponseMetadata
 *
 * @typedef {Readonly<{
 *   terminal: true,
 *   outcome: 'immediate'|'queued'|'failed-closed',
 *   reason: string,
 *   effects: ReadonlyArray<never>
 * }>} DiagnosticVerdict
 *
 * @typedef {Readonly<{
 *   ok: true
 * }>|Readonly<{
 *   ok: false,
 *   reason: 'raw-value-leak'|'ambiguous-dom-observation'
 * }>} ObservationValidation
 */

const DOM_KEYS = Object.freeze([
  'csrfPresent',
  'turnstilePresent',
  'trackRowCount',
  'buttonIdCount',
  'opaqueFieldCount',
  'malformedRowCount',
  'duplicateIdCount',
  'anomalies'
]);

const RESPONSE_KEYS = Object.freeze([
  'status',
  'bodyKind',
  'errorFlag',
  'hasDirectUrl',
  'hasTaskId'
]);

const BODY_KINDS = new Set(['json', 'html', 'empty', 'unknown']);
const DOM_ANOMALIES = new Set([
  'csrf-absent',
  'turnstile-absent',
  'track-row-malformed',
  'duplicate-button-id',
  'button-count-mismatch',
  'opaque-field-count-unexpected'
]);

const verdict = (outcome, reason) => Object.freeze({
  terminal: true,
  outcome,
  reason,
  effects: Object.freeze([])
});

const hasExactKeys = (value, keys) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.keys(value).length === keys.length
  && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
);

const hasRawValueKey = (value, allowedKeys) => (
  value !== null
  && typeof value === 'object'
  && Object.keys(value)
    .filter((key) => !allowedKeys.includes(key))
    .some((key) => /(?:id|token|url|value|content|html)/i.test(key))
);

const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;

/**
 * @param {DomObservation} observation Expurgated DOM observation.
 * @returns {ObservationValidation} Validation result for the exact observation contract.
 */
export function validateExpurgatedObservation(observation) {
  if (!hasExactKeys(observation, DOM_KEYS)) {
    return Object.freeze({
      ok: false,
      reason: hasRawValueKey(observation, DOM_KEYS) ? 'raw-value-leak' : 'ambiguous-dom-observation'
    });
  }

  const booleansAreValid = [observation.csrfPresent, observation.turnstilePresent]
    .every((value) => typeof value === 'boolean');
  const countersAreValid = [
    observation.trackRowCount,
    observation.buttonIdCount,
    observation.opaqueFieldCount,
    observation.malformedRowCount,
    observation.duplicateIdCount
  ].every(isNonNegativeInteger);
  const anomaliesAreValid = Array.isArray(observation.anomalies)
    && observation.anomalies.every((anomaly) => DOM_ANOMALIES.has(anomaly));

  return booleansAreValid && countersAreValid && anomaliesAreValid
    ? Object.freeze({ ok: true })
    : Object.freeze({ ok: false, reason: 'ambiguous-dom-observation' });
}

const isExactResponseMetadata = (metadata) => (
  hasExactKeys(metadata, RESPONSE_KEYS)
  && (metadata.status === null || (Number.isInteger(metadata.status) && metadata.status >= 100 && metadata.status <= 599))
  && BODY_KINDS.has(metadata.bodyKind)
  && (metadata.errorFlag === null || typeof metadata.errorFlag === 'boolean')
  && typeof metadata.hasDirectUrl === 'boolean'
  && typeof metadata.hasTaskId === 'boolean'
);

/**
 * @param {ResponseMetadata} metadata Expurgated response metadata.
 * @returns {DiagnosticVerdict} Terminal verdict for the response metadata.
 */
export function evaluateResponseMetadata(metadata) {
  if (!isExactResponseMetadata(metadata)) return verdict('failed-closed', 'ambiguous-metadata');
  if (!Number.isInteger(metadata.status)) return verdict('failed-closed', 'unknown-status');
  if (metadata.status === 403) return verdict('failed-closed', 'http-403');
  if (metadata.status === 422) return verdict('failed-closed', 'http-422');
  if (metadata.status === 429) return verdict('failed-closed', 'http-429');
  if (metadata.status === 500) return verdict('failed-closed', 'http-500');
  if (metadata.status < 200 || metadata.status > 299) return verdict('failed-closed', 'other-non-2xx');
  if (metadata.bodyKind === 'html') return verdict('failed-closed', 'html-body');
  if (metadata.bodyKind === 'empty') return verdict('failed-closed', 'empty-body');
  if (metadata.bodyKind === 'unknown') return verdict('failed-closed', 'unknown-body');
  if (metadata.errorFlag === null) return verdict('failed-closed', 'ambiguous-metadata');
  if (metadata.errorFlag === true) return verdict('failed-closed', 'error-flag');
  if (metadata.hasDirectUrl && metadata.hasTaskId) return verdict('failed-closed', 'ambiguous-direct-and-task');
  if (metadata.hasDirectUrl) return verdict('immediate', 'immediate-direct-url');
  if (metadata.hasTaskId) return verdict('queued', 'queued-task-id');
  return verdict('failed-closed', 'missing-result-shape');
}

/**
 * @param {Readonly<{observation: DomObservation, response: ResponseMetadata}>} input Expurgated diagnostic snapshot.
 * @returns {DiagnosticVerdict} Terminal verdict for the complete snapshot.
 */
export function evaluateDiagnosticSnapshot(input) {
  if (!hasExactKeys(input, ['observation', 'response'])) {
    return verdict('failed-closed', 'ambiguous-dom-observation');
  }
  const observationValidation = validateExpurgatedObservation(input.observation);
  if (!observationValidation.ok) return verdict('failed-closed', observationValidation.reason);
  return evaluateResponseMetadata(input.response);
}
