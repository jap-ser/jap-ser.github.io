// ファビコン／ロゴ画像を public/ に生成する。
// 元データは public/favicon.svg（会社のロゴマーク）。実ロゴの画像を受け取ったら
// favicon.svg を差し替えて `node scripts/make-icons.mjs` を実行すれば全サイズが揃う。
//
// 生成物:
//   favicon.ico        16/32/48px を束ねた本物のICO（Googleがまず取りに来るURL）
//   icon-192.png       PWA / Android
//   icon-512.png       PWA / Android
//   apple-touch-icon.png  180px iOS
//   logo.png           512px 構造化データ（Organization.logo）用
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pub = (p) => fileURLToPath(new URL(`../public/${p}`, import.meta.url));
const svg = readFileSync(pub('favicon.svg'));
const render = (size) => sharp(svg, { density: 600 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

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

for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180], ['logo.png', 512]]) {
  writeFileSync(pub(name), await render(size));
}
console.log('icons written to public/');
