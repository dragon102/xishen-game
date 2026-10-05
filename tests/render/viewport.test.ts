import { describe, it, expect } from 'vitest';
import { VIEW_H, VIEW_W, fitViewport } from '../../src/render/viewport';
import { clampCamera, followCamera } from '../../src/render/camera';

describe('fitViewport', () => {
  it('iPhone 横屏 812×375 @3x：放大 4 倍，居中', () => {
    const v = fitViewport(812, 375, 3);
    expect(v.scale).toBe(4);
    expect(v.cssW).toBeCloseTo((VIEW_W * 4) / 3, 6);
    expect(v.cssH).toBeCloseTo((VIEW_H * 4) / 3, 6);
    expect(v.left).toBeCloseTo((812 - v.cssW) / 2, 6);
    expect(v.top).toBeCloseTo((375 - v.cssH) / 2, 6);
  });

  it('电脑 1280×720 @2x：放大 5 倍', () => {
    expect(fitViewport(1280, 720, 2).scale).toBe(5);
  });

  it('再小也至少 1 倍', () => {
    expect(fitViewport(100, 100, 1).scale).toBe(1);
  });
});

describe('camera', () => {
  it('clampCamera 不让镜头越过地图两端', () => {
    expect(clampCamera(-50, 960)).toBe(0);
    expect(clampCamera(900, 960)).toBe(960 - VIEW_W);
    expect(clampCamera(100, 960)).toBe(100);
  });

  it('地图比画面窄时镜头固定在 0', () => {
    expect(clampCamera(100, 300)).toBe(0);
  });

  it('followCamera 平滑靠近「角色居中」的位置', () => {
    const next = followCamera(0, 600, 960, 1 / 60);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(600 - VIEW_W / 2);
    let cam = 0;
    for (let i = 0; i < 600; i++) cam = followCamera(cam, 600, 960, 1 / 60);
    expect(cam).toBeCloseTo(600 - VIEW_W / 2, 1);
  });
});
