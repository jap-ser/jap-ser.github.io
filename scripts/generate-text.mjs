// 町名ページ・市町ページの解説文を Claude Code で生成し data/text/ にキャッシュする
// 数字はすべて aggregated.json から渡す。AIには数字を作らせない（プロンプトで禁止し、出力も検査する）
// 使い方: node scripts/generate-text.mjs [--city kanazawa] [--limit 20] [--force]
import path from 'node:path';
import crypto from 'node:crypto';
import { AGG_FILE, TEXT_DIR, readJSON, writeJSON, loadEnv } from './_common.mjs';
import { askJSON } from './claude-code.mjs';

loadEnv();
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const onlyCity = opt('--city');
const limit = opt('--limit') ? Number(opt('--limit')) : Infinity;
const force = args.includes('--force');
const MODEL = process.env.MODEL_SOUBA || undefined; // 未指定なら Claude Code の既定モデル

const agg = readJSON(AGG_FILE);
if (!agg) { console.error('data/aggregated.json がありません。先に aggregate.mjs を実行してください。'); process.exit(2); }
if (agg.sample) { console.log('サンプルデータのため文章生成はスキップします（実データが入ったら実行）'); process.exit(0); }

const TYPE_LABEL = { land: '土地', house: '戸建（土地と建物）', condo: 'マンション' };
const fmt = (v, unit = '') => (v == null ? 'データなし' : `${v.toLocaleString('ja-JP')}${unit}`);

function describe(name, s, latestLabel) {
  const lines = [`対象: ${name}`, `最新データ期: ${latestLabel}`];
  for (const t of ['land', 'house', 'condo']) {
    const x = s[t];
    if (!x || !x.y3 || !x.y3.count) { lines.push(`${TYPE_LABEL[t]}: 直近3年の取引なし`); continue; }
    lines.push(`${TYPE_LABEL[t]}: 直近1年 ${x.y1.count}件 / 直近3年 ${x.y3.count}件`);
    let mid = `  直近3年の中央値: 価格 ${fmt(x.y3.medianPrice, '万円')}, 坪単価 ${fmt(x.y3.medianTsubo, '万円/坪')}, 面積 ${fmt(x.y3.medianArea, '㎡')}`;
    if (t === 'house' && x.y3.medianBuildingYear) mid += `, 建築年 ${x.y3.medianBuildingYear}年頃`;
    lines.push(mid);
    if (x.y3.p25Tsubo != null && x.y3.p75Tsubo != null) lines.push(`  坪単価の中間帯(25〜75%): ${x.y3.p25Tsubo}〜${x.y3.p75Tsubo}万円/坪`);
    if (x.trend) lines.push(`  直近1年 vs その前1年の変化: ${x.trend.pct > 0 ? '+' : ''}${x.trend.pct}%（${x.trend.curCount}件 vs ${x.trend.prevCount}件）`);
    else lines.push('  変化率: 件数が少ないため算出不可');
  }
  return lines.join('\n');
}

function buildPrompt(kind, facts) {
  return [
    'あなたは石川県金沢市で30年以上営業する不動産会社の担当者です。以下の集計データ「だけ」を根拠に、' + kind + 'ページの解説文を日本語で書いてください。',
    '',
    '【厳守】',
    '- 数字はデータにあるものだけ使う。データにない数字・年・割合を絶対に書かない。推測の数値も禁止',
    '- 「必ず」「最短◯日」「相場の◯%で買取」「地域No.1」「金沢で一番」などの断定・保証・比較優位表現は禁止',
    '- 買取について触れる場合は「査定・物件確認のうえで判断」という前提を必ず添える',
    '- 口コミ・お客様の声・架空の事例を作らない',
    '- 特定の取引を推測させる書き方をしない（町名単位の傾向まで）',
    '- データが少ない種別は「件数が少ないため参考値」と正直に書く',
    '- 300〜600字。段落は2〜4つ。売却を考えている地元の方に向けた、落ち着いた丁寧な文体（です・ます）',
    '- 冒頭で町名（または市町名）に触れ、最後は「相場を踏まえて仲介と買取のどちらが合うか一緒に考えましょう」という趣旨で穏やかに締める（文言は自由）',
    '',
    '【データ】',
    facts,
    '',
    '【出力形式】JSONのみ。前後に説明を付けない:',
    '{"paragraphs": ["段落1", "段落2"], "summary": "検索結果向けの説明文（80〜110字。数字はデータにあるものだけ）"}',
  ].join('\n');
}

