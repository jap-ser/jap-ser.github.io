// SNS投稿用の「相場カード」画像（1080x1080 JPEG）と投稿文を aggregated.json から生成する
// 出力: public/social/cards/{city}_{slug}.jpg, public/social/cards/{city}.jpg, public/social/monthly_{period}.jpg
//       data/social/captions.json（画像ごとの投稿文。数字はデータからのみ）
// 使い方: node scripts/social/make-cards.mjs [--city kanazawa] [--limit 20] [--force]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { ROOT, AGG_FILE, readJSON, writeJSON } from '../_common.mjs';

const OUT_DIR = path.join(ROOT, 'public', 'social', 'cards');
const CAP_FILE = path.join(ROOT, 'data', 'social', 'captions.json');
const SITE_URL = 'https://jap-ser.github.io';
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const onlyCity = opt('--city');
const limit = opt('--limit') ? Number(opt('--limit')) : Infinity;
const force = args.includes('--force');
const onlyIds = opt('--ids') ? new Set(opt('--ids').split(',')) : null; // 例: --ids kanazawa,kanazawa_泉野町

const agg = readJSON(AGG_FILE);
if (!agg || agg.sample) { console.error('実データの aggregated.json が必要です'); process.exit(2); }
fs.mkdirSync(OUT_DIR, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT = "'Noto Sans JP', 'BIZ UDPGothic', 'Yu Gothic', 'Meiryo', sans-serif";
const fmtMan = (v) => (v == null ? '—' : v >= 10000 ? `${(v / 10000).toFixed(v % 10000 === 0 ? 0 : 1)}億円` : `${v.toLocaleString('ja-JP')}万円`);
const fmtTsubo = (v) => (v == null ? '—' : `${v.toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}万円/坪`);

function cardSVG({ kicker, title, rows, foot, period }) {
  // rows: [{label, value, sub}]
  const rowH = 150;
  const rowsSvg = rows.map((r, i) => {
    const y = 380 + i * rowH;
    return `
      <rect x="90" y="${y}" width="900" height="${rowH - 22}" rx="18" fill="#ffffff"/>
      <text x="130" y="${y + 52}" font-size="30" fill="#5f6f68" font-family="${FONT}">${esc(r.label)}</text>
      <text x="130" y="${y + 106}" font-size="52" font-weight="700" fill="#1d3348" font-family="${FONT}">${esc(r.value)}</text>
      <text x="960" y="${y + 100}" font-size="26" fill="#5f6f68" text-anchor="end" font-family="${FONT}">${esc(r.sub || '')}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d3348"/><stop offset="1" stop-color="#2f6f5e"/></linearGradient></defs>
    <rect width="1080" height="1080" fill="url(#g)"/>
    <rect x="60" y="60" width="960" height="960" rx="34" fill="#f2f6f3"/>
    <rect x="60" y="60" width="960" height="250" rx="34" fill="#1d3348"/>
    <rect x="60" y="250" width="960" height="60" fill="#1d3348"/>
    <text x="110" y="135" font-size="30" fill="#cfe0d8" font-family="${FONT}">${esc(kicker)}</text>
    <text x="110" y="215" font-size="${title.length > 12 ? 52 : 62}" font-weight="700" fill="#ffffff" font-family="${FONT}">${esc(title)}</text>
    <text x="110" y="270" font-size="26" fill="#cfe0d8" font-family="${FONT}">最新データ期：${esc(period)}｜直近3年の中央値</text>
    ${rowsSvg}
    <text x="110" y="955" font-size="26" fill="#5f6f68" font-family="${FONT}">${esc(foot)}</text>
    <text x="110" y="995" font-size="24" fill="#8a9a93" font-family="${FONT}">出典：国土交通省 不動産情報ライブラリ（不動産取引価格情報）を当社集計</text>
  </svg>`;
}

function rowsFor(s) {
  const rows = [];
  if (s.land.y3.count) rows.push({ label: '土地 坪単価', value: fmtTsubo(s.land.y3.medianTsubo), sub: `${s.land.y3.count}件` });
  if (s.house.y3.count) rows.push({ label: '戸建 価格', value: fmtMan(s.house.y3.medianPrice), sub: `${s.house.y3.count}件` });
  if (s.condo.y3.count) rows.push({ label: 'マンション 坪単価', value: fmtTsubo(s.condo.y3.medianTsubo), sub: `${s.condo.y3.count}件` });
  return rows.slice(0, 3);
}

function caption(kind, name, s, url) {
  const parts = [];
  if (s.land.y3.count) parts.push(`土地は坪単価 ${fmtTsubo(s.land.y3.medianTsubo)}（直近3年${s.land.y3.count}件）`);
  if (s.house.y3.count) parts.push(`戸建は ${fmtMan(s.house.y3.medianPrice)}（${s.house.y3.count}件）`);
  if (s.condo.y3.count) parts.push(`マンションは坪単価 ${fmtTsubo(s.condo.y3.medianTsubo)}（${s.condo.y3.count}件）`);
  const few = s.total3y < 10 ? '件数が少ないため参考値です。' : '';
  return [
    `【${name}の${kind}】国土交通省の取引データ（${agg.latestPeriodLabel}まで）を集計しました。`,
    parts.join('、') + '。' + few,
    '中央値は「真ん中の取引」の値で、実際の価格は面積・形状・建物の状態で変わります。',
    `詳しい表と推移はこちら → ${url}`,
    '売るかどうか決めていなくても大丈夫です。仲介と当社買取、両方の目安を並べてお伝えします（査定・物件確認のうえで判断）。',
    '#金沢市 #不動産売却 #不動産相場 #ジャパンサービス',
  ].join('\n');
}

const caps = readJSON(CAP_FILE, {}) || {};
let made = 0, skipped = 0;
async function render(id, svg, cap) {
  if (onlyIds && !onlyIds.has(id)) return;
  const file = path.join(OUT_DIR, `${id}.jpg`);
  if (fs.existsSync(file) && caps[id] && caps[id].period === agg.latestPeriod && !force) { skipped++; return; }
  await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toFile(file);
  caps[id] = { period: agg.latestPeriod, image: `${SITE_URL}/social/cards/${id}.jpg`, caption: cap, madeAt: new Date().toISOString().slice(0, 10) };
  made++;
}

for (const c of Object.values(agg.cities)) {
  if (onlyCity && c.key !== onlyCity) continue;
  if (made >= limit) break;
  await render(c.key, cardSVG({
    kicker: '金沢・石川の不動産相場', title: `${c.name}の相場`, rows: rowsFor(c.summary), period: agg.latestPeriodLabel,
    foot: `町名ページ ${c.pageCount}件 → ${SITE_URL}/${c.key}/`,
  }), caption('不動産相場', c.name, c.summary, `${SITE_URL}/${c.key}/`));
  for (const t of Object.values(c.towns)) {
    if (!t.hasPage || made >= limit) continue;
    const id = `${c.key}_${t.slug}`;
    await render(id, cardSVG({
      kicker: `${c.name}の町名別相場`, title: t.name, rows: rowsFor(t.summary), period: agg.latestPeriodLabel,
      foot: `直近3年の取引 ${t.summary.total3y}件 → ${SITE_URL}/${c.key}/${t.slug}/`,
    }), caption('相場', `${c.name}${t.name}`, t.summary, `${SITE_URL}/${c.key}/${t.slug}/`));
  }
}
writeJSON(CAP_FILE, caps);
console.log(`カード生成 ${made} / 変更なし ${skipped} → public/social/cards（投稿文: data/social/captions.json）`);
