// The menu is an editing timeline: one clip per section, a playhead that follows
// the scroll, a timecode, and you can scrub the page by dragging on the track.
import { scrollToTarget, lenis } from './motion';

const FPS = 24;
const RUNTIME = 150; // seconds the whole page "lasts"

export function initTimeline() {
  const track = document.querySelector<HTMLElement>('[data-track]');
  const head = document.querySelector<HTMLElement>('[data-playhead]');
  const tc = document.querySelector<HTMLElement>('[data-timecode]');
  const clips = [...document.querySelectorAll<HTMLAnchorElement>('[data-clip]')];
  if (!track || !head) return;
  const sections = clips.map((c) => document.getElementById(c.dataset.clip!)).filter(Boolean) as HTMLElement[];

  // Clip widths follow how long each section is.
  const layout = () => {
    const total = document.documentElement.scrollHeight;
    sections.forEach((s, i) => {
      const next = sections[i + 1];
      const len = (next ? next.offsetTop : total) - s.offsetTop;
      clips[i].style.flexGrow = String(Math.max(0.6, len / total * 10));
    });
  };
  layout();
  window.addEventListener('resize', layout);
  window.addEventListener('load', layout);
  setTimeout(layout, 1500);

  const progress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  };
  const fmt = (p: number) => {
    const total = p * RUNTIME;
    const s = Math.floor(total), f = Math.floor((total - s) * FPS);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `00:${pad(Math.floor(s / 60))}:${pad(s % 60)}:${pad(f)}`;
  };
  // Vertical rail on desktop, horizontal bar on small screens.
  const vertical = () => track.clientHeight > track.clientWidth;
  const render = () => {
    const p = progress();
    if (vertical()) { head.style.top = `${p * 100}%`; head.style.left = ''; }
    else { head.style.left = `${p * 100}%`; head.style.top = ''; }
    if (tc) tc.textContent = fmt(p);
    requestAnimationFrame(render);
  };
  render();

  // Scrub: drag anywhere on the track (clicks on a clip still jump to it).
  let dragging = false, moved = false;
  const seek = (e: PointerEvent) => {
    const r = track.getBoundingClientRect();
    const raw = vertical() ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    const p = Math.min(1, Math.max(0, raw));
    const y = p * (document.documentElement.scrollHeight - window.innerHeight);
    if (lenis) lenis.scrollTo(y, { immediate: true });
    else window.scrollTo(0, y);
  };
  track.addEventListener('pointerdown', (e) => { dragging = true; moved = false; track.setPointerCapture(e.pointerId); });
  track.addEventListener('pointermove', (e) => { if (!dragging) return; if (Math.abs(vertical() ? e.movementY : e.movementX) > 1) moved = true; if (moved) seek(e); });
  track.addEventListener('pointerup', () => { dragging = false; });
  clips.forEach((c) => c.addEventListener('click', (e) => {
    e.preventDefault();
    if (moved) return;
    scrollToTarget(`#${c.dataset.clip}`);
  }));

  // ← → jump between clips.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if ((e.target as HTMLElement).closest('input, textarea')) return;
    const y = window.scrollY + 5;
    const idx = sections.reduce((acc, s, i) => (s.offsetTop <= y ? i : acc), 0);
    const next = sections[Math.min(sections.length - 1, Math.max(0, idx + (e.key === 'ArrowRight' ? 1 : -1)))];
    if (next) { e.preventDefault(); scrollToTarget(next); }
  });

}
