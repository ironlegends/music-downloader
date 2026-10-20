import test from 'node:test';
import assert from 'node:assert/strict';
import { createMotionBackdrop } from '../../src/browser/motion-backdrop.js';

function environment(reduced = false) {
  let width = 1440, height = 1020, nextId = 0;
  const pending = new Map(), observers = [];
  const target = () => {
    const listeners = new Map();
    return {
      listeners,
      addEventListener(name, fn) { listeners.set(name, fn); },
      removeEventListener(name) { listeners.delete(name); },
      dispatch(name, event = {}) { listeners.get(name)?.(event); }
    };
  };
  const element = () => ({
    ...target(), children: [], attributes: {}, style: {},
    appendChild(child) { child.parent = this; this.children.push(child); return child; },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); },
    setAttribute(name, value) { this.attributes[name] = value; },
    getBoundingClientRect() { return { width, height, left: 0, top: 0 }; },
    getTotalLength() { return 1000; },
    getPointAtLength(distance) { return { x: distance, y: distance / 2 }; }
  });
  const root = element(), trace = element(), preference = { ...target(), matches: reduced };
  const doc = { ...target(), createElement: element, createElementNS: element, hidden: false };
  class Observer {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe() {}
    disconnect() { this.disconnected = true; }
  }
  const win = {
    ...target(), requestAnimationFrame(fn) { const id = ++nextId; pending.set(id, fn); return id; },
    cancelAnimationFrame(id) { pending.delete(id); }, matchMedia: () => preference,
    ResizeObserver: Observer, IntersectionObserver: Observer
  };
  const controller = createMotionBackdrop({ root, documentRef: doc, windowRef: win, trace });
  const field = root.children[0], inner = field.children[3];
  const advance = time => { const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(time)); };
  return { root, trace, field, inner, doc, win, preference, pending, observers, controller, advance,
    resize(w, h) { width = w; height = h; win.dispatch('resize'); } };
}

test('one bounded loop moves covers, light and trace; pause freezes all persistent motion', () => {
  const env = environment();
  env.controller.setTracks(Array.from({ length: 4 }, (_, i) => ({ id: String(i), position: i + 1 })));
  assert.equal(env.inner.children.length, 20);
  const cover = env.inner.children[0], light = env.field.children[0];
  env.advance(100);
  const first = [cover.style.transform, light.style.transform, env.trace.attributes.d];
  env.advance(116);
  assert.deepEqual([cover.style.transform, light.style.transform, env.trace.attributes.d], first, 'Skip work before the 32ms budget.');
  env.advance(140);
  assert.notEqual(cover.style.transform, first[0]);
  assert.notEqual(light.style.transform, first[1]);
  assert.notEqual(env.trace.attributes.d, first[2]);
  env.controller.pauseButton.dispatch('click', { isTrusted: false });
  assert.equal(env.root.attributes['data-motion'], 'running');
  env.controller.pauseButton.dispatch('click', { isTrusted: true });
  assert.equal(env.pending.size, 0);
  const paused = [cover.style.transform, light.style.transform, env.trace.attributes.d];
  env.root.dispatch('pointermove', { clientX: 20, clientY: 20 }); env.controller.pulse('0'); env.advance(300);
  assert.deepEqual([cover.style.transform, light.style.transform, env.trace.attributes.d], paused);
  env.controller.destroy();
});

test('reduced motion, hidden/offscreen states and teardown own every frame and listener', () => {
  const env = environment(true);
  assert.equal(env.pending.size, 0);
  env.preference.dispatch('change', { matches: false }); assert.equal(env.pending.size, 1);
  env.doc.hidden = true; env.doc.dispatch('visibilitychange'); assert.equal(env.pending.size, 0);
  env.doc.hidden = false; env.doc.dispatch('visibilitychange'); assert.equal(env.pending.size, 1);
  env.observers[1].callback([{ isIntersecting: false }]); assert.equal(env.pending.size, 0);
  env.observers[1].callback([{ isIntersecting: true }]); assert.equal(env.pending.size, 1);
  env.controller.destroy();
  assert.equal(env.pending.size, 0);
  assert.equal(env.root.children.length, 0);
  assert.equal(env.root.listeners.size + env.doc.listeners.size + env.win.listeners.size + env.preference.listeners.size, 0);
  assert(env.observers.every(observer => observer.disconnected));
  env.controller.destroy(); assert.equal(env.pending.size, 0);
});

test('narrow resize caps the cover population and keeps rotated images inside bounds', () => {
  const env = environment(true);
  env.controller.setTracks(Array.from({ length: 100 }, (_, i) => ({ id: String(i), position: i + 1 })));
  assert.equal(env.inner.children.length, 32);
  env.resize(320, 844); assert.equal(env.inner.children.length, 18);
  for (const node of env.inner.children) {
    const values = node.style.transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const x = values[1], y = values[2], angle = values[4] * Math.PI / 180, size = parseFloat(node.style.width);
    const extra = size * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle)) - 1) / 2;
    assert(x - extra >= 0 && y - extra >= 0 && x + size + extra <= 320 && y + size + extra <= 844);
  }
  env.controller.destroy();
});
