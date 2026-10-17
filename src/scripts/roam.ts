// Blue, Spooky and Zoe roam the whole site. They walk and leap between perches
// (boxes, beds, tables, shelves, headings, cards, the timeline), sit in boxes,
// sleep in odd places, and Zoe pushes things off shelves while looking at you.
// Cats live in a fixed layer and follow their perch's live position every frame.
import { gsap } from 'gsap';
import { reducedMotion, canAnimate, findSecret, on, emit, onPause } from './state';

type Name = 'blue' | 'spooky' | 'zoe';
type PerchKind = 'box' | 'bed' | 'top' | 'shelf' | 'window';
type Pose = 'stand' | 'loaf' | 'sleep' | 'belly';
interface Pt { x: number; y: number }
interface Perch { el: HTMLElement; kind: PerchKind; any: boolean; occ: Set<Cat> }
interface Move { from: Pt; to: () => Pt; t: number; dur: number; arc: number; done: () => void }
interface Cat {
  name: Name; el: HTMLElement; svg: SVGSVGElement; bubble: HTMLElement; w: number;
  parts: { upper: SVGGElement; head: SVGGElement; eyes: SVGGElement; sleep: SVGGElement; tail: SVGElement; legs: SVGElement[] };
  x: number; y: number; facing: number; phase: number;
  state: 'idle' | 'move' | 'perch' | 'busy' | 'chase' | 'held' | 'fall';
  perch: Perch | null; px: number; since: number; nextThink: number; hiddenSince: number;
  move: Move | null; pose: Pose; belly: boolean; pokes: number[]; sulkUntil: number; vy: number; clingUntil: number; lastPx: number; nextNoise: number;
}

const fx = document.querySelector<HTMLElement>('[data-fx]')!;
const HEAD = 'M20 40 L22 12 L42 28 Q50 26 58 28 L78 12 L80 40 Q86 49 86 58 Q86 88 50 88 Q14 88 14 58 Q14 49 20 40 Z';

// ---------- drawings (side view, facing right, ground at y=96) ----------
const LOOK = {
  blue: { fur: '#FBF8F3', far: '#F1E8DC', line: '#D3C8B8', eye: '#6F8DB5', w: 118, body: [16, 34, 100, 36, 18], legs: [26, 86, 40, 100], head: 'translate(86 -6) scale(.5)', tail: 'M20 48 C 4 42 2 20 12 8', tailCol: '#E0B98F' },
  spooky: { fur: '#5E4C3B', far: '#4E3F31', line: '#1F1A16', eye: '#B3A25C', w: 150, body: [12, 30, 112, 40, 20], legs: [24, 92, 38, 106], head: 'translate(92 -10) scale(.54)', tail: 'M16 46 C -2 42 -2 16 8 6', tailCol: '#5E4C3B' },
  zoe: { fur: '#707176', far: '#626368', line: '#4F5054', eye: '#C2CB8C', w: 136, body: [14, 28, 106, 46, 23], legs: [28, 86, 42, 100], head: 'translate(88 -8) scale(.52)', tail: 'M18 44 C 0 46 0 24 10 12', tailCol: '#707176' },
} as const;

function catSVG(n: Name) {
  const L = LOOK[n];
  const [bx, by, bw, bh, br] = L.body;
  const leg = (x: number, fill: string, i: number) => `<rect data-leg="${i}" x="${x}" y="58" width="12" height="38" rx="6" fill="${fill}" stroke="${L.line}" stroke-width="1.5"/>`;
  let pattern = '', headExtra = '';
  if (n === 'blue') headExtra = `<polygon points="21,26 22,12 33,21" fill="#E0B98F"/><polygon points="67,21 78,12 79,26" fill="#E0B98F"/><ellipse cx="50" cy="77" rx="11" ry="7" fill="#E0B98F"/><polygon points="46,72 54,72 50,76" fill="#C98B7E"/>`;
  if (n === 'spooky') {
    pattern = [40, 58, 76, 94].map((x, i) => `<rect x="${x}" y="${by}" width="8" height="${i % 2 ? 14 : 19}" rx="4" fill="#1F1A16"/>`).join('');
    headExtra = `<polygon points="24,30 25,19 33,26" fill="#1F1A16"/><polygon points="67,26 75,19 76,30" fill="#1F1A16"/><rect x="43.5" y="30" width="3" height="12" rx="1.5" fill="#1F1A16"/><rect x="48.5" y="28" width="3" height="14" rx="1.5" fill="#1F1A16"/><rect x="53.5" y="30" width="3" height="12" rx="1.5" fill="#1F1A16"/>`;
  }
  if (n === 'zoe') {
    pattern = `<ellipse cx="46" cy="52" rx="13" ry="9" fill="#D4A88C"/><ellipse cx="98" cy="38" rx="9" ry="6" fill="#B98F78"/><ellipse cx="76" cy="64" rx="7" ry="4" fill="#D4A88C"/>`;
    headExtra = `<ellipse cx="50" cy="31" rx="5" ry="10" fill="#D4A88C"/><ellipse cx="69" cy="37" rx="8" ry="5" fill="#D4A88C"/><polygon points="46,74 54,74 50,78" fill="#3E3F43"/>`;
  }
  const tailTip = n === 'spooky' ? `<path d="M3 20 C 3 13 5 9 8 6" fill="none" stroke="#1F1A16" stroke-width="10" stroke-linecap="round"/>` : '';
  return `<svg viewBox="0 0 150 100" aria-hidden="true">
  <ellipse cx="68" cy="97" rx="50" ry="3.5" fill="#26211D" opacity=".14"/>
  ${leg(L.legs[0], L.far, 0)}${leg(L.legs[1], L.far, 1)}
  <g data-b="upper">
    <g data-b="tail"><path d="${L.tail}" fill="none" stroke="${L.tailCol}" stroke-width="9" stroke-linecap="round"/>${tailTip}</g>
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="${br}" fill="${L.fur}" stroke="${L.line}" stroke-width="1.5"/>${pattern}
    <g transform="${L.head}"><g data-b="head">
      <path d="${HEAD}" fill="${L.fur}" stroke="${L.line}" stroke-width="3"/>${headExtra}
      <g data-b="eyes"><rect x="36" y="48" width="8" height="22" rx="4" fill="${L.eye}"/><rect x="58" y="48" width="8" height="22" rx="4" fill="${L.eye}"/></g>
      <g data-b="sleep" opacity="0"><path d="M33 58 Q40 65 47 58 M55 58 Q62 65 69 58" fill="none" stroke="${L.eye}" stroke-width="4" stroke-linecap="round"/></g>
    </g></g>
  </g>
  ${leg(L.legs[2], L.fur, 2)}${leg(L.legs[3], L.fur, 3)}
</svg>`;
}

// ---------- perches ----------
const perches: Perch[] = [...document.querySelectorAll<HTMLElement>('[data-perch]')].map((el) => ({
  el, kind: el.dataset.perch as PerchKind, any: el.hasAttribute('data-perch-any'), occ: new Set<Cat>(),
}));
const timelinePerch = perches.find((p) => p.el.classList.contains('tl'));
const vw = () => window.innerWidth, vh = () => window.innerHeight;
const windowPerch = perches.find((p) => p.kind === 'window');
// The timeline is a vertical rail on the right (desktop) or a bar at the bottom (mobile).
const rail = () => document.querySelector<HTMLElement>('.tl')?.getBoundingClientRect();
const railIsBar = () => { const r = rail(); return !!r && r.width > r.height; };
/** Where things land: the top of the bottom bar, or the bottom of the screen. */
const tlTop = () => { const r = rail(); return r && r.width > r.height ? r.top : vh() - 6; };
/** The right edge cats can use (left of the rail on desktop). */
const rightWall = () => { const r = rail(); return r && r.height > r.width ? r.left - 8 : vw(); };

function hiddenByScene(el: HTMLElement) {
  return !!el.closest('.is-gone');
}
function perchPoint(p: Perch, px: number): Pt {
  const r = p.el.getBoundingClientRect();
  const x = r.left + r.width * px;
  switch (p.kind) {
    case 'box': return { x, y: r.top + r.height * 0.45 };
    case 'bed': return { x, y: r.top + r.height * 0.62 };
    case 'window': {
      const h = (p.el.querySelector('[data-hammock]') ?? p.el).getBoundingClientRect();
      return { x: h.left + h.width * 0.5, y: h.top + h.height * 0.78 };
    }
    case 'shelf': {
      const plank = p.el.querySelector('.shelf__plank')!.getBoundingClientRect();
      return { x, y: plank.top + 1 };
    }
    default: return { x, y: r.top + 2 };
  }
}
function visible(p: Perch, px = 0.5) {
  if (hiddenByScene(p.el)) return false;
  const r = p.el.getBoundingClientRect();
  if (!r.width) return false;
  const pt = perchPoint(p, px);
  if (p.kind === 'window') return pt.y > 60 && pt.y < tlTop() + 4;
  return pt.x > 40 && pt.x < rightWall() - 40 && pt.y > 90 && pt.y < tlTop() + 4;
}
function standingItems(p: Perch) {
  return [...p.el.querySelectorAll<HTMLElement>('[data-item]:not(.is-fallen)')];
}
const PREF: Record<Name, Record<PerchKind, number>> = {
  blue: { box: 5, bed: 5, top: 1.2, shelf: 0.6, window: 0.5 },
  zoe: { box: 1, bed: 1.5, top: 2.5, shelf: 6, window: 9 },
  spooky: { box: 2, bed: 3, top: 4, shelf: 0.5, window: 0.25 },
};

