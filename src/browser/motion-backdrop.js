import { isTrustedUserEvent } from './policy.js';

const createMotionBackdrop = ({ root, documentRef: doc, windowRef: win, trace } = {}) => {
  const noop = Object.freeze({ setTracks() {}, setActivity() {}, pulse() {}, refresh() {}, destroy() {} });
  if (!root || !doc?.createElementNS || !win?.requestAnimationFrame || !win?.cancelAnimationFrame) return noop;
  const make = (tag, className) => {
    const node = doc.createElement(tag);
    node.className = className;
    return node;
  };
  const svgNode = (tag, attributes = {}) => {
    const node = doc.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    return node;
  };
  const field = make('div', 'spotmate-motion-field');
  field.setAttribute('aria-hidden', 'true');
  const warm = make('div', 'spotmate-ambient-light spotmate-light-warm');
  const olive = make('div', 'spotmate-ambient-light spotmate-light-olive');
  field.appendChild(warm); field.appendChild(olive);
  const signal = svgNode('svg', { viewBox: '0 0 1440 1020', preserveAspectRatio: 'none', class: 'spotmate-signal-field' });
  const flow = svgNode('g');
  const curves = [
    'M-90 760 C140 880 210 150 590 80 S1230 440 1530 230',
    'M-90 800 C180 950 220 210 610 120 S1260 480 1530 270',
    'M-90 410 C270 40 350 1060 880 920 S1240 690 1530 840'
  ].map(d => { const path = svgNode('path', { d, class: 'spotmate-signal-path' }); flow.appendChild(path); return path; });
  const lengths = curves.map(path => path.getTotalLength());
  const dots = curves.map((_, i) => { const dot = svgNode('circle', { r: i === 1 ? 2 : 3, class: 'spotmate-signal-dot' }); flow.appendChild(dot); return dot; });
  signal.appendChild(flow); field.appendChild(signal);
  const inner = make('div', 'spotmate-cover-layer spotmate-cover-inner');
  const outer = make('div', 'spotmate-cover-layer spotmate-cover-outer');
  field.appendChild(inner); field.appendChild(outer); root.appendChild(field);
  const pauseButton = make('button', 'spotmate-motion-toggle');
  pauseButton.type = 'button';
  const preference = win.matchMedia?.('(prefers-reduced-motion: reduce)');
  let paused = preference?.matches === true, visible = true, destroyed = false, frame = 0, previous = 0;
  let width = 1, height = 1, time = 0, tracks = [], sprites = [], activity = 'idle';
  let pointer = null, lightX = 0, lightY = 0, kick = 0;
  const removers = [];
  const listen = (target, event, callback, options) => {
    target?.addEventListener?.(event, callback, options);
    removers.push(() => target?.removeEventListener?.(event, callback, options));
  };
  const fraction = (n, base) => { let sum = 0, factor = 1 / base; while (n > 0) { sum += n % base * factor; n = Math.floor(n / base); factor /= base; } return sum; };
  const clamp = sprite => {
    const margin = sprite.size * .24 + 8;
    const right = Math.max(margin, width - sprite.size - margin), bottom = Math.max(margin, height - sprite.size - margin);
    if (sprite.x < margin) { sprite.x = margin; sprite.vx = Math.abs(sprite.vx); }
    if (sprite.x > right) { sprite.x = right; sprite.vx = -Math.abs(sprite.vx); }
    if (sprite.y < margin) { sprite.y = margin; sprite.vy = Math.abs(sprite.vy); }
    if (sprite.y > bottom) { sprite.y = bottom; sprite.vy = -Math.abs(sprite.vy); }
  };
  const artNode = (track, className) => {
    const node = make('div', className);
    node.setAttribute('data-cover', 'true');
    node.setAttribute('data-tone', String((track.position || 1) % 4));
    if (track.artworkUrl) {
      const image = make('img', 'spotmate-cover-image');
      image.alt = ''; image.referrerPolicy = 'no-referrer'; image.draggable = false;
      image.addEventListener('error', () => image.remove(), { once: true });
      image.src = track.artworkUrl;
      node.appendChild(image);
    }
    return node;
  };
  const refresh = () => {
    if (destroyed || !doc.createRange) return;
    const fieldRect = field.getBoundingClientRect();
    const rects = [];
    for (const node of root.querySelectorAll('h2,h3,p,label,.spotmate-steps li,.spotmate-result-name,.spotmate-result-state,.spotmate-column-head span')) {
      const range = doc.createRange(); range.selectNodeContents(node);
      for (const rect of range.getClientRects()) if (rect.width && rect.height) rects.push(rect);
    }
    for (const node of root.querySelectorAll('button,input,a')) rects.push(node.getBoundingClientRect());
    const holes = rects.filter(rect => rect.width && rect.height).map(rect => `<rect x="${rect.left - fieldRect.left - 10}" y="${rect.top - fieldRect.top - 10}" width="${rect.width + 20}" height="${rect.height + 20}" rx="6" fill="black" filter="url(#soft)"/>`).join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><filter id="soft" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="4"/></filter></defs><rect width="100%" height="100%" fill="white"/>${holes}</svg>`;
    const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    outer.style.display = win.CSS?.supports?.('mask-image', mask) ? '' : 'none';
    outer.style.maskImage = mask;
  };
  const paint = () => {
    for (const sprite of sprites) {
      const transform = `translate3d(${sprite.x.toFixed(2)}px,${sprite.y.toFixed(2)}px,0) rotate(${sprite.angle.toFixed(2)}deg)`;
      sprite.nodes.forEach(node => { node.style.transform = transform; });
    }
    const dx = Math.sin(time * .17) * 36 + lightX, dy = Math.cos(time * .13) * 24 + lightY;
    warm.style.transform = `translate3d(${dx.toFixed(2)}px,${dy.toFixed(2)}px,0) scale(${(1 + kick * .08).toFixed(3)})`;
    olive.style.transform = `translate3d(${(-dx * .7).toFixed(2)}px,${(-dy * .8).toFixed(2)}px,0)`;
    flow.style.transform = `translate3d(${(lightX * .15).toFixed(2)}px,${(Math.sin(time * .2) * 8 + lightY * .1).toFixed(2)}px,0)`;
    dots.forEach((dot, i) => { const p = curves[i].getPointAtLength(((time * .026 + i * .31) % 1) * lengths[i]); dot.style.transform = `translate3d(${p.x.toFixed(2)}px,${p.y.toFixed(2)}px,0)`; });
    if (trace) {
      const busy = activity !== 'idle' && activity !== 'ready';
      const amplitude = (busy ? 9 : activity === 'ready' ? 4 : 2.8) + kick * 3;
      const points = [];
      for (let x = 0; x <= 280; x += 4) {
        const y = 17 + Math.pow(Math.sin(x / 280 * Math.PI), 1.5) * amplitude *
          (Math.sin(x * .055 - time * (busy ? 2.5 : .8)) * .65 + Math.sin(x * .11 + time * .5) * .35);
        points.push(`${x ? 'L' : 'M'}${x} ${y.toFixed(2)}`);
      }
      trace.setAttribute('d', points.join(' '));
    }
  };
  const syncTracks = () => {
    const count = Math.min(width <= 650 ? 18 : 32, tracks.length * (width <= 650 ? 3 : 5));
    // Reuse velocity and positions across workflow updates; replace art only for a new playlist.
    while (sprites.length > count) sprites.pop().nodes.forEach(node => node.remove());
    while (sprites.length < count) {
      const i = sprites.length, speed = 19 + i * 7 % 17;
      const sprite = { x: fraction(i + 1, 2) * width, y: fraction(i + 1, 3) * height,
        vx: Math.cos(i * 2.39996 + .3) * speed, vy: Math.sin(i * 2.39996 + .3) * speed,
        angle: i * 11 % 33 - 16, nodes: [], track: null };
      sprites.push(sprite);
    }
    sprites.forEach((sprite, i) => {
      sprite.size = (width <= 650 ? 30 : 43) + i * 13 % (width <= 650 ? 17 : 25);
      const track = tracks[i % tracks.length];
      if (sprite.track !== track) {
        sprite.nodes.forEach(node => node.remove());
        sprite.nodes = [inner, outer].map(layer => { const node = artNode(track, 'spotmate-floating-cover'); layer.appendChild(node); return node; });
        sprite.track = track;
      }
      sprite.nodes.forEach(node => { node.style.width = `${sprite.size}px`; node.style.height = `${sprite.size}px`; });
      clamp(sprite);
    });
    paint(); refresh();
  };
  const resize = () => {
    const rect = field.getBoundingClientRect(), oldWidth = width, oldHeight = height;
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    sprites.forEach(sprite => { sprite.x *= width / oldWidth; sprite.y *= height / oldHeight; });
    syncTracks();
  };
  const tick = now => {
    if (destroyed || paused || doc.hidden || !visible) { frame = 0; return; }
    if (!previous || now - previous >= 32) {
      const dt = previous ? Math.min((now - previous) / 1000, .075) : .033;
      previous = now; time += dt; kick = Math.max(0, kick - dt * .8);
      const ease = 1 - Math.exp(-dt * 2.5);
      lightX += ((pointer ? (pointer.x / width - .5) * 100 : 0) - lightX) * ease;
      lightY += ((pointer ? (pointer.y / height - .5) * 80 : 0) - lightY) * ease;
      sprites.forEach((sprite, i) => {
        const dx = sprite.x + sprite.size / 2 - (pointer?.x ?? -10000), dy = sprite.y + sprite.size / 2 - (pointer?.y ?? -10000), distance = Math.hypot(dx, dy);
        if (distance > 1 && distance < 180) { const force = (1 - distance / 180) * 32 * dt; sprite.vx += dx / distance * force; sprite.vy += dy / distance * force; }
        const speed = Math.hypot(sprite.vx, sprite.vy);
        if (speed > 95) { sprite.vx *= 95 / speed; sprite.vy *= 95 / speed; }
        if (speed < 12) { sprite.vx += Math.cos(i * 2.39996 + .3) * 8 * dt; sprite.vy += Math.sin(i * 2.39996 + .3) * 8 * dt; }
        sprite.vx *= Math.pow(.996, dt * 30); sprite.vy *= Math.pow(.996, dt * 30);
        sprite.x += sprite.vx * dt; sprite.y += sprite.vy * dt;
        sprite.angle = i * 11 % 33 - 16 + Math.sin(time * .28 + i) * 3; clamp(sprite);
      });
      paint();
    }
    frame = win.requestAnimationFrame(tick);
  };
  const schedule = () => {
    win.cancelAnimationFrame(frame); frame = 0; previous = 0;
    const stopped = paused || doc.hidden || !visible;
    root.setAttribute('data-motion', stopped ? 'stopped' : 'running');
    pauseButton.textContent = paused ? 'Resume motion' : 'Pause motion';
    pauseButton.setAttribute('aria-pressed', String(paused));
    if (!stopped && !destroyed) frame = win.requestAnimationFrame(tick);
  };
  const pulse = id => {
    if (paused || doc.hidden || !visible || destroyed) return;
    kick = 1;
    for (const sprite of sprites) {
      const dx = sprite.x + sprite.size / 2 - (pointer?.x ?? width / 2), dy = sprite.y + sprite.size / 2 - (pointer?.y ?? height / 2);
      const distance = Math.max(1, Math.hypot(dx, dy));
      if (distance < 260 || sprite.track?.id === id) { sprite.vx += dx / distance * 35; sprite.vy += dy / distance * 35; }
    }
  };
  listen(pauseButton, 'click', event => { if (isTrustedUserEvent(event)) { paused = !paused; schedule(); } });
  listen(root, 'pointermove', event => { const rect = field.getBoundingClientRect(); pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }; }, { passive: true });
  listen(root, 'pointerleave', () => { pointer = null; });
  listen(root, 'pointerdown', () => pulse(), { passive: true });
  listen(root, 'scroll', refresh, { passive: true, capture: true });
  listen(win, 'resize', resize, { passive: true });
  listen(win, 'scroll', refresh, { passive: true });
  listen(doc, 'visibilitychange', schedule);
  listen(preference, 'change', event => { paused = event.matches; schedule(); });
  const resizeObserver = typeof win.ResizeObserver === 'function' ? new win.ResizeObserver(resize) : null;
  resizeObserver?.observe(root);
  const observer = typeof win.IntersectionObserver === 'function' ? new win.IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting !== false; schedule();
  }) : null;
  observer?.observe(root);
  resize(); schedule();
  return Object.freeze({
    pauseButton,
    setTracks(next) { tracks = Array.isArray(next) ? next : []; syncTracks(); },
    setActivity(next) { activity = next; }, pulse, refresh,
    destroy() { destroyed = true; win.cancelAnimationFrame(frame); removers.forEach(remove => remove()); observer?.disconnect(); resizeObserver?.disconnect(); field.remove(); pauseButton.remove(); }
  });
};

export { createMotionBackdrop };
