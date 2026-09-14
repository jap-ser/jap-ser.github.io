// サンプルデータ(sample:true のraw)と、その集計・文章キャッシュを削除する
import fs from 'node:fs';
import path from 'node:path';
import { RAW_DIR, AGG_FILE, TEXT_DIR } from './_common.mjs';

let n = 0;
if (fs.existsSync(RAW_DIR)) {
  for (const f of fs.readdirSync(RAW_DIR)) {
    const p = path.join(RAW_DIR, f);
    try { if (JSON.parse(fs.readFileSync(p, 'utf8')).sample) { fs.unlinkSync(p); n++; } } catch {}
  }
}
if (n) {
  fs.rmSync(AGG_FILE, { force: true });
  fs.rmSync(TEXT_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEXT_DIR, { recursive: true });
}
console.log(`サンプル ${n} ファイルを削除しました`);
