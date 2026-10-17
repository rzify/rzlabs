// Shared state: reduced motion, the global pause (logo button), secrets and toasts.
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(pointer: fine)').matches;

let paused = false;
const pauseListeners: Array<(p: boolean) => void> = [];
export const isPaused = () => paused;
/** True when ambient tweens should run (motion allowed and not paused by the visitor). */
export const canAnimate = () => !reducedMotion && !paused;
export function setPaused(next: boolean) {
  paused = next;
  pauseListeners.forEach((fn) => fn(paused));
}
export const onPause = (fn: (p: boolean) => void) => pauseListeners.push(fn);

// ---------- simple event bus ----------
type Handler = (detail?: any) => void;
const bus = new Map<string, Handler[]>();
export const on = (name: string, fn: Handler) => bus.set(name, [...(bus.get(name) ?? []), fn]);
export const emit = (name: string, detail?: unknown) => bus.get(name)?.forEach((fn) => fn(detail));

// ---------- toast ----------
const toast = document.querySelector<HTMLElement>('[data-toast]');
const toastText = document.querySelector<HTMLElement>('[data-toast-text]');
let toastTimer = 0;
export function showToast(message: string) {
  if (!toast || !toastText) return;
  toastText.textContent = message;
  toast.classList.add('is-on');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-on'), 3200);
}

// ---------- secrets ----------
export const SECRETS: Record<string, { label: string; toast: string }> = {
  pat: { label: 'Pat Blue on the bum', toast: 'Blue approves. Secret found.' },
  yarn: { label: 'Play yarn with Blue', toast: 'Blue caught it. Secret found.' },
  belly: { label: 'Earn Spooky’s trust', toast: 'Spooky rolled over. Secret found.' },
  zoe: { label: 'Give Zoe too much love', toast: 'Zoe ran away. Secret found.' },
  sulk: { label: 'Give Spooky too much love', toast: 'Spooky turned his back on you. Secret found.' },
  jealous: { label: 'Make Blue jealous', toast: 'Blue wants attention too. Secret found.' },
  carry: { label: 'Pick up a cat', toast: 'Careful, they have opinions. Secret found.' },
  chaos: { label: 'Let them break three things', toast: 'Chaos. Secret found.' },
  tidy: { label: 'Clean up after them', toast: 'Tidy human. Secret found.' },
  bird: { label: 'Watch the birds with Zoe', toast: 'ek ek ek. Secret found.' },
  box: { label: 'Find a cat in a box', toast: 'If it fits, I sits. Secret found.' },
  laser: { label: 'The red dot', toast: 'They’ll never catch it. Secret found.' },
  treat: { label: 'Give them a treat', toast: 'Pâté delivered. Secret found.' },
  dinner: { label: 'Fill the bowl', toast: 'Dinner is served. Secret found.' },
  nap: { label: 'Let them fall asleep', toast: 'Shh. Nap time. Secret found.' },
  zoomies: { label: 'Give them the zoomies', toast: 'ZOOMIES. Secret found.' },
  rzlabs: { label: 'Type the studio name', toast: 'r-z-l-a-b-s. Secret found.' },
  meow: { label: 'Say it in their language', toast: 'Meow received. Secret found.' },
  konami: { label: 'An old code', toast: 'Nine lives unlocked. Secret found.' },
  copy: { label: 'Copy something', toast: 'Zoe saw that. Secret found.' },
  console: { label: 'Look under the hood', toast: 'Hello, developer. Secret found.' },
  welcome: { label: 'Leave, then come back', toast: 'Welcome back. The cats noticed.' },
  gift: { label: 'Give the cats their furniture', toast: 'Delivered. They’ll pretend they don’t care. Secret found.' },
  letter: { label: 'Send the cats a brief', toast: 'Brief stamped by Zoe. Secret found.' },
  real: { label: 'Meet the real ones', toast: 'Yes, they’re real. Secret found.' },
};

