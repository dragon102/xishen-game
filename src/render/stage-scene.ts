import { TILE } from '../physics/platformer';
import { STAGE } from '../level/stage';
import { interactableBox } from '../level/level';
import { frameFor } from '../art/sprites';
import { EXPECT } from '../expectation/expectation';
import { FAIL_DONE_AT, PASS_DONE_AT, PASS_SHATTER_AT, type StageSession } from '../scenes/stage-session';
import { FLOOR_Y, drawBang, drawChenling, drawTiles, hash } from './common';
import { VIEW_H, VIEW_W } from './viewport';

const TILES = { '=': 'stageFloor', '#': 'stageWall', x: 'crate' } as const;

let light: HTMLCanvasElement | null = null;
let lightCtx: CanvasRenderingContext2D | null = null;

/** 危险程度 0~1：越接近失败，红眼睛凑得越近。 */
function dangerLean(s: StageSession): number {
  if (s.phase === 'failing') return 1;
  if (s.expect.status !== 'danger') return 0;
  return Math.min(1, s.expect.dangerTime / EXPECT.failAfter);
}

function drawAudience(ctx: CanvasRenderingContext2D, cx: number, time: number, lean: number): void {
  ctx.fillStyle = '#07070a';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  for (let row = 0; row < 7; row++) {
    const par = 0.3 + row * 0.08;
    const y = 40 + row * 22 + Math.round(lean * row * 3);
    const spacing = 12 + row * 2;
    ctx.fillStyle = '#121218';
    ctx.fillRect(0, y + 4, VIEW_W, 3);
    const scroll = cx * par;
    const first = Math.floor(scroll / spacing) - 1;
    for (let i = first; i * spacing - scroll < VIEW_W + spacing; i++) {
      const x = Math.round(i * spacing - scroll);
      const seat = i + row * 1000;
      if (hash(seat) < 0.2) continue;
      if (hash(seat * 7 + Math.floor(time * 1.5 + hash(seat) * 10)) < 0.06) continue;
      const size = lean > 0.5 ? 2 : 1;
      ctx.fillStyle = '#d0202c';
      ctx.fillRect(x, y, 2, size);
      ctx.fillRect(x + 4, y, 2, size);
    }
  }
}

function drawCurtain(ctx: CanvasRenderingContext2D, x: number, w: number): void {
  for (let i = 0; i < w; i++) {
    const f = i % 4;
    ctx.fillStyle = f === 0 ? '#6e0c14' : f === 1 ? '#a8141f' : f === 2 ? '#c41e2a' : '#8c1019';
    ctx.fillRect(x + i, 0, 1, FLOOR_Y);
  }
}

function drawSpotlight(ctx: CanvasRenderingContext2D, sx: number): void {
  if (!light) {
    light = document.createElement('canvas');
    light.width = VIEW_W;
    light.height = VIEW_H;
    lightCtx = light.getContext('2d');
  }
  const l = lightCtx;
  if (!l) return;
  const cone = (c: CanvasRenderingContext2D): void => {
    c.beginPath();
    c.moveTo(sx - 10, 0);
    c.lineTo(sx + 10, 0);
    c.lineTo(sx + 44, FLOOR_Y);
    c.lineTo(sx - 44, FLOOR_Y);
    c.closePath();
  };
  l.globalCompositeOperation = 'source-over';
  l.clearRect(0, 0, VIEW_W, VIEW_H);
  l.fillStyle = 'rgba(0,0,0,0.62)';
  l.fillRect(0, 0, VIEW_W, VIEW_H);
  l.globalCompositeOperation = 'destination-out';
  cone(l);
  l.fill();
  l.beginPath();
  l.ellipse(sx, FLOOR_Y + 2, 48, 6, 0, 0, Math.PI * 2);
  l.fill();
  l.globalCompositeOperation = 'source-over';
  ctx.drawImage(light, 0, 0);
  ctx.fillStyle = 'rgba(255,245,220,0.07)';
  cone(ctx);
  ctx.fill();
}

