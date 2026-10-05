import { TILE } from '../physics/platformer';
import { HOME, HOME_DECOR } from '../level/home';
import { interactableBox } from '../level/level';
import { frameFor } from '../art/sprites';
import { FINALE_DONE_AT, FINALE_FADE_AT, type HomeSession } from '../scenes/home-session';
import { FLOOR_Y, drawBang, drawChenling, drawTiles, hash } from './common';
import { VIEW_H, VIEW_W } from './viewport';

const X = (tile: number, camX: number): number => tile * TILE - camX;

export interface HomeBackdrop {
  camX: number;
  time: number;
  night: boolean;
  props: Readonly<Record<string, string>>;
  eyes: number;
}

function door(ctx: CanvasRenderingContext2D, x: number, open: boolean): void {
  ctx.fillStyle = '#2a1f18';
  ctx.fillRect(x - 2, FLOOR_Y - 46, 22, 46);
  ctx.fillStyle = open ? '#08080c' : '#5a3d26';
  ctx.fillRect(x, FLOOR_Y - 44, 18, 44);
  if (!open) {
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(x + 14, FLOOR_Y - 22, 2, 2);
  }
}

/** 陈伶家的背景与家具（不含人物）。opening 与醒来关共用。 */
export function drawHomeBackdrop(ctx: CanvasRenderingContext2D, v: HomeBackdrop): void {
  const cx = Math.round(v.camX);
  ctx.fillStyle = v.night ? '#24232a' : '#4a4c56';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = v.night ? '#2a2930' : '#52545e';
  for (let x = -((cx * 1) % 8); x < VIEW_W; x += 8) ctx.fillRect(x, 0, 2, FLOOR_Y);
  ctx.fillStyle = '#2a1f18';
  ctx.fillRect(0, FLOOR_Y - 8, VIEW_W, 8);

  // 卧室
  const bx = X(HOME_DECOR.bed, cx);
  ctx.fillStyle = '#5a3d26';
  ctx.fillRect(bx, FLOOR_Y - 22, 80, 22);
  ctx.fillStyle = '#d8d4cc';
  ctx.fillRect(bx + 2, FLOOR_Y - 28, 76, 8);
  ctx.fillStyle = '#eeeae2';
  ctx.fillRect(bx + 4, FLOOR_Y - 32, 16, 6);
  const wx = X(HOME_DECOR.window, cx);
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(wx, 96, 48, 64);
  ctx.fillStyle = v.night ? '#141a2e' : '#6f7f9a';
  ctx.fillRect(wx + 3, 99, 42, 58);
  ctx.fillStyle = 'rgba(88,196,208,0.55)';
  ctx.fillRect(wx + 3, 110 + Math.round(Math.sin(v.time) * 2), 42, 4);
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(wx + 23, 99, 2, 58);
  const wd = X(HOME_DECOR.wardrobe, cx);
  ctx.fillStyle = '#4a3220';
  ctx.fillRect(wd, FLOOR_Y - 104, 48, 104);
  ctx.fillStyle = '#2a1c12';
  ctx.fillRect(wd + 23, FLOOR_Y - 100, 2, 96);
  ctx.fillStyle = '#c9a24a';
  ctx.fillRect(wd + 19, FLOOR_Y - 56, 2, 4);
  ctx.fillRect(wd + 27, FLOOR_Y - 56, 2, 4);

  // 卧室门、大门
  door(ctx, X(HOME_DECOR.bedroomDoor, cx), v.props.bedroomDoor === 'open');
  door(ctx, X(HOME_DECOR.frontDoor, cx), v.props.frontDoor === 'open');

  // 客厅
  const dx = X(HOME_DECOR.dispenser, cx);
  ctx.fillStyle = '#d8d8dc';
  ctx.fillRect(dx, FLOOR_Y - 48, 18, 48);
  ctx.fillStyle = '#9a9aa2';
  ctx.fillRect(dx + 3, FLOOR_Y - 30, 4, 3);
  if (v.props.bucket === 'full') {
    ctx.fillStyle = '#6fa8d8';
    ctx.fillRect(dx + 2, FLOOR_Y - 72, 14, 24);
    ctx.fillStyle = '#4a7fb0';
    ctx.fillRect(dx + 2, FLOOR_Y - 64, 14, 2);
  }
  if (v.props.bucket === 'empty') {
    ctx.fillStyle = '#6fa8d8';
    for (const [ox, w] of [[-8, 4], [-2, 3], [22, 5], [28, 2]] as const) ctx.fillRect(dx + ox, FLOOR_Y - 2, w, 2);
  }
  const sx = X(HOME_DECOR.sofa, cx);
  ctx.fillStyle = '#5b4a5e';
  ctx.fillRect(sx, FLOOR_Y - 28, 80, 28);
  ctx.fillStyle = '#4a3a4e';
  ctx.fillRect(sx, FLOOR_Y - 40, 80, 14);
  door(ctx, X(HOME_DECOR.parentsDoor, cx), false);
  const px = X(HOME_DECOR.photo, cx);
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(px, 116, 26, 22);
  ctx.fillStyle = '#9a8a7a';
  ctx.fillRect(px + 2, 118, 22, 18);
  ctx.fillStyle = '#2a1a14';
  for (const ox of [4, 9, 14, 19]) ctx.fillRect(px + ox, 124, 3, 3);

  // 客厅与厨房之间的拱门
  const ax = X(HOME_DECOR.kitchenArch, cx);
  ctx.fillStyle = '#2a1f18';
  ctx.fillRect(ax, 70, 6, FLOOR_Y - 70);
  ctx.fillRect(ax + 26, 70, 6, FLOOR_Y - 70);
  ctx.fillRect(ax, 64, 32, 8);

  // 厨房
  const kx = X(HOME_DECOR.counter, cx);
  ctx.fillStyle = '#6b6f78';
  ctx.fillRect(kx, FLOOR_Y - 40, 144, 40);
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(kx, FLOOR_Y - 42, 144, 3);
  ctx.fillStyle = '#5b5f68';
  ctx.fillRect(kx, 100, 144, 40);
  const fx = X(HOME_DECOR.fridge, cx);
  ctx.fillStyle = '#cfd3d8';
  ctx.fillRect(fx, FLOOR_Y - 84, 32, 84);
  ctx.fillStyle = '#9aa0a8';
  ctx.fillRect(fx, FLOOR_Y - 52, 32, 2);
  if (!v.night) {
    const bk = X(HOME_DECOR.bucket, cx);
    ctx.fillStyle = '#6fa8d8';
    for (const [ox, oy, w] of [[0, 2, 5], [7, 1, 3], [12, 2, 6], [20, 1, 3], [26, 2, 4]] as const) ctx.fillRect(bk + ox, FLOOR_Y - oy, w, oy);
    ctx.fillStyle = '#5a0a12';
    for (const [ox, w] of [[-6, 10], [6, 4], [14, 12], [30, 6]] as const) ctx.fillRect(bk + ox, FLOOR_Y, w, 1);
  }

  drawTiles(ctx, HOME, { '=': 'homeFloor', '#': 'homeWall' }, cx);

  if (v.eyes > 0) {
    ctx.fillStyle = '#d0202c';
    for (let i = 0; i < 10; i++) {
      const ex = X(40, cx) + i * 18 + Math.round(hash(i) * 6);
      const ey = 104 + Math.round(hash(i + 20) * 30);
      ctx.fillRect(ex, ey, 3, 2);
      ctx.fillRect(ex + 6, ey, 3, 2);
    }
  }

  ctx.fillStyle = v.night ? 'rgba(10,14,30,0.45)' : 'rgba(60,80,110,0.22)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (v.night) {
    // 吊灯：灯线、灯罩、灯泡，加一束向下的淡光
    const lx = Math.round(X(43, cx));
    ctx.fillStyle = 'rgba(255,210,140,0.06)';
    ctx.beginPath();
    ctx.moveTo(lx - 3, 76);
    ctx.lineTo(lx + 3, 76);
    ctx.lineTo(lx + 45, FLOOR_Y);
    ctx.lineTo(lx - 45, FLOOR_Y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1a20';
    ctx.fillRect(lx, 0, 1, 70);
    ctx.fillStyle = '#c9a24a';
    ctx.fillRect(lx - 3, 70, 6, 4);
    ctx.fillStyle = '#ffe2a0';
    ctx.fillRect(lx - 1, 74, 2, 2);
  }
}

