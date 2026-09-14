// Facebookページ・Instagram への自動投稿（Meta Graph API）
// 流れ: 未投稿の町名を選ぶ → カード画像を生成 → git commit/push（GitHub Pages に公開） → 画像URLが見えるのを待つ
//       → Facebook に写真投稿 → Instagram に画像投稿 → data/social/log.json に記録
// 必要な .env（karte\.env）: FB_PAGE_ID, FB_PAGE_TOKEN（ページの長期トークン）, IG_USER_ID（任意。無ければFacebookのみ）
// 使い方: node scripts/social/post.mjs [--count 1] [--dry-run] [--ids kanazawa_泉野町]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, AGG_FILE, readJSON, writeJSON, loadEnv } from '../_common.mjs';

loadEnv();
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const COUNT = opt('--count') ? Number(opt('--count')) : 1;
const DRY = args.includes('--dry-run');
const FORCE_IDS = opt('--ids') ? opt('--ids').split(',') : null;
const LOG_FILE = path.join(ROOT, 'data', 'social', 'log.json');
const CAP_FILE = path.join(ROOT, 'data', 'social', 'captions.json');
const GRAPH = 'https://graph.facebook.com/v21.0';
const { FB_PAGE_ID, FB_PAGE_TOKEN, IG_USER_ID } = process.env;

const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
function run(cmd, cmdArgs, allowFail = false) {
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0 && !allowFail) throw new Error(`${cmd} ${cmdArgs[0]} failed (${r.status})`);
  return r.status;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function graph(method, pathname, params) {
  const url = new URL(`${GRAPH}/${pathname}`);
  const body = new URLSearchParams({ ...params, access_token: FB_PAGE_TOKEN });
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: method === 'GET' ? undefined : body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) throw new Error(`Graph ${pathname}: ${JSON.stringify(json.error || json).slice(0, 300)}`);
  return json;
}

// ---- 1) 投稿する町名を選ぶ（市町 → 取引の多い町名の順。投稿済みは後回し、同じ期のデータでは1回だけ） ----
const agg = readJSON(AGG_FILE);
if (!agg || agg.sample) { console.error('実データの aggregated.json が必要です'); process.exit(2); }
const logData = readJSON(LOG_FILE, { posts: [] });
const postedKey = new Set(logData.posts.map((p) => `${p.id}@${p.period}`));
const candidates = [];
for (const c of Object.values(agg.cities)) {
  candidates.push({ id: c.key, score: 1e9 });
  for (const t of Object.values(c.towns)) if (t.hasPage) candidates.push({ id: `${c.key}_${t.slug}`, score: t.summary.total3y });
}
candidates.sort((a, b) => b.score - a.score);
const queue = FORCE_IDS ?? candidates.filter((x) => !postedKey.has(`${x.id}@${agg.latestPeriod}`)).map((x) => x.id).slice(0, COUNT);
if (!queue.length) { log('投稿できる新しい町名がありません（この期は全部投稿済み）'); process.exit(0); }
log(`投稿対象: ${queue.join(', ')}`);

// ---- 2) カード生成 → 公開 ----
run('node', ['scripts/social/make-cards.mjs', '--ids', queue.join(',')]);
const caps = readJSON(CAP_FILE, {});
if (!DRY) {
  const status = spawnSync('git', ['status', '--porcelain', 'public/social', 'data/social/captions.json'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  if (status) {
    run('git', ['add', 'public/social', 'data/social/captions.json']);
    run('git', ['commit', '-m', `social: カード追加 ${queue.join(', ')}`]);
    run('git', ['push']);
    // GitHub Pages の反映待ち（最大10分）
    for (const id of queue) {
      const url = caps[id].image;
      let ok = false;
      for (let i = 0; i < 60; i++) {
        const r = await fetch(url, { method: 'HEAD' }).catch(() => null);
        if (r && r.ok) { ok = true; break; }
        await sleep(10000);
      }
      if (!ok) throw new Error(`画像が公開されませんでした: ${url}`);
    }
  }
}

// ---- 3) 投稿 ----
if (!FB_PAGE_ID || !FB_PAGE_TOKEN) {
  log('FB_PAGE_ID / FB_PAGE_TOKEN が未設定のため投稿はスキップ（カードと投稿文は生成済み）');
  process.exit(DRY ? 0 : 1);
}
for (const id of queue) {
  const { image, caption } = caps[id];
  const entry = { id, period: agg.latestPeriod, at: new Date().toISOString(), image };
  if (DRY) { log(`[dry-run] FB/IG に投稿: ${image}\n${caption}`); continue; }
  try {
    const fb = await graph('POST', `${FB_PAGE_ID}/photos`, { url: image, message: caption });
    entry.fb = fb.post_id || fb.id;
    log(`Facebook 投稿 OK ${entry.fb}`);
  } catch (e) { entry.fbError = e.message; log(`Facebook 失敗: ${e.message}`); }
  if (IG_USER_ID) {
    try {
      const c = await graph('POST', `${IG_USER_ID}/media`, { image_url: image, caption });
      await sleep(5000);
      const pub = await graph('POST', `${IG_USER_ID}/media_publish`, { creation_id: c.id });
      entry.ig = pub.id;
      log(`Instagram 投稿 OK ${entry.ig}`);
    } catch (e) { entry.igError = e.message; log(`Instagram 失敗: ${e.message}`); }
  }
  logData.posts.push(entry);
  writeJSON(LOG_FILE, logData);
}
const failed = logData.posts.slice(-queue.length).some((p) => p.fbError || p.igError);
process.exit(failed ? 1 : 0);
