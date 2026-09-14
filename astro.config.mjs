// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';

// 公開URLは src/config/site.ts の SITE.url と合わせる（独自ドメイン切替時は両方＋public/CNAME）
const site = 'https://jap-ser.github.io';
let sample = false;
try { sample = !!JSON.parse(readFileSync(new URL('./data/aggregated.json', import.meta.url), 'utf8')).sample; } catch {}

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/privacy/'),
    }),
  ],
  vite: { define: { __SAMPLE__: JSON.stringify(sample) } },
});
