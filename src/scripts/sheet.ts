// The secrets sheet opens like a little show: the cats peek up from behind the
// header, the tiles deal in, the count rolls up and Blue walks the progress bar.
// Hover a tile and its cat pops up; filter by cat; NEW marks what you just found.
import { gsap } from 'gsap';
import { canAnimate, renderSecrets } from './state';

let wired = false;
export function animateSheet(sheet: HTMLDialogElement) {
  renderSecrets();
  const list = sheet.querySelector<HTMLElement>('[data-secret-list]')!;
  const tiles = () => [...list.querySelectorAll<HTMLElement>('li')].filter((li) => !li.hidden);
  const count = sheet.querySelector<HTMLElement>('.sheet__progress [data-secret-count]');
  const bar = sheet.querySelector<HTMLElement>('[data-secret-bar]');
  const walker = sheet.querySelector<HTMLElement>('[data-walker]');
  const peeks = [...sheet.querySelectorAll<SVGElement>('.peek')];
  const total = list.children.length || 1;
  const got = list.querySelectorAll('.is-found').length;
  const pct = (got / total) * 100;
  applyFilter(sheet, sheet.querySelector<HTMLElement>('[data-filter].is-on')?.dataset.filter ?? 'all');
  if (!wired) wire(sheet);

  if (!canAnimate()) {
    if (walker) walker.style.left = `${pct}%`;
    return;
  }
  const n = { v: 0 };
  const tl = gsap.timeline();
  tl.from(sheet, { y: 30, scale: 0.94, opacity: 0, duration: 0.45, ease: 'back.out(1.6)' })
    .from(peeks, { yPercent: 110, duration: 0.5, stagger: 0.12, ease: 'back.out(2.2)' }, 0.15)
    .from(tiles(), { y: 22, scale: 0.94, opacity: 0, duration: 0.4, stagger: 0.022, ease: 'power3.out' }, 0.2)
    .fromTo(bar, { width: '0%' }, { width: `${pct}%`, duration: 1.2, ease: 'power2.inOut' }, 0.35)
    .to(n, { v: got, duration: 1.2, ease: 'power2.inOut', onUpdate: () => { if (count) count.textContent = String(Math.round(n.v)); } }, 0.35);
  if (walker) {
    walker.classList.add('is-walking');
    tl.fromTo(walker, { left: '0%' }, { left: `${pct}%`, duration: 1.2, ease: 'power2.inOut', onComplete: () => walker.classList.remove('is-walking') }, 0.35);
  }
  const fresh = list.querySelectorAll('.is-new');
  if (fresh.length) tl.fromTo(fresh, { scale: 1 }, { scale: 1.06, duration: 0.18, yoyo: true, repeat: 3, ease: 'sine.inOut', stagger: 0.1 }, '>-0.2');
}

function applyFilter(sheet: HTMLElement, f: string) {
  sheet.querySelectorAll<HTMLElement>('[data-filter]').forEach((b) => b.classList.toggle('is-on', b.dataset.filter === f));
  sheet.querySelectorAll<HTMLElement>('[data-secret-list] li').forEach((li) => {
    li.hidden = f === 'all' ? false : f === 'locked' ? li.classList.contains('is-found') : li.dataset.owner !== f;
  });
}

function wire(sheet: HTMLElement) {
  wired = true;
  const list = sheet.querySelector<HTMLElement>('[data-secret-list]')!;
  sheet.querySelectorAll<HTMLElement>('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    applyFilter(sheet, b.dataset.filter!);
    const shown = [...list.querySelectorAll<HTMLElement>('li')].filter((li) => !li.hidden);
    if (canAnimate()) gsap.from(shown, { y: 14, opacity: 0, duration: 0.3, stagger: 0.02, ease: 'power2.out' });
    const cat = b.dataset.filter;
    sheet.querySelectorAll('.peek').forEach((p) => p.classList.toggle('is-up', p.getAttribute('data-peek-cat') === cat));
  }));
  // Hovering a tile brings its cat up.
  list.addEventListener('pointerover', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('li');
    const owner = li?.dataset.owner;
    sheet.querySelectorAll('.peek').forEach((p) => p.classList.toggle('is-up', !!owner && p.getAttribute('data-peek-cat') === owner));
  });
  list.addEventListener('pointerleave', () => sheet.querySelectorAll('.peek').forEach((p) => p.classList.remove('is-up')));
  // A found tile does a little happy wiggle when clicked.
  list.addEventListener('click', (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>('li.is-found');
    if (li && canAnimate()) gsap.fromTo(li.querySelector('.secrets__icon'), { rotate: 0 }, { rotate: 360, duration: 0.6, ease: 'back.out(1.5)' });
  });
  // The cats' eyes follow the pointer around the sheet.
  sheet.addEventListener('pointermove', (e) => {
    sheet.querySelectorAll<SVGGElement>('.peek__eyes').forEach((eyes) => {
      const r = (eyes.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      gsap.to(eyes, { x: (dx / d) * 5, y: (dy / d) * 4, duration: 0.3, overwrite: 'auto' });
    });
  });
}
