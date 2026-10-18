// The contact form is a chat: Blue, Spooky and Zoe ask the questions one at a time,
// react to the answers, and Zoe stamps the brief. Sending opens the visitor's own
// mail app with the brief written out (no server, nothing stored).
import { gsap } from 'gsap';
import { canAnimate, findSecret, emit } from './state';

type Who = 'blue' | 'spooky' | 'zoe' | 'you';
type Answers = { name: string; what: string[]; when: string; msg: string; email: string };
interface Step {
  who: Exclude<Who, 'you'>;
  key: keyof Answers | 'send';
  ask: (a: Answers) => string;
  type: 'text' | 'email' | 'textarea' | 'chips' | 'send';
  options?: string[];
  multi?: boolean;
  placeholder?: string;
}

const TO = 'hello@rzlabs.me';
const HEAD = 'M20 40 L22 12 L42 28 Q50 26 58 28 L78 12 L80 40 Q86 49 86 58 Q86 88 50 88 Q14 88 14 58 Q14 49 20 40 Z';
const FACE: Record<Exclude<Who, 'you'>, [string, string, string]> = {
  blue: ['#FBF8F3', '#6F8DB5', 'Blue'], spooky: ['#5E4C3B', '#B3A25C', 'Spooky'], zoe: ['#707176', '#C2CB8C', 'Zoe'],
};

const STEPS: Step[] = [
  { who: 'blue', key: 'name', type: 'text', placeholder: 'Your name', ask: () => 'Hi! I’m Blue. What’s your name?' },
  { who: 'spooky', key: 'what', type: 'chips', multi: true, options: ['AI', 'Software', 'Website', 'Motion', 'Animation', 'Not sure yet'],
    ask: (a) => `…hi, ${a.name}. What are we making? Pick as many as you like.` },
  { who: 'zoe', key: 'when', type: 'chips', options: ['Yesterday', 'This month', 'No rush', 'Just saying hi'], ask: () => 'When do you need it?' },
  { who: 'blue', key: 'msg', type: 'textarea', placeholder: 'A few lines is perfect', ask: () => 'Tell us about it. Spooky reads slowly, so take your time.' },
  { who: 'zoe', key: 'email', type: 'email', placeholder: 'you@company.com', ask: () => 'Your email, so he can write back.' },
  { who: 'zoe', key: 'send', type: 'send', ask: () => 'I read it. Stamped. Send it?' },
];

// Little reactions to some answers.
const REACT: Record<string, [Exclude<Who, 'you'>, string]> = {
  AI: ['spooky', 'Will it replace me?'],
  Animation: ['zoe', 'Finally, something with taste.'],
  Motion: ['zoe', 'Make me look good.'],
  'Not sure yet': ['blue', 'That’s fine! Neither am I, most days.'],
  Yesterday: ['zoe', 'Of course it is.'],
  'No rush': ['spooky', '…my favourite speed.'],
  'Just saying hi': ['blue', 'Hi!!'],
};

