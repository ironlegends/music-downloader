/**
 * @typedef {Readonly<{
 *   potentiallyRetryable: boolean,
 *   autoRetryAllowed: false,
 *   reason: 'rate-limited'|'server-error'|'forbidden'|'unprocessable'|'not-retryable'|'unknown-status'
 * }>} RetryAssessment
 */

const assessment = (potentiallyRetryable, reason) => Object.freeze({
  potentiallyRetryable,
  autoRetryAllowed: false,
  reason
});

/**
 * @param {Readonly<{method?: string, status?: number|null}>} [input={}] Retry context.
 * @returns {RetryAssessment} Informative classification with automatic retry disabled.
 */
export function assessRetryPolicy({ status } = {}) {
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    return assessment(false, 'unknown-status');
  }
  if (status === 403) {
    return assessment(false, 'forbidden');
  }
  if (status === 422) {
    return assessment(false, 'unprocessable');
  }
  if (status === 429) {
    return assessment(true, 'rate-limited');
  }
  if (status >= 500 && status <= 599) {
    return assessment(true, 'server-error');
  }
  return assessment(false, 'not-retryable');
}