// ---------- cats ----------
const cats: Cat[] = [];
const scale = () => (vw() < 760 ? 0.66 : 1);

function makeCat(name: Name): Cat {
  const el = document.createElement('div');
  el.className = `rcat rcat--${name}`;
  el.innerHTML = catSVG(name);
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  el.setAttribute('aria-label', { blue: 'Blue — pat him', spooky: 'Spooky — he’ll warm up', zoe: 'Zoe — careful' }[name]);
  el.dataset.cursor = { blue: 'Pat', spooky: 'Wait', zoe: 'Poke' }[name];
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.setAttribute('aria-hidden', 'true');
  el.appendChild(bubble);
  fx.appendChild(el);
  const svg = el.querySelector('svg')!;
  const q = (b: string) => svg.querySelector<SVGGElement>(`[data-b="${b}"]`)!;
  const cat: Cat = {
    name, el, svg, bubble, w: LOOK[name].w,
    parts: { upper: q('upper'), head: q('head'), eyes: q('eyes'), sleep: q('sleep'), tail: q('tail'), legs: [...svg.querySelectorAll<SVGElement>('[data-leg]')] },
    x: -200, y: vh() * 0.5, facing: 1, phase: Math.random() * 6,
    state: 'idle', perch: null, px: 0.5, since: 0, nextThink: 0, hiddenSince: 0, move: null, pose: 'stand', belly: false, pokes: [], sulkUntil: 0, vy: 0, clingUntil: 0, lastPx: 0, nextNoise: 0,
  };
  el.style.width = `${cat.w * scale()}px`;
  gsap.to(cat.parts.tail, { rotation: 10, transformOrigin: '100% 100%', duration: 0.9 + Math.random() * 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to(cat.parts.upper, { scaleY: 1.025, transformOrigin: '50% 100%', duration: 1.5 + Math.random(), yoyo: true, repeat: -1, ease: 'sine.inOut' });
  // Click = pet. Press and drag = pick the cat up.
  let down: Pt | null = null;
  let dragged = false;
  el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; dragged = false; el.setPointerCapture(e.pointerId); e.preventDefault(); });
  el.addEventListener('pointermove', (e) => {
    if (!down) return;
    if (!dragged && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) { dragged = true; pickUp(cat); }
    if (dragged) { pointer.x = e.clientX; pointer.y = e.clientY; }
  });
  el.addEventListener('pointerup', () => { if (down && dragged) release(cat); else if (down) touch(cat); down = null; });
  el.addEventListener('pointercancel', () => { if (dragged) release(cat); down = null; });
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); touch(cat); } });
  cats.push(cat);
  return cat;
}

function say(cat: Cat, text: string, ms = 2600) {
  cat.bubble.classList.remove('is-offer');
  cat.bubble.textContent = text;
  gsap.to(cat.bubble, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)', overwrite: true });
  gsap.to(cat.bubble, { opacity: 0, scale: 0.6, duration: 0.2, delay: ms / 1000, overwrite: false });
}
function setPose(cat: Cat, pose: Pose) {
  if (cat.pose === pose) return;
  cat.pose = pose;
  const d = canAnimate() ? 0.35 : 0;
  const low = pose === 'loaf' || pose === 'sleep';
  gsap.to(cat.parts.upper, { y: low ? 16 : 0, duration: d, ease: 'power2.out' });
  cat.parts.legs.forEach((l) => gsap.to(l, { scaleY: low ? 0.1 : 1, transformOrigin: '50% 0%', duration: d, overwrite: 'auto' }));
  gsap.to(cat.parts.eyes, { opacity: pose === 'sleep' ? 0 : 1, duration: d / 2 });
  gsap.to(cat.parts.sleep, { opacity: pose === 'sleep' ? 1 : 0, duration: d / 2 });
  gsap.to(cat.parts.head, { rotation: pose === 'sleep' ? 10 : 0, transformOrigin: '50% 80%', duration: d });
  gsap.to(cat.svg, { rotation: pose === 'belly' ? 180 : 0, transformOrigin: '50% 64%', duration: canAnimate() ? 0.6 : 0, ease: 'back.out(1.6)' });
}
function hearts(cat: Cat, glyph = '♥', color = '#C98B7E') {
  if (!canAnimate()) return;
  const r = cat.el.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const h = document.createElement('span');
    h.className = 'paw'; h.textContent = glyph; h.style.color = color;
    h.style.left = `${r.left + r.width * (0.3 + Math.random() * 0.4)}px`; h.style.top = `${r.top}px`;
    document.body.appendChild(h);
    gsap.to(h, { y: -50 - Math.random() * 50, x: (Math.random() - 0.5) * 60, rotation: (Math.random() - 0.5) * 60, opacity: 0, duration: 1.1, ease: 'power2.out', onComplete: () => h.remove() });
  }
}

// ---------- movement ----------
const SPEED: Record<Name, number> = { blue: 300, zoe: 230, spooky: 180 };
function offscreen(c: Cat) { return c.x < -60 || c.x > vw() + 60 || c.y < -40 || c.y > vh() + 80; }
function goTo(cat: Cat, to: () => Pt, done: () => void, speed = SPEED[cat.name]) {
  if (cat.state === 'held' || cat.state === 'fall') return;
  leave(cat);
  const target = to();
  if (offscreen(cat)) { cat.x = target.x < vw() / 2 ? -90 : vw() + 90; cat.y = Math.min(target.y, tlTop()); }
  const dist = Math.hypot(target.x - cat.x, target.y - cat.y);
  const dy = target.y - cat.y;
  cat.move = { from: { x: cat.x, y: cat.y }, to, t: 0, dur: gsap.utils.clamp(0.35, 2.6, dist / speed), arc: Math.abs(dy) > 14 ? gsap.utils.clamp(40, 170, 40 + Math.abs(dy) * 0.35 + (dy < 0 ? -dy * 0.25 : 0)) : 0, done };
  cat.state = 'move';
  setPose(cat, 'stand');
  if (cat.belly) { cat.belly = false; setPose(cat, 'stand'); }
}
function leave(cat: Cat) {
  cat.perch?.occ.delete(cat);
  cat.perch = null;
  cat.el.style.clipPath = '';
}
function sitOn(cat: Cat, p: Perch, px: number) {
  cat.perch = p; cat.px = px; p.occ.add(cat);
  goTo(cat, () => perchPoint(p, px), () => arrive(cat, p));
  cat.perch = p; p.occ.add(cat); // goTo cleared it; keep the reservation while travelling
}
function arrive(cat: Cat, p: Perch) {
  cat.state = 'perch'; cat.since = performance.now(); cat.hiddenSince = 0;
  cat.nextThink = cat.since + ({ blue: 7000, zoe: 9000, spooky: 30000 }[cat.name]) + Math.random() * 6000;
  if (p.kind === 'box') setPose(cat, 'loaf');
  else if (p.kind === 'bed') setPose(cat, cat.name === 'zoe' ? 'loaf' : 'sleep');
  else if (p.kind === 'window') { setPose(cat, 'loaf'); if (cat.name === 'zoe') cat.nextThink = cat.since + 22000 + Math.random() * 14000; }
  else if (p.kind === 'shelf') { setPose(cat, 'stand'); if (cat.name === 'zoe' || Math.random() < 0.25) knockRoutine(cat, p); }
  else setPose(cat, Math.random() < 0.6 ? 'loaf' : 'stand');
  if (canAnimate()) gsap.fromTo(cat.svg, { scaleY: 0.86, scaleX: 1.08 }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)', transformOrigin: '50% 96%' });
  const lines: Record<PerchKind, string[]> = {
    box: ['If it fits, I sits.', 'My box now.'], bed: ['zzz', 'Do not disturb.'],
    top: ['Comfy.', 'I live here now.', 'This is my spot.'], shelf: ['…', 'Oh, what’s this?'],
    window: cat.name === 'zoe' ? ['My window.', 'Finally. Peace.', 'Don’t talk to me.'] : ['Nice view.', 'Is this allowed?'],
  };
  if (Math.random() < 0.35) say(cat, lines[p.kind][Math.floor(Math.random() * lines[p.kind].length)]);
}

function choose(cat: Cat) {
  const options: Array<{ p: Perch; px: number; w: number }> = [];
  perches.forEach((p) => {
    if (!p.any && p.occ.size && !p.occ.has(cat)) return;
    if (p.any && p.occ.size >= 2 && !p.occ.has(cat)) return;
    const px = p.kind === 'shelf' ? 0.84 : p.any ? 0.15 + Math.random() * 0.7 : 0.5;
    if (!visible(p, px)) return;
    let w = PREF[cat.name][p.kind];
    if (p === timelinePerch) w *= 0.25;
    if (p === windowPerch && cat.name !== 'zoe' && cats.find((c) => c.name === 'zoe')?.perch !== windowPerch) w *= 0.3; // they know whose spot it is
    if (p.kind === 'shelf' && cat.name === 'zoe' && standingItems(p).length) w *= 2.5;
    if (p.kind === 'shelf' && !standingItems(p).length) w *= 0.3;
    if (p === cat.perch) w *= 0.15;
    options.push({ p, px, w });
  });
  const fallback = windowPerch && !windowPerch.occ.size && visible(windowPerch) ? windowPerch : railIsBar() ? timelinePerch : undefined;
  if (!options.length && fallback) options.push({ p: fallback, px: 0.1 + Math.random() * 0.8, w: 1 });
  if (!options.length) return;
  let r = Math.random() * options.reduce((s, o) => s + o.w, 0);
  const pick = options.find((o) => (r -= o.w) <= 0) ?? options[0];
  sitOn(cat, pick.p, pick.px);
}

