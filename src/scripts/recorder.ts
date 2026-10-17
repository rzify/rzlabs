// A camera that records the visit. Every key moment (a secret, a cat picked up,
// something knocked off a shelf, a new section) is logged as a frame. Reaching the
// bottom of the page ends the take and shows the reel; scrolling back up starts a
// new take. Leaving the tab or pausing the site pauses the tape.
import { on, emit, isPaused, onPause, reducedMotion, canAnimate } from './state';
import { lenis } from './motion';
import { gsap } from 'gsap';

type Who = 'blue' | 'spooky' | 'zoe' | 'you';
interface Snap { svg: string; flip: boolean; line: string }
interface Moment { take: number; t: number; id: string; text: string; who: Who; zone: string; y: number; snap?: Snap }

const FPS = 24;
const KEY = 'rz-reel';
const HEAD = 'M20 40 L22 12 L42 28 Q50 26 58 28 L78 12 L80 40 Q86 49 86 58 Q86 88 50 88 Q14 88 14 58 Q14 49 20 40 Z';
const FUR: Record<Who, [string, string]> = {
  blue: ['#FBF8F3', '#6F8DB5'], spooky: ['#5E4C3B', '#B3A25C'], zoe: ['#707176', '#C2CB8C'], you: ['#26211D', '#EFE7DA'],
};
const ZONE_BG: Record<string, string> = { top: '#E6DED2', work: '#2A241F', services: '#E6DED2', team: '#F4EEE5', contact: '#2A241F' };
const SECTION: Record<string, string> = { top: 'Intro', work: 'Work', services: 'Services', team: 'Team', contact: 'Contact' };

// What each moment is called on the tape, and who's in the shot.
const LINES: Record<string, [string, Who]> = {
  pat: ['Blue got his bum pats', 'blue'],
  yarn: ['Blue caught the yarn', 'blue'],
  jealous: ['Blue got jealous', 'blue'],
  belly: ['Spooky showed his belly', 'spooky'],
  sulk: ['Spooky turned his back on you', 'spooky'],
  zoe: ['Zoe had enough and left', 'zoe'],
  knock: ['Zoe pushed something off a shelf', 'zoe'],
  chaos: ['Three things broken. Zoe’s proud', 'zoe'],
  bird: ['Zoe spotted a bird', 'zoe'],
  copy: ['Zoe caught you copying', 'zoe'],
  tidy: ['You cleaned up after them', 'you'],
  box: ['Cat in a box', 'blue'],
  laser: ['Chasing the red dot', 'blue'],
  treat: ['Pâté, gone in a second', 'blue'],
  dinner: ['Dinner is served', 'spooky'],
  nap: ['Everyone fell asleep', 'spooky'],
  zoomies: ['Zoomies', 'zoe'],
  rzlabs: ['You typed r-z-l-a-b-s', 'you'],
  meow: ['You said meow', 'you'],
  konami: ['Nine lives', 'you'],
  console: ['You looked under the hood', 'you'],
  welcome: ['You came back', 'you'],
  real: ['You met the real ones', 'you'],
  letter: ['You sent the cats a brief', 'zoe'],
  gift: ['You moved the furniture for them', 'blue'],
};