export function initChat() {
  const form = document.querySelector<HTMLFormElement>('[data-chat]');
  if (!form) return;
  const log = form.querySelector<HTMLOListElement>('[data-chat-log]')!;
  const box = form.querySelector<HTMLElement>('[data-chat-input]')!;
  const a: Answers = { name: '', what: [], when: '', msg: '', email: '' };
  let i = 0;
  let started = false;

  const avatar = (who: Exclude<Who, 'you'>) => {
    const [fur, eye] = FACE[who];
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${HEAD}" fill="${fur}" ${who === 'blue' ? 'stroke="#D3C8B8" stroke-width="3"' : ''}/><rect x="36" y="48" width="8" height="22" rx="4" fill="${eye}"/><rect x="58" y="48" width="8" height="22" rx="4" fill="${eye}"/></svg>`;
  };
  const down = () => requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
  const pop = (el: HTMLElement) => { down(); if (canAnimate()) gsap.from(el, { y: 12, opacity: 0, scale: 0.96, duration: 0.35, ease: 'back.out(1.6)' }); };

  // Cat messages arrive after a short "typing…" pause.
  const say = (who: Exclude<Who, 'you'>, text: string) => new Promise<void>((done) => {
    const li = document.createElement('li');
    li.className = `msg msg--${who}`;
    li.innerHTML = `<span class="msg__face">${avatar(who)}</span><div class="msg__bubble"><b class="msg__name">${FACE[who][2]}</b><span class="msg__text"><i class="dots"><i></i><i></i><i></i></i></span></div>`;
    log.appendChild(li);
    pop(li);
    const wait = canAnimate() ? Math.min(1100, 380 + text.length * 14) : 0;
    setTimeout(() => {
      li.querySelector('.msg__text')!.textContent = text;
      down();
      done();
    }, wait);
  });
  const mine = (text: string, step: number) => {
    const li = document.createElement('li');
    li.className = 'msg msg--you';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'msg__bubble';
    btn.title = 'Change this answer';
    btn.textContent = text;
    btn.addEventListener('click', () => rewind(step));
    li.appendChild(btn);
    log.appendChild(li);
    pop(li);
  };

  // Go back to an earlier question: drop everything from it onwards and ask again.
  const marks: number[] = [];
  const rewind = (step: number) => {
    while (log.children.length > (marks[step] ?? 0)) log.lastElementChild!.remove();
    i = step;
    ask();
  };

  const input = (step: Step) => {
    box.innerHTML = '';
    if (step.type === 'chips') {
      const wrap = document.createElement('div');
      wrap.className = 'chips';
      const chosen = new Set<string>(step.key === 'what' ? a.what : []);
      step.options!.forEach((o) => {
        const c = document.createElement('button');
        c.type = 'button';
        c.className = 'chip';
        c.textContent = o;
        c.setAttribute('aria-pressed', String(chosen.has(o)));
        c.addEventListener('click', () => {
          if (!step.multi) return answer(o);
          chosen.has(o) ? chosen.delete(o) : chosen.add(o);
          c.setAttribute('aria-pressed', String(chosen.has(o)));
          next.disabled = !chosen.size;
        });
        wrap.appendChild(c);
      });
      const next = Object.assign(document.createElement('button'), { type: 'button', className: 'btn btn--linen chat__go', textContent: 'That’s it' });
      if (step.multi) { next.disabled = !chosen.size; next.addEventListener('click', () => answer([...chosen])); wrap.appendChild(next); }
      box.appendChild(wrap);
      return;
    }
    if (step.type === 'send') {
      const row = document.createElement('div');
      row.className = 'chat__send';
      row.innerHTML = `<div class="letter" aria-label="Your brief"><span class="letter__stamp">approved<br>by zoe</span><b>To: ${TO}</b><p>${esc(subject())}</p><small>${esc(a.msg).slice(0, 140)}${a.msg.length > 140 ? '…' : ''}</small></div>`;
      // With a spam check configured, Send stays locked until Turnstile hands us a token.
      const locked = !!SITE_KEY && !token;
      const send = Object.assign(document.createElement('button'), { type: 'submit', className: 'btn btn--linen', textContent: locked ? 'Checking you’re human…' : 'Send it', disabled: locked });
      const redo = Object.assign(document.createElement('button'), { type: 'button', className: 'chat__redo', textContent: 'Start over' });
      redo.addEventListener('click', reset);
      row.append(send, redo);
      box.appendChild(row);
      if (canAnimate()) gsap.from(row.querySelector('.letter__stamp'), { scale: 2.4, opacity: 0, rotate: -30, duration: 0.5, delay: 0.3, ease: 'back.out(2)' });
      return;
    }
    const field = document.createElement(step.type === 'textarea' ? 'textarea' : 'input') as HTMLInputElement | HTMLTextAreaElement;
    field.className = 'chat__field';
    field.name = String(step.key);
    field.placeholder = step.placeholder ?? '';
    field.setAttribute('aria-label', step.ask(a));
    if (field instanceof HTMLInputElement) { field.type = step.type; field.autocomplete = step.type === 'email' ? 'email' : 'name'; }
    field.value = String(a[step.key as keyof Answers] ?? '');
    const go = Object.assign(document.createElement('button'), { type: 'submit', className: 'btn btn--linen chat__go', textContent: '↵' });
    go.setAttribute('aria-label', 'Answer');
    const row = document.createElement('div');
    row.className = `chat__row chat__row--${step.type}`;
    row.append(field, go);
    if (step.type === 'textarea') {
      // Zoe's patience runs out on long messages. Spooky keeps reading.
      const meter = document.createElement('div');
      meter.className = 'patience';
      meter.innerHTML = '<span>Zoe’s patience</span><i><b></b></i>';
      const bar = meter.querySelector('b')!;
      field.addEventListener('input', () => {
        const left = Math.max(0, 1 - field.value.length / 700);
        bar.style.width = `${left * 100}%`;
        meter.classList.toggle('is-out', left === 0);
        meter.querySelector('span')!.textContent = left === 0 ? 'Zoe stopped reading. Spooky’s still going.' : 'Zoe’s patience';
      });
      field.addEventListener('keydown', (ev) => { const e = ev as KeyboardEvent; if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) form.requestSubmit(); });
      row.appendChild(meter);
    }
    box.appendChild(row);
    if (started) field.focus({ preventScroll: true });
  };

  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const subject = () => `${a.what.length ? a.what.join(' + ') : 'Hello'} — ${a.name || 'a new human'}`;

  const ask = async () => {
    const step = STEPS[i];
    box.innerHTML = '';
    marks[i] = log.children.length;
    await say(step.who, step.ask(a));
    input(step);
  };

  const answer = async (value: string | string[]) => {
    const step = STEPS[i];
    const key = step.key as keyof Answers;
    (a as Record<string, unknown>)[key] = value;
    mine(Array.isArray(value) ? value.join(', ') : value, i);
    box.innerHTML = '';
    started = true;
    const r = (Array.isArray(value) ? value : [value]).map((v) => REACT[v]).find(Boolean);
    if (r) await say(r[0], r[1]);
    emit('chat', { key, value });
    i++;
    ask();
  };

  const reset = () => {
    Object.assign(a, { name: '', what: [], when: '', msg: '', email: '' });
    log.innerHTML = '';
    i = 0;
    ask();
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const step = STEPS[i];
    if (step.type === 'send') return send();
    const field = box.querySelector<HTMLInputElement | HTMLTextAreaElement>('.chat__field');
    const v = (field?.value ?? '').trim();
    if (!v) return field?.focus();
    if (step.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      await say('zoe', 'That’s not an email. Try again.');
      return field?.focus();
    }
    answer(v);
  });

  // ---------- Turnstile (spam check), loaded only when the letter is ready ----------
  const SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined;
  let token = '';
  let gotToken: (t: string) => void = () => {};
  let tokenReady = new Promise<string>((r) => { gotToken = r; });
  const lockSend = (locked: boolean) => {
    const b = box.querySelector<HTMLButtonElement>('.chat__send .btn');
    if (b && b.textContent !== 'Sending…') { b.disabled = locked; b.textContent = locked ? 'Checking you’re human…' : 'Send it'; }
  };
  const setToken = (t: string) => {
    token = t;
    if (t) gotToken(t); else tokenReady = new Promise<string>((r) => { gotToken = r; });
    lockSend(!t);
  };
  // Wait for the spam check to finish (it is invisible for most people), but never forever.
  const waitToken = (ms: number) => (!SITE_KEY || token ? Promise.resolve(token) : Promise.race([tokenReady, new Promise<string>((r) => setTimeout(() => r(token), ms))]));
  type TS = { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void };
  const turnstile = () => new Promise<TS | null>((ok) => {
    if (!SITE_KEY) return ok(null);
    const w = window as unknown as { turnstile?: TS };
    if (w.turnstile) return ok(w.turnstile);
    const sc = Object.assign(document.createElement('script'), { src: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', async: true });
    sc.onload = () => ok(w.turnstile ?? null);
    sc.onerror = () => ok(null);
    document.head.appendChild(sc);
  });
  const guard = async (row: HTMLElement) => {
    const ts = await turnstile();
    // Script blocked or no key: unlock, the server decides (and mailto stays as the fallback).
    if (!ts) return lockSend(false);
    const slot = document.createElement('div');
    slot.className = 'chat__guard';
    row.appendChild(slot);
    ts.render(slot, { sitekey: SITE_KEY, appearance: 'interaction-only', theme: 'dark', callback: (t: string) => setToken(t),
      'expired-callback': () => setToken(''), 'error-callback': () => { setToken(''); console.warn('[brief] turnstile error'); } });
  };
  new MutationObserver(() => { const row = box.querySelector<HTMLElement>('.chat__send'); if (row && !row.dataset.guarded) { row.dataset.guarded = '1'; guard(row); } })
    .observe(box, { childList: true });

  const mailto = () => {
    const body = [`Hi rzlabs,`, ``, a.msg, ``, `— ${a.name}`, `What: ${a.what.join(', ') || '—'}`, `When: ${a.when || '—'}`, `Reply to: ${a.email}`, ``, `(Brief taken by Blue, Spooky & Zoe at rzlabs.me)`].join('\n');
    window.location.href = `mailto:${TO}?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(body)}`;
  };

  const send = async () => {
    const btn = box.querySelector<HTMLButtonElement>('.chat__send .btn');
    if (SITE_KEY && !token && btn?.disabled) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    const honey = form.querySelector<HTMLInputElement>('[name="website"]')?.value ?? '';
    let ok = false;
    try {
      await waitToken(10_000);
      const r = await fetch('/api/brief', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...a, token, website: honey }) });
      ok = r.ok;
      if (!ok) console.warn('[brief]', r.status, await r.text().catch(() => ''));
    } catch (e) { ok = false; console.warn('[brief] network', e); }
    findSecret('letter');
    box.innerHTML = '';
    const letter = document.createElement('div');
    letter.className = 'letter letter--fly';
    letter.innerHTML = '<span class="letter__stamp">approved<br>by zoe</span>';
    box.appendChild(letter);
    if (canAnimate()) await gsap.to(letter, { x: 260, y: -160, rotate: 24, scale: 0.4, opacity: 0, duration: 0.9, ease: 'power2.in' });
    letter.remove();
    if (ok) {
      await say('blue', `Sent! He’ll write back to ${a.email} soon.`);
      await say('zoe', 'I stamped it myself. You’re welcome.');
    } else {
      mailto();
      await say('spooky', '…the post office is closed. I opened your mail app instead.');
      await say('zoe', 'Hit send there. Or write to hello@rzlabs.me. I’ll allow it.');
    }
    const again = Object.assign(document.createElement('button'), { type: 'button', className: 'chat__redo', textContent: 'Start over' });
    again.addEventListener('click', reset);
    box.appendChild(again);
  };

  // Start the conversation when the form scrolls into view.
  const io = new IntersectionObserver((entries) => {
    if (!entries.some((en) => en.isIntersecting)) return;
    io.disconnect();
    ask();
  }, { threshold: 0.3 });
  io.observe(form);
}