// ---------- Zoe's favourite hobby ----------
let fallen = 0;
function knockRoutine(cat: Cat, p: Perch) {
  const items = standingItems(p);
  if (!items.length) return;
  const cr = cat.el.getBoundingClientRect();
  const item = items.reduce((a, b) => (Math.abs(b.getBoundingClientRect().left - cr.left) < Math.abs(a.getBoundingClientRect().left - cr.left) ? b : a));
  const dir = item.getBoundingClientRect().left < cr.left + cr.width / 2 ? -1 : 1;
  cat.facing = dir;
  cat.state = 'busy';
  const paw = cat.parts.legs[3];
  const tap = () => gsap.timeline().to(paw, { rotation: dir > 0 ? -55 : -55, scaleY: 1, transformOrigin: '50% 0%', duration: 0.14 }).to(paw, { rotation: 0, duration: 0.18 });
  gsap.timeline({ onComplete: () => { cat.state = 'perch'; } })
    .call(() => say(cat, '…', 1200))
    .to(cat.parts.head, { rotation: -14, transformOrigin: '50% 80%', duration: 0.4 }, 0.2) // looks at you
    .add(tap, 1.3).to(item, { rotation: dir * 9, duration: 0.1, yoyo: true, repeat: 1 }, 1.35)
    .add(tap, 2.1).to(item, { rotation: dir * 14, duration: 0.1, yoyo: true, repeat: 1 }, 2.15)
    .add(tap, 3.0).call(() => knock(item, dir), [], 3.1)
    .to(cat.parts.head, { rotation: 0, duration: 0.4 }, 3.4)
    .call(() => say(cat, ['Oops.', 'Gravity works.', 'It was like that.', 'Prove it.'][Math.floor(Math.random() * 4)]), [], 3.6);
}
export function knock(item: HTMLElement, dir = 1) {
  if (item.classList.contains('is-fallen')) return;
  const floor = (item.closest('[data-floor]') as HTMLElement | null)?.getBoundingClientRect();
  const ir = item.getBoundingClientRect();
  // Land on the floor of the room, but never under the timeline while it's on screen.
  const floorY = Math.min(floor ? floor.bottom : ir.bottom + 300, floor && floor.bottom > window.innerHeight ? Infinity : tlTop());
  const drop = Math.max(40, floorY - ir.bottom - 18);
  item.classList.add('is-fallen');
  gsap.to(item, { x: dir * (50 + Math.random() * 90), rotation: dir * (90 + Math.random() * 110), duration: canAnimate() ? 0.9 : 0, ease: 'power1.out' });
  gsap.to(item, { y: drop, duration: canAnimate() ? 0.9 : 0, ease: 'bounce.out' });
  fallen++;
  emit('knock', fallen);
  if (fallen >= 3) findSecret('chaos');
}
document.querySelectorAll<HTMLElement>('[data-item]').forEach((item) => {
  item.addEventListener('click', () => {
    if (!item.classList.contains('is-fallen')) return;
    item.classList.remove('is-fallen');
    gsap.to(item, { x: 0, y: 0, rotation: 0, duration: canAnimate() ? 0.6 : 0, ease: 'back.out(1.6)' });
    fallen = Math.max(0, fallen - 1);
    if (fallen === 0 && document.querySelectorAll('[data-item]').length) {
      // Only counts if they had made a mess first.
      if (sessionMess) findSecret('tidy');
    }
  });
});
let sessionMess = false;
on('knock', (n: number) => { if (n >= 3) sessionMess = true; });

// Clicking a box with a cat in it.
perches.filter((p) => p.kind === 'box').forEach((p) => p.el.addEventListener('click', () => {
  const c = [...p.occ][0];
  if (c && c.state === 'perch') { say(c, 'If it fits, I sits.'); findSecret('box'); }
}));

// ---------- touching the cats ----------
function touch(cat: Cat) {
  if ((offerUntil.get(cat.name) ?? 0) > performance.now()) { showPhoto(cat); return; }
  const now = Date.now();
  cat.pokes = [...cat.pokes.filter((t) => now - t < 5000), now];
  const tooMuch = cat.pokes.length >= 4;

  if (cat.name === 'blue') {
    say(cat, ['prrr', 'More.', 'Left a bit.', 'Yes. There.', 'Don’t stop.'][Math.floor(Math.random() * 5)]);
    hearts(cat);
    findSecret('pat');
    // Bum up: rotate around the front paws, tail high. Blue never has too much.
    if (canAnimate()) gsap.timeline()
      .to(cat.svg, { rotation: 14, transformOrigin: '78% 96%', duration: 0.25, ease: 'power2.out' })
      .to(cat.parts.tail, { rotation: -40, duration: 0.25 }, 0)
      .to(cat.svg, { rotation: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }, 1.6)
      .to(cat.parts.tail, { rotation: 0, duration: 0.4 }, 1.6);
    return;
  }

  if (cat.name === 'spooky') {
    if (performance.now() < cat.sulkUntil) { say(cat, ['…', 'Not talking to you.', 'Go away.'][Math.floor(Math.random() * 3)]); return; }
    if (cat.belly && !tooMuch) { say(cat, 'prrr… ok, ok.'); hearts(cat); jealous(cat); return; }
    if (tooMuch) {
      // Too much love: he turns his back on you.
      cat.pokes = [];
      cat.belly = false;
      setPose(cat, 'loaf');
      cat.sulkUntil = performance.now() + 9000;
      gsap.to(cat.parts.eyes, { opacity: 0, duration: 0.2 });
      say(cat, 'Enough. Back turned.');
      findSecret('sulk');
      cat.nextThink = performance.now() + 15000;
      return;
    }
    say(cat, ['prr.', '…fine.', 'One more. Maybe.'][cat.pokes.length - 1] ?? 'prr.');
    hearts(cat);
    if (canAnimate()) gsap.fromTo(cat.parts.tail, { rotation: 0 }, { rotation: -25, duration: 0.12, yoyo: true, repeat: 3 });
    jealous(cat);
    return;
  }

  // Zoe: a little affection is fine. Too much and she runs.
  if (tooMuch) {
    cat.pokes = [];
    say(cat, 'Enough.');
    findSecret('zoe');
    emit('zoe');
    const shelf = cat.perch?.kind === 'shelf' ? cat.perch : null;
    const item = shelf ? standingItems(shelf)[0] : null;
    if (item) knock(item, cat.facing);
    setTimeout(() => runAway(cat), 350);
    return;
  }
  say(cat, ['prr… fine.', 'That’s enough.', 'I said enough.'][cat.pokes.length - 1] ?? '…');
  if (cat.pokes.length === 1) hearts(cat);
  if (canAnimate()) gsap.timeline().to(cat.parts.eyes, { x: -6, scaleY: 0.6, transformOrigin: '50% 50%', duration: 0.15 }).to(cat.parts.eyes, { x: 0, scaleY: 1, duration: 0.2 }, 1);
  jealous(cat);
}

// Blue is needy: pet someone else (a roaming cat or a portrait) and he comes running.
let jealousCool = 0;
let blueNeedyUntil = 0;
function jealous(target: Cat) {
  jealousTo(target.perch, target.px, { x: target.x, y: target.y });
}
function jealousTo(p: Perch | null, tpx: number, at: Pt) {
  const blue = cats.find((c) => c.name === 'blue');
  const now = performance.now();
  if (!blue || now < jealousCool || laserOn) return;
  jealousCool = now + 2500;
  blueNeedyUntil = now + 6000;
  // Already next to them: just push in for attention.
  if (Math.hypot(blue.x - at.x, blue.y - at.y) < 170 && blue.state !== 'move') {
    blue.facing = at.x > blue.x ? 1 : -1;
    say(blue, ['Me too!', 'Pat ME.', 'Ahem.'][Math.floor(Math.random() * 3)], 1600);
    if (canAnimate()) gsap.timeline().to(blue.svg, { x: blue.facing * 10, duration: 0.2, yoyo: true, repeat: 3, ease: 'sine.inOut' });
    findSecret('jealous');
    return;
  }
  const side = at.x > vw() / 2 ? -1 : 1;
  const px = p ? gsap.utils.clamp(0.05, 0.95, tpx + side * (p.any || p.kind === 'top' ? 0.16 : 0.3)) : 0.5;
  say(blue, ['Me too!', 'Pat ME.', 'Hey! What about me?'][Math.floor(Math.random() * 3)], 1800);
  goTo(blue, () => (p ? perchPoint(p, px) : { x: at.x + side * 80, y: at.y }), () => {
    if (p) { blue.perch = p; blue.px = px; p.occ.add(blue); }
    blue.state = p ? 'perch' : 'idle';
    blue.since = performance.now(); blue.hiddenSince = 0; blue.nextThink = blue.since + 10000;
    setPose(blue, 'stand');
    blue.facing = at.x > blue.x ? 1 : -1;
    say(blue, 'Pat me instead.');
    findSecret('jealous');
    if (canAnimate()) gsap.timeline().to(blue.svg, { x: blue.facing * 8, duration: 0.25, yoyo: true, repeat: 3, ease: 'sine.inOut' });
  }, SPEED.blue * 1.9);
}
// Petting the portraits in the Team section counts too.
on('petted', (el: HTMLElement) => {
  const p = perches.find((q) => q.el.contains(el)) ?? null;
  const r = el.getBoundingClientRect();
  jealousTo(p, 0.5, { x: r.left + r.width / 2, y: r.top });
});