export function initRecorder() {
  const cam = document.querySelector<HTMLElement>('[data-cam]');
  const reel = document.querySelector<HTMLElement>('[data-reel]');
  if (!cam || !reel) return;
  const $ = (s: string) => cam.querySelector<HTMLElement>(s)!;
  const stateEl = $('[data-cam-state]'), tcEl = $('[data-cam-tc]'), takeEl = $('[data-cam-take]'), nEl = $('[data-cam-n]');
  const strip = reel.querySelector<HTMLElement>('[data-reel-strip]')!;
  const sum = reel.querySelector<HTMLElement>('[data-reel-sum]')!;
  const empty = reel.querySelector<HTMLElement>('[data-reel-empty]')!;

  let take = 1, elapsed = 0, ended = false, zone = 'top';
  let moments: Moment[] = [];
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (saved && Array.isArray(saved.moments)) { moments = saved.moments.slice(-40); take = (saved.take ?? 0) + 1; elapsed = saved.elapsed ?? 0; }
  } catch { /* fresh tape */ }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ moments, take, elapsed })); } catch { /* no storage */ } };

  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (s: number) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}:${pad(Math.floor((s % 1) * FPS))}`;

  type Mode = 'rec' | 'paused' | 'ended';
  const mode = (): Mode => (ended ? 'ended' : document.hidden || isPaused() ? 'paused' : 'rec');
  const paint = () => {
    const m = mode();
    cam.dataset.mode = m;
    stateEl.textContent = m === 'rec' ? 'REC' : m === 'paused' ? 'PAUSED' : 'END OF TAPE';
    takeEl.textContent = `TAKE ${pad(take)}`;
    nEl.textContent = String(moments.length);
  };

  // ---------- frames ----------
  const face = (m: Moment) => {
    if (m.snap) return `<span class="snap${m.snap.flip ? ' is-flip' : ''}">${m.snap.svg}</span>`;
    const [fur, eye] = FUR[m.who];
    const dark = m.zone === 'work' || m.zone === 'contact';
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${HEAD}" fill="${fur}" ${m.who === 'blue' || (m.who === 'you' && dark) ? 'stroke="#D3C8B8" stroke-width="3"' : ''}/>${m.who === 'you'
      ? `<circle cx="40" cy="58" r="5" fill="${eye}"/><circle cx="60" cy="58" r="5" fill="${eye}"/>`
      : `<rect x="36" y="48" width="8" height="22" rx="4" fill="${eye}"/><rect x="58" y="48" width="8" height="22" rx="4" fill="${eye}"/>`}</svg>`;
  };
  const frame = (m: Moment, index: number) => {
    const li = document.createElement('li');
    li.className = 'frame';
    li.innerHTML = `<button type="button" class="frame__shot" style="--bg:${ZONE_BG[m.zone] ?? '#E6DED2'}" data-cursor="Replay" aria-label="Replay: ${m.text}">
      <span class="frame__tc">T${pad(m.take)} · ${fmt(m.t)}</span>
      ${face(m)}
      <span class="frame__where">${SECTION[m.zone] ?? ''}</span>
    </button><p class="frame__cap">${m.text}</p>`;
    li.querySelector('button')!.addEventListener('click', () => openPlayer(index, false));
    return li;
  };
  const renderReel = () => {
    strip.innerHTML = '';
    let lastTake = 0;
    moments.forEach((m) => {
      if (m.take !== lastTake) {
        const cut = document.createElement('li');
        cut.className = 'frame frame--slate';
        cut.innerHTML = `<span>TAKE</span><b>${pad(m.take)}</b>`;
        strip.appendChild(cut);
        lastTake = m.take;
      }
      const f = frame(m, moments.indexOf(m));
      f.style.setProperty('--i', String(strip.children.length));
      strip.appendChild(f);
    });
    empty.hidden = moments.length > 0;
    const takes = new Set(moments.map((m) => m.take)).size;
    sum.textContent = moments.length ? `${moments.length} moment${moments.length > 1 ? 's' : ''} · ${takes} take${takes > 1 ? 's' : ''} · ${fmt(elapsed)} on tape` : '';
  };

  const snap = (w: Who): Snap | undefined => {
    const el = document.querySelector<HTMLElement>(`.rcat--${w}`);
    const svg = el?.querySelector('svg');
    if (!el || !svg) return undefined;
    const b = el.querySelector<HTMLElement>('.bubble');
    const said = b && Number(getComputedStyle(b).opacity) > 0.2 ? (b.firstChild?.textContent ?? b.textContent ?? '') : '';
    return { svg: svg.outerHTML.replace(/^<svg([^>]*?) style="[^"]*"/, '<svg$1'), flip: Number(gsap.getProperty(svg, 'scaleX')) < 0, line: said.trim() };
  };

  // ---------- the player: watch the moments back ----------
  const player = document.querySelector<HTMLElement>('[data-player]');
  const screen = player?.querySelector<HTMLElement>('[data-player-screen]');
  const dots = player?.querySelector<HTMLElement>('[data-player-dots]');
  const playBtn = player?.querySelector<HTMLButtonElement>('[data-player-play]');
  let cur = 0, playing = false, timer = 0;
  const show = (k: number) => {
    if (!screen || !moments.length) return;
    cur = (k + moments.length) % moments.length;
    const m = moments[cur];
    const line = m.snap?.line || '';
    screen.innerHTML = `<div class="pl-shot" style="--bg:${ZONE_BG[m.zone] ?? '#E6DED2'}">
      <span class="pl-tc"><i></i>PLAY  T${pad(m.take)} · ${fmt(m.t)}</span><span class="pl-where">${SECTION[m.zone] ?? ''}</span>
      <div class="pl-floor"></div>
      <div class="pl-cat${m.who === 'you' ? ' pl-cat--you' : ''}">${line ? `<span class="pl-bubble">${line}</span>` : ''}${face(m)}</div>
      <p class="pl-sub">${m.text}</p></div>`;
    dots!.innerHTML = moments.map((_, j) => `<i class="${j === cur ? 'is-on' : ''}"></i>`).join('');
    if (canAnimate()) {
      gsap.fromTo(screen.querySelector('.pl-shot'), { scale: 1.06, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'power2.out' });
      gsap.from(screen.querySelector('.pl-cat'), { y: 40, scaleY: 0.85, duration: 0.6, ease: 'back.out(2)', transformOrigin: '50% 100%' });
      const bub = screen.querySelector('.pl-bubble');
      if (bub) gsap.from(bub, { scale: 0.4, opacity: 0, duration: 0.3, delay: 0.35, ease: 'back.out(2)' });
    }
  };
  const tickPlay = () => {
    window.clearTimeout(timer);
    if (!playing) return;
    timer = window.setTimeout(() => {
      if (cur >= moments.length - 1) { setPlaying(false); return; }
      show(cur + 1); tickPlay();
    }, 2300);
  };
  const setPlaying = (on: boolean) => {
    playing = on;
    if (playBtn) { playBtn.textContent = on ? 'Ⅱ' : '▶'; playBtn.setAttribute('aria-label', on ? 'Pause' : 'Play'); }
    tickPlay();
  };
  const openPlayer = (k: number, autoplay: boolean) => {
    if (!player || !moments.length) return;
    player.hidden = false;
    document.documentElement.classList.add('is-watching');
    lenis?.stop();
    show(k);
    setPlaying(autoplay);
    emit('watch');
  };
  const closePlayer = () => {
    if (!player || player.hidden) return;
    setPlaying(false);
    player.hidden = true;
    document.documentElement.classList.remove('is-watching');
    lenis?.start();
  };
  player?.querySelector('[data-player-prev]')?.addEventListener('click', () => { show(cur - 1); tickPlay(); });
  player?.querySelector('[data-player-next]')?.addEventListener('click', () => { show(cur + 1); tickPlay(); });
  playBtn?.addEventListener('click', () => { if (!playing && cur >= moments.length - 1) show(0); setPlaying(!playing); });
  player?.querySelector('[data-player-close]')?.addEventListener('click', closePlayer);
  player?.querySelector('[data-player-goto]')?.addEventListener('click', () => {
    const y = moments[cur]?.y ?? 0;
    closePlayer();
    lenis ? lenis.scrollTo(y, { duration: 1.4 }) : window.scrollTo({ top: y, behavior: 'smooth' });
  });
  player?.addEventListener('click', (e) => { if (e.target === player) closePlayer(); });
  window.addEventListener('keydown', (e) => {
    if (!player || player.hidden) return;
    if (e.key === 'Escape') closePlayer();
    if (e.key === 'ArrowRight') { e.stopPropagation(); show(cur + 1); tickPlay(); }
    if (e.key === 'ArrowLeft') { e.stopPropagation(); show(cur - 1); tickPlay(); }
    if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
  }, true);
  reel.querySelector('[data-reel-play]')?.addEventListener('click', () => openPlayer(0, true));

  // ---------- logging ----------
  const last = new Map<string, number>();
  const log = (id: string, who?: Who, text?: string) => {
    if (ended || mode() !== 'rec') return;
    const now = performance.now();
    if (now - (last.get(id) ?? -1e9) < 6000) return; // the same thing twice in a row isn't news
    last.set(id, now);
    const base = LINES[id];
    const w = who ?? base?.[1] ?? 'you';
    let caption = text ?? base?.[0] ?? id;
    if (id === 'carry') caption = `${w === 'blue' ? 'Blue' : w === 'zoe' ? 'Zoe' : 'Spooky'} got picked up${w === 'blue' ? ' (loved it)' : w === 'zoe' ? ' (did not)' : ' (terrified)'}`;
    const m: Moment = { take, t: elapsed, id, text: caption, who: w, zone, y: window.scrollY };
    moments.push(m);
    // A beat later, grab the cat exactly as it looks right now: pose, direction and what it said.
    if (w !== 'you') setTimeout(() => { m.snap = snap(w); save(); }, 450);
    if (moments.length > 40) moments.shift();
    save();
    paint();
    cam.classList.remove('is-snap'); void cam.offsetWidth; cam.classList.add('is-snap');
  };
  on('moment', (d: { id: string; who?: Who }) => log(d.id, d.who));
  on('knock', () => log('knock'));
  on('zone', (id: string) => {
    if (!SECTION[id] || id === zone) return;
    zone = id;
    if (id !== 'top') log(`zone-${id}`, 'you', `Cut to: ${SECTION[id]}`);
  });

  // ---------- end of tape / new take ----------
  const progress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? window.scrollY / max : 0;
  };
  const end = () => {
    if (ended) return;
    ended = true;
    save();
    renderReel();
    paint();
    reel.classList.remove('is-ended'); void reel.offsetWidth; reel.classList.add('is-ended');
    if (moments.length) emit('tape-end', moments.length);
  };
  const resume = () => {
    if (!ended) return;
    ended = false;
    take++;
    save();
    paint();
  };
  window.addEventListener('scroll', () => {
    const p = progress();
    if (p > 0.992) end();
    else if (ended && p < 0.94) resume();
  }, { passive: true });

  cam.addEventListener('click', () => {
    const y = document.documentElement.scrollHeight;
    lenis ? lenis.scrollTo(y, { duration: 2 }) : window.scrollTo({ top: y, behavior: reducedMotion ? 'auto' : 'smooth' });
  });

  document.addEventListener('visibilitychange', paint);
  onPause(paint);
  let prev = performance.now();
  const tick = () => {
    const now = performance.now();
    if (mode() === 'rec') elapsed += Math.min(0.25, (now - prev) / 1000);
    prev = now;
    tcEl.textContent = fmt(elapsed);
    requestAnimationFrame(tick);
  };
  tick();
  setInterval(save, 5000);
  renderReel();
  paint();
}