const FLOOR_BASE = '#3a2818';
const STAIN_CX = VIEW_W / 2;
const STAIN_CY = VIEW_H / 2 + 6;

function paintFloor(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = FLOOR_BASE;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#2a1c12';
  for (let y = 30; y < VIEW_H; y += 48) ctx.fillRect(0, y, VIEW_W, 4);
}

/** 近似椭圆的像素块：一行一行的矩形，每行宽度带一点抖动。 */
function blobRows(rects: Array<[number, number, number, number]>, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  for (let y = -ry; y < ry; y += 3) {
    const k = Math.sqrt(1 - (y / ry) * (y / ry));
    const wl = rx * k * (0.86 + hash(seed + y) * 0.28);
    const wr = rx * k * (0.86 + hash(seed + y + 77) * 0.28);
    rects.push([cx - wl, cy + y, wl + wr, 3]);
  }
}

/** 一整块连在一起的深色痕迹：由重叠的像素块堆出来，带几条流痕和两个空洞 + 一道歪嘴，隐约像张扭曲的脸（只暗示，不写实）。 */
function drawStain(ctx: CanvasRenderingContext2D, grow: number): void {
  if (grow <= 0) return;
  const body: Array<[number, number, number, number]> = [];
  blobRows(body, 0, 0, 104, 54, 3);
  blobRows(body, -34, 6, 70, 46, 41);
  blobRows(body, 38, -4, 66, 44, 97);
  blobRows(body, 6, 22, 80, 32, 131);
  for (let i = 0; i < 14; i++) {
    const a = hash(i + 200) * Math.PI * 2;
    const d = 0.55 + hash(i + 230) * 0.4;
    const w = 14 + hash(i + 260) * 22;
    const h = 8 + hash(i + 290) * 12;
    body.push([Math.cos(a) * 100 * d - w / 2, Math.sin(a) * 52 * d - h / 2, w, h]);
  }
  // 流痕：从下缘往下拖
  for (let i = 0; i < 6; i++) {
    const x = -80 + i * 30 + hash(i + 320) * 14;
    const len = 12 + hash(i + 340) * 22;
    body.push([x, 44, 3 + (i % 2), len]);
    body.push([x - 1, 44 + len, 5, 3]);
  }
  const R = (r: [number, number, number, number], grow2: number): [number, number, number, number] => [
    Math.round(STAIN_CX + r[0] * grow),
    Math.round(STAIN_CY + r[1] * grow),
    Math.max(1, Math.round((r[2] + grow2) * grow)),
    Math.max(1, Math.round((r[3] + grow2) * grow)),
  ];
  ctx.fillStyle = '#5a0a12';
  for (const r of body) {
    const [x, y, w, h] = R(r, 4);
    ctx.fillRect(x - 2, y - 2, w, h);
  }
  ctx.fillStyle = '#4a0810';
  for (const r of body) ctx.fillRect(...R(r, 0));

  // 空洞：露出地板
  const voids: Array<[number, number, number, number]> = [];
  blobRows(voids, -42, -20, 19, 11, 500);
  blobRows(voids, 40, -16, 17, 12, 530);
  const mouth: Array<[number, number, number, number]> = [];
  for (let i = 0; i < 9; i++) mouth.push([-40 + i * 9, 28 - Math.round(Math.sin(i * 0.9) * 5) - i, 10, 5 + (i % 3 === 1 ? 2 : 0)]);
  ctx.save();
  ctx.beginPath();
  for (const r of [...voids, ...mouth]) {
    const [x, y, w, h] = R(r, 0);
    ctx.rect(x, y, w, h);
  }
  ctx.clip();
  paintFloor(ctx);
  ctx.restore();
}

