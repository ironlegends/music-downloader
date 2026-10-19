const DEFAULT_CELL_COUNT = 4;
const SYNTHETIC_BUTTON_IDS = Object.freeze([Symbol(), Symbol(), Symbol()]);

export const SYNTHETIC_SELECTORS = Object.freeze({
  csrf: '[data-csrf-marker]',
  turnstile: '[data-turnstile-marker]',
  trackRows: '[data-track-row]',
  buttons: '[data-track-button]',
  opaqueFields: '[data-opaque-field]',
  expectedTrackCellCount: DEFAULT_CELL_COUNT
});

const guardedNode = ({ childCount = 0, id = null } = {}) => {
  const children = Object.freeze(Array.from({ length: childCount }, () => Object.freeze({})));
  const target = {
    children,
    getAttribute(name) {
      if (name !== 'id') throw new Error('unexpected attribute read');
      return id;
    }
  };

  return new Proxy(target, {
    get(object, property, receiver) {
      if (property !== 'children' && property !== 'getAttribute') {
        throw new Error(`unexpected node read: ${String(property)}`);
      }
      return Reflect.get(object, property, receiver);
    },
    set() {
      throw new Error('synthetic DOM is read-only');
    },
    defineProperty() {
      throw new Error('synthetic DOM is read-only');
    },
    deleteProperty() {
      throw new Error('synthetic DOM is read-only');
    }
  });
};

export function makeSyntheticRoot({
  csrf = true,
  turnstile = true,
  rowCellCounts = [DEFAULT_CELL_COUNT, DEFAULT_CELL_COUNT, DEFAULT_CELL_COUNT],
  buttonIds = SYNTHETIC_BUTTON_IDS,
  opaqueFieldCount = 3
} = {}) {
  const nodes = new Map([
    [SYNTHETIC_SELECTORS.csrf, csrf ? [guardedNode()] : []],
    [SYNTHETIC_SELECTORS.turnstile, turnstile ? [guardedNode()] : []],
    [SYNTHETIC_SELECTORS.trackRows, rowCellCounts.map((childCount) => guardedNode({ childCount }))],
    [SYNTHETIC_SELECTORS.buttons, buttonIds.map((id) => guardedNode({ id }))],
    [SYNTHETIC_SELECTORS.opaqueFields, Array.from({ length: opaqueFieldCount }, () => guardedNode())]
  ]);

  const target = {
    querySelector(selector) {
      const matches = nodes.get(selector);
      if (matches === undefined) throw new Error('unexpected selector read');
      return matches[0] ?? null;
    },
    querySelectorAll(selector) {
      const matches = nodes.get(selector);
      if (matches === undefined) throw new Error('unexpected selector read');
      return matches;
    }
  };

  return new Proxy(target, {
    get(object, property, receiver) {
      if (property !== 'querySelector' && property !== 'querySelectorAll') {
        throw new Error(`unexpected root read: ${String(property)}`);
      }
      return Reflect.get(object, property, receiver);
    },
    set() {
      throw new Error('synthetic DOM is read-only');
    },
    defineProperty() {
      throw new Error('synthetic DOM is read-only');
    },
    deleteProperty() {
      throw new Error('synthetic DOM is read-only');
    }
  });
}
