// Blue, Spooky and Zoe on the page: always alive (breathing, tail, head and eyes
// following the cursor, blinks) and each with their own reactions.
import { gsap } from 'gsap';
import { canAnimate, findSecret, showToast, onPause, emit } from './state';

type CatName = 'blue' | 'spooky' | 'zoe';
const all = [...document.querySelectorAll<HTMLButtonElement>('[data-cat]')];
const byName = (n: CatName) => all.filter((c) => c.dataset.cat === n);
const idle = (cat: HTMLElement) => cat.querySelector<SVGGElement>('[data-pose="idle"]')!;
const part = (cat: HTMLElement, name: string) => idle(cat).querySelector<SVGGraphicsElement>(`[data-part="${name}"]`);
const reacting = (cat: HTMLElement) => cat.classList.contains('is-react');

// Where each tail is attached (in the tail's own bounding box).
const TAIL_ORIGIN: Record<CatName, string> = { blue: '100% 100%', spooky: '100% 85%', zoe: '0% 100%' };

// ---------- idle life ----------
const loops: gsap.core.Tween[] = [];
function rig(cat: HTMLElement) {
  const name = cat.dataset.cat as CatName;
  const body = part(cat, 'body');
  const tail = part(cat, 'tail');
  if (body) loops.push(gsap.to(body, { scaleY: 1.03, scaleX: 0.995, transformOrigin: '50% 100%', duration: 1.6 + Math.random() * 0.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: Math.random() }));
  if (tail) loops.push(gsap.fromTo(tail, { rotation: -6 }, { rotation: 7, transformOrigin: TAIL_ORIGIN[name], duration: name === 'zoe' ? 0.9 : 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: Math.random() }));
}
all.forEach(rig);
onPause((p) => loops.forEach((t) => (p ? t.pause() : t.resume())));

function blink(cat: HTMLElement, slow = false) {
  const eyes = part(cat, 'eyes');
  if (!eyes || reacting(cat) || !canAnimate()) return;
  gsap.timeline()
    .to(eyes, { scaleY: 0.08, transformOrigin: '50% 50%', duration: slow ? 0.25 : 0.07, ease: 'power2.in' })
    .to(eyes, { scaleY: 1, duration: slow ? 0.35 : 0.1, delay: slow ? 0.5 : 0.04, ease: 'power2.out' });
}
function twitch(cat: HTMLElement) {
  const head = part(cat, 'head');
  if (!head || reacting(cat) || !canAnimate()) return;
  gsap.timeline()
    .to(head, { rotation: '+=5', transformOrigin: '50% 80%', duration: 0.08 })
    .to(head, { rotation: '-=5', duration: 0.5, ease: 'elastic.out(1, 0.3)' });
}
function life(cat: HTMLElement) {
  window.setTimeout(() => {
    Math.random() < 0.75 ? blink(cat) : twitch(cat);
    life(cat);
  }, 2500 + Math.random() * 4500);
}
all.forEach(life);

// Head turns and pupils look at the cursor; only cats on screen are updated.
const visible = new Set<HTMLElement>();
const io = new IntersectionObserver((entries) => entries.forEach((e) => (e.isIntersecting ? visible.add(e.target as HTMLElement) : visible.delete(e.target as HTMLElement))));
all.forEach((c) => io.observe(c));
let pointer: { x: number; y: number } | null = null;
window.addEventListener('pointermove', (e) => (pointer = { x: e.clientX, y: e.clientY }), { passive: true });
gsap.ticker.add(() => {
  if (!pointer || !canAnimate()) return;
  visible.forEach((cat) => {
    if (reacting(cat) || cat.dataset.side === 'on') return;
    const head = part(cat, 'head');
    const pupils = part(cat, 'pupils');
    if (!head || !pupils) return;
    const r = head.getBoundingClientRect();
    const dx = pointer!.x - (r.left + r.width / 2);
    const dy = pointer!.y - (r.top + r.height * 0.6);
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 320);
    gsap.to(pupils, { x: (dx / d) * 3.5 * k, y: (dy / d) * 2.6 * k, duration: 0.35, overwrite: 'auto' });
    gsap.to(head, { rotation: gsap.utils.clamp(-9, 9, dx / 60), y: gsap.utils.clamp(-2, 3, dy / 200), transformOrigin: '50% 85%', duration: 0.6, overwrite: 'auto' });
  });
});