/** 结尾特写：放大的地板、碎桶片、一整块形状扭曲的深色痕迹（暗示，不写实）。 */
function drawFinale(ctx: CanvasRenderingContext2D, phaseTime: number): void {
  paintFloor(ctx);
  drawStain(ctx, Math.min(1, phaseTime / 1.2));
  ctx.fillStyle = '#6fa8d8';
  for (let i = 0; i < 24; i++) {
    const x = Math.round(40 + hash(i) * 400);
    const y = Math.round(36 + hash(i + 9) * 200);
    const nx = (x - STAIN_CX) / 124;
    const ny = (y - STAIN_CY) / 76;
    if (nx * nx + ny * ny < 1) continue;
    ctx.fillRect(x, y, 6 + Math.round(hash(i + 3) * 10), 4);
  }
  if (phaseTime > FINALE_FADE_AT) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, (phaseTime - FINALE_FADE_AT) / (FINALE_DONE_AT - FINALE_FADE_AT))})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

export function drawHomeLevel(ctx: CanvasRenderingContext2D, s: HomeSession, camX: number): void {
  if (s.phase === 'finale' || s.phase === 'done') {
    drawFinale(ctx, s.phase === 'done' ? FINALE_DONE_AT : s.phaseTime);
    return;
  }
  const cx = Math.round(camX);
  drawHomeBackdrop(ctx, { camX: cx, time: s.time, night: false, props: { bucket: 'none' }, eyes: s.eyes });
  const fx = s.actor.body.x + s.actor.body.w / 2;
  if (s.sitting) {
    drawChenling(ctx, fx, FLOOR_Y, 1, 'idle0', -12, cx);
    // 被子只盖在腿上，头和身子留在上面
    const blanketX = X(HOME_DECOR.bed, cx) + 20;
    ctx.fillStyle = '#5b6b8a';
    ctx.fillRect(blanketX, FLOOR_Y - 24, 60, 12);
    ctx.fillStyle = '#4a5878';
    ctx.fillRect(blanketX, FLOOR_Y - 24, 60, 1);
  } else {
    const { frame, dy } = frameFor(s.actor.anim, s.actor.animTime);
    drawChenling(ctx, fx, s.actor.body.y + s.actor.body.h, s.actor.facing, frame, dy, cx);
  }
  if (s.nearby && !s.talk.current) {
    const b = interactableBox(s.nearby);
    drawBang(ctx, b.x + 8 - cx, b.y - 2, s.time);
  }
}