// Zoe flees to the farthest spot she can see.
function runAway(cat: Cat) {
  if (cat.name === 'zoe' && windowPerch && cat.perch !== windowPerch && !windowPerch.occ.size && visible(windowPerch)) {
    windowPerch.occ.add(cat);
    goTo(cat, () => perchPoint(windowPerch, 0.5), () => arrive(cat, windowPerch), SPEED.zoe * 2.6);
    cat.perch = windowPerch; cat.px = 0.5;
    return;
  }
  const options = perches.filter((p) => p !== cat.perch && (p.any ? p.occ.size < 2 : !p.occ.size) && visible(p, p.kind === 'shelf' ? 0.84 : 0.5));
  if (!options.length) return choose(cat);
  const far = options.reduce((a, b) => {
    const da = perchPoint(a, 0.5), db = perchPoint(b, 0.5);
    return Math.hypot(db.x - cat.x, db.y - cat.y) > Math.hypot(da.x - cat.x, da.y - cat.y) ? b : a;
  });
  const px = far.kind === 'shelf' ? 0.84 : far.any ? 0.15 + Math.random() * 0.7 : 0.5;
  far.occ.add(cat);
  goTo(cat, () => perchPoint(far, px), () => arrive(cat, far), SPEED.zoe * 2.6);
  cat.perch = far; cat.px = px;
}

// ---------- toys, treats, laser, moods ----------
const pointer: Pt = { x: vw() / 2, y: vh() / 2 };
window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

