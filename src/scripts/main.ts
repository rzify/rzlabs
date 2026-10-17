import { isPaused, setPaused, onPause, findSecret, showToast, on, emit, fresh } from './state';
import { animateSheet } from './sheet';
import { initMotion, pressCap, scrollToTarget, lenis } from './motion';
import { allBlink } from './cats';
import { initRoam, toggleLaser } from './roam';
import { initCursor } from './cursor';
import { initTimeline } from './timeline';
import { initRecorder } from './recorder';
import { initBadges } from './badges';
import { initChat } from './contact';

document.documentElement.classList.add('js');
initMotion();
initRoam();
initCursor();
onPause((p) => document.documentElement.classList.toggle('is-paused', p));
initTimeline();
initRecorder();
initBadges();
initChat();

// ---------- the play/pause button (the logo) pauses the whole site ----------
const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
let pauseClicks: number[] = [];
toggle?.addEventListener('click', () => {
  setPaused(!isPaused());
  const now = Date.now();
  pauseClicks = [...pauseClicks.filter((t) => now - t < 3000), now];
  if (pauseClicks.length >= 5) { pauseClicks = []; showToast('Stop pausing us. — the cats'); }
});
onPause((p) => {
  toggle?.setAttribute('aria-pressed', String(p));
  toggle?.setAttribute('aria-label', p ? 'Play animations' : 'Pause animations');
  if (toggle) toggle.dataset.cursor = p ? 'Play' : 'Pause';
  showToast(p ? 'Paused. Everyone holds still.' : 'Playing again.');
});

// ---------- anchors ----------
document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]:not([data-clip])').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href')!;
    if (href.length < 2 || !document.querySelector(href)) return;
    e.preventDefault();
    scrollToTarget(href);
  });
});

// ---------- sheet ----------
const sheet = document.querySelector<HTMLDialogElement>('[data-sheet]');
const openSheet = () => { if (!sheet || sheet.open) return; sheet.showModal(); lenis?.stop(); animateSheet(sheet); };
sheet?.addEventListener('close', () => { lenis?.start(); fresh.clear(); });
document.querySelectorAll('[data-sheet-open]').forEach((b) => b.addEventListener('click', openSheet));

// ---------- keyboard: shortcuts, secret words, konami ----------
const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
let seq: string[] = [];
let word = '';
window.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) return;
  if (sheet?.open && e.key !== '?') return;
  const k = e.key.toLowerCase();

  seq = [...seq, k].slice(-KONAMI.length);
  if (seq.join() === KONAMI.join()) { findSecret('konami'); emit('konami'); seq = []; }

  pressCap(k);
  word = (word + k).slice(-8);
  if (word.endsWith('meow')) { allBlink(); emit('meow'); findSecret('meow'); }

  if (e.key === '?') openSheet();
  else if (k === 'p') setPaused(!isPaused());
  else if (k === 'x') toggleLaser();
  else if (k === 'escape') toggleLaser(false);
});
on('typed-rzlabs', () => { findSecret('rzlabs'); allBlink(); });

// ---------- copy, console, tab away ----------
document.addEventListener('copy', () => { findSecret('copy'); emit('copy'); });

console.log('%c /\\_/\\ \n( o.o )  rzlabs\n > ^ <   Blue, Spooky & Zoe are watching.\n\nTry: rzlabs.meow()', 'font: 14px/1.4 monospace; color: #6A5848');
(window as unknown as { rzlabs: unknown }).rzlabs = {
  meow() { findSecret('console'); emit('meow'); allBlink(); return 'mrrp.'; },
  pause() { setPaused(true); return 'paused'; },
};

const favicon = document.querySelector<HTMLLinkElement>('#favicon');
const title = document.title;
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    if (favicon) favicon.href = '/favicon-sleep.svg';
    document.title = 'zzz — rzlabs';
  } else {
    if (favicon) favicon.href = '/favicon.svg';
    document.title = title;
    if (hiddenAt && Date.now() - hiddenAt > 3000) findSecret('welcome');
  }
});
