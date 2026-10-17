// A cursor follower that grows and labels interactive things (data-cursor).
import { gsap } from 'gsap';
import { finePointer, reducedMotion } from './state';

export function initCursor() {
  const el = document.querySelector<HTMLElement>('[data-cursor-el]');
  const label = document.querySelector<HTMLElement>('[data-cursor-label]');
  if (!el || !label || !finePointer) return;
  const dur = reducedMotion ? 0 : 0.35;
  const xTo = gsap.quickTo(el, 'x', { duration: dur, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'y', { duration: dur, ease: 'power3' });
  window.addEventListener('pointermove', (e) => {
    el.classList.add('is-on');
    xTo(e.clientX); yTo(e.clientY);
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor], a, button, [data-cat]');
    const text = t?.dataset.cursor ?? (t?.dataset.cat ? { blue: 'Pat', spooky: 'Wait', zoe: 'Poke' }[t.dataset.cat] : t ? '' : null);
    el.classList.toggle('is-big', text !== null && text !== undefined);
    label.textContent = text ?? '';
  }, { passive: true });
  document.addEventListener('pointerleave', () => el.classList.remove('is-on'));
}
