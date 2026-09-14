// 【開発プレビュー専用】APIキーが届くまでレイアウト確認に使う架空データを data/raw に作る
// aggregated.json に sample:true が付き、サイトには赤い帯が出て、デプロイは拒否される
// 実データを入れる前に  node scripts/clear-sample.mjs  で消すこと
import fs from 'node:fs';
import path from 'node:path';
import { CITIES, RAW_DIR, recentQuarters } from './_common.mjs';

const TOWNS = {
  kanazawa: ['サンプル町一', 'サンプル町二', 'サンプル町三', 'サンプル町四', 'サンプル町五', 'サンプル町六', 'サンプル町七', 'サンプル町八', 'サンプル町九', 'サンプル町十'],
  nonoichi: ['見本一丁目', '見本二丁目', '見本三丁目', '見本四丁目'],
  hakusan: ['試験町A', '試験町B', '試験町C'],
  tsubata: ['仮町A', '仮町B'],
  kahoku: ['仮町C', '仮町D'],
  nomi: ['仮町E', '仮町F'],
  komatsu: ['仮町G', '仮町H', '仮町I'],
  hakui: ['仮町J'],
};
let seed = 42;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

fs.rmSync(RAW_DIR, { recursive: true, force: true });
fs.mkdirSync(RAW_DIR, { recursive: true });
for (const c of CITIES) {
  for (const { year, quarter } of recentQuarters(5)) {
    const data = [];
    for (const town of TOWNS[c.key]) {
      const n = Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) {
        const r = rnd();
        const type = r < 0.5 ? '宅地(土地)' : r < 0.85 ? '宅地(土地と建物)' : '中古マンション等';
        const area = Math.round(type === '中古マンション等' ? 60 + rnd() * 40 : 150 + rnd() * 250);
        const unit = Math.round((60000 + rnd() * 90000) / 1000) * 1000;
        const mult = type === '宅地(土地)' ? 1 : type === '中古マンション等' ? 3 : 1.6;
        const price = Math.round((area * unit * mult) / 100000) * 100000;
        data.push({
          Type: type, MunicipalityCode: c.code, Municipality: c.name, DistrictName: town,
          TradePrice: String(price), Area: String(area), Period: `${year}年第${quarter}四半期`,
          BuildingYear: type !== '宅地(土地)' ? `${1985 + Math.floor(rnd() * 35)}年` : '',
          PriceCategory: '不動産取引価格情報',
        });
      }
    }
    fs.writeFileSync(path.join(RAW_DIR, `${c.key}_${year}Q${quarter}.json`), JSON.stringify({ city: c.key, code: c.code, year, quarter, sample: true, data }));
  }
}
console.log('サンプルデータを data/raw に作成しました（sample:true）');
