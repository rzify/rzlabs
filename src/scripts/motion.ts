// Scroll-driven motion: Lenis + GSAP ScrollTrigger + SplitText.
// Chapters: hero scene (camera zooms into the monitor) → horizontal work → stacking
// services → team → contact. Background colour follows data-zone.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { reducedMotion, finePointer, onPause, isPaused, emit } from './state';

gsap.registerPlugin(ScrollTrigger, SplitText);
export let lenis: Lenis | null = null;

export function scrollToTarget(target: HTMLElement | string) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { duration: 1.6 });
  else el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

const ZONES: Record<string, { bg: string; fg: string }> = {
  linen: { bg: '#EAE3D8', fg: '#26211D' },
  ink: { bg: '#26211D', fg: '#EAE3D8' },
  milk: { bg: '#FBF8F3', fg: '#26211D' },
};

/** Offset of `el` inside `ancestor`, ignoring transforms. */
function offsetIn(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0, y = 0, n: HTMLElement | null = el;
  while (n && n !== ancestor) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
  return { x, y };
}

export async function initMotion() {
  if (reducedMotion) return zones(); // static, fully readable page

  lenis = new Lenis({ autoRaf: false, lerp: 0.09 });
  lenis.on('scroll', (l: Lenis) => { ScrollTrigger.update(); emit('scroll-speed', l.velocity); });
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  await document.fonts.ready;
  intro();
  hero();
  work();
  services();
  reveals();
  depth();
  footer();
  zones(); // after the pins, so zone positions include pin spacing
  ScrollTrigger.refresh();
}

// ---------- background zones ----------
function zones() {
  document.querySelectorAll<HTMLElement>('[data-zone]').forEach((sec) => {
    const z = ZONES[sec.dataset.zone!] ?? ZONES.linen;
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => {
        if (!self.isActive) return;
        gsap.to(document.body, { backgroundColor: z.bg, color: z.fg, duration: reducedMotion ? 0 : 0.7, ease: 'power2.out', overwrite: true });
        document.querySelectorAll('[data-clip]').forEach((k) => k.classList.toggle('is-current', (k as HTMLElement).dataset.clip === sec.id));
        emit('zone', sec.id);
      },
    });
  });
}

// ---------- intro: the logo blinks, presses play, and opens ----------
function intro() {
  const ov = document.querySelector<HTMLElement>('[data-intro]');
  if (!ov) return;
  let seen = false;
  try { seen = sessionStorage.getItem('rz-intro') === '1'; sessionStorage.setItem('rz-intro', '1'); } catch { /* ignore */ }
  const heroIn = () => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
    const lines = document.querySelectorAll('[data-line]');
    tl.from(lines, { yPercent: 60, opacity: 0, duration: 1, stagger: 0.08 })
      .from('.world__inner', { yPercent: 14, opacity: 0, scale: 0.94, duration: 1.2, ease: 'back.out(1.4)' }, 0.1)
      .from('[data-vf] .vf__c', { scale: 0.4, opacity: 0, duration: 0.8, stagger: 0.06, ease: 'back.out(2)' }, 0.2);
  };
  if (seen) { ov.classList.add('is-done'); heroIn(); return; }
  lenis?.stop();
  const mark = ov.querySelector('svg')!;
  gsap.timeline({ onComplete: () => { ov.classList.add('is-done'); lenis?.start(); } })
    .from(mark, { scale: 0.4, opacity: 0, duration: 0.6, ease: 'back.out(2)' })
    .to('[data-intro-pause]', { scaleY: 0.1, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1 }, '+=0.25')
    .to('[data-intro-pause]', { opacity: 0, duration: 0.1 }, '+=0.25')
    .to('[data-intro-play]', { opacity: 1, duration: 0.1 }, '<')
    .to(mark, { scale: 0.85, duration: 0.12, yoyo: true, repeat: 1 })
    .to(ov, { clipPath: 'circle(0% at 50% 50%)', duration: 0.9, ease: 'power4.inOut' }, '+=0.1')
    .add(heroIn, '-=0.5');
}