// 出力にデータ外の数字が混ざっていないか簡易検査
function numbersIn(text) {
  return new Set((String(text).match(/\d[\d,\.]*/g) ?? []).map((s) => s.replace(/,/g, '').replace(/\.0+$/, '')));
}
function validate(out, facts) {
  if (!out || !Array.isArray(out.paragraphs) || !out.paragraphs.length || typeof out.summary !== 'string') return 'format';
  const allowed = numbersIn(facts);
  for (const n of numbersIn(out.paragraphs.join(' ') + ' ' + out.summary)) {
    if (n.length <= 1) continue; // 1桁は「3つ」等の語に使われるので許容
    if (!allowed.has(n)) return `unknown number ${n}`;
  }
  const body = out.paragraphs.join('');
  if (body.length < 200 || body.length > 900) return `length ${body.length}`;
  for (const ng of ['必ず', 'No.1', 'ナンバーワン', '一番', '最短', '保証']) if (body.includes(ng)) return `ng word ${ng}`;
  return null;
}

const jobs = [];
for (const c of Object.values(agg.cities)) {
  if (onlyCity && c.key !== onlyCity) continue;
  jobs.push({ id: c.key, kind: '市町の相場', name: c.name, summary: c.summary });
  for (const t of Object.values(c.towns)) {
    if (t.hasPage) jobs.push({ id: `${c.key}_${t.slug}`, kind: '町名別の相場', name: `${c.name}${t.name}`, summary: t.summary });
  }
}

let done = 0, skipped = 0, failed = 0;
let transientFails = 0;   // 連続した一時エラーの回数（成功でリセット）
const MAX_WAITS = 12;     // 待機して再試行する上限（1,1,5,5,15,15,... 分 ≒ 最大約2時間）
for (const j of jobs) {
  if (done >= limit) break;
  const facts = describe(j.name, j.summary, agg.latestPeriodLabel);
  const hash = crypto.createHash('sha1').update(facts).digest('hex').slice(0, 12);
  const file = path.join(TEXT_DIR, `${j.id}.json`);
  const prev = readJSON(file);
  if (prev && prev.hash === hash && !force) { skipped++; continue; }
  let ok = false, lastErr = '';
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    try {
      const out = await askJSON(buildPrompt(j.kind, facts), { model: MODEL });
      const err = validate(out, facts);
      if (err) { lastErr = err; continue; }
      writeJSON(file, { id: j.id, name: j.name, hash, generatedAt: new Date().toISOString().slice(0, 10), paragraphs: out.paragraphs, summary: out.summary });
      ok = true; done++; transientFails = 0;
      console.log(`生成 ${j.name}`);
    } catch (e) {
      lastErr = e.message;
      if (/authenticate|OAuth|login|not logged/i.test(e.message)) {
        console.error('Claude Code のログインが切れています。karte\\claude-login.bat をダブルクリックして再ログインしてください。');
        process.exit(1);
      }
      // 利用枠・通信などの一時的なエラー: 待ってから同じ町をやり直す（最大 MAX_WAITS 回）
      if (/rate limit|usage limit|limit reached|429|exit 1|overloaded|ECONN|timeout/i.test(e.message)) {
        transientFails++;
        if (transientFails > MAX_WAITS) {
          console.error(`一時的なエラーが続くため終了します（${transientFails - 1}回待機）。次回の実行で続きから再開します。最後のエラー: ${e.message.slice(0, 200)}`);
          process.exit(1);
        }
        const waitMin = transientFails <= 2 ? 1 : transientFails <= 4 ? 5 : 15;
        console.error(`一時エラー（${e.message.slice(0, 120)}）。${waitMin}分待って再試行します（${transientFails}/${MAX_WAITS}）`);
        await new Promise((r) => setTimeout(r, waitMin * 60 * 1000));
        attempt--; // この試行はカウントしない
      }
    }
  }
  if (!ok) { failed++; console.error(`失敗 ${j.name}: ${lastErr}`); }
}
console.log(`生成 ${done} / 変更なし ${skipped} / 失敗 ${failed} / 全${jobs.length}`);
process.exit(failed ? 1 : 0);
