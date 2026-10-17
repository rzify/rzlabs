// POST /api/brief — the cats' chat sends the brief here; it goes out through Resend.
// Runs on the server (Vercel function), so the Resend key never reaches the browser.
// Env: RESEND_API_KEY, BRIEF_TO, BRIEF_FROM, TURNSTILE_SECRET_KEY (optional in dev).
import type { APIRoute } from 'astro';

export const prerender = false;

const MAX = { name: 80, msg: 4000, email: 200, item: 40 };
const WHAT = new Set(['AI', 'Software', 'Website', 'Motion', 'Animation', 'Not sure yet']);
const WHEN = new Set(['Yesterday', 'This month', 'No rush', 'Just saying hi']);
const recent = new Map<string, number[]>(); // best-effort rate limit per warm instance

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const env = (k: string) => (import.meta.env[k] as string | undefined) ?? process.env[k];

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return json(400, { ok: false, error: 'bad_json' }); }

  // Honeypot: real people never fill this field.
  if (typeof data.website === 'string' && data.website.trim()) return json(200, { ok: true });

  const name = String(data.name ?? '').trim().slice(0, MAX.name);
  const email = String(data.email ?? '').trim().slice(0, MAX.email);
  const msg = String(data.msg ?? '').trim().slice(0, MAX.msg);
  const what = (Array.isArray(data.what) ? data.what : []).map(String).filter((w) => WHAT.has(w)).slice(0, 6);
  const when = WHEN.has(String(data.when)) ? String(data.when) : '';
  if (!name || !msg || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(422, { ok: false, error: 'invalid' });

  const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (hits.length >= 5) return json(429, { ok: false, error: 'slow_down' });
  recent.set(ip, [...hits, now]);

  // Turnstile (Cloudflare) — skipped only when no secret is configured (local dev).
  const secret = env('TURNSTILE_SECRET_KEY');
  if (secret) {
    const token = String(data.token ?? '');
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!verify.success) {
      console.error('[brief] turnstile failed', { codes: verify['error-codes'], hostname: verify.hostname, hasToken: !!token });
      return json(403, { ok: false, error: 'captcha' });
    }
  }

  const key = env('RESEND_API_KEY'), to = env('BRIEF_TO'), from = env('BRIEF_FROM') ?? 'rzlabs <onboarding@resend.dev>';
  if (!key || !to) {
    console.error('[brief] not configured', { hasKey: !!key, hasTo: !!to });
    return json(503, { ok: false, error: 'not_configured' });
  }

  const subject = `${what.length ? what.join(' + ') : 'Hello'} — ${name}`;
  const text = [`${msg}`, '', `— ${name} <${email}>`, `What: ${what.join(', ') || '—'}`, `When: ${when || '—'}`, '', 'Brief taken by Blue, Spooky & Zoe at rzlabs.me'].join('\n');
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#26211D">
    <p style="white-space:pre-wrap">${esc(msg)}</p>
    <p>— <b>${esc(name)}</b> &lt;${esc(email)}&gt;<br>What: ${esc(what.join(', ') || '—')}<br>When: ${esc(when || '—')}</p>
    <p style="color:#6A5848;font-size:12px">Brief taken by Blue, Spooky &amp; Zoe at rzlabs.me</p></div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: to.split(',').map((s) => s.trim()), reply_to: email, subject, text, html }),
  }).catch((e) => { console.error('[brief] resend unreachable', String(e)); return null; });
  if (!res || !res.ok) {
    // Resend's error body says what is wrong (unverified domain, bad key scope, bad from). It holds no secrets.
    const detail = res ? await res.json().catch(() => ({})) as { name?: string; message?: string } : {};
    console.error('[brief] resend failed', { status: res?.status, from, name: detail.name, message: detail.message });
    return json(502, { ok: false, error: 'send_failed', reason: detail.name ?? 'unreachable' });
  }
  return json(200, { ok: true });
};
