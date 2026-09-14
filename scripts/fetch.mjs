// 国交省 不動産情報ライブラリ API (XIT001) から 8市町・直近5年分を取得し data/raw にキャッシュする
// 使い方: node scripts/fetch.mjs            (未取得の期だけ取得)
//         node scripts/fetch.mjs --refresh-latest  (最新4期は取り直す。公表後に件数が増えるため)
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { CITIES, RAW_DIR, loadEnv, recentQuarters, periodKey } from './_common.mjs';

loadEnv();
const KEY = process.env.MLIT_API_KEY;
if (!KEY) {
  console.error('MLIT_API_KEY が未設定です。karte\.env か baikyaku-site\.env に MLIT_API_KEY=... を書いてください。');
  process.exit(2);
}
const refreshLatest = process.argv.includes('--refresh-latest');
const quarters = recentQuarters(5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchOne(city, year, quarter) {
  const url = new URL('https://www.reinfolib.mlit.go.jp/ex-api/external/XIT001');
  url.searchParams.set('year', String(year));
  url.searchParams.set('quarter', String(quarter));
  url.searchParams.set('city', city.code);
  // priceClassification 未指定 = 取引価格・成約価格の両方
  const res = await fetch(url, { headers: { 'Ocp-Apim-Subscription-Key': KEY, 'Accept-Encoding': 'gzip' } });
  if (res.status === 429) throw new Error('429 rate limited');
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text().catch(() => '')}`.slice(0, 200));
  let buf = Buffer.from(await res.arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf); // 生gzipで返る場合の保険
  const json = JSON.parse(buf.toString('utf8'));
  if (json.status && json.status !== 'OK') throw new Error(`API status ${json.status}`);
  return json.data ?? [];
}

let fetched = 0, skipped = 0, failed = 0;
for (const city of CITIES) {
  for (let i = 0; i < quarters.length; i++) {
    const { year, quarter } = quarters[i];
    const file = path.join(RAW_DIR, `${city.key}_${periodKey(year, quarter)}.json`);
    const isLatest = i < 4;
    if (fs.existsSync(file) && !(refreshLatest && isLatest)) { skipped++; continue; }
    let tries = 0;
    while (true) {
      try {
        const data = await fetchOne(city, year, quarter);
        fs.mkdirSync(RAW_DIR, { recursive: true });
        fs.writeFileSync(file, JSON.stringify({ city: city.key, code: city.code, year, quarter, fetchedAt: new Date().toISOString(), data }), 'utf8');
        console.log(`${city.name} ${year}Q${quarter}: ${data.length}件`);
        fetched++;
        await sleep(1200); // 連続アクセスを避ける（利用約款の求め）
        break;
      } catch (e) {
        tries++;
        if (tries >= 3) { console.error(`${city.name} ${year}Q${quarter}: 失敗 ${e.message}`); failed++; break; }
        await sleep(5000 * tries);
      }
    }
  }
}
console.log(`取得 ${fetched} / スキップ ${skipped} / 失敗 ${failed}`);
process.exit(failed ? 1 : 0);
