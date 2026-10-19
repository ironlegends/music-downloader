export const SAFE_DOM_OBSERVATION = Object.freeze({
  csrfPresent: true,
  turnstilePresent: true,
  trackRowCount: 3,
  buttonIdCount: 3,
  opaqueFieldCount: 3,
  malformedRowCount: 0,
  duplicateIdCount: 0,
  anomalies: Object.freeze([])
});

export const RESPONSE_CASES = Object.freeze({
  directOnly: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: false, hasDirectUrl: true, hasTaskId: false }),
  taskOnly: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: false, hasDirectUrl: false, hasTaskId: true }),
  directAndTask: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: false, hasDirectUrl: true, hasTaskId: true }),
  missingShape: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: false, hasDirectUrl: false, hasTaskId: false }),
  unknownErrorFlag: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: null, hasDirectUrl: true, hasTaskId: false }),
  errorDeclared: Object.freeze({ status: 200, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false }),
  html: Object.freeze({ status: 200, bodyKind: 'html', errorFlag: null, hasDirectUrl: false, hasTaskId: false }),
  empty: Object.freeze({ status: 204, bodyKind: 'empty', errorFlag: null, hasDirectUrl: false, hasTaskId: false }),
  unknownBody: Object.freeze({ status: 200, bodyKind: 'unknown', errorFlag: null, hasDirectUrl: false, hasTaskId: false }),
  unknownStatus: Object.freeze({ status: null, bodyKind: 'unknown', errorFlag: null, hasDirectUrl: false, hasTaskId: false }),
  forbidden: Object.freeze({ status: 403, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false }),
  unprocessable: Object.freeze({ status: 422, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false }),
  rateLimited: Object.freeze({ status: 429, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false }),
  serverError: Object.freeze({ status: 500, bodyKind: 'json', errorFlag: true, hasDirectUrl: false, hasTaskId: false })
});