// ---------- hero: pinned scene, camera zooms into the monitor ----------
function hero() {
  const scene = document.querySelector<HTMLElement>('[data-scene]');
  const world = document.querySelector<HTMLElement>('[data-world]');
  const screen = document.querySelector<HTMLElement>('[data-screen]');
  const stick = scene?.querySelector<HTMLElement>('.scene__stick');
  if (!scene || !world || !screen || !stick) return;

  const zoom = () => {
    const vw = stick.clientWidth, vh = stick.clientHeight;
    const w = offsetIn(world, stick);
    const s = offsetIn(screen, world);
    const S = Math.max(vw / screen.offsetWidth, vh / screen.offsetHeight) * 1.04;
    return {
      scale: S,
      x: vw / 2 - w.x - (s.x + screen.offsetWidth / 2) * S,
      y: vh / 2 - w.y - (s.y + screen.offsetHeight / 2) * S,
    };
  };
  gsap.set(world, { transformOrigin: '0 0' });

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: scene, start: 'top top', end: 'bottom bottom', scrub: 1, invalidateOnRefresh: true,
      onUpdate: (self) => {
        document.querySelector('.hero-shelf')?.classList.toggle('is-gone', self.progress > 0.12);
        world.classList.toggle('is-gone', self.progress > 0.14);
      },
    },
  });
  tl.to('[data-hint]', { opacity: 0, duration: 0.05 }, 0)
    .to('[data-copy]', { yPercent: -30, scale: 1.15, opacity: 0, duration: 0.3 }, 0.02)
    .to('[data-foot]', { y: 60, opacity: 0, duration: 0.15 }, 0)
    .to('[data-vf]', { opacity: 0, scale: 1.06, duration: 0.25 }, 0.1)
    .to('.hero-shelf', { y: -80, opacity: 0, duration: 0.2 }, 0.05)
    .to(world, { x: () => zoom().x, y: () => zoom().y, scale: () => zoom().scale, duration: 0.6, ease: 'power2.inOut' }, 0.18)
    .to('[data-screen-wipe]', { clipPath: 'inset(0% 0 0 0)', duration: 0.2, ease: 'power2.inOut' }, 0.72)
    .from('[data-screen-wipe] span', { yPercent: 100, opacity: 0, duration: 0.15 }, 0.82)
    .to({}, { duration: 0.08 });

  typing();
  keyboard();
}

// Code types itself on the monitor, line by line, in a loop.
function typing() {
  const pre = document.querySelector<HTMLElement>('[data-code]');
  if (!pre) return;
  const html = pre.innerHTML;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = tmp.textContent ?? '';
  let i = 0;
  const caret = '<span class="caret"></span>';
  const step = () => {
    if (isPaused()) return void setTimeout(step, 300);
    i++;
    // Rebuild highlighted HTML for the first i visible characters.
    let count = 0, out = '';
    const walk = (node: Node) => {
      if (count >= i) return;
      if (node.nodeType === 3) {
        const t = node.textContent ?? '';
        const take = t.slice(0, i - count);
        count += take.length;
        out += take.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      } else if (node instanceof HTMLElement) {
        out += `<span class="${node.className}">`;
        node.childNodes.forEach(walk);
        out += '</span>';
      }
    };
    tmp.childNodes.forEach(walk);
    pre.innerHTML = out + caret;
    if (i >= text.length) { i = 0; return void setTimeout(step, 3200); }
    setTimeout(step, text[i] === '\n' ? 260 : 28 + Math.random() * 50);
  };
  step();
}

// The desk keyboard: click caps or type on your own keyboard.
const typed: string[] = [];
export function pressCap(letter: string) {
  const cap = document.querySelector<HTMLElement>(`[data-cap="${letter}"]`);
  if (!cap) return false;
  cap.classList.add('is-down');
  setTimeout(() => cap.classList.remove('is-down'), 120);
  typed.push(letter);
  if (typed.slice(-6).join('') === 'rzlabs') emit('typed-rzlabs');
  return true;
}
function keyboard() {
  document.querySelectorAll<HTMLElement>('[data-cap]').forEach((cap) => cap.addEventListener('click', () => pressCap(cap.dataset.cap!)));
}