// Small line icons for the secrets sheet (24×24, stroke = currentColor).
const ICON: Record<string, string> = {
  paw: '<ellipse cx="12" cy="15.5" rx="4.5" ry="3.8"/><circle cx="6.5" cy="10" r="1.8"/><circle cx="10" cy="6.5" r="1.8"/><circle cx="14" cy="6.5" r="1.8"/><circle cx="17.5" cy="10" r="1.8"/>',
  ball: '<circle cx="12" cy="12" r="8"/><path d="M8.5 8.5a5 5 0 0 1 3.5-1.5"/>',
  box: '<path d="M4 9h16v11H4z"/><path d="M4 9l2-4h12l2 4M10 9v4h4V9"/>',
  tin: '<ellipse cx="12" cy="9" rx="8" ry="3"/><path d="M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9"/>',
  moon: '<path d="M19 15A8 8 0 1 1 9 5a6 6 0 0 0 10 10z"/>',
  bolt: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
  key: '<rect x="3" y="7" width="18" height="11" rx="2"/><path d="M7 11h.01M11 11h.01M15 11h.01M8 15h8"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  bird: '<path d="M3 13c4-1 6-5 9-5 2 0 3 1 3 1l4-1-2 3c0 4-4 7-9 7-2 0-4-1-5-2"/><path d="M14 10h.01"/>',
  broken: '<path d="M6 4h12l-2 16H8z"/><path d="M11 4l-1 5 3 2-1 5"/>',
  dot: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/>',
  hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a5 5 0 0 1-4.5-3L4 13a1.5 1.5 0 0 1 2.5-1.5L8 13"/>',
  letter: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 7l9 6 9-6"/>',
  door: '<path d="M6 21V4h10v17M4 21h16M13 12h.01"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
};
const SECRET_ICON: Record<string, string> = {
  pat: 'paw', yarn: 'ball', belly: 'heart', zoe: 'paw', sulk: 'paw', jealous: 'heart', carry: 'hand', chaos: 'broken', tidy: 'broken',
  bird: 'bird', box: 'box', laser: 'dot', treat: 'tin', dinner: 'tin', nap: 'moon', zoomies: 'bolt', rzlabs: 'key', meow: 'chat',
  konami: 'key', copy: 'key', console: 'key', welcome: 'door', gift: 'box', letter: 'letter', real: 'camera',
};
const svg = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] ?? ICON.paw}</svg>`;

// Who each secret belongs to, and a nudge for the ones still locked.
type Owner = 'blue' | 'spooky' | 'zoe' | 'you';
export const SECRET_META: Record<string, [Owner, string]> = {
  pat: ['blue', 'Blue has a favourite spot. It isn’t his head.'], yarn: ['blue', 'Something orange in the sidebar.'],
  belly: ['spooky', 'Spooky needs time. Just stay a while.'], zoe: ['zoe', 'Zoe has limits. Find them.'],
  sulk: ['spooky', 'Spooky has limits too.'], jealous: ['blue', 'Pet someone who isn’t Blue.'],
  carry: ['you', 'Press on a cat and drag.'], chaos: ['zoe', 'Leave Zoe near a shelf.'], tidy: ['you', 'Clean up after the chaos.'],
  bird: ['zoe', 'Zoe’s window. Wait for it.'], box: ['blue', 'If it fits…'], laser: ['you', 'The red dot. Or press X.'],
  treat: ['you', 'Open a tin.'], dinner: ['spooky', 'There’s a bowl in the team room.'], nap: ['spooky', 'Stop moving for a bit.'],
  zoomies: ['zoe', 'Scroll really, really fast.'], rzlabs: ['you', 'Type the studio’s name.'], meow: ['you', 'Speak their language.'],
  konami: ['you', '↑ ↑ ↓ ↓ ← → ← → B A'], copy: ['zoe', 'Zoe hates plagiarism.'], console: ['you', 'Developers look under the hood.'],
  welcome: ['you', 'Leave. Then come back.'], gift: ['blue', 'Furniture can move.'], letter: ['zoe', 'Answer the cats’ questions.'],
  real: ['spooky', 'Hover a staff badge.'],
};
/** Secrets found since the sheet was last opened (shown as NEW). */
export const fresh = new Set<string>();
const KEY = 'rz-secrets';
function load(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((k) => k in SECRETS) : [];
  } catch {
    return [];
  }
}
const found = new Set<string>(load());
function render() {
  const total = Object.keys(SECRETS).length;
  document.querySelectorAll('[data-secret-count]').forEach((el) => (el.textContent = String(found.size)));
  document.querySelectorAll('[data-secret-total]').forEach((el) => (el.textContent = String(total)));
  const list = document.querySelector('[data-secret-list]');
  if (list) {
    list.innerHTML = '';
    Object.entries(SECRETS).forEach(([id, sc]) => {
      const li = document.createElement('li');
      const got = found.has(id);
      const [owner, hint] = SECRET_META[id] ?? ['you', ''];
      li.className = `${got ? 'is-found' : ''}${fresh.has(id) ? ' is-new' : ''}`;
      li.dataset.owner = owner;
      const n = String(Object.keys(SECRETS).indexOf(id) + 1).padStart(2, '0');
      const paw = '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="26" rx="8" ry="6.5"/><circle cx="11" cy="16" r="3.4"/><circle cx="17" cy="11" r="3.4"/><circle cx="24" cy="11" r="3.4"/><circle cx="30" cy="16" r="3.4"/></svg>';
      li.innerHTML = `<span class="frm__slate"><span>SC ${n}</span><span>${got ? (owner === 'you' ? 'YOU' : owner.toUpperCase()) : 'NOT SHOT'}</span></span>`
        + `<span class="frm__shot"><span class="secrets__icon">${svg(got ? SECRET_ICON[id] : 'lock')}</span></span>`
        + `<span class="secrets__label">${got ? sc.label : '???'}</span>`
        + (got ? `<span class="frm__stamp">${paw}${owner === 'you' ? 'by you' : 'approved'}</span>` : `<span class="secrets__hint">${hint}</span>`)
        + (fresh.has(id) ? '<b class="secrets__new">NEW</b>' : '');
      list.appendChild(li);
    });
  }
  document.querySelectorAll<HTMLElement>('[data-secret-bar]').forEach((el) => (el.style.width = `${(found.size / total) * 100}%`));
}
render();
export const renderSecrets = render;
/** A secret moment happened: logged on the session tape every time, counted once ever. */
export function findSecret(id: string, who?: string) {
  emit('moment', { id, who });
  if (!(id in SECRETS) || found.has(id)) return;
  found.add(id);
  fresh.add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...found]));
  } catch {
    /* storage unavailable: the count still works for this visit */
  }
  render();
  showToast(SECRETS[id].toast);
  emit('secret', id);
}
