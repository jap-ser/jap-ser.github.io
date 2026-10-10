// Googleビジネスプロフィール「最新情報」投稿用のイメージ画像を作る（1200x900・文字なしのイラスト）。
// 追加費用ゼロ（SVG を sharp で JPG にするだけ）。ネット上の写真は構図・雰囲気の参考にしただけで、素材は使っていない。
// 使い方（baikyaku-site のフォルダで）: node sns/gbp/make_images.mjs          … 全部作る
//                                       node sns/gbp/make_images.mjs furuie   … 1枚だけ
// 色はサイト・投稿カードと同じ（緑 #2f6f5e / 紺 #1d3348 / ミスト #eef4f1 / アンバー #c8862c）。
import sharp from 'sharp';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const W = 1200, H = 900;
const C = {
  brand: '#2f6f5e', deep: '#235448', light: '#488e79', mist: '#eef4f1', ink: '#1d3348', amber: '#c8862c',
  roof: '#3d4850', roofHi: '#5f6c75', roofDk: '#2c353b', wall: '#efe7d6', wood: '#6b5444', woodDk: '#4a3a2e',
  glass: '#cfdde0', stone: '#bdb6a6', road: '#c7ccc8',
};

// 乱数は固定（何度作っても同じ絵になるように）
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const lerp = (a, b, t) => a + (b - a) * t;

const grad = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">` +
  stops.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('') +
  `</linearGradient>`;

const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>` +
  `<filter id="b4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>` +
  `<filter id="b12" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>` +
  `<filter id="b30" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>` +
  defs + `</defs>${body}</svg>`;

// ---- 部品 ----------------------------------------------------------------

function mountains(far, near, dy = 0) {
  return `<g transform="translate(0,${dy})">
  <path d="M0,520 C120,470 220,430 330,455 C420,400 520,380 620,430 C720,390 830,360 940,420 C1030,400 1120,430 1200,450 L1200,700 L0,700 Z" fill="${far}"/>
  <path d="M0,565 C150,525 260,505 380,535 C500,505 640,495 760,530 C880,500 1040,505 1200,545 L1200,700 L0,700 Z" fill="${near}"/></g>`;
}

function cloud(x, y, s = 1, o = 0.8) {
  return `<g transform="translate(${x},${y}) scale(${s})" opacity="${o}" filter="url(#b12)">
  <ellipse cx="0" cy="0" rx="120" ry="26" fill="#fff"/><ellipse cx="-50" cy="-18" rx="60" ry="24" fill="#fff"/><ellipse cx="40" cy="-24" rx="70" ry="28" fill="#fff"/></g>`;
}

// 瓦屋根（台形）。瓦の縦筋つき
function tileRoof(x1b, x2b, yb, x1t, x2t, yt, { fill = C.roof, n = 26, snow = false } = {}) {
  let s = `<polygon points="${x1b},${yb} ${x2b},${yb} ${x2t},${yt} ${x1t},${yt}" fill="${fill}"/>`;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    s += `<line x1="${lerp(x1t, x2t, t)}" y1="${yt}" x2="${lerp(x1b, x2b, t)}" y2="${yb}" stroke="${C.roofHi}" stroke-width="2" opacity="0.55"/>`;
  }
  s += `<rect x="${x1b - 2}" y="${yb - 3}" width="${x2b - x1b + 4}" height="11" rx="3" fill="${C.roofDk}"/>`;
  if (snow) {
    const m = (yb - yt) * 0.2;
    const k = (x1t - x1b) / (yt - yb); // 斜辺の傾き
    const xb1 = x1b + k * -m + 10, xb2 = x2b - k * -m - 10;
    s += `<polygon points="${xb1},${yb - m} ${xb2},${yb - m} ${x2t - 4},${yt - 4} ${x1t + 4},${yt - 4}" fill="#fbfdfd" stroke="#fbfdfd" stroke-width="16" stroke-linejoin="round"/>`;
    s += `<path d="M${xb1},${yb - m + 6} L${xb2},${yb - m + 6}" stroke="#d5e0e6" stroke-width="5" stroke-linecap="round"/>`;
  }
  return s;
}

// 障子風の窓
function shoji(x, y, w, h, cols = 3, rows = 2) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f7f2e6" stroke="${C.wood}" stroke-width="5"/>`;
  for (let i = 1; i < cols; i++) s += `<line x1="${x + (w * i) / cols}" y1="${y}" x2="${x + (w * i) / cols}" y2="${y + h}" stroke="${C.wood}" stroke-width="2.5"/>`;
  for (let j = 1; j < rows; j++) s += `<line x1="${x}" y1="${y + (h * j) / rows}" x2="${x + w}" y2="${y + (h * j) / rows}" stroke="${C.wood}" stroke-width="2.5"/>`;
  return s;
}

