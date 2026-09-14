// data/raw/*.json を町名×種別で集計し data/aggregated.json を書く
// 指標: 取引件数・価格中央値・坪単価中央値・面積中央値・四半期推移・直近1年の動き
import fs from 'node:fs';
import path from 'node:path';
import { CITIES, RAW_DIR, AGG_FILE, TSUBO, parsePeriod, num, median, quantile, townSlug, writeJSON } from './_common.mjs';

const TYPE_OF = (t) => {
  const s = String(t ?? '');
  if (s.includes('マンション')) return 'condo';
  if (s.includes('土地と建物')) return 'house';
  if (s.includes('宅地') || s === '土地') return 'land';
  return null; // 農地・林地は対象外
};
const TYPES = ['land', 'house', 'condo'];
const MIN_TOWN_3Y = 3;      // 直近3年でこれ未満の町は単独ページを作らない
const MIN_FOR_TREND = 5;    // 前後比較に必要な件数

function toRecord(r) {
  const p = parsePeriod(r.Period);
  const type = TYPE_OF(r.Type);
  if (!p || !type) return null;
  const price = num(r.TradePrice);
  const areaStr = String(r.Area ?? '');
  const area = /以上/.test(areaStr) ? null : num(areaStr);
  const unit = price && area ? price / area : null;
  const by = num(r.BuildingYear);
  return {
    type, price, area, unit,
    tsubo: unit ? unit * TSUBO : null,
    buildingYear: by && by > 1800 ? by : null,
    pidx: p.year * 4 + p.quarter, year: p.year, quarter: p.quarter,
    district: String(r.DistrictName ?? '').trim(),
    category: String(r.PriceCategory ?? ''),
  };
}

const man = (yen) => (yen == null ? null : Math.round(yen / 10000));          // 円 → 万円
const man1 = (yen) => (yen == null ? null : Math.round(yen / 1000) / 10);     // 円 → 万円(小数1桁)

function stats(recs) {
  if (!recs.length) return { count: 0 };
  const prices = recs.map((r) => r.price), areas = recs.map((r) => r.area), tsubos = recs.map((r) => r.tsubo);
  return {
    count: recs.length,
    medianPrice: man(median(prices)),
    medianTsubo: man1(median(tsubos)),
    p25Tsubo: man1(quantile(tsubos, 0.25)),
    p75Tsubo: man1(quantile(tsubos, 0.75)),
    medianArea: (() => { const m = median(areas); return m == null ? null : Math.round(m); })(),
    medianBuildingYear: (() => { const m = median(recs.map((r) => r.buildingYear)); return m == null ? null : Math.round(m); })(),
  };
}

function trend(recs, latestIdx) {
  // 直近4期 vs その前4期 の中央値比較（土地・マンションは坪単価、戸建は総額）
  const cur = recs.filter((r) => r.pidx > latestIdx - 4);
  const prev = recs.filter((r) => r.pidx <= latestIdx - 4 && r.pidx > latestIdx - 8);
  if (cur.length < MIN_FOR_TREND || prev.length < MIN_FOR_TREND) return null;
  const key = (r) => (r.type === 'house' ? r.price : r.tsubo);
  const a = median(cur.map(key)), b = median(prev.map(key));
  if (!a || !b) return null;
  return { pct: Math.round(((a - b) / b) * 1000) / 10, curCount: cur.length, prevCount: prev.length };
}

function quarterly(recs, latestIdx, n = 12) {
  const out = [];
  for (let i = latestIdx - n + 1; i <= latestIdx; i++) {
    const y = Math.floor((i - 1) / 4), q = ((i - 1) % 4) + 1;
    const row = { period: `${y}Q${q}`, label: `${y}年${q}Q` };
    for (const t of TYPES) {
      const rs = recs.filter((r) => r.pidx === i && r.type === t);
      row[t] = {
        count: rs.length,
        medianTsubo: man1(median(rs.map((r) => r.tsubo))),
        medianPrice: man(median(rs.map((r) => r.price))),
      };
    }
    out.push(row);
  }
  return out;
}

function summarize(recs, latestIdx) {
  const y1 = recs.filter((r) => r.pidx > latestIdx - 4);
  const y3 = recs.filter((r) => r.pidx > latestIdx - 12);
  const out = {};
  for (const t of TYPES) {
    const a = y1.filter((r) => r.type === t), b = y3.filter((r) => r.type === t);
    out[t] = { y1: stats(a), y3: stats(b), trend: trend(recs.filter((r) => r.type === t), latestIdx) };
  }
  out.total3y = y3.length;
  out.total1y = y1.length;
  return out;
}

// ---- 読み込み ----
const files = fs.existsSync(RAW_DIR) ? fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.json')) : [];
if (!files.length) { console.error('data/raw が空です。先に fetch.mjs か import-csv.mjs を実行してください。'); process.exit(2); }
const byCity = Object.fromEntries(CITIES.map((c) => [c.key, []]));
let sample = false, latestIdx = 0, totalRecs = 0;
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(RAW_DIR, f), 'utf8'));
  if (j.sample) sample = true;
  if (!byCity[j.city]) continue;
  for (const r of j.data ?? []) {
    const rec = toRecord(r);
    if (!rec || !rec.price) continue;
    byCity[j.city].push(rec);
    if (rec.pidx > latestIdx) latestIdx = rec.pidx;
    totalRecs++;
  }
}
const ly = Math.floor((latestIdx - 1) / 4), lq = ((latestIdx - 1) % 4) + 1;

// ---- 集計 ----
const cities = {};
for (const c of CITIES) {
  const recs = byCity[c.key];
  const towns = {};
  const byTown = new Map();
  for (const r of recs) { if (!r.district) continue; if (!byTown.has(r.district)) byTown.set(r.district, []); byTown.get(r.district).push(r); }
  for (const [name, rs] of byTown) {
    const s = summarize(rs, latestIdx);
    towns[name] = {
      name, slug: townSlug(name), hasPage: s.total3y >= MIN_TOWN_3Y,
      summary: s,
      quarterly: s.total3y >= MIN_TOWN_3Y ? quarterly(rs, latestIdx) : undefined,
    };
  }
  cities[c.key] = {
    key: c.key, name: c.name, code: c.code,
    records: recs.length,
    summary: summarize(recs, latestIdx),
    quarterly: quarterly(recs, latestIdx),
    towns,
    townCount: Object.keys(towns).length,
    pageCount: Object.values(towns).filter((t) => t.hasPage).length,
  };
  console.log(`${c.name}: ${recs.length}件 / 町名 ${cities[c.key].townCount} / 単独ページ ${cities[c.key].pageCount}`);
}

writeJSON(AGG_FILE, {
  generatedAt: new Date().toISOString().slice(0, 10),
  latestPeriod: `${ly}Q${lq}`,
  latestPeriodLabel: `${ly}年第${lq}四半期`,
  windowY1: `${Math.floor((latestIdx - 4) / 4)}年第${((latestIdx - 4) % 4) + 1}四半期〜${ly}年第${lq}四半期`,
  windowY3: `${Math.floor((latestIdx - 12) / 4)}年第${((latestIdx - 12) % 4) + 1}四半期〜${ly}年第${lq}四半期`,
  sample,
  totalRecords: totalRecs,
  cities,
});
console.log(`最新期 ${ly}Q${lq} / 全${totalRecs}件 → data/aggregated.json${sample ? '  ※サンプルデータ' : ''}`);
