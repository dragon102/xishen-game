import type { CutsceneWorld } from '../cutscene/runner';
import { levelWidthPx } from '../level/level';
import { HOME } from '../level/home';
import { STREET } from '../level/street';
import { clampCamera } from './camera';
import { FLOOR_Y, drawChenling, drawHeldBucket, drawParent, drawRain, hash } from './common';
import { drawHomeBackdrop } from './home-scene';
import { drawStreetScene } from './street-scene';
import { VIEW_H, VIEW_W } from './viewport';

function drawActors(ctx: CanvasRenderingContext2D, w: CutsceneWorld, cam: number, time: number): void {
  for (const who of ['lixiuchun', 'chentan'] as const) {
    const a = w.actors[who];
    if (a.visible) drawParent(ctx, who, a.x, a.facing, a.pose === 'scared', cam, time);
  }
  const c = w.actors.chenling;
  if (!c.visible) return;
  const frames = ['walk0', 'walk1', 'walk2', 'walk3'] as const;
  const frame = c.walking ? frames[Math.floor(time / (c.stagger ? 0.18 : 0.12)) % 4] : 'idle0';
  const dy = c.stagger ? Math.round(Math.sin(time * 7) * 1.2) : 0;
  const sway = c.stagger ? Math.round(Math.sin(time * 3.3)) : 0;
  drawChenling(ctx, c.x + sway, FLOOR_Y, c.facing, frame, dy, cam);
  if (c.pose === 'drink') drawHeldBucket(ctx, c.x, c.facing, w.props.bucket === 'broken', cam);
}

export function drawOpening(ctx: CanvasRenderingContext2D, w: CutsceneWorld, time: number): void {
  const shake = w.shakeTime > 0 ? Math.round((hash(Math.floor(time * 30)) - 0.5) * 2 * w.shakeStrength) : 0;
  ctx.save();
  ctx.translate(shake, 0);
  if (w.scene === 'street') {
    const cam = clampCamera(w.cameraX, levelWidthPx(STREET));
    drawStreetScene(ctx, cam, time, w.props);
    drawActors(ctx, w, cam, time);
  } else if (w.scene === 'home') {
    const cam = clampCamera(w.cameraX, levelWidthPx(HOME));
    drawHomeBackdrop(ctx, { camX: cam, time, night: true, props: w.props, eyes: 0 });
    drawActors(ctx, w, cam, time);
  } else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.restore();
  if (w.rain && w.scene === 'street') drawRain(ctx, time);
  if (w.fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${w.fade})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
