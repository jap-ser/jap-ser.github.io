// 月次バッチ: データ取得 → 集計 → 文章生成 → コミット → push（GitHub Actions が自動でビルド・公開）
// Windows タスクスケジューラから run-monthly.bat 経由で毎月実行される。手動実行も可
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, AGG_FILE, readJSON, loadEnv } from './_common.mjs';

loadEnv();
const log = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
function run(cmd, args, { allowFail = false } = {}) {
  log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0 && !allowFail) throw new Error(`${cmd} ${args[0]} が失敗しました (exit ${r.status})`);
  return r.status;
}

try {
  if (!process.env.MLIT_API_KEY) throw new Error('MLIT_API_KEY が未設定です（karte\\.env に追記してください）');
  const before = readJSON(AGG_FILE);
  if (before?.sample) throw new Error('サンプルデータが残っています。node scripts/clear-sample.mjs を実行してください');

  // 1) 取得（未取得の期＋最新4期の取り直し）
  run('node', ['scripts/fetch.mjs', '--refresh-latest'], { allowFail: true }); // 一部失敗しても手持ちで進む
  // 2) 集計
  run('node', ['scripts/aggregate.mjs']);
  // 3) 文章生成（変わった町だけ。利用枠超過なら途中終了 → 次回続きから）
  const gen = run('node', ['scripts/generate-text.mjs'], { allowFail: true });
  if (gen !== 0) log('文章生成が一部未完了です。生成済み分で公開し、次回続きを生成します');

  // 4) 変更があればコミット＆push
  const status = spawnSync('git', ['status', '--porcelain', 'data'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  if (!status) { log('データに変更なし。push しません'); process.exit(0); }
  const after = readJSON(AGG_FILE);
  run('git', ['add', 'data/aggregated.json', 'data/text']);
  run('git', ['commit', '-m', `data: ${after.generatedAt} 更新（最新期 ${after.latestPeriod}）`]);
  run('git', ['push']);
  log('完了。GitHub Actions がビルド・公開します');
} catch (e) {
  log(`エラー: ${e.message}`);
  // 失敗を残す（朝ブリーフ等で拾えるように）
  fs.appendFileSync(path.join(ROOT, 'logs', 'monthly-errors.log'), `${new Date().toISOString()} ${e.message}\n`);
  process.exit(1);
}