// 格子（金沢の町家にある細い縦格子）
function koshi(x, y, w, h, n = 16) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#3b2f27"/>`;
  for (let i = 0; i <= n; i++) s += `<rect x="${x + (w - 5) * (i / n)}" y="${y}" width="5" height="${h}" fill="${C.wood}"/>`;
  s += `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" fill="none" stroke="${C.woodDk}" stroke-width="5"/>`;
  return s;
}

// 古い木造2階建て（瓦屋根）。原点は地面の中央
function oldHouse(x, y, s = 1, { snow = false } = {}) {
  let g = '';
  // 1階
  g += `<rect x="-270" y="-222" width="540" height="222" fill="${C.wall}"/>`;
  g += `<rect x="-270" y="-96" width="540" height="96" fill="${C.wood}"/>`;
  for (let i = 0; i <= 27; i++) g += `<line x1="${-270 + i * 20}" y1="-96" x2="${-270 + i * 20}" y2="0" stroke="${C.woodDk}" stroke-width="2" opacity="0.6"/>`;
  g += `<rect x="-276" y="-8" width="552" height="8" fill="#9c978b"/>`;
  // 2階
  g += `<rect x="-184" y="-384" width="368" height="124" fill="${C.wall}"/>`;
  for (const px of [-184, -62, 62, 176]) g += `<rect x="${px}" y="-384" width="8" height="124" fill="${C.wood}"/>`;
  g += shoji(-150, -356, 76, 70, 2, 2) + shoji(-40, -356, 86, 70, 2, 2) + shoji(82, -356, 76, 70, 2, 2);
  g += `<rect x="-184" y="-284" width="368" height="8" fill="${C.wood}"/>`;
  // 屋根（上＝大屋根、下＝1階の庇）
  g += tileRoof(-240, 240, -384, -178, 178, -474, { snow });
  g += `<rect x="-184" y="-484" width="368" height="14" rx="5" fill="${C.roofDk}"/>`;
  g += `<rect x="-196" y="-490" width="20" height="24" rx="4" fill="${C.roofDk}"/><rect x="176" y="-490" width="20" height="24" rx="4" fill="${C.roofDk}"/>`;
  if (snow) g += `<rect x="-176" y="-496" width="352" height="16" rx="8" fill="#fbfdfd"/>`;
  g += tileRoof(-312, 312, -222, -276, 276, -268, { n: 34, snow });
  g += `<rect x="-270" y="-222" width="540" height="14" fill="#000" opacity="0.12"/>`;
  // 1階の窓・玄関
  g += koshi(-236, -196, 200, 92, 18);
  g += `<rect x="16" y="-178" width="136" height="178" fill="${C.woodDk}"/>`;
  for (let i = 0; i < 2; i++) {
    const dx = 22 + i * 64;
    g += `<rect x="${dx}" y="-170" width="60" height="164" fill="#5d4a3d"/>`;
    g += `<rect x="${dx + 6}" y="-162" width="48" height="96" fill="#d9e1da" opacity="0.85"/>`;
    for (let k = 1; k < 4; k++) g += `<line x1="${dx + 6 + k * 12}" y1="-162" x2="${dx + 6 + k * 12}" y2="-66" stroke="#5d4a3d" stroke-width="2.5"/>`;
    g += `<line x1="${dx + 6}" y1="-114" x2="${dx + 54}" y2="-114" stroke="#5d4a3d" stroke-width="2.5"/>`;
  }
  g += shoji(182, -186, 64, 62, 2, 2);
  return `<g transform="translate(${x},${y}) scale(${s})">${g}</g>`;
}

// 今どきの2階建て（住宅街・空き地の背景用）
function modHouse(x, y, s = 1, { wall = '#f1ece0', roof = C.roof, snow = false } = {}) {
  let g = '';
  g += `<rect x="-100" y="-170" width="200" height="170" fill="${wall}"/>`;
  g += `<rect x="44" y="-170" width="56" height="170" fill="#000" opacity="0.06"/>`;
  g += `<polygon points="-118,-170 118,-170 78,-232 -78,-232" fill="${roof}"/>`;
  g += `<rect x="-120" y="-173" width="240" height="9" rx="2" fill="#000" opacity="0.35"/>`;
  if (snow) g += `<polygon points="-104,-182 104,-182 74,-230 -74,-230" fill="#fbfdfd" stroke="#fbfdfd" stroke-width="10" stroke-linejoin="round"/>`;
  g += `<rect x="-112" y="-92" width="224" height="9" fill="${roof}"/>`;
  for (const wx of [-76, 20]) g += `<rect x="${wx}" y="-150" width="56" height="42" fill="${C.glass}" stroke="#fff" stroke-width="5"/><line x1="${wx + 28}" y1="-150" x2="${wx + 28}" y2="-108" stroke="#fff" stroke-width="3"/>`;
  g += `<rect x="-72" y="-70" width="40" height="70" fill="${C.wood}"/><circle cx="-40" cy="-34" r="3" fill="#d9c9a0"/>`;
  g += `<rect x="0" y="-68" width="76" height="46" fill="${C.glass}" stroke="#fff" stroke-width="5"/><line x1="38" y1="-68" x2="38" y2="-22" stroke="#fff" stroke-width="3"/>`;
  g += `<rect x="-100" y="-6" width="200" height="6" fill="#9c978b"/>`;
  return `<g transform="translate(${x},${y}) scale(${s})">${g}</g>`;
}

