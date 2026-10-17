// When a cat on its badge is asked, it shows a real photo of itself: a polaroid
// with where its name came from.
import { gsap } from 'gsap';
import { on, canAnimate, findSecret } from './state';

const NAMES: Record<string, string> = { blue: 'Blue', spooky: 'Spooky', zoe: 'Zoe' };

export function initBadges() {
  const wrap = document.querySelector<HTMLElement>('[data-polaroid]');
  if (!wrap) return;
  const card = wrap.querySelector<HTMLElement>('.polaroid__card')!;
  const img = wrap.querySelector<HTMLImageElement>('[data-polaroid-img]')!;
  const name = wrap.querySelector<HTMLElement>('[data-polaroid-name]')!;
  const why = wrap.querySelector<HTMLElement>('[data-polaroid-why]')!;
  const close = () => {
    if (wrap.hidden) return;
    if (!canAnimate()) { wrap.hidden = true; return; }
    gsap.to(card, { y: 40, opacity: 0, rotate: 6, duration: 0.25, ease: 'power2.in', onComplete: () => { wrap.hidden = true; } });
  };
  on('photo-show', ({ name: id, from }: { name: string; from: DOMRect }) => {
    img.src = `/cats/${id}.jpg`;
    img.alt = `${NAMES[id]}, the real cat`;
    name.textContent = `${NAMES[id]}, the real one`;
    why.textContent = document.querySelector<HTMLElement>(`[data-crew="${id}"]`)?.dataset.why ?? '';
    wrap.hidden = false;
    findSecret('real');
    if (!canAnimate()) return;
    const r = card.getBoundingClientRect();
    gsap.fromTo(card,
      { x: from.left + from.width / 2 - (r.left + r.width / 2), y: from.top - (r.top + r.height / 2), scale: 0.2, rotate: -17, opacity: 0 },
      { x: 0, y: 0, scale: 1, rotate: -3, opacity: 1, duration: 0.6, ease: 'back.out(1.5)' });
  });
  // ON SET lights up while that cat is actually on screen.
  const badges = [...document.querySelectorAll<HTMLElement>('[data-crew]')];
  window.setInterval(() => {
    badges.forEach((b) => {
      const cat = document.querySelector<HTMLElement>(`.rcat--${b.dataset.crew}`);
      const r = cat?.getBoundingClientRect();
      const on = !!r && r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
      if (b.classList.contains('is-onset') === on) return;
      b.classList.toggle('is-onset', on);
      const tag = b.querySelector('[data-onset]');
      if (tag) tag.textContent = on ? 'On set' : 'Off set';
    });
  }, 600);
  wrap.addEventListener('click', (e) => { if (e.target === wrap || (e.target as HTMLElement).closest('[data-polaroid-close]')) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
