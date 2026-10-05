import { TILE } from '../physics/platformer';
import type { LevelDef } from '../level/level';
import { tileCanvas, type TileKind } from '../art/tiles';
import { chenlingCanvas, parentCanvas, type ChenlingFrame } from '../art/sprites';
import { VIEW_H, VIEW_W } from './viewport';

export const FLOOR_Y = 14 * TILE;

/** 0~1 的伪随机，同一输入永远同一输出（眨眼、雨丝、裂纹都用它，画面不闪烁乱跳）。 */
export function hash(n: number): number {
  const s = Math.sin(n * 12.9898) * 43758.5453;
  return s - Math.floor(s);
}

export function drawTiles(ctx: CanvasRenderingContext2D, level: LevelDef, kinds: Readonly<Record<string, TileKind>>, camX: number): void {
  const cx = Math.round(camX);
  const x0 = Math.max(0, Math.floor(cx / TILE));
  const x1 = Math.min(level.width - 1, Math.floor((cx + VIEW_W) / TILE));
  for (let ty = 0; ty < level.height; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const kind = kinds[level.rows[ty][tx]];
      if (kind) ctx.drawImage(tileCanvas(kind), tx * TILE - cx, ty * TILE);
    }
  }
}

export function drawRain(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.fillStyle = 'rgba(170,180,210,0.35)';
  for (let i = 0; i < 90; i++) {
    const x = Math.floor((i * 97 + time * 60 + hash(i) * 400) % (VIEW_W + 40)) - 20;
    const y = Math.floor((i * 61 + time * 320 + hash(i + 99) * 300) % (VIEW_H + 20)) - 10;
    for (let k = 0; k < 6; k++) ctx.fillRect(x - Math.floor(k / 3), y + k, 1, 1);
  }
}

/** 黄色像素「!」，(x, y) 是它底部中点（屏幕坐标）。 */
export function drawBang(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const bob = Math.round(Math.sin(time * 6));
  ctx.fillStyle = '#101014';
  ctx.fillRect(x - 2, y - 12 + bob, 5, 12);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(x - 1, y - 11 + bob, 3, 6);
  ctx.fillRect(x - 1, y - 3 + bob, 3, 2);
}

export function drawChenling(
  ctx: CanvasRenderingContext2D,
  footXPos: number,
  footY: number,
  facing: 1 | -1,
  frame: ChenlingFrame,
  dy: number,
  camX: number,
): void {
  ctx.drawImage(chenlingCanvas(frame, facing), Math.round(footXPos - 12 - camX), Math.round(footY - 39 + dy));
}

export function drawParent(
  ctx: CanvasRenderingContext2D,
  who: 'lixiuchun' | 'chentan',
  footXPos: number,
  facing: 1 | -1,
  scared: boolean,
  camX: number,
  time: number,
): void {
  const jitter = scared ? (Math.floor(time * 12) % 2 === 0 ? 1 : -1) : 0;
  ctx.drawImage(parentCanvas(who, facing), Math.round(footXPos - 12 - camX + jitter), FLOOR_Y - 39);
}

/** 陈伶抱着水桶喝水：桶挡在脸前。broken = 桶口碎了。 */
export function drawHeldBucket(ctx: CanvasRenderingContext2D, footXPos: number, facing: 1 | -1, broken: boolean, camX: number): void {
  const x = Math.round(footXPos - camX + facing * 3 - 6);
  const y = FLOOR_Y - 46;
  ctx.fillStyle = '#101014';
  ctx.fillRect(x - 1, y - 1, 14, 18);
  ctx.fillStyle = '#6fa8d8';
  ctx.fillRect(x, y, 12, 16);
  ctx.fillStyle = '#4a7fb0';
  ctx.fillRect(x, y + 4, 12, 2);
  ctx.fillRect(x, y + 11, 12, 2);
  if (broken) {
    ctx.clearRect(x, y - 1, 12, 3);
    ctx.fillStyle = '#6fa8d8';
    for (const [dx, h] of [[0, 2], [3, 1], [5, 3], [8, 1], [10, 2]] as const) ctx.fillRect(x + dx, y, 2, h);
    ctx.fillStyle = 'rgba(160,200,240,0.8)';
    ctx.fillRect(x + 2, y + 16, 1, 3);
    ctx.fillRect(x + 8, y + 16, 1, 4);
  }
}