function pine(x, y, s = 1, { snow = false, yukitsuri = false } = {}) {
  let g = `<path d="M0,0 C-10,-60 16,-110 -4,-170 C-16,-210 8,-240 2,-272" stroke="${C.wood}" stroke-width="16" fill="none" stroke-linecap="round"/>`;
  const pads = [[-52, -150, 66, 26], [50, -190, 60, 24], [-34, -236, 54, 22], [12, -282, 46, 20]];
  for (const [cx, cy, rx, ry] of pads) {
    g += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#3f6b57"/><ellipse cx="${cx - 6}" cy="${cy - 7}" rx="${rx * 0.72}" ry="${ry * 0.6}" fill="#4f8068"/>`;
    if (snow) g += `<ellipse cx="${cx}" cy="${cy - ry * 0.55}" rx="${rx * 0.86}" ry="${ry * 0.55}" fill="#fbfdfd"/>`;
  }
  if (yukitsuri) {
    // 雪吊り（金沢の冬の風物）
    g += `<line x1="0" y1="0" x2="0" y2="-392" stroke="#8a7a5c" stroke-width="6"/>`;
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI * (i / 16);
      const ex = Math.cos(a) * 138, ey = -96 + Math.sin(a) * 26;
      g += `<line x1="0" y1="-388" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" stroke="#b59f6d" stroke-width="2"/>`;
    }
    g += `<ellipse cx="0" cy="-96" rx="138" ry="26" fill="none" stroke="#b59f6d" stroke-width="2.5"/>`;
    g += `<path d="M-7,-388 L0,-410 L7,-388 Z" fill="#b59f6d"/>`;
  }
  return `<g transform="translate(${x},${y}) scale(${s})">${g}</g>`;
}

function roundTree(x, y, s = 1, c1 = '#5b8f6f', c2 = '#6fa482') {
  return `<g transform="translate(${x},${y}) scale(${s})"><rect x="-6" y="-70" width="12" height="70" fill="${C.wood}"/>
  <circle cx="0" cy="-110" r="56" fill="${c1}"/><circle cx="-34" cy="-84" r="34" fill="${c1}"/><circle cx="34" cy="-86" r="36" fill="${c1}"/><circle cx="-12" cy="-124" r="32" fill="${c2}"/></g>`;
}

function bush(x, y, s = 1, c1 = '#4f8068', c2 = '#6a9c80') {
  return `<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="0" cy="-22" rx="46" ry="26" fill="${c1}"/><ellipse cx="-30" cy="-12" rx="28" ry="18" fill="${c1}"/><ellipse cx="30" cy="-12" rx="30" ry="18" fill="${c1}"/><ellipse cx="-8" cy="-30" rx="26" ry="14" fill="${c2}"/></g>`;
}

// 電柱（原点は根元）
function pole(x, base, h, s = 1) {
  const g = `<rect x="-6" y="${-h}" width="12" height="${h}" fill="#77797a"/>
  <rect x="-48" y="${-h + 30}" width="96" height="7" fill="#6a6c6c"/><rect x="-38" y="${-h + 64}" width="76" height="6" fill="#6a6c6c"/>
  <rect x="8" y="${-h + 96}" width="26" height="44" rx="6" fill="#8d8f8e"/>
  ${[-44, -20, 20, 44].map((dx) => `<rect x="${dx - 3}" y="${-h + 20}" width="6" height="10" fill="#9aa0a0"/>`).join('')}`;
  return `<g transform="translate(${x},${base}) scale(${s})">${g}</g>`;
}

function blockWall(x, y, w, h) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.stone}"/><rect x="${x - 3}" y="${y - 7}" width="${w + 6}" height="9" fill="#a39c8c"/>`;
  for (let i = 1; i < w / 46; i++) s += `<line x1="${x + i * 46}" y1="${y + 2}" x2="${x + i * 46}" y2="${y + h}" stroke="#a39c8c" stroke-width="2"/>`;
  s += `<line x1="${x}" y1="${y + h / 2 + 1}" x2="${x + w}" y2="${y + h / 2 + 1}" stroke="#a39c8c" stroke-width="2"/>`;
  return s;
}