// Yarn balls: throw as many as you like; Blue chases the nearest one, Zoe bats any that roll past.
interface Ball { el: HTMLElement; x: number; y: number; vx: number; vy: number; r: number; held: boolean; thrown: boolean; rot: number }
const balls: Ball[] = [];
const MAX_BALLS = 8;
const YARN_COLORS = ['#C98B7E', '#E0B98F', '#6F8DB5', '#C2CB8C', '#B3A25C'];
const yarnSVG = (_c: string) => `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#E8893A" stroke="#26211D" stroke-width="2.5"/><circle cx="14" cy="13" r="4.5" fill="#fff" opacity=".35"/></svg>`;
function spawnYarn(from?: DOMRect) {
  const el = document.createElement('div');
  el.className = 'yarn'; el.innerHTML = yarnSVG(YARN_COLORS[balls.length % YARN_COLORS.length]); el.dataset.cursor = 'Drag';
  fx.appendChild(el);
  const b: Ball = { el, x: (from?.left ?? vw() / 2) + 20, y: (from?.top ?? vh() - 100) - 30, vx: (Math.random() < 0.5 ? -1 : 1) * (250 + Math.random() * 450), vy: -800 - Math.random() * 400, r: 19, held: false, thrown: true, rot: 0 };
  let last = { x: 0, y: 0, t: 0 };
  el.addEventListener('pointerdown', (e) => { b.held = true; el.setPointerCapture(e.pointerId); last = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  el.addEventListener('pointermove', (e) => {
    if (!b.held) return;
    const now = performance.now(), dt = Math.max(1, now - last.t) / 1000;
    b.vx = (e.clientX - last.x) / dt; b.vy = (e.clientY - last.y) / dt; b.x = e.clientX; b.y = e.clientY;
    last = { x: e.clientX, y: e.clientY, t: now };
  });
  el.addEventListener('pointerup', () => { b.held = false; b.thrown = true; });
  balls.push(b);
  if (balls.length > MAX_BALLS) { const old = balls.shift()!; gsap.to(old.el, { scale: 0, duration: 0.3, onComplete: () => old.el.remove() }); }
  const blue = cats.find((c) => c.name === 'blue');
  if (blue) say(blue, balls.length > 2 ? 'SO MANY.' : 'MINE.', 1200);
}

// Laser: the dot moves on its own (darts, pauses, escapes); cats chase it at their own pace.
let laserOn = false, laserSince = 0;
let laserDot: HTMLElement | null = null;
const laser = { x: 0, y: 0, tx: 0, ty: 0, speed: 1000, pauseUntil: 0, hist: [] as Array<{ t: number; x: number; y: number }> };
const CHASE: Record<Name, { delay: number; speed: number; off: number }> = {
  blue: { delay: 0.18, speed: 640, off: 0 }, zoe: { delay: 0.36, speed: 520, off: 52 }, spooky: { delay: 0.6, speed: 360, off: -56 },
};
let spookyLazy = false, lazyFlip = 0;
const pounceAt = new Map<Cat, number>();
function laserTarget(far: boolean) {
  const minY = 120, maxY = tlTop() - 14;
  if (far) { laser.tx = 60 + Math.random() * (rightWall() - 120); laser.ty = minY + Math.random() * (maxY - minY); }
  else { laser.tx = gsap.utils.clamp(60, rightWall() - 60, laser.x + (Math.random() - 0.5) * 440); laser.ty = gsap.utils.clamp(minY, maxY, laser.y + (Math.random() - 0.5) * 300); }
  laser.speed = 650 + Math.random() * 950;
}
export function toggleLaser(force?: boolean) {
  laserOn = force ?? !laserOn;
  document.documentElement.classList.toggle('laser-on', laserOn);
  document.querySelector('[data-toy="laser"]')?.setAttribute('aria-pressed', String(laserOn));
  if (laserOn) {
    laserDot = document.createElement('div'); laserDot.className = 'laser'; fx.appendChild(laserDot);
    laserSince = performance.now();
    laser.x = vw() * 0.5; laser.y = Math.min(vh() * 0.6, tlTop() - 40); laser.hist = []; laser.pauseUntil = performance.now() + 500;
    laserTarget(true);
    cats.forEach((c, i) => {
      if (c.state === 'held' || c.state === 'fall') return;
      leave(c); c.move = null; c.state = 'busy';
      setPose(c, 'stand'); c.belly = false;
      setTimeout(() => say(c, ['!!', 'DOT.', '…hm.'][i], 900), i * 200);
    });
    cats.forEach((c) => { if (c.state !== 'held' && c.state !== 'fall') c.state = 'chase'; });
  } else {
    laserDot?.remove(); laserDot = null;
    cats.forEach((c) => { c.move = null; c.state = 'idle'; gsap.set(c.svg, { y: 0 }); c.parts.legs.forEach((l) => gsap.set(l, { rotation: 0 })); });
  }
}
function laserTick(now: number, dt: number) {
  if (!laserDot) return;
  // The dot
  if (now < laser.pauseUntil) {
    laser.x += (Math.random() - 0.5) * 3; laser.y += (Math.random() - 0.5) * 3; // hand jitter
  } else {
    const dx = laser.tx - laser.x, dy = laser.ty - laser.y, d = Math.hypot(dx, dy);
    const step = Math.min(d, laser.speed * dt);
    if (d > 1) { laser.x += (dx / d) * step; laser.y += (dy / d) * step; }
    if (d < 4) { laser.pauseUntil = now + 150 + Math.random() * 750; laserTarget(Math.random() < 0.35); }
  }
  laser.hist.push({ t: now, x: laser.x, y: laser.y });
  while (laser.hist.length && now - laser.hist[0].t > 1500) laser.hist.shift();
  gsap.set(laserDot, { x: laser.x, y: laser.y });
  if (now - laserSince > 4000) findSecret('laser');
  if (now > lazyFlip) { spookyLazy = Math.random() < 0.45; lazyFlip = now + 2500 + Math.random() * 2500; }

  const sample = (delay: number) => {
    const t = now - delay * 1000;
    return laser.hist.find((h) => h.t >= t) ?? { x: laser.x, y: laser.y };
  };
  const chasers = cats.filter((c) => c.state === 'chase');
  chasers.forEach((c) => {
    const cfg = CHASE[c.name];
    if (c.name === 'spooky' && spookyLazy) {
      // Just watches it.
      c.facing = laser.x > c.x ? 1 : -1;
      gsap.to(c.parts.head, { rotation: gsap.utils.clamp(-14, 14, (laser.y - c.y) / 12), duration: 0.3, overwrite: 'auto' });
      c.parts.legs.forEach((l) => gsap.set(l, { rotation: 0 }));
      gsap.set(c.svg, { y: 0 });
      return;
    }
    const tgt = sample(cfg.delay);
    const tx = tgt.x + cfg.off, ty = Math.min(tgt.y + 8, tlTop());
    const dx = tx - c.x, dy = ty - c.y, d = Math.hypot(dx, dy);
    const step = Math.min(d, cfg.speed * dt);
    if (d > 2) { c.x += (dx / d) * step; c.y += (dy / d) * step; c.facing = dx > 0 ? 1 : -1; }
    const moving = d > 6;
    c.phase += dt * (moving ? 18 : 4);
    c.parts.legs.forEach((l, i) => gsap.set(l, { rotation: moving ? Math.sin(c.phase + (i < 2 ? Math.PI : 0) + (i % 2 ? Math.PI : 0)) * 32 : 0, transformOrigin: '50% 0%' }));
    gsap.set(c.svg, { y: moving ? -Math.abs(Math.sin(c.phase * 0.5)) * 12 : 0 });
    // Pounce when close to the real dot (and the dot escapes).
    const real = Math.hypot(laser.x - c.x, laser.y - c.y);
    if (real < 50 && now > (pounceAt.get(c) ?? 0)) {
      pounceAt.set(c, now + 900);
      gsap.fromTo(c.parts.legs[3], { rotation: 0 }, { rotation: -60, duration: 0.1, yoyo: true, repeat: 1, transformOrigin: '50% 0%' });
      laser.pauseUntil = 0; laserTarget(true); laser.speed = 1700;
      if (Math.random() < 0.3) say(c, ['Missed.', 'ALMOST.', 'Where’d it go?'][Math.floor(Math.random() * 3)], 900);
    }
  });
  // Keep them apart.
  for (let i = 0; i < chasers.length; i++) for (let j = i + 1; j < chasers.length; j++) {
    const a = chasers[i], b = chasers[j];
    const dx = b.x - a.x, d = Math.abs(dx);
    if (d < 80 && Math.abs(b.y - a.y) < 50) { const push = (80 - d) / 2 * (dx >= 0 ? 1 : -1); a.x -= push; b.x += push; }
  }
}

// Treats: drop as many tins of pâté as you like; each cat races to the nearest free one.
interface Treat { el: HTMLElement; x: number; y: number; claimed: Cat | null; eaten: boolean }
const treats: Treat[] = [];
const eating = new Map<Cat, Treat>();
const FISH = `<svg viewBox="0 0 40 40"><path d="M5 19 v9 q0 6 15 6 q15 0 15 -6 v-9" fill="#C9CDD1" stroke="#26211D" stroke-width="2.2"/><path d="M5.5 22 q14.5 5 29 0 v5 q-14.5 5 -29 0 z" fill="#E0B98F"/><ellipse cx="20" cy="19" rx="15" ry="6" fill="#B9806E" stroke="#26211D" stroke-width="2.2"/><path d="M12 18 q4 -3 8 0 q4 3 8 0" fill="none" stroke="#8A5A4C" stroke-width="1.6" stroke-linecap="round"/><circle cx="20" cy="27" r="1.6" fill="#26211D"/><circle cx="17.4" cy="25" r=".9" fill="#26211D"/><circle cx="22.6" cy="25" r=".9" fill="#26211D"/></svg>`; // a little tin of pâté
function dropTreat() {
  if (treats.length >= 8) return;
  const el = document.createElement('div');
  el.className = 'treat'; el.innerHTML = FISH;
  fx.appendChild(el);
  const x = 100 + Math.random() * (rightWall() - 200), y = tlTop() - 2;
  const t: Treat = { el, x, y, claimed: null, eaten: false };
  treats.push(t);
  gsap.fromTo(el, { x: x - 17, y: -40, rotation: -40 }, { y: y - 30, rotation: 0, duration: canAnimate() ? 0.9 : 0, ease: 'bounce.out' });
  if (treats.length === 1) cats.forEach((c, i) => say(c, ['FOOD.', 'Mine!', '…pâté?'][i], 1200));
  assignTreats();
}
function assignTreats() {
  cats.forEach((c) => {
    if (laserOn || eating.has(c)) return;
    const free = treats.filter((t) => !t.eaten && !t.claimed);
    if (!free.length) return;
    const t = free.reduce((a, b) => (Math.hypot(b.x - c.x, b.y - c.y) < Math.hypot(a.x - c.x, a.y - c.y) ? b : a));
    t.claimed = c; eating.set(c, t);
    goTo(c, () => ({ x: t.x - c.facing * 20, y: t.y }), () => eatTreat(c, t), SPEED[c.name] * 1.8);
  });
}
function eatTreat(cat: Cat, t: Treat) {
  cat.state = 'idle'; cat.nextThink = performance.now() + 2500;
  eating.delete(cat);
  if (t.eaten) { say(cat, 'Hey!'); return assignTreats(); }
  t.eaten = true;
  treats.splice(treats.indexOf(t), 1);
  say(cat, 'nom nom', 1200);
  gsap.to(t.el, { scale: 0, duration: 0.5, delay: 0.3, onComplete: () => t.el.remove() });
  findSecret('treat');
  setTimeout(assignTreats, 700);
}
function feedBowl(bowl: HTMLElement) {
  const kib = bowl.querySelector('[data-kibble]');
  if (kib) gsap.to(kib, { opacity: 1, duration: 0.2 });
  findSecret('dinner');
  cats.forEach((c, i) => setTimeout(() => {
    say(c, ['Dinner!', 'Finally.', 'About time.'][i]);
    goTo(c, () => { const r = bowl.getBoundingClientRect(); return { x: r.left + r.width / 2 + (i - 1) * 46, y: r.top + r.height * 0.4 }; }, () => {
      c.state = 'idle'; c.nextThink = performance.now() + 3000;
      setTimeout(() => kib && gsap.to(kib, { opacity: 0, duration: 0.6 }), 3500);
    }, SPEED[c.name] * 1.6);
  }, 200 * i));
}

// Nap when the visitor is idle.
let lastInput = performance.now(), napping = false;
const awake = document.querySelector('[data-awake]') as HTMLElement | null;
function wake() {
  lastInput = performance.now();
  if (!napping) return;
  napping = false;
  gsap.to('[data-dim]', { opacity: 0, duration: 0.6 });
  cats.forEach((c) => { if (c.pose === 'sleep' && c.perch?.kind !== 'bed') setPose(c, 'loaf'); });
  if (awake) awake.textContent = '3/3 cats awake';
}
['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart'].forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
function nap() {
  napping = true;
  gsap.to('[data-dim]', { opacity: 0.22, duration: 2 });
  cats.forEach((c) => { if (c.state === 'perch') setPose(c, 'sleep'); });
  if (awake) awake.textContent = '0/3 cats awake';
  findSecret('nap');
}
function zz(cat: Cat) {
  const r = cat.el.getBoundingClientRect();
  const z = document.createElement('span');
  z.className = 'zz'; z.textContent = 'z';
  Object.assign(z.style, { left: `${r.left + r.width * 0.75}px`, top: `${r.top + r.height * 0.2}px`, color: 'currentColor', position: 'fixed', zIndex: '46' });
  document.body.appendChild(z);
  gsap.to(z, { x: 20, y: -40, opacity: 0, scale: 1.6, duration: 2, ease: 'sine.out', onComplete: () => z.remove() });
}

// Zoomies on very fast scrolling.
let zoomCool = 0;
on('scroll-speed', (v: number) => {
  const now = performance.now();
  if (Math.abs(v) < 70 || now < zoomCool) return;
  zoomCool = now + 12000;
  findSecret('zoomies');
  cats.forEach((c, i) => {
    say(c, ['ZOOM', 'AAAA', '!!!'][i], 1200);
    const side = Math.random() < 0.5 ? -160 : vw() + 160;
    goTo(c, () => ({ x: side, y: Math.min(c.y, tlTop()) }), () => { c.state = 'idle'; c.nextThink = 0; }, 900);
  });
});
on('konami', () => {
  cats.forEach((c, i) => setTimeout(() => {
    say(c, 'NINE LIVES');
    if (canAnimate()) gsap.timeline().to(c.svg, { y: -90, rotation: 360, duration: 0.6, ease: 'power2.out' }).to(c.svg, { y: 0, rotation: 0, duration: 0.5, ease: 'bounce.out' });
    hearts(c, '✦', '#E0B98F');
  }, i * 150));
});
// New section on screen: cats waiting on the timeline go explore it.
on('zone', () => {
  const now = performance.now();
  cats.forEach((c) => { if (c.perch === timelinePerch || c.state === 'idle') c.nextThink = Math.min(c.nextThink, now + 400 + Math.random() * 1800); });
});
// End of the page: the cats point you to the tape they filmed.
on('tape-end', () => {
  const lines: Record<Name, string> = { blue: 'We filmed you! Watch your cut ↓', zoe: 'Your tape is below. You’re welcome.', spooky: '…I’m in it.' };
  cats.forEach((c, i) => setTimeout(() => c.state !== 'held' && say(c, lines[c.name], 3600), 300 + i * 700));
});
on('copy', () => { const z = cats.find((c) => c.name === 'zoe'); if (z) say(z, 'Plagiarism.'); });
on('meow', () => cats.forEach((c, i) => setTimeout(() => say(c, ['meow', 'mrrp', '…meow.'][i]), i * 250)));


// ---------- picking cats up ----------
const HOLD_LINES: Record<Name, string[]> = {
  blue: ['prrr… yes.', 'Best day ever.', 'Hold me forever.', 'Don’t stop.'],
  zoe: ['MEOW!', 'MRRAOW!', 'Put. Me. Down.', 'MEEEOW.', 'I will bite.'],
  spooky: ['o_o', '…', 'please…', '*trembles*'],
};
function pickUp(c: Cat) {
  if (c.state === 'held') return;
  leave(c);
  c.move = null; c.state = 'held'; c.belly = false; c.clingUntil = 0; c.vy = 0; c.lastPx = pointer.x;
  eating.delete(c);
  c.el.style.clipPath = '';
  c.el.style.zIndex = '3';
  findSecret('carry', c.name);
  c.nextNoise = 0;
  if (c.name === 'spooky') { setPose(c, 'loaf'); gsap.to(c.parts.head, { rotation: 18, duration: 0.3 }); gsap.to(c.parts.eyes, { scaleY: 0.55, transformOrigin: '50% 50%', duration: 0.2 }); }
  else setPose(c, 'stand');
  if (c.name === 'blue') { gsap.to(c.parts.eyes, { opacity: 0, duration: 0.2 }); gsap.to(c.parts.sleep, { opacity: 1, duration: 0.2 }); }
  say(c, HOLD_LINES[c.name][0], 1400);
}
function release(c: Cat) {
  if (c.state !== 'held') return;
  if (c.name === 'blue' && !c.clingUntil) {
    // He doesn't want to leave: hangs on to the cursor a little longer.
    c.clingUntil = performance.now() + 1800;
    say(c, 'No. Not leaving.', 1600);
    return;
  }
  drop(c);
}
function drop(c: Cat) {
  c.state = 'fall'; c.vy = 0; c.clingUntil = 0;
}
function land(c: Cat, p: Perch | null) {
  c.el.style.zIndex = '';
  gsap.to(c.svg, { rotation: 0, duration: 0.3 });
  c.parts.legs.forEach((l) => gsap.set(l, { rotation: 0 }));
  gsap.to(c.parts.eyes, { opacity: 1, scaleY: 1, duration: 0.2 });
  gsap.to(c.parts.sleep, { opacity: 0, duration: 0.2 });
  gsap.to(c.parts.head, { rotation: 0, duration: 0.3 });
  if (canAnimate()) gsap.fromTo(c.svg, { scaleY: 0.78, scaleX: 1.12 }, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)', transformOrigin: '50% 96%' });
  if (p) {
    const r = p.el.getBoundingClientRect();
    c.perch = p; p.occ.add(c);
    c.px = p.any || p.kind === 'top' ? gsap.utils.clamp(0.05, 0.95, (c.x - r.left) / r.width) : p.kind === 'shelf' ? 0.84 : 0.5;
    c.state = 'perch'; c.since = performance.now(); c.hiddenSince = 0; c.nextThink = c.since + 8000;
    setPose(c, p.kind === 'box' || p.kind === 'window' ? 'loaf' : 'stand');
  } else { c.perch = null; c.state = 'idle'; c.nextThink = performance.now() + 6000; }
  if (c.name === 'zoe') { say(c, 'Hmph.'); setTimeout(() => runAway(c), 450); }
  if (c.name === 'blue') { say(c, 'Again? Again!'); }
  if (c.name === 'spooky') {
    say(c, '…', 1500);
    if (canAnimate()) gsap.fromTo(c.svg, { x: -1.5 }, { x: 1.5, duration: 0.05, repeat: 30, yoyo: true, onComplete: () => { gsap.set(c.svg, { x: 0 }); hide(c); } });
    else hide(c);
  }
}
// Spooky goes to hide in the nearest box or bed after being carried.
function hide(c: Cat) {
  if (c.state !== 'perch' && c.state !== 'idle') return;
  const spots = perches.filter((p) => (p.kind === 'box' || p.kind === 'bed') && !p.occ.size && visible(p));
  if (!spots.length) return;
  const near = spots.reduce((a, b) => (Math.hypot(perchPoint(b, 0.5).x - c.x, perchPoint(b, 0.5).y - c.y) < Math.hypot(perchPoint(a, 0.5).x - c.x, perchPoint(a, 0.5).y - c.y) ? b : a));
  sitOn(c, near, 0.5);
}
function carryTick(c: Cat, now: number, dt: number, h: number) {
  if (c.state === 'held') {
    if (c.clingUntil && now > c.clingUntil) { drop(c); return; }
    const vx = (pointer.x - c.lastPx) / Math.max(dt, 0.001);
    c.lastPx = pointer.x;
    c.x = pointer.x; c.y = pointer.y + h * 0.78;
    gsap.to(c.svg, { rotation: gsap.utils.clamp(-28, 28, -vx * 0.03), transformOrigin: '70% 10%', duration: 0.25, overwrite: 'auto' });
    c.phase += dt * (c.name === 'zoe' ? 26 : 5);
    c.parts.legs.forEach((l, i) => gsap.set(l, { rotation: c.name === 'zoe' ? Math.sin(c.phase + i * 1.7) * 45 : c.name === 'blue' ? Math.sin(c.phase + i) * 6 : 0, transformOrigin: '50% 0%' }));
    if (c.name === 'spooky') gsap.set(c.svg, { x: (Math.random() - 0.5) * 3 });
    if (now > c.nextNoise) {
      c.nextNoise = now + (c.name === 'zoe' ? 1100 : 1900);
      const lines = HOLD_LINES[c.name];
      say(c, lines[Math.floor(Math.random() * lines.length)], c.name === 'zoe' ? 900 : 1500);
      if (c.name === 'blue') hearts(c);
    }
    return;
  }
  // Falling: gravity until a surface under the cat (or the timeline).
  const prevY = c.y;
  c.vy += 2600 * dt;
  c.y += c.vy * dt;
  gsap.set(c.svg, { rotation: 0 });
  for (const p of perches) {
    if (p.occ.size && !p.any) continue;
    const r = p.el.getBoundingClientRect();
    if (c.x < r.left - 10 || c.x > r.right + 10 || hiddenByScene(p.el)) continue;
    const px = p.any || p.kind === 'top' ? gsap.utils.clamp(0.05, 0.95, (c.x - r.left) / r.width) : p.kind === 'shelf' ? 0.84 : 0.5;
    const pt = perchPoint(p, px);
    if (prevY <= pt.y && c.y >= pt.y && Math.abs(pt.x - c.x) < Math.max(60, r.width)) { c.y = pt.y; c.x = pt.x; land(c, p); return; }
  }
  const floor = tlTop();
  if (c.y >= floor) { c.y = floor; land(c, railIsBar() ? timelinePerch ?? null : null); }
}

// Hovering a staff badge: that cat comes over and comments on it.
const BADGE_LINES: Record<Name, string[]> = {
  blue: ['That’s me!', 'Head of calm. Mostly naps.', 'Read it. Then pat me.'],
  spooky: ['I’ve been here the whole time.', 'QA report: it’s fine.', '…that photo is old.'],
  zoe: ['Don’t read that.', 'I approved this card. Barely.', 'Creative director. Obviously.'],
};
const badgeCool = new Map<Name, number>();
// On their badge, each cat offers to show a real photo of themselves.
const OFFER: Record<Name, string> = { blue: 'Wanna see a real photo of me?', spooky: '…there’s a photo of me. If you want.', zoe: 'Fine. You may see my photo.' };
const offerUntil = new Map<Name, number>();
function offerPhoto(c: Cat) {
  if (c.state === 'held' || c.state === 'fall') return;
  offerUntil.set(c.name, performance.now() + 6000);
  const b = c.bubble;
  b.innerHTML = '';
  b.append(OFFER[c.name], Object.assign(document.createElement('button'), { type: 'button', className: 'bubble__btn', textContent: 'Show me' }));
  b.classList.add('is-offer');
  b.querySelector('button')!.addEventListener('pointerdown', (e) => { e.stopPropagation(); showPhoto(c); });
  gsap.to(b, { opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)', overwrite: true });
  gsap.to(b, { opacity: 0, scale: 0.6, duration: 0.2, delay: 6, overwrite: false, onComplete: () => b.classList.remove('is-offer') });
}
function showPhoto(c: Cat) {
  offerUntil.delete(c.name);
  c.bubble.classList.remove('is-offer');
  gsap.to(c.bubble, { opacity: 0, scale: 0.6, duration: 0.15, overwrite: true });
  emit('photo-show', { name: c.name, from: c.el.getBoundingClientRect() });
  setTimeout(() => say(c, { blue: 'Handsome, right?', spooky: '…', zoe: 'Don’t stare.' }[c.name], 2400), 400);
}
function summonToBadge(el: HTMLElement) {
  const name = el.dataset.crew as Name;
  const c = cats.find((k) => k.name === name);
  const now = performance.now();
  if (!c || laserOn || c.state === 'held' || c.state === 'fall' || now < (badgeCool.get(name) ?? 0)) return;
  badgeCool.set(name, now + 5000);
  const line = BADGE_LINES[name][Math.floor(Math.random() * BADGE_LINES[name].length)];
  if (name === 'spooky' && now < c.sulkUntil) return say(c, 'Not talking to you.');
  const p = perches.find((q) => q.el === el);
  const offer = () => setTimeout(() => offerPhoto(c), 2300);
  if (!p) { say(c, line, 2100); return offer(); }
  if (c.perch === p && c.state === 'perch') { say(c, line, 2100); return offer(); }
  const px = 0.25 + Math.random() * 0.5;
  p.occ.add(c);
  goTo(c, () => perchPoint(p, px), () => { arrive(c, p); c.px = px; say(c, line, 2100); offer(); c.facing = pointer.x > c.x ? 1 : -1; }, SPEED[name] * 1.7);
  c.perch = p; c.px = px;
  say(c, '!', 700);
}

// ---------- Zoe's window: a hammock stuck to the glass, always on the left ----------
function initWindow(p: Perch, zoe: Cat) {
  const el = p.el;
  const h = new Date().getHours();
  el.dataset.time = h >= 21 || h < 6 ? 'night' : h < 9 ? 'dawn' : h < 18 ? 'day' : 'dusk';
  const hammock = el.querySelector<SVGGElement>('[data-hammock]');
  const sway = hammock && !reducedMotion
    ? gsap.fromTo(hammock, { rotation: -1.6 }, { rotation: 1.6, transformOrigin: '50% 0%', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    : null;
  const cloud = el.querySelector('[data-cloud]');
  const drift = cloud && !reducedMotion ? gsap.fromTo(cloud, { x: -60 }, { x: 90, duration: 38, ease: 'none', repeat: -1 }) : null;
  onPause((paused) => [sway, drift].forEach((t) => t && (paused ? t.pause() : t.resume())));

  // A bird flies past now and then; Zoe chatters at it.
  const bird = el.querySelector<SVGGElement>('[data-bird]');
  const flyBy = () => {
    window.setTimeout(flyBy, 16000 + Math.random() * 16000);
    if (!bird || !canAnimate() || el.dataset.time === 'night') return;
    const home = zoe.perch === p && zoe.state === 'perch';
    gsap.timeline()
      .set(bird, { opacity: 1, x: -30, y: 40 + Math.random() * 40 })
      .to(bird, { x: 170, duration: 2.6, ease: 'none' })
      .to(bird, { y: '-=24', duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0)
      .set(bird, { opacity: 0 });
    if (home) {
      gsap.timeline().to(zoe.parts.head, { rotation: -18, transformOrigin: '50% 80%', duration: 0.3 }).to(zoe.parts.head, { rotation: 0, duration: 0.5, delay: 2 });
      window.setTimeout(() => { say(zoe, 'ek ek ek ek', 1600); findSecret('bird'); }, 600);
    }
  };
  window.setTimeout(flyBy, 9000);

  // Knocking on the glass: Zoe comes home, or tells you off for disturbing her.
  el.addEventListener('click', () => {
    if (zoe.perch === p && zoe.state === 'perch') return say(zoe, ['This is MY window.', 'I’m busy. Birds.', 'Shh.'][Math.floor(Math.random() * 3)]);
    if (zoe.state === 'held' || zoe.state === 'fall' || laserOn) return;
    const other = [...p.occ].find((c) => c !== zoe);
    if (other) { say(zoe, 'Move.'); leave(other); other.nextThink = 0; other.state = 'idle'; }
    p.occ.add(zoe);
    goTo(zoe, () => perchPoint(p, 0.5), () => arrive(zoe, p), SPEED.zoe * 1.8);
    zoe.perch = p; zoe.px = 0.5;
  });
}

// ---------- the team room: drag the furniture and hand it to a cat ----------
// Drop a box next to a cat and they get in, a bed and they nap, the post and they
// scratch it, the bowl and it's dinner. Dropped away from everyone, the cat who
// likes that thing most comes over anyway.
const FAN: Record<string, Name> = { box: 'blue', bed: 'spooky', post: 'zoe', bowl: 'blue' };
const GIFT_LINES: Record<string, Record<Name, string>> = {
  box: { blue: 'MY box.', spooky: '…safe in here.', zoe: 'Acceptable.' },
  bed: { blue: 'Ooh, warm.', spooky: 'zzz', zoe: 'Finally, some respect.' },
  post: { blue: 'scritch scritch', spooky: '…scratch.', zoe: 'Better than the sofa. Barely.' },
};
function scratch(c: Cat, post: HTMLElement) {
  const at = () => { const r = post.getBoundingClientRect(); const left = c.x < r.left + r.width / 2; return { x: left ? r.left - c.w * scale() * 0.32 : r.right + c.w * scale() * 0.32, y: r.bottom - 2 }; };
  goTo(c, at, () => {
    const r = post.getBoundingClientRect();
    c.facing = c.x < r.left + r.width / 2 ? 1 : -1;
    c.state = 'busy';
    setPose(c, 'stand');
    say(c, GIFT_LINES.post[c.name], 2200);
    const [, , a, b] = c.parts.legs;
    const tl = gsap.timeline({ onComplete: () => { gsap.set([a, b], { rotation: 0 }); c.state = 'idle'; c.nextThink = performance.now() + 2500; } });
    if (canAnimate()) {
      tl.to(c.parts.upper, { rotation: -14, transformOrigin: '80% 100%', duration: 0.25 });
      for (let k = 0; k < 6; k++) {
        tl.to(a, { rotation: -80 - (k % 2) * 20, transformOrigin: '50% 0%', duration: 0.14 }).to(b, { rotation: -70 - (k % 2) * 20, transformOrigin: '50% 0%', duration: 0.14 }, '<0.07');
        tl.to([a, b], { rotation: -40, duration: 0.14 });
        tl.call(() => shavings(post));
      }
      tl.to(c.parts.upper, { rotation: 0, duration: 0.3 });
    } else tl.to({}, { duration: 1.5 });
  }, SPEED[c.name] * 1.5);
}
function shavings(post: HTMLElement) {
  const r = post.getBoundingClientRect();
  for (let k = 0; k < 3; k++) {
    const s = document.createElement('i');
    s.className = 'shaving';
    fx.appendChild(s);
    gsap.fromTo(s, { x: r.left + r.width * (0.3 + Math.random() * 0.4), y: r.top + r.height * (0.3 + Math.random() * 0.4), opacity: 1 },
      { x: `+=${(Math.random() - 0.5) * 60}`, y: r.bottom - 4, rotation: Math.random() * 360, opacity: 0, duration: 0.9, ease: 'power1.in', onComplete: () => s.remove() });
  }
}
function giveProp(el: HTMLElement, kind: string) {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const free = cats.filter((c) => c.state !== 'held' && c.state !== 'fall' && !(c.name === 'spooky' && performance.now() < c.sulkUntil));
  if (!free.length) return;
  const near = free.map((c) => ({ c, d: Math.hypot(c.x - cx, c.y - cy) })).sort((x, y) => x.d - y.d)[0];
  const c = near.d < 220 ? near.c : free.find((k) => k.name === FAN[kind]) ?? near.c;
  findSecret('gift');
  if (kind === 'bowl') return feedBowl(el);
  if (kind === 'post') return scratch(c, el);
  const p = perches.find((q) => q.el === el);
  if (!p) return;
  [...p.occ].filter((o) => o !== c).forEach((o) => { leave(o); o.state = 'idle'; o.nextThink = 0; });
  say(c, '!', 600);
  p.occ.add(c);
  goTo(c, () => perchPoint(p, 0.5), () => { arrive(c, p); say(c, GIFT_LINES[kind][c.name], 2400); c.nextThink = performance.now() + 14000; }, SPEED[c.name] * 1.6);
  c.perch = p; c.px = 0.5;
}
function initFurniture() {
  document.querySelectorAll<HTMLElement>('.team__room .prop').forEach((el) => {
    const kind = el.dataset.prop ?? '';
    el.classList.add('is-draggable');
    el.dataset.cursor = 'Drag';
    el.style.touchAction = 'none';
    let start: Pt | null = null, base = { x: 0, y: 0 }, moved = false;
    el.addEventListener('pointerdown', (e) => {
      start = { x: e.clientX, y: e.clientY };
      base = { x: Number(gsap.getProperty(el, 'x')) || 0, y: Number(gsap.getProperty(el, 'y')) || 0 };
      moved = false;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) { moved = true; el.classList.add('is-dragging'); }
      const room = el.parentElement!.getBoundingClientRect(), r0 = el.getBoundingClientRect();
      const minX = base.x + room.left - (r0.left - (Number(gsap.getProperty(el, 'x')) - base.x));
      const x = gsap.utils.clamp(minX, minX + room.width - r0.width, base.x + dx);
      gsap.set(el, { x, y: Math.min(0, base.y + dy), rotation: gsap.utils.clamp(-12, 12, (e.movementX || 0) * 0.8) });
    });
    const up = () => {
      if (!start) return;
      start = null;
      el.classList.remove('is-dragging');
      if (!moved) return;
      el.dataset.dragged = '1';
      setTimeout(() => delete el.dataset.dragged, 50);
      gsap.to(el, { y: 0, rotation: 0, duration: canAnimate() ? 0.6 : 0, ease: 'bounce.out', onComplete: () => giveProp(el, kind) });
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  });
}

// ---------- main loop ----------
export function initRoam() {
  const blue = makeCat('blue'), spooky = makeCat('spooky'), zoe = makeCat('zoe');
  const find = (sel: string) => perches.find((p) => p.el.matches(sel));
  const start: Array<[Cat, Perch | undefined, number]> = [
    [spooky, find('[data-monitor]'), 0.88],
    [blue, find('.desk-box'), 0.5],
    [zoe, windowPerch ?? find('.hero-shelf'), windowPerch ? 0.5 : 0.84],
  ];
  if (windowPerch && !visible(windowPerch)) start[2] = [zoe, find('.hero-shelf'), 0.84];
  start.forEach(([c, p, px], i) => {
    if (!p) return;
    c.perch = p; c.px = px; p.occ.add(c);
    const pt = perchPoint(p, px);
    c.x = pt.x; c.y = pt.y;
    if (reducedMotion) arrive(c, p);
    else setTimeout(() => arrive(c, p), 3800 + i * 300);
    c.state = 'perch'; c.since = performance.now(); c.nextThink = c.since + 9000 + i * 2500;
  });

  if (windowPerch && windowPerch.el.getBoundingClientRect().width) initWindow(windowPerch, zoe);

  document.querySelectorAll<HTMLElement>('[data-toy]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.toy;
    if (t === 'yarn') spawnYarn(b.getBoundingClientRect());
    if (t === 'laser') toggleLaser();
    if (t === 'treat') dropTreat();
  }));
  document.querySelectorAll<HTMLElement>('[data-prop="bowl"]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.dragged !== '1') feedBowl(b); }));
  initFurniture();
  document.querySelectorAll<HTMLElement>('[data-crew]').forEach((el) => el.addEventListener('pointerenter', () => summonToBadge(el)));

  let prev = performance.now();
  let nextZ = 0;
  gsap.ticker.add(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const animate = canAnimate();

    if (animate && !napping && now - lastInput > 25000) nap();

    if (laserOn && animate) laserTick(now, dt);

    // Yarn physics (every ball)
    if (animate) balls.forEach((ball) => {
      const floor = tlTop();
      if (!ball.held) {
        ball.vy += 2200 * dt; ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.y > floor - ball.r) { ball.y = floor - ball.r; ball.vy *= -0.55; ball.vx *= 0.9; if (Math.abs(ball.vy) < 60) ball.vy = 0; }
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx *= -0.7; }
        if (ball.x > rightWall() - ball.r) { ball.x = rightWall() - ball.r; ball.vx *= -0.7; }
        if (ball.y >= floor - ball.r - 1) ball.vx *= 1 - 1.8 * dt;
      }
      // Balls bump into each other.
      balls.forEach((o) => {
        if (o === ball) return;
        const dx = o.x - ball.x, dy = o.y - ball.y, d = Math.hypot(dx, dy);
        if (d > 0 && d < ball.r + o.r) { const push = (ball.r + o.r - d) / 2; ball.x -= (dx / d) * push; ball.y -= (dy / d) * push; ball.vx -= (dx / d) * 40; }
      });
      ball.rot += ((ball.vx * dt) / ball.r) * 57.3;
      gsap.set(ball.el, { x: ball.x - ball.r, y: ball.y - ball.r, rotation: ball.rot });
    });

    cats.forEach((c) => {
      const s = scale();
      const w = c.w * s, h = w * (100 / 150);
      if (c.state === 'held' || c.state === 'fall') {
        carryTick(c, now, dt, h);
        gsap.set(c.el, { x: c.x - w / 2, y: c.y - h + h * 0.04 });
        gsap.set(c.svg, { scaleX: c.facing });
        return;
      }

      if (animate) {
        if (laserOn && c.state === 'chase') {
          gsap.set(c.el, { x: c.x - w / 2, y: c.y - h + h * 0.04 });
          gsap.set(c.svg, { scaleX: c.facing });
          return;
        }
        // Blue chases the nearest yarn ball on the floor; Zoe bats any that roll past her.
        const floorBalls = balls.filter((b) => !b.held && b.y > tlTop() - 80);
        if (floorBalls.length && !laserOn && !eating.has(c) && !(c.name === 'blue' && performance.now() < blueNeedyUntil)) {
          const ball = floorBalls.reduce((a, b) => (Math.abs(b.x - c.x) < Math.abs(a.x - c.x) ? b : a));
          const d = ball.x - c.x;
          if (c.name === 'blue' && Math.abs(d) > 40 && c.state !== 'move') goTo(c, () => ({ x: ball.x, y: tlTop() }), () => { c.state = 'idle'; c.nextThink = performance.now() + 4000; }, 520);
          else if ((c.name === 'blue' || c.name === 'zoe') && Math.abs(d) <= 40 && Math.abs(ball.y - c.y) < 60) {
            ball.vx = (d < 0 ? -1 : 1) * (380 + Math.random() * 380); ball.vy = -520 - Math.random() * 300;
            if (ball.thrown && c.name === 'blue') { findSecret('yarn'); ball.thrown = false; say(c, 'Again!', 900); }
            gsap.fromTo(c.parts.legs[3], { rotation: 0 }, { rotation: -50, transformOrigin: '50% 0%', duration: 0.12, yoyo: true, repeat: 1 });
          }
        }

        // Movement
        if (c.state === 'move' && c.move) {
          const m = c.move;
          m.t += dt / m.dur;
          const e = m.t >= 1 ? 1 : gsap.parseEase('power1.inOut')(m.t);
          const to = m.to();
          const nx = gsap.utils.interpolate(m.from.x, to.x, e);
          const ny = gsap.utils.interpolate(m.from.y, to.y, e) - m.arc * Math.sin(Math.PI * e);
          if (Math.abs(nx - c.x) > 0.3) c.facing = nx > c.x ? 1 : -1;
          c.x = nx; c.y = ny;
          // Walk cycle: diagonal legs move together, the body bobs and the head nods with each step.
          // In a jump the legs stretch out (front forward, back behind) and tuck in to land.
          const stride = Math.min(1, Math.hypot(to.x - m.from.x, to.y - m.from.y) / (m.dur * 120));
          c.phase += dt * (10 + stride * 8);
          if (m.arc) {
            const up = Math.sin(Math.PI * e);
            c.parts.legs.forEach((l, i) => gsap.set(l, { rotation: (i % 2 ? -1 : 1) * (12 + 38 * up) * (e < 0.5 ? 1 : -0.6), scaleY: 1, transformOrigin: '50% 0%' }));
            gsap.set(c.parts.upper, { rotation: (e < 0.5 ? -8 : 6) * up, transformOrigin: '50% 100%' });
          } else {
            c.parts.legs.forEach((l, i) => gsap.set(l, { rotation: Math.sin(c.phase + (i < 2 ? Math.PI : 0) + (i % 2 ? Math.PI : 0)) * 38, scaleY: 1, transformOrigin: '50% 0%' }));
            gsap.set(c.parts.upper, { y: -Math.abs(Math.sin(c.phase)) * 3, rotation: 0 });
            gsap.set(c.parts.head, { rotation: Math.sin(c.phase * 2) * 3, transformOrigin: '50% 80%' });
          }
          if (m.t >= 1) {
            c.move = null;
            c.parts.legs.forEach((l) => gsap.to(l, { rotation: 0, duration: 0.15 }));
            gsap.to(c.parts.upper, { y: 0, rotation: 0, duration: 0.2 });
            gsap.to(c.parts.head, { rotation: 0, duration: 0.2 });
            m.done();
          }
        } else if (c.perch && (c.state === 'perch' || c.state === 'busy')) {
          // Follow the perch as the page scrolls.
          const pt = perchPoint(c.perch, c.px);
          c.x = pt.x; c.y = pt.y;
          if (c.perch.kind === 'box') {
            const r = c.perch.el.getBoundingClientRect();
            const cut = Math.max(0, c.y - (r.top + r.height * 0.27));
            c.el.style.clipPath = `inset(-60px -60px ${cut}px -60px)`;
          }
          if (c.state === 'perch' && !napping && !laserOn) {
            const isVisible = visible(c.perch, c.px);
            if (!isVisible) {
              c.hiddenSince ||= now;
              if (now - c.hiddenSince > ({ blue: 900, zoe: 1500, spooky: 5000 }[c.name])) choose(c);
            } else {
              c.hiddenSince = 0;
              // Spooky warms up after 30 s in one spot and rolls over.
              if (c.name === 'spooky' && !c.belly && now - c.since > 30000) {
                c.belly = true; setPose(c, 'belly'); say(c, '…ok. You can stay.'); findSecret('belly'); emit('belly');
                c.nextThink = now + 20000;
              } else if (now > c.nextThink) choose(c);
            }
          }
        } else if (c.state === 'idle') choose(c);

        if (c.pose === 'sleep' && now > nextZ && !offscreen(c)) { zz(c); }
      }

      if (now < c.sulkUntil) c.facing = pointer.x > c.x ? -1 : 1;
      else if (c.sulkUntil && now >= c.sulkUntil) { c.sulkUntil = 0; gsap.to(c.parts.eyes, { opacity: 1, duration: 0.3 }); say(c, '…ok, I forgive you.'); }
      gsap.set(c.el, { x: c.x - w / 2, y: c.y - h + h * 0.04 });
      gsap.set(c.svg, { scaleX: c.facing });
    });
    if (now > nextZ) nextZ = now + 1400;
  });

  onPause((p) => cats.forEach((c) => say(c, p ? 'Paused.' : '…', 900)));
  window.addEventListener('resize', () => cats.forEach((c) => (c.el.style.width = `${c.w * scale()}px`)));
}
