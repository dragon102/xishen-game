import type { Speaker } from '../dialogue/dialogue';
import { colorGridCanvas, outlineColorGrid, paintPixels, type PixelPainter } from './painter';

const OUT = '#101014';

/** 陈伶：沿用定稿像素立绘（128×160）的形状，只裁头肩 48×48（x 32~79，y 0~47）。 */
function drawChenling(p: PixelPainter): void {
  const C = {
    hair: '#1b1b22',
    hairHi: '#3a3a4a',
    skin: '#f7e3d7',
    skinSh: '#e3bdae',
    red: '#c41e2a',
    blk: '#26262e',
    teal: '#3fb5b0',
    white: '#f4f1ec',
    pink: '#e88a9a',
    eye: '#d0202c',
  };
  p.fill(C.blk, 'M48 43 L64 43 L67 142 L46 142');
  p.fill(C.red, 'M52 42 B46 43 40 45 38 50 B36 80 34 110 32 142 L48 143 B48 110 48 80 49 46');
  p.fill(C.red, 'M60 42 B66 43 72 45 74 50 B78 80 86 110 100 142 L66 143 B65 110 64 80 63 46');
  p.stroke(C.teal, 2.4, 'M49 46 B48.5 80 48.5 110 48 142');
  p.stroke(C.teal, 2.4, 'M63 46 B64 80 65 110 66 142');
  p.fill(C.red, 'M70 46 B80 47 92 50 100 52 L104 72 B96 76 86 74 78 68 B74 62 72 56 70 52');
  p.fill(C.teal, 'A 76 55 4.5');
  p.fill(C.white, 'A 76 55 2.8');
  p.fill(C.pink, 'A 76 55 1.4');
  p.fill(C.red, 'A 61 51 2.6');
  p.fill(C.blk, 'R 51 38 10 6');
  p.stroke(C.white, 1, 'M51 44 L61 44');
  p.fill(C.skinSh, 'R 53 33 6 6');
  p.fill(C.skin, 'M45 20 B45 12 50 9 56 9 B62 9 67 12 67 20 B67 27 64 33 58 37 B56 38.5 54.5 38.5 53 36.5 B49 32 45 27 45 20');
  p.fill(
    C.hair,
    'M41 20 B41 9 49 3 57 3 B65 3 73 9 73 19 L77 30 L72 27 L73 36 L69 30 L68 38 L67 26 L66 19 L65 27 L62 18 L60 22 L58 16 L56 29 L54 17 L51 22 L49 16 L47 23 L46 31 L45 38 L43 30 L39 33 L41 26 L38 26',
  );
  p.fill(C.hair, 'M55 4 L59 -1 L58 4');
  p.fill(C.hair, 'M64 5 L69 1 L67 6');
  for (const d of ['M50 9 L52 14', 'M57 7 L58 12', 'M63 9 L64 13', 'M44 14 L45 19']) p.stroke(C.hairHi, 1, d);
  p.stroke(C.red, 1.6, 'M70 30 B72 34 73 38 72 44');
  const eye = (x0: number, dir: -1 | 1): void => {
    for (let x = x0 - 1; x <= x0 + 6; x++) p.px(x, 24, C.hair);
    p.px(dir < 0 ? x0 - 2 : x0 + 7, 25, C.hair);
    const ox = dir < 0 ? x0 : x0 + 5;
    const ix = dir < 0 ? x0 + 5 : x0;
    p.px(ox, 26, '#ffffff');
    p.px(ox, 27, '#ffffff');
    p.px(ix, 26, '#f3ece6');
    for (let x = x0 - 1; x <= x0 + 6; x++) {
      if (dir < 0 ? x < x0 + 2 : x > x0 + 3) p.px(x, 23, C.hair);
    }
    for (let x = x0 + 1; x <= x0 + 4; x++) {
      p.px(x, 25, '#5a0a12');
      p.px(x, 26, C.eye);
      p.px(x, 27, '#ec4a55');
      p.px(x, 28, C.skinSh);
    }
    p.px(x0 + 2, 26, '#ffffff');
    p.px(x0 + 3, 25, '#2a0508');
  };
  eye(48, -1);
  eye(59, 1);
  p.px(57, 30, C.skinSh);
  for (const [x, y] of [[55, 33], [56, 33], [57, 32], [58, 32]]) p.px(x, y, '#a04848');
  for (const [x, y] of [[47, 30], [48, 30], [64, 30], [65, 30]]) p.px(x, y, '#f2b4b4');
}

