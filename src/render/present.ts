import { VIEW_H, VIEW_W, type Viewport } from './viewport';

export function sizeScreen(screen: HTMLCanvasElement, v: Viewport): void {
  screen.width = VIEW_W * v.scale;
  screen.height = VIEW_H * v.scale;
  screen.style.width = `${v.cssW}px`;
  screen.style.height = `${v.cssH}px`;
  screen.style.left = `${v.left}px`;
  screen.style.top = `${v.top}px`;
}

export function present(screenCtx: CanvasRenderingContext2D, view: HTMLCanvasElement, v: Viewport): void {
  screenCtx.imageSmoothingEnabled = false;
  screenCtx.drawImage(view, 0, 0, VIEW_W * v.scale, VIEW_H * v.scale);
}