function stake(x, y, s = 1) {
  return `<g transform="translate(${x},${y}) scale(${s})"><ellipse cx="2" cy="1" rx="12" ry="4" fill="#000" opacity="0.18"/><rect x="-6" y="-50" width="12" height="50" fill="#f5f1e6"/><rect x="2" y="-50" width="4" height="50" fill="#000" opacity="0.1"/><rect x="-6" y="-50" width="12" height="14" fill="#c8402c"/></g>`;
}

// ---- 1. 古家付き土地（瓦屋根の古い家） -------------------------------------
function furuie() {
  const defs = grad('sky', [[0, '#dfe8ea'], [0.6, '#eef2ee'], [1, '#f6f4ea']]) + grad('rd', [[0, '#cdd2ce'], [1, '#b4bbb7']]);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += `<circle cx="930" cy="170" r="70" fill="#fff" opacity="0.7" filter="url(#b30)"/>`;
  b += cloud(240, 150, 1.1, 0.75) + cloud(980, 250, 0.8, 0.6);
  b += mountains('#b9cdc4', '#9dbbac', 60);
  // 遠くの家並み
  b += modHouse(60, 716, 0.82, { wall: '#e3e2da', roof: '#6b7378' }) + modHouse(1150, 720, 0.9, { wall: '#e8e2d6', roof: '#7a6d64' });
  b += roundTree(1010, 722, 0.9, '#7ea88f', '#93b8a0');
  // 電線
  b += `<path d="M982,236 Q520,330 -20,250" stroke="#5b5d5c" stroke-width="2" fill="none" opacity="0.6"/><path d="M992,270 Q540,360 -20,292" stroke="#5b5d5c" stroke-width="2" fill="none" opacity="0.6"/><path d="M1078,236 Q1150,262 1220,240" stroke="#5b5d5c" stroke-width="2" fill="none" opacity="0.6"/>`;
  // 庭
  b += `<rect x="0" y="716" width="${W}" height="60" fill="#a9bfa3"/>`;
  b += pine(150, 730, 1.02);
  b += oldHouse(545, 734, 1.02);
  b += bush(300, 742, 0.9) + bush(880, 742, 1.0) + bush(960, 746, 0.7, '#5b8f6f', '#79aa8c');
  b += `<polygon points="566,734 696,734 716,790 546,790" fill="#d8d2c3"/>`;
  b += pole(1030, 792, 590);
  // 塀と道路
  b += blockWall(40, 748, 500, 42) + blockWall(722, 748, 440, 42);
  b += `<rect x="0" y="790" width="${W}" height="110" fill="url(#rd)"/><rect x="0" y="790" width="${W}" height="8" fill="#e2e3dd"/>`;
  b += `<rect x="0" y="842" width="${W}" height="6" fill="#f4f4ee" opacity="0.9"/>`;
  return svg(b, defs);
}

