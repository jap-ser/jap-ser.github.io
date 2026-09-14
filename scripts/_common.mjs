// スクリプト共通: 市町一覧・パス・ユーティリティ
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RAW_DIR = path.join(ROOT, 'data', 'raw');
export const TEXT_DIR = path.join(ROOT, 'data', 'text');
export const AGG_FILE = path.join(ROOT, 'data', 'aggregated.json');

export const CITIES = [
  { key: 'kanazawa', name: '金沢市', code: '17201' },
  { key: 'nonoichi', name: '野々市市', code: '17212' },
  { key: 'hakusan', name: '白山市', code: '17210' },
  { key: 'tsubata', name: '津幡町', code: '17361' },
  { key: 'kahoku', name: 'かほく市', code: '17209' },
  { key: 'nomi', name: '能美市', code: '17211' },
  { key: 'komatsu', name: '小松市', code: '17203' },
  { key: 'hakui', name: '羽咋市', code: '17207' },
];

export const TSUBO = 3.30579; // 1坪 = 3.30579㎡

// .env を読む（karte/.env と baikyaku-site/.env の両方。後者が優先）
export function loadEnv() {
  for (const f of [path.join(ROOT, '..', '.env'), path.join(ROOT, '.env')]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#')) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
    }
  }
}

// 直近N年分の (year, quarter) を新しい順に列挙。最新期は「今日の前の四半期」まで
export function recentQuarters(years = 5, now = new Date()) {
  const out = [];
  let y = now.getFullYear();
  let q = Math.floor(now.getMonth() / 3) + 1; // 現在の四半期
  // 公表は当四半期の約3か月後なので、現在の四半期は含めない
  q -= 1; if (q === 0) { q = 4; y -= 1; }
  for (let i = 0; i < years * 4; i++) {
    out.push({ year: y, quarter: q });
    q -= 1; if (q === 0) { q = 4; y -= 1; }
  }
  return out;
}

export function periodKey(year, quarter) { return `${year}Q${quarter}`; }

// "2025年第1四半期" / "2025年第１四半期" → {year, quarter}
export function parsePeriod(s) {
  const t = String(s ?? '').replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const m = t.match(/(\d{4})年第(\d)四半期/);
  return m ? { year: +m[1], quarter: +m[2] } : null;
}

export function num(v) {
  if (v == null) return null;
  const t = String(v).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/,/g, '');
  const m = t.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export function median(arr) {
  const a = arr.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

export function quantile(arr, p) {
  const a = arr.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const idx = (a.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (idx - lo);
}

// 町名をURL用に整える（日本語のまま。空白や記号を除く）
export function townSlug(name) {
  return String(name).trim().replace(/[\s\/\?#%&=+"'<>]/g, '');
}

export function readJSON(f, fallback = null) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; }
}
export function writeJSON(f, obj) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(obj, null, 1), 'utf8');
}