function drawGiantEyes(ctx: CanvasRenderingContext2D, time: number): void {
  ctx.fillStyle = '#d0202c';
  for (let gy = 0; gy < 5; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      if (hash(gx * 13 + gy * 7 + Math.floor(time * 4)) < 0.15) continue;
      const x = 30 + gx * 56 + (gy % 2) * 20;
      const y = 30 + gy * 48;
      ctx.fillRect(x, y, 8, 3);
      ctx.fillRect(x + 14, y, 8, 3);
    }
  }
}

function drawCracks(ctx: CanvasRenderingContext2D, p: number): void {
  ctx.fillStyle = '#f4f1ec';
  for (let i = 0; i < 14; i++) {
    const ang = hash(i) * Math.PI * 2;
    const len = Math.min(1, p) * (80 + hash(i + 7) * 200);
    for (let d = 0; d < len; d += 2) {
      const wob = Math.sin(d / 9 + i) * 3;
      ctx.fillRect(Math.round(VIEW_W / 2 + Math.cos(ang) * d + wob), Math.round(VIEW_H / 2 + Math.sin(ang) * d), 1, 1);
    }
  }
}

export function drawStageScene(ctx: CanvasRenderingContext2D, s: StageSession, camX: number, spotX: number): void {
  const cx = Math.round(camX);
  const lean = dangerLean(s);
  drawAudience(ctx, cx, s.time, lean);

  ctx.fillStyle = '#5a0a12';
  ctx.fillRect(0, 0, VIEW_W, 10);
  ctx.fillStyle = '#8c1019';
  for (let x = 0; x < VIEW_W; x += 4) ctx.fillRect(x, 10, 2, 3);

  drawTiles(ctx, STAGE, TILES, cx);
  drawCurtain(ctx, 2 * TILE - cx, 24);
  drawCurtain(ctx, (STAGE.width - 2) * TILE - 24 - cx, 24);

  for (const it of STAGE.interactables) {
    if (s.found.has(it.id)) continue;
    if (Math.floor(s.time * 2 + hash(it.tileX) * 4) % 3 !== 0) continue;
    const b = interactableBox(it);
    ctx.fillStyle = 'rgba(255,240,200,0.7)';
    ctx.fillRect(b.x + 7 - cx, b.y + 14, 2, 2);
  }

  const { frame, dy } = frameFor(s.actor.anim, s.actor.animTime);
  drawChenling(ctx, s.actor.body.x + s.actor.body.w / 2, s.actor.body.y + s.actor.body.h, s.actor.facing, frame, dy, cx);

  if (s.nearby && s.phase === 'play' && !s.talk.current) {
    const b = interactableBox(s.nearby);
    drawBang(ctx, b.x + 8 - cx, b.y - 2, s.time);
  }

  drawSpotlight(ctx, Math.round(spotX - cx));

  if (lean > 0) {
    ctx.fillStyle = `rgba(160,0,20,${0.5 * lean})`;
    const t = 10 + Math.round(20 * lean);
    ctx.fillRect(0, 0, VIEW_W, t);
    ctx.fillRect(0, VIEW_H - t, VIEW_W, t);
    ctx.fillRect(0, 0, t, VIEW_H);
    ctx.fillRect(VIEW_W - t, 0, t, VIEW_H);
  }

  if (s.phase === 'failing') {
    const p = s.phaseTime / FAIL_DONE_AT;
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, p * 2.5)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (p > 0.3) drawGiantEyes(ctx, s.time);
  }

  if (s.phase === 'passing') {
    drawCracks(ctx, s.phaseTime / PASS_SHATTER_AT);
    if (s.phaseTime > PASS_SHATTER_AT) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (s.phaseTime - PASS_SHATTER_AT) / (PASS_DONE_AT - PASS_SHATTER_AT))})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }
}
