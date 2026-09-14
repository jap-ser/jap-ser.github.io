// 不動産情報ライブラリの画面からダウンロードしたCSV（石川県・全期間）を data/raw に取り込む
// APIキーが届くまでのつなぎ。CSVの列名を API(XIT001) の項目名に合わせて保存する
// 使い方: node scripts/import-csv.mjs <csvファイル or zip解凍済みフォルダ> [...]
import fs from 'node:fs';
import path from 'node:path';
import { CITIES, RAW_DIR, parsePeriod, periodKey } from './_common.mjs';

const COLMAP = [
  ['価格情報区分', 'PriceCategory'], ['種類', 'Type'], ['地域', 'Region'], ['市区町村コード', 'MunicipalityCode'],
  ['都道府県名', 'Prefecture'], ['市区町村名', 'Municipality'], ['地区名', 'DistrictName'],
  ['取引価格（総額）', 'TradePrice'], ['坪単価', 'PricePerUnit'], ['間取り', 'FloorPlan'], ['面積', 'Area'],
  ['取引価格（㎡単価）', 'UnitPrice'], ['土地の形状', 'LandShape'], ['間口', 'Frontage'], ['延床面積', 'TotalFloorArea'],
  ['建築年', 'BuildingYear'], ['建物の構造', 'Structure'], ['用途', 'Use'], ['今後の利用目的', 'Purpose'],
  ['前面道路：方位', 'Direction'], ['前面道路：種類', 'Classification'], ['前面道路：幅員', 'Breadth'],
  ['都市計画', 'CityPlanning'], ['建ぺい率', 'CoverageRatio'], ['容積率', 'FloorAreaRatio'], ['取引時期', 'Period'],
  ['改装', 'Renovation'], ['取引の事情等', 'Remarks'],
];

function decode(buf) {
  // BOM付きUTF-8 か Shift_JIS(cp932) を自動判別
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) return buf.toString('utf8').slice(1);
  const utf = buf.toString('utf8');
  if (!utf.includes('�') && /取引|価格/.test(utf)) return utf;
  return new TextDecoder('shift_jis').decode(buf);
}

function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.length > 1);
}

const files = [];
for (const a of process.argv.slice(2)) {
  const st = fs.statSync(a);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(a)) if (f.toLowerCase().endsWith('.csv')) files.push(path.join(a, f));
  } else {
    files.push(a);
  }
}
if (!files.length) { console.error('CSVファイルを指定してください'); process.exit(2); }

const byKey = new Map(); // cityKey_YYYYQn -> rows
const byCode = new Map(CITIES.map((c) => [c.code, c]));
let total = 0, unknownCity = 0;
for (const f of files) {
  const rows = parseCSV(decode(fs.readFileSync(f)));
  const header = rows[0].map((h) => h.trim());
  const idx = COLMAP.map(([jp, en]) => [en, header.findIndex((h) => h.startsWith(jp))]);
  for (const r of rows.slice(1)) {
    const rec = {};
    for (const [en, i] of idx) if (i >= 0) rec[en] = r[i] ?? '';
    const city = byCode.get(String(rec.MunicipalityCode).padStart(5, '0'));
    const p = parsePeriod(rec.Period);
    if (!city || !p) { unknownCity++; continue; }
    const k = `${city.key}_${periodKey(p.year, p.quarter)}`;
    if (!byKey.has(k)) byKey.set(k, { city: city.key, code: city.code, year: p.year, quarter: p.quarter, data: [] });
    byKey.get(k).data.push(rec);
    total++;
  }
}
fs.mkdirSync(RAW_DIR, { recursive: true });
for (const [k, v] of byKey) {
  v.fetchedAt = new Date().toISOString();
  v.importedFrom = 'csv';
  fs.writeFileSync(path.join(RAW_DIR, `${k}.json`), JSON.stringify(v), 'utf8');
}
console.log(`取り込み ${total}件 / ${byKey.size}ファイル（対象外の市町: ${unknownCity}件）`);
