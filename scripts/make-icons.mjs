// ファビコン／ロゴ画像を public/ にまとめて生成する。
//
//   node scripts/make-icons.mjs [ロゴ画像のパス] [--bg=#ffffff] [--pad=8]
//
// 引数なしのときは public/logo-source.(svg|png|jpg|jpeg|webp) を探し、
// 無ければ public/favicon.svg（暫定の家＋Jマーク）を使う。
// 会社の正式ロゴを受け取ったら public/logo-source.png などとして置き、このコマンドを1回流せば
// 下の生成物がぜんぶ作り直される。HTML側の参照URLは変わらないので他の修正は不要。
//
//   --bg   正方形にするときの余白の色（既定: 透明。白地のロゴなら --bg=#ffffff）
//   --pad  余白の割合(%)。ロゴが枠いっぱいで窮屈なときに 8〜12 くらい
//
// 生成物:
//   favicon.ico          16/32/48px を束ねた本物のICO（Googleがまず取りに来るURL）
//   favicon.svg          SVG版（元がラスター画像のときはPNGを埋め込んだSVGを書き出す）
//   icon-192.png         PWA / Android
//   icon-512.png         PWA / Android
//   apple-touch-icon.png 180px iOS
//   logo.png             512px 構造化データ（Organization.logo）用
import sharp from 'sharp';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pub = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const bg = flag('bg', null);
const pad = Number(flag('pad', 0));

const candidates = ['logo-source.svg', 'logo-source.png', 'logo-source.jpg', 'logo-source.jpeg', 'logo-source.webp'];
const source = args.find((a) => !a.startsWith('--')) ?? candidates.map(pub).find(existsSync) ?? pub('favicon.svg');
if (!existsSync(source)) throw new Error(`元画像が見つからない: ${source}`);
const isSvg = source.toLowerCase().endsWith('.svg');
const input = readFileSync(source);

// 元画像が横長・縦長でも切らずに正方形へ収める（余白は --bg、既定は透明）
const background = bg ?? { r: 0, g: 0, b: 0, alpha: 0 };
async function render(size) {
  const inner = Math.max(1, Math.round(size * (1 - pad / 50)));
  const fitted = await sharp(input, { density: 600 })
    .resize(inner, inner, { fit: 'contain', background })
    .png()
    .toBuffer();
  return sharp(fitted)
    .resize(size, size, { fit: 'contain', background })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// PNGを埋め込むICO（Vista以降の形式）を組み立てる
function buildIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach(({ size, data }, i) => {
    const at = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, at);
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1);
    dir.writeUInt8(0, at + 2);
    dir.writeUInt8(0, at + 3);
    dir.writeUInt16LE(1, at + 4);
    dir.writeUInt16LE(32, at + 6);
    dir.writeUInt32LE(data.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.data)]);
}

const ico = [];
for (const size of [16, 32, 48]) ico.push({ size, data: await render(size) });
writeFileSync(pub('favicon.ico'), buildIco(ico));

const png192 = await render(192);
for (const [name, data] of [
  ['icon-192.png', png192],
  ['icon-512.png', await render(512)],
  ['apple-touch-icon.png', await render(180)],
  ['logo.png', await render(512)],
]) writeFileSync(pub(name), data);

// HTMLは常に /favicon.svg を参照する。元がSVGならそのまま、ラスターなら192pxのPNGを包んだSVGにする
if (isSvg) {
  if (resolve(pub('favicon.svg')) !== resolve(source)) writeFileSync(pub('favicon.svg'), input);
} else {
  writeFileSync(
    pub('favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192" role="img" aria-label="ジャパンサービス">` +
      `<image href="data:image/png;base64,${png192.toString('base64')}" width="192" height="192"/>` +
      `</svg>\n`,
  );
}

console.log(`元画像: ${source}`);
console.log('public/ に favicon.ico / favicon.svg / icon-192 / icon-512 / apple-touch-icon / logo.png を書き出した');
