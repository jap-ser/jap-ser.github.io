// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// 公開URLは src/config/site.ts の SITE.url と合わせる（独自ドメイン切替時は両方＋public/CNAME）
const site = 'https://jap-ser.github.io';
// サイトマップの lastmod（最終更新日）: 直近コミットの日付。Googleが更新済みページを優先して巡回する手がかりになる
let lastmod = new Date().toISOString();
try { lastmod = new Date(execSync('git log -1 --format=%cI').toString().trim()).toISOString(); } catch {}
let sample = false;
try { sample = !!JSON.parse(readFileSync(new URL('./data/aggregated.json', import.meta.url), 'utf8')).sample; } catch {}

export default defineConfig({
  site,
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/privacy/'),
      serialize: (item) => ({ ...item, lastmod }),
    }),
  ],
  vite: { define: { __SAMPLE__: JSON.stringify(sample) } },
});
