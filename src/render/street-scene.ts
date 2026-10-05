import { TILE } from '../physics/platformer';
import { STREET, STREET_DOOR_TILE } from '../level/street';
import { drawTiles, hash, FLOOR_Y } from './common';
import { VIEW_H, VIEW_W } from './viewport';

/** 雨夜极光城的街道：深色天空、极光、两层楼房剪影、路灯、陈伶家的门。 */
export function drawStreetScene(ctx: CanvasRenderingContext2D, camX: number, time: number, props: Readonly<Record<string, string>>): void {
  const cx = Math.round(camX);
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // 极光：三条缓慢起伏的色带
  for (const [color, base, amp, speed] of [
    ['rgba(63,181,176,0.22)', 34, 8, 0.4],
    ['rgba(90,200,130,0.16)', 48, 10, 0.3],
    ['rgba(120,90,200,0.12)', 60, 6, 0.5],
  ] as const) {
    ctx.fillStyle = color;
    for (let x = 0; x < VIEW_W; x += 2) {
      const y = base + Math.sin((x + cx * 0.1) / 40 + time * speed) * amp;
      ctx.fillRect(x, Math.round(y), 2, 6);
    }
  }

  // 远处楼房（视差 0.3）
  for (let i = 0; i < 24; i++) {
    const w = 40 + Math.floor(hash(i) * 40);
    const h = 60 + Math.floor(hash(i + 50) * 70);
    const x = Math.round(i * 70 - cx * 0.3);
    if (x > VIEW_W || x + w < 0) continue;
    ctx.fillStyle = '#141826';
    ctx.fillRect(x, FLOOR_Y - h, w, h);
    ctx.fillStyle = 'rgba(255,210,120,0.35)';
    for (let k = 0; k < 4; k++) {
      if (hash(i * 10 + k) > 0.6) ctx.fillRect(x + 6 + k * 9, FLOOR_Y - h + 10 + (k % 2) * 14, 3, 4);
    }
  }

  // 近处楼房（视差 0.7）
  for (let i = 0; i < 18; i++) {
    const w = 60 + Math.floor(hash(i + 200) * 30);
    const h = 90 + Math.floor(hash(i + 300) * 40);
    const x = Math.round(i * 100 + 30 - cx * 0.7);
    if (x > VIEW_W || x + w < 0) continue;
    ctx.fillStyle = '#1b2030';
    ctx.fillRect(x, FLOOR_Y - h, w, h);
  }

  // 陈伶家（世界坐标，跟地面一起走）
  const houseX = (STREET_DOOR_TILE - 4) * TILE - cx;
  ctx.fillStyle = '#2a2730';
  ctx.fillRect(houseX, FLOOR_Y - 120, 9 * TILE, 120);
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(houseX - 4, FLOOR_Y - 124, 9 * TILE + 8, 6);
  const doorX = STREET_DOOR_TILE * TILE - cx;
  ctx.fillStyle = props.streetDoor === 'open' ? '#06060a' : '#5a3d26';
  ctx.fillRect(doorX, FLOOR_Y - 40, 18, 40);
  ctx.fillStyle = 'rgba(255,200,120,0.5)';
  ctx.fillRect(houseX + 20, FLOOR_Y - 90, 12, 14);

  // 路灯
  for (let tx = 6; tx < STREET.width; tx += 14) {
    const x = tx * TILE - cx;
    if (x < -20 || x > VIEW_W + 20) continue;
    ctx.fillStyle = '#2e3240';
    ctx.fillRect(x, FLOOR_Y - 70, 2, 70);
    ctx.fillRect(x, FLOOR_Y - 70, 10, 2);
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(x + 8, FLOOR_Y - 68, 3, 3);
    ctx.fillStyle = 'rgba(255,217,138,0.08)';
    ctx.beginPath();
    ctx.moveTo(x + 9, FLOOR_Y - 66);
    ctx.lineTo(x + 30, FLOOR_Y);
    ctx.lineTo(x - 12, FLOOR_Y);
    ctx.closePath();
    ctx.fill();
  }

  drawTiles(ctx, STREET, { '=': 'cobble' }, cx);

  // 积水
  ctx.fillStyle = 'rgba(120,140,190,0.25)';
  for (let i = 0; i < 10; i++) {
    const x = Math.round(i * 110 + 40 - cx);
    if (x > VIEW_W || x < -40) continue;
    ctx.fillRect(x, FLOOR_Y, 30, 1);
  }
}
