// Claude Code(月額サブスク)経由でプロンプトを実行する。karte/src/lib/claude-code.js と同じ方針:
// - ANTHROPIC_API_KEY を環境から除外して起動（従量課金への横滑り事故を構造的に防ぐ。消さないこと）
// - ツール全無効、1回の応答だけもらう
import { spawn } from 'node:child_process';
import path from 'node:path';

const CLAUDE_BIN = process.platform === 'win32'
  ? path.join(process.env.APPDATA ?? '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe')
  : 'claude';

export function ask(prompt, { model, timeoutMs = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    const args = ['-p', '--output-format', 'json', '--tools', ''];
    if (model) args.push('--model', model);
    // cwd を一時フォルダにして、プロジェクトの CLAUDE.md や git 状態を読み込ませない（純粋なテキスト処理にする）
    const child = spawn(CLAUDE_BIN, args, { env, cwd: process.env.TEMP || process.env.TMP || undefined });
    let out = '', err = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new Error('claude timeout')); }, timeoutMs);
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => { clearTimeout(timer); reject(e); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        // JSON封筒なら result（人が読めるエラー文）を優先して返す
        try { const e = JSON.parse(out); if (e && e.result) return reject(new Error(`claude exit ${code}: ${String(e.result).slice(0, 500)}`)); } catch {}
        return reject(new Error(`claude exit ${code}: ${(err || out).slice(0, 500)}`));
      }
      try {
        const envelope = JSON.parse(out);
        if (envelope.is_error) return reject(new Error(`claude error: ${String(envelope.result).slice(0, 500)}`));
        resolve(envelope.result ?? '');
      } catch { resolve(out.trim()); }
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export async function askJSON(prompt, opts = {}) {
  const text = await ask(prompt, opts);
  const clean = text.replace(/```json|```/g, '').trim();
  try { return JSON.parse(clean); } catch {
    const m = clean.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error(`JSONパース失敗: ${clean.slice(0, 200)}`);
  }
}