// ---------- work: horizontal ride ----------
function work() {
  const mm = gsap.matchMedia();
  mm.add('(min-width: 900px)', () => {
    const pin = document.querySelector<HTMLElement>('[data-work-pin]');
    const track = document.querySelector<HTMLElement>('[data-work-track]');
    const count = document.querySelector<HTMLElement>('[data-work-count]');
    if (!pin || !track) return;
    const cards = track.querySelectorAll('.wcard');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: {
        trigger: pin, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.set('[data-work-bar]', { scaleX: self.progress });
          if (count) count.textContent = String(Math.min(cards.length - 1, Math.round(self.progress * (cards.length - 2))) + 1).padStart(2, '0');
        },
      },
    });
    // Cards sway a little as they ride past.
    cards.forEach((card) => {
      gsap.fromTo(card, { y: 60, rotation: '+=6' }, {
        y: 0, rotation: '-=6', ease: 'none',
        scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'center center', scrub: true },
      });
    });
  });
}

// ---------- services: cards stack and sink back ----------
function services() {
  const cards = gsap.utils.toArray<HTMLElement>('[data-scard]');
  cards.forEach((card, i) => {
    card.style.setProperty('--i', String(i));
    const next = cards[i + 1];
    if (!next) return;
    gsap.to(card, {
      scale: 0.92, '--dim': 0.35, ease: 'none',
      scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: true },
    });
  });
}

// ---------- reveals ----------
function reveals() {
  document.querySelectorAll<HTMLElement>('[data-split]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words,chars', mask: 'chars', wordsClass: 'split-word' });
    gsap.from(split.chars, { yPercent: 115, rotation: 8, duration: 0.9, stagger: 0.022, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  document.querySelectorAll<HTMLElement>('[data-words]').forEach((el) => {
    const split = SplitText.create(el, { type: 'words' });
    gsap.fromTo(split.words, { opacity: 0.32 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: true } });
  });
  gsap.utils.toArray<HTMLElement>('.crew__card').forEach((c, i) => {
    gsap.from(c, { y: 120, rotation: i % 2 ? -8 : 8, opacity: 0, duration: 1, ease: 'back.out(1.4)', scrollTrigger: { trigger: c, start: 'top 90%' } });
  });
  gsap.from('.contact__zoe', { x: 200, rotation: 15, opacity: 0, duration: 1.2, ease: 'back.out(1.3)', scrollTrigger: { trigger: '.contact__zoe', start: 'top 85%' } });
}

// ---------- depth: mouse parallax, 3D tilt, magnetic, pattern drift ----------
function depth() {
  if (finePointer) {
    const layers = gsap.utils.toArray<HTMLElement>('[data-depth]');
    const setters = layers.map((el) => ({ x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3' }), y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3' }), d: Number(el.dataset.depth) }));
    window.addEventListener('pointermove', (e) => {
      if (isPaused()) return;
      const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      setters.forEach((s) => { s.x(-nx * 60 * s.d); s.y(-ny * 40 * s.d); });
    }, { passive: true });

    document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.5 }), ry = gsap.quickTo(el, 'rotationY', { duration: 0.5 });
      gsap.set(el, { transformPerspective: 900 });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 14);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 14);
      });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });

    document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' }), my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * 0.25); my((e.clientY - r.top - r.height / 2) * 0.4); });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }
  // Floating chips bob forever.
  const bobs = gsap.utils.toArray<HTMLElement>('[data-chip]').map((c, i) => gsap.to(c, { yPercent: -18, duration: 1.6 + i * 0.3, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
  onPause((p) => bobs.forEach((b) => (p ? b.pause() : b.resume())));
  // The paw pattern drifts slower than the page.
  gsap.to('[data-pattern]', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: true } });
}

// ---------- footer: the cats peek over the big wordmark ----------
function footer() {
  gsap.from('[data-peek] .mark', {
    yPercent: 110, duration: 0.9, stagger: 0.15, ease: 'back.out(2)',
    scrollTrigger: { trigger: '[data-bigmark]', start: 'top 80%' },
  });
}
