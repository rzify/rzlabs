// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';

// Static site; only /api/brief runs as a Vercel function.
export default defineConfig({
  site: 'https://rzlabs.me',
  adapter: vercel(),
  integrations: [sitemap()],
});