/** 李秀春：齐肩深棕发、眉头往上皱、眼眶泛红。 */
function drawMother(p: PixelPainter): void {
  p.fill('#3b2a22', 'M10 24 B9 8 18 3 24 3 B31 3 39 8 38 24 L40 42 L32 40 L32 26 L16 26 L16 40 L8 42');
  p.fill('#c9b79c', 'M4 48 B7 40 15 37 24 37 B33 37 41 40 44 48');
  p.fill('#e3bdae', 'R 20 30 8 9');
  p.fill('#f7e3d7', 'M14 20 B14 10 19 7 24 7 B29 7 34 10 34 20 B34 28 29 35 24 36 B19 35 14 28 14 20');
  p.fill('#3b2a22', 'M13 21 B12 9 18 5 24 5 B30 5 36 9 35 21 L33 14 B28 12 20 12 15 15');
  const dark = '#2a1a14';
  for (const [x, y] of [[17, 17], [18, 16], [19, 16], [20, 16], [31, 17], [30, 16], [29, 16], [28, 16]]) p.px(x, y, dark);
  for (const x of [18, 19, 20, 28, 29, 30]) p.px(x, 19, dark);
  for (const [x, c] of [[18, dark], [19, '#ffffff'], [20, dark], [28, dark], [29, '#ffffff'], [30, dark]] as const) p.px(x, 20, c);
  for (const x of [17, 18, 19, 20, 21, 27, 28, 29, 30, 31]) p.px(x, 21, '#e08080');
  for (const [x, y] of [[24, 25], [24, 26]]) p.px(x, y, '#e3bdae');
  for (const [x, y] of [[22, 30], [23, 29], [24, 29], [25, 29], [26, 30]]) p.px(x, y, '#a04848');
}

/** 陈坛：短黑发、方下巴、胡茬、眼袋、灰外套。 */
function drawFather(p: PixelPainter): void {
  p.fill('#5b5f66', 'M3 48 B6 39 14 36 24 36 B34 36 42 39 45 48');
  p.fill('#d8d4cc', 'M19 37 L24 44 L29 37');
  p.fill('#e3bdae', 'R 20 30 8 8');
  p.fill('#f7e3d7', 'M14 18 B14 9 19 6 24 6 B29 6 34 9 34 18 L34 26 B33 32 29 35 24 35 B19 35 15 32 14 26');
  p.fill('#1b1b22', 'M13 18 B12 7 18 3 24 3 B30 3 36 7 35 18 L33 12 B28 10 20 10 15 12');
  const dark = '#2a1a14';
  for (const x of [17, 18, 19, 20, 21, 27, 28, 29, 30, 31]) p.px(x, 16, '#1b1b22');
  for (const x of [18, 19, 20, 21, 27, 28, 29, 30]) p.px(x, 18, dark);
  for (const x of [19, 20, 28, 29]) p.px(x, 19, dark);
  for (const x of [18, 19, 20, 21, 27, 28, 29, 30]) p.px(x, 21, '#d8b0a0');
  for (const [x, y] of [[24, 24], [24, 25], [23, 26]]) p.px(x, y, '#e3bdae');
  for (let x = 21; x <= 27; x++) p.px(x, 29, '#8a4a4a');
  for (const [x, y] of [[18, 30], [20, 32], [22, 31], [26, 31], [28, 32], [30, 30], [24, 33], [19, 28], [29, 28]]) p.px(x, y, '#8a7e74');
}

const cache = new Map<Speaker, HTMLCanvasElement>();

export function portraitCanvas(speaker: Speaker): HTMLCanvasElement {
  const hit = cache.get(speaker);
  if (hit) return hit;
  const grid =
    speaker === 'chenling'
      ? paintPixels(48, 48, drawChenling, { x: 32, y: 0 })
      : paintPixels(48, 48, speaker === 'lixiuchun' ? drawMother : drawFather);
  const cv = colorGridCanvas(outlineColorGrid(grid, OUT));
  cache.set(speaker, cv);
  return cv;
}