/** Swap pose with squash and stretch (instant when motion is off). */
function setPose(cat: HTMLElement, react: boolean) {
  if (reacting(cat) === react) return;
  const svg = cat.querySelector('svg')!;
  if (!canAnimate()) return void cat.classList.toggle('is-react', react);
  gsap.timeline()
    .to(svg, { scaleY: 0.86, scaleX: 1.07, duration: 0.12, ease: 'power2.in', transformOrigin: '50% 100%' })
    .add(() => cat.classList.toggle('is-react', react))
    .to(svg, { scaleY: 1.06, scaleX: 0.96, duration: 0.14, ease: 'power2.out' })
    .to(svg, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
}
function hearts(cat: HTMLElement, glyph = '♥') {
  if (!canAnimate()) return;
  const r = cat.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const h = document.createElement('span');
    h.textContent = glyph;
    h.setAttribute('aria-hidden', 'true');
    Object.assign(h.style, { position: 'fixed', left: `${r.left + r.width * (0.3 + Math.random() * 0.4)}px`, top: `${r.top + r.height * 0.3}px`, zIndex: '70', font: '700 22px var(--rz-font-display)', color: '#C98B7E', pointerEvents: 'none' });
    document.body.appendChild(h);
    gsap.to(h, { y: -60 - Math.random() * 50, x: (Math.random() - 0.5) * 60, rotation: (Math.random() - 0.5) * 50, opacity: 0, duration: 1 + Math.random() * 0.4, ease: 'power2.out', onComplete: () => h.remove() });
  }
}

// ---------- Blue: spoiled, calm. Hover → slow blink. Pat his bum → bum up, purr. ----------
export function patBlue(cat?: HTMLElement) {
  const targets = cat ? [cat] : byName('blue');
  targets.forEach((c) => {
    setPose(c, true);
    hearts(c);
    window.clearTimeout(Number(c.dataset.t));
    c.dataset.t = String(window.setTimeout(() => setPose(c, false), 2400));
  });
  findSecret('pat');
}
byName('blue').forEach((c) => {
  c.addEventListener('pointerenter', () => blink(c, true));
  c.addEventListener('click', () => patBlue(c));
});

// ---------- Spooky: stays put. After ~30 s on the page → belly up. ----------
let spookyTimer = window.setTimeout(() => spookyBellyUp(), 30000);
export function spookyBellyUp() {
  byName('spooky').forEach((c) => setPose(c, true));
}
byName('spooky').forEach((c) => {
  c.addEventListener('click', () => {
    emit('petted', c);
    if (reacting(c)) {
      byName('spooky').forEach((s) => setPose(s, false));
      window.clearTimeout(spookyTimer);
      spookyTimer = window.setTimeout(() => spookyBellyUp(), 30000);
      return;
    }
    const tail = part(c, 'tail');
    if (tail && canAnimate()) gsap.fromTo(tail, { rotation: 0 }, { rotation: -16, duration: 0.12, yoyo: true, repeat: 3, ease: 'sine.inOut', transformOrigin: TAIL_ORIGIN.spooky });
    showToast('Spooky isn’t comfortable yet. Stay a while.');
  });
});

// ---------- Zoe: the diva. Hover → side-eye. Three pokes → back turned. ----------
function sideEye(c: HTMLElement, on: boolean) {
  if (reacting(c)) return;
  c.dataset.side = on ? 'on' : 'off';
  const side = part(c, 'side-eye');
  const pupils = part(c, 'pupils');
  if (!side || !pupils) return;
  gsap.set(pupils, { x: 0, y: 0 });
  const d = canAnimate() ? 0.15 : 0;
  gsap.to(side, { opacity: on ? 1 : 0, duration: d });
  gsap.to(pupils, { opacity: on ? 0 : 1, duration: d });
  const head = part(c, 'head');
  if (head && on && canAnimate()) gsap.to(head, { rotation: -8, duration: 0.3, overwrite: 'auto' });
}
export function pokeZoe(c?: HTMLElement) {
  const targets = c ? [c] : byName('zoe');
  targets.forEach((z) => {
    if (reacting(z)) return;
    const now = Date.now();
    const pokes = [...JSON.parse(z.dataset.pokes ?? '[]').filter((t: number) => now - t < 4000), now];
    z.dataset.pokes = JSON.stringify(pokes);
    if (pokes.length >= 3) {
      z.dataset.pokes = '[]';
      sideEye(z, false);
      setPose(z, true);
      findSecret('zoe');
      emit('zoe');
      window.setTimeout(() => setPose(z, false), 5000 + Math.random() * 4000);
    } else {
      sideEye(z, true);
      if (canAnimate()) gsap.fromTo(z.querySelector('svg'), { x: -4 }, { x: 0, duration: 0.4, ease: 'elastic.out(1, 0.3)' });
      window.setTimeout(() => !z.matches(':hover') && sideEye(z, false), 900);
    }
  });
}
byName('zoe').forEach((z) => {
  z.addEventListener('pointerenter', () => sideEye(z, true));
  z.addEventListener('pointerleave', () => sideEye(z, false));
  z.addEventListener('click', () => { emit('petted', z); pokeZoe(z); });
});

export function allBlink() {
  all.forEach((c) => blink(c, true));
}
