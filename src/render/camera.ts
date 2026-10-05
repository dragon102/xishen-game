import { VIEW_W } from './viewport';

export function clampCamera(x: number, levelWidthPx: number): number {
  return Math.max(0, Math.min(Math.max(0, levelWidthPx - VIEW_W), x));
}

export function followCamera(camX: number, targetX: number, levelWidthPx: number, dt: number): number {
  const desired = clampCamera(targetX - VIEW_W / 2, levelWidthPx);
  const k = 1 - Math.exp(-6 * dt);
  return clampCamera(camX + (desired - camX) * k, levelWidthPx);
}
