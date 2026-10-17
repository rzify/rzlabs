# rzlabs.me

Code & motion studio site, supervised by three cats (Blue, Spooky and Zoe).
Astro 7 + GSAP (ScrollTrigger, SplitText) + Lenis, deployed on Vercel.

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static site + one Vercel function (/api/brief)
npm run check    # type check
```

## What's on the page

The whole site is a film set, one object per section:

- **Hero**: camera viewfinder over the desk (ultrawide with code, 27" with a CS round, PT keyboard, MacBook dock). Scrolling zooms into the screen.
- **Work**: film frames, each project with a little cat scene.
- **Services**: clapper slates, a cat doing each job.
- **Team**: crew passes. Hover one and that cat comes over and offers a real photo.
- **Contact**: the brief is a chat with the cats, sent through `/api/brief`.
- **Everywhere**: roaming cats (pick them up, toys, perches, Zoe's window), a session camera that records key moments and plays them back at the end, and 25 secrets (press `?`).

## Code map

| Path | What |
|---|---|
| `src/pages/index.astro` | All sections and markup |
| `src/pages/api/brief.ts` | Contact endpoint: validation, honeypot, Turnstile, Resend |
| `src/scripts/roam.ts` | Roaming cats engine (perches, walk cycle, toys, personalities) |
| `src/scripts/recorder.ts` | Session camera, reel and player |
| `src/scripts/contact.ts` | Chat brief with the cats |
| `src/scripts/state.ts` | Pause, event bus, toasts, secrets |
| `src/scripts/motion.ts` | Lenis, hero zoom, reveals, zones |
| `src/components/` | Props, cat portraits, project and service scenes |
| `public/cats/` | Real photos of the cats |

## Environment

Copy `.env.example` to `.env` for local work and add the same variables in Vercel
(Project → Settings → Environment Variables). Never commit real values.

- `RESEND_API_KEY`, `BRIEF_TO`, `BRIEF_FROM`: sending briefs with Resend
- `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile spam check

Without them the chat falls back to opening the visitor's mail app.
Vercel Web Analytics is included; enable it in the Vercel dashboard.