// ---- 2. 費用と税金（机の上の家の模型・電卓・書類） -------------------------
function hiyouZeikin() {
  const defs = grad('desk', [[0, '#e6d3b3'], [1, '#d3bb95']], 1, 1) +
    `<radialGradient id="lt" cx="0.12" cy="0.05" r="0.9"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
  const r = rng(7);
  let b = `<rect width="${W}" height="${H}" fill="url(#desk)"/>`;
  for (let i = 1; i < 6; i++) b += `<line x1="0" y1="${i * 150 + 10}" x2="${W}" y2="${i * 150 - 30}" stroke="#b99f77" stroke-width="2" opacity="0.5"/>`;
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, l = 60 + r() * 160; b += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + l).toFixed(0)}" y2="${(y - l * 0.03).toFixed(0)}" stroke="#c4aa80" stroke-width="1.5" opacity="0.45"/>`; }

  const paper = (cx, cy, w, h, rot, inner) => `<g transform="translate(${cx},${cy}) rotate(${rot})"><rect x="${-w / 2 + 10}" y="${-h / 2 + 14}" width="${w}" height="${h}" fill="#3a2e1e" opacity="0.22" filter="url(#b12)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" fill="#fdfdfb"/>${inner}</g>`;
  // 下の書類（表）
  let t1 = `<rect x="-200" y="-300" width="220" height="16" rx="3" fill="${C.brand}" opacity="0.8"/>`;
  for (let j = 0; j < 9; j++) t1 += `<rect x="-200" y="${-250 + j * 44}" width="400" height="44" fill="${j % 2 ? '#f1f5f3' : '#fff'}" stroke="#cfd8d4" stroke-width="2"/><rect x="-186" y="${-236 + j * 44}" width="${90 + (j * 37) % 80}" height="12" rx="3" fill="#c3ccc9"/><rect x="100" y="${-236 + j * 44}" width="${50 + (j * 23) % 40}" height="12" rx="3" fill="#aab6b2"/>`;
  b += paper(770, 500, 500, 700, 7, t1);
  // 上の書類（文章）
  let t2 = `<rect x="-180" y="-270" width="200" height="18" rx="3" fill="${C.ink}" opacity="0.75"/>`;
  for (let j = 0; j < 12; j++) t2 += `<rect x="-180" y="${-220 + j * 34}" width="${j % 4 === 3 ? 210 : 360 - (j * 29) % 60}" height="11" rx="3" fill="#c9d1ce"/>`;
  t2 += `<circle cx="140" cy="250" r="26" fill="none" stroke="#c8402c" stroke-width="4" opacity="0.8"/><rect x="-180" y="236" width="220" height="3" fill="#9aa5a1"/>`;
  b += paper(470, 440, 460, 640, -9, t2);

  // 電卓
  let calc = `<rect x="-118" y="-150" width="260" height="340" rx="22" fill="#1e1a14" opacity="0.3" filter="url(#b12)"/><rect x="-130" y="-170" width="260" height="340" rx="22" fill="#2e3d45"/><rect x="-130" y="-170" width="260" height="340" rx="22" fill="none" stroke="#415158" stroke-width="3"/>`;
  calc += `<rect x="-108" y="-148" width="216" height="70" rx="8" fill="#d5e4da"/><rect x="-108" y="-148" width="216" height="10" rx="5" fill="#000" opacity="0.08"/>`;
  for (const dx of [30, 52, 74]) calc += `<rect x="${dx}" y="-124" width="14" height="26" rx="3" fill="#2e3d45" opacity="0.75"/>`;
  for (let row = 0; row < 5; row++) for (let col = 0; col < 4; col++) {
    const op = col === 3, eq = op && row === 4;
    calc += `<rect x="${-108 + col * 56}" y="${-58 + row * 44}" width="48" height="36" rx="8" fill="${eq ? C.brand : op ? C.amber : row === 0 ? '#7b8a91' : '#56666e'}"/><rect x="${-108 + col * 56}" y="${-58 + row * 44}" width="48" height="12" rx="6" fill="#fff" opacity="0.1"/>`;
  }
  b += `<g transform="translate(250,560) rotate(-14)">${calc}</g>`;

  // 家の模型（立体）
  b += `<ellipse cx="850" cy="640" rx="170" ry="36" fill="#2b2012" opacity="0.3" filter="url(#b12)"/>`;
  b += `<polygon points="700,480 810,516 810,650 700,612" fill="#f7f5ef"/>`;          // 妻側の壁
  b += `<polygon points="700,480 755,396 810,516" fill="#f7f5ef"/>`;                    // 妻の三角
  b += `<polygon points="810,516 940,470 940,602 810,650" fill="#e1ddd2"/>`;           // 平側の壁
  b += `<polygon points="814,526 950,478 885,352 751,388" fill="${C.brand}"/>`;        // 屋根（手前の面）
  b += `<polygon points="751,388 755,398 692,494 688,484" fill="${C.deep}"/>`;        // 屋根の厚み
  b += `<line x1="751" y1="388" x2="885" y2="352" stroke="${C.deep}" stroke-width="6" stroke-linecap="round"/>`;
  b += `<polygon points="814,526 950,478 950,488 814,537" fill="${C.deep}"/>`;
  b += `<polygon points="735,556 775,569 775,640 735,626" fill="${C.wood}"/>`;         // 玄関
  b += `<polygon points="842,548 908,525 908,575 842,599" fill="#bcd3d6"/><polygon points="842,548 908,525 908,575 842,599" fill="none" stroke="#fff" stroke-width="5"/><line x1="875" y1="537" x2="875" y2="587" stroke="#fff" stroke-width="4"/>`;
  b += `<circle cx="755" cy="470" r="13" fill="#bcd3d6" stroke="#fff" stroke-width="4"/>`;

  // ペン
  b += `<g transform="translate(560,770) rotate(-24)"><rect x="-150" y="-2" width="300" height="20" rx="10" fill="#2b2012" opacity="0.25" filter="url(#b4)"/><rect x="-150" y="-10" width="250" height="20" rx="10" fill="${C.ink}"/><rect x="60" y="-10" width="40" height="20" fill="#c9ccd0"/><polygon points="100,-10 150,0 100,10" fill="#c9ccd0"/><polygon points="136,-3 150,0 136,3" fill="#444"/><rect x="-140" y="-13" width="90" height="5" rx="2" fill="#c9ccd0"/></g>`;
  // 観葉植物（右上）
  b += `<g transform="translate(1090,120)"><circle cx="6" cy="10" r="84" fill="#2b2012" opacity="0.25" filter="url(#b12)"/><circle r="78" fill="#f1ede4"/><circle r="64" fill="#6b5444"/>` +
    [0, 50, 100, 150, 205, 260, 310].map((a, i) => `<ellipse cx="0" cy="-46" rx="24" ry="52" fill="${i % 2 ? '#4f8068' : '#3f6b57'}" transform="rotate(${a})"/>`).join('') + `</g>`;
  b += `<rect width="${W}" height="${H}" fill="url(#lt)"/>`;
  return svg(b, defs);
}

// ---- 3. 住宅街（相続・空き家・相場など汎用） ---------------------------------
function jutakugai() {
  const defs = grad('sky', [[0, '#cfe3ea'], [0.7, '#eaf2ef'], [1, '#f3f4ea']]) + grad('rd', [[0, '#cdd2ce'], [1, '#b4bbb7']]);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += `<circle cx="250" cy="150" r="80" fill="#fff" opacity="0.75" filter="url(#b30)"/>` + cloud(820, 130, 1.2, 0.8) + cloud(430, 260, 0.7, 0.6);
  b += mountains('#aac6bd', '#8fb3a4', 10);
  // 奥の家並み（淡く）
  b += `<rect x="0" y="640" width="${W}" height="160" fill="#b7c9b0"/>`;
  const back = [[70, '#e6e2d8', '#7c858a'], [250, '#ece6da', '#8a7d74'], [430, '#e2e7e4', '#6f7a82'], [770, '#ece6da', '#7c858a'], [960, '#e6e2d8', '#8a7d74'], [1140, '#e2e7e4', '#6f7a82']];
  for (const [x, wall, roof] of back) b += modHouse(x, 648, 0.62, { wall, roof });
  b += `<rect x="0" y="560" width="${W}" height="90" fill="#eaf2ef" opacity="0.35"/>`;
  b += roundTree(160, 652, 0.6, '#7ea88f', '#93b8a0') + roundTree(860, 652, 0.62, '#7ea88f', '#93b8a0');
  // 電線
  b += `<path d="M1082,266 Q600,380 -20,290" stroke="#5b5d5c" stroke-width="2" fill="none" opacity="0.6"/><path d="M1092,300 Q600,410 -20,330" stroke="#5b5d5c" stroke-width="2" fill="none" opacity="0.6"/><path d="M1178,266 Q1195,274 1220,268" stroke="#5b5d5c" stroke-width="2" fill="none" opacity="0.6"/>`;
  // 手前の家並み
  b += modHouse(200, 770, 1.28, { wall: '#f1e9da', roof: '#4a5560' });
  b += roundTree(402, 774, 0.95);
  b += oldHouse(628, 770, 0.6);
  b += pine(858, 774, 0.62);
  b += modHouse(1010, 770, 1.2, { wall: '#e7e3d9', roof: '#6b5a50' });
  b += bush(40, 780, 0.9) + bush(470, 782, 0.8, '#5b8f6f', '#79aa8c') + bush(800, 782, 0.7) + bush(1170, 782, 0.9, '#5b8f6f', '#79aa8c');
  b += pole(1130, 802, 570);
  // 塀・生け垣と道路
  b += blockWall(250, 770, 150, 32) + blockWall(440, 770, 130, 32) + blockWall(700, 770, 190, 32);
  b += `<rect x="1068" y="762" width="132" height="40" rx="14" fill="#5b8f6f"/><rect x="1068" y="762" width="132" height="14" rx="7" fill="#79aa8c"/>`;
  b += `<rect x="0" y="800" width="${W}" height="100" fill="url(#rd)"/><rect x="0" y="800" width="${W}" height="8" fill="#e2e3dd"/><rect x="0" y="850" width="${W}" height="6" fill="#f4f4ee" opacity="0.9"/>`;
  return svg(b, defs);
}

// ---- 4. 雪の前の空き家点検（雪の瓦屋根と雪吊り） ---------------------------
function yuki() {
  const defs = grad('sky', [[0, '#b9c8d2'], [0.7, '#dbe4e8'], [1, '#eef2f3']]) + grad('gr', [[0, '#f6f9fa'], [1, '#dde6eb']]);
  const r = rng(21);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += mountains('#dfe7ea', '#cbd8dd', 60);
  b += modHouse(60, 716, 0.82, { wall: '#dcdcd6', roof: '#6b7378', snow: true }) + modHouse(1150, 720, 0.9, { wall: '#e0dcd2', roof: '#7a6d64', snow: true });
  b += `<rect x="0" y="712" width="${W}" height="188" fill="url(#gr)"/>`;
  b += oldHouse(590, 734, 1.0, { snow: true });
  b += pine(170, 742, 1.05, { snow: true, yukitsuri: true });
  b += `<ellipse cx="350" cy="742" rx="52" ry="26" fill="#fbfdfd"/><ellipse cx="930" cy="744" rx="64" ry="30" fill="#fbfdfd"/><ellipse cx="1010" cy="750" rx="40" ry="20" fill="#fbfdfd"/>`;
  b += `<path d="M0,770 C200,750 420,790 640,772 C860,756 1040,790 1200,768 L1200,900 L0,900 Z" fill="#fbfdfd"/>`;
  b += `<path d="M0,838 C260,820 520,850 760,834 C960,822 1100,846 1200,836" stroke="#d3dfe6" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  b += `<polygon points="612,734 742,734 800,900 560,900" fill="#e3ebef" opacity="0.9"/>`; // 玄関までの踏み跡
  for (let i = 0; i < 150; i++) { const x = r() * W, y = r() * H, rad = 1.5 + r() * 4.5; b += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rad.toFixed(1)}" fill="#fff" opacity="${(0.55 + r() * 0.45).toFixed(2)}"/>`; }
  return svg(b, defs);
}

// ---- 5. 土地・境界（家と家の間の空き地と境界杭） ---------------------------
function tochi() {
  const defs = grad('sky', [[0, '#cfe3ea'], [0.7, '#eaf2ef'], [1, '#f3f4ea']]) + grad('lot', [[0, '#9fc08f'], [1, '#b4cf9f']]) + grad('rd', [[0, '#cdd2ce'], [1, '#b4bbb7']]);
  const r = rng(5);
  let b = `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
  b += `<circle cx="900" cy="140" r="80" fill="#fff" opacity="0.75" filter="url(#b30)"/>` + cloud(300, 150, 1.2, 0.8) + cloud(700, 250, 0.7, 0.55);
  b += mountains('#aac6bd', '#8fb3a4', -10);
  b += `<rect x="0" y="600" width="${W}" height="300" fill="#b7c9b0"/>`;
  // 奥の家並みと木
  b += modHouse(470, 628, 0.5, { wall: '#e6e2d8', roof: '#6b7378' }) + modHouse(610, 628, 0.56, { wall: '#efe9dc', roof: '#5a4a42' }) + modHouse(760, 628, 0.5, { wall: '#e2e7e4', roof: C.roof });
  b += roundTree(370, 634, 0.7) + roundTree(860, 634, 0.62, '#5b8f6f', '#79aa8c');
  b += blockWall(290, 610, 620, 34);
  // 空き地
  b += `<polygon points="290,644 910,644 1030,806 170,806" fill="url(#lot)"/>`;
  b += `<ellipse cx="560" cy="716" rx="150" ry="30" fill="#c9bb9c" opacity="0.6"/><ellipse cx="760" cy="770" rx="110" ry="18" fill="#c9bb9c" opacity="0.5"/>`;
  for (let i = 0; i < 90; i++) {
    const t = r(), y = lerp(654, 800, t), half = lerp(300, 420, t), x = 600 + (r() * 2 - 1) * half, h = 8 + r() * 12;
    b += `<path d="M${x.toFixed(0)},${y.toFixed(0)} l-4,-${h.toFixed(0)} M${x.toFixed(0)},${y.toFixed(0)} l1,-${(h + 4).toFixed(0)} M${x.toFixed(0)},${y.toFixed(0)} l6,-${h.toFixed(0)}" stroke="#6f9b68" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
  }
  // 両隣の家
  b += modHouse(96, 800, 1.5, { wall: '#f1e9da', roof: '#4a5560' }) + modHouse(1110, 800, 1.5, { wall: '#e7e3d9', roof: '#6b5a50' });
  // 境界杭とロープ
  b += `<line x1="300" y1="622" x2="900" y2="622" stroke="#e8c23c" stroke-width="0" />`;
  b += stake(300, 648, 0.7) + stake(900, 648, 0.7);
  b += `<path d="M186,772 Q600,800 1014,772" stroke="#e0b93a" stroke-width="4" fill="none"/>`;
  b += stake(186, 806, 1.25) + stake(1014, 806, 1.25);
  // 道路
  b += `<rect x="0" y="806" width="${W}" height="94" fill="url(#rd)"/><rect x="0" y="806" width="${W}" height="10" fill="#e2e3dd"/><rect x="0" y="858" width="${W}" height="6" fill="#f4f4ee" opacity="0.9"/>`;
  return svg(b, defs);
}

// ---- 6. 相続・手続き（鍵・印鑑・書類） -------------------------------------
function shorui() {
  const defs = grad('desk', [[0, '#cdb48c'], [1, '#b99c70']], 1, 1) +
    `<radialGradient id="lt" cx="0.85" cy="0.05" r="0.95"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
  const r = rng(11);
  let b = `<rect width="${W}" height="${H}" fill="url(#desk)"/>`;
  for (let i = 1; i < 6; i++) b += `<line x1="0" y1="${i * 150 - 20}" x2="${W}" y2="${i * 150 + 16}" stroke="#a3875c" stroke-width="2" opacity="0.5"/>`;
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * H, l = 60 + r() * 160; b += `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x + l).toFixed(0)}" y2="${(y + l * 0.03).toFixed(0)}" stroke="#ab9063" stroke-width="1.5" opacity="0.45"/>`; }
  const sh = (inner, dx = 10, dy = 14) => `<g transform="translate(${dx},${dy})" opacity="0.28" filter="url(#b12)">${inner}</g>`;
  // 封筒
  const env = `<rect x="-300" y="-200" width="600" height="400" rx="6" fill="#d9c39a"/>`;
  b += `<g transform="translate(360,330) rotate(-10)">${sh(`<rect x="-300" y="-200" width="600" height="400" rx="6" fill="#2b2012"/>`)}${env}<polygon points="-300,-200 300,-200 0,10" fill="#ccb489"/><polyline points="-300,-200 0,10 300,-200" fill="none" stroke="#b79d70" stroke-width="3"/></g>`;
  // 書類
  let t = `<rect x="-200" y="-300" width="240" height="18" rx="3" fill="${C.ink}" opacity="0.75"/>`;
  for (let j = 0; j < 13; j++) t += `<rect x="-200" y="${-246 + j * 34}" width="${j % 5 === 4 ? 230 : 400 - (j * 31) % 70}" height="11" rx="3" fill="#c9d1ce"/>`;
  t += `<rect x="-200" y="226" width="250" height="3" fill="#9aa5a1"/><rect x="-200" y="276" width="250" height="3" fill="#9aa5a1"/><circle cx="120" cy="250" r="30" fill="none" stroke="#c8402c" stroke-width="5" opacity="0.85"/><circle cx="120" cy="250" r="20" fill="none" stroke="#c8402c" stroke-width="2.5" opacity="0.7"/>`;
  b += `<g transform="translate(720,470) rotate(6)">${sh(`<rect x="-250" y="-350" width="500" height="700" fill="#2b2012"/>`)}<rect x="-250" y="-350" width="500" height="700" fill="#fdfdfb"/>${t}</g>`;
  // 朱肉
  b += `<g transform="translate(1040,700)">${sh(`<circle r="92" fill="#2b2012"/>`, 8, 12)}<circle r="92" fill="#24282b"/><circle r="74" fill="#b8382a"/><circle r="74" fill="none" stroke="#8f2a20" stroke-width="5"/><ellipse cx="-22" cy="-26" rx="30" ry="16" fill="#fff" opacity="0.14" transform="rotate(-30)"/></g>`;
  // 印鑑
  b += `<g transform="translate(930,470) rotate(38)">${sh(`<rect x="-100" y="-20" width="200" height="40" rx="18" fill="#2b2012"/>`, 6, 12)}<rect x="-100" y="-20" width="200" height="40" rx="18" fill="#2a2420"/><rect x="-100" y="-20" width="200" height="12" rx="6" fill="#fff" opacity="0.14"/><rect x="78" y="-20" width="22" height="40" rx="8" fill="#b8382a"/><circle cx="-52" cy="0" r="5" fill="#d8c08a"/></g>`;
  // 鍵（緑のタグ付き）
  const key = `<circle cx="0" cy="0" r="40" fill="none" stroke="#b9bcc0" stroke-width="16"/><rect x="34" y="-9" width="170" height="18" rx="4" fill="#b9bcc0"/><rect x="150" y="9" width="16" height="26" fill="#b9bcc0"/><rect x="178" y="9" width="16" height="18" fill="#b9bcc0"/><rect x="34" y="-9" width="170" height="6" rx="3" fill="#fff" opacity="0.35"/>`;
  b += `<g transform="translate(250,650) rotate(18)">${sh(key.replaceAll('#b9bcc0', '#2b2012'), 6, 10)}${key}</g>`;
  b += `<path d="M228,618 C190,560 240,520 300,548" stroke="#8d9094" stroke-width="5" fill="none"/>`;
  b += `<g transform="translate(380,560) rotate(-22)">${sh(`<rect x="-80" y="-44" width="170" height="88" rx="14" fill="#2b2012"/>`, 6, 10)}<path d="M-80,0 L-50,-44 L90,-44 L90,44 L-50,44 Z" fill="${C.brand}" stroke="${C.deep}" stroke-width="3" stroke-linejoin="round"/><circle cx="-52" cy="0" r="10" fill="#cdb48c" stroke="${C.deep}" stroke-width="3"/><path d="M-6,8 L22,-18 L50,8 Z M0,8 h44 v22 h-44 Z" fill="#fff" opacity="0.92"/></g>`;
  b += `<rect width="${W}" height="${H}" fill="url(#lt)"/>`;
  return svg(b, defs);
}

const SCENES = { furuie, 'hiyou-zeikin': hiyouZeikin, jutakugai, yuki, tochi, shorui };
const only = process.argv.slice(2);
for (const [name, fn] of Object.entries(SCENES)) {
  if (only.length && !only.includes(name)) continue;
  const out = join(OUT, `${name}.jpg`);
  await sharp(Buffer.from(fn())).jpeg({ quality: 90 }).toFile(out);
  console.log('saved', out);
}
