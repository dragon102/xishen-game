export const VIEW_W = 480;
export const VIEW_H = 270;

export interface Viewport {
  /** 一个游戏像素 = 多少个设备像素（整数） */
  scale: number;
  cssW: number;
  cssH: number;
  left: number;
  top: number;
}

/** 按设备像素取整数倍放大，像素边缘才干净；剩下的边留黑。 */
export function fitViewport(cssW: number, cssH: number, dpr: number): Viewport {
  const scale = Math.max(1, Math.floor(Math.min((cssW * dpr) / VIEW_W, (cssH * dpr) / VIEW_H)));
  const w = (VIEW_W * scale) / dpr;
  const h = (VIEW_H * scale) / dpr;
  return { scale, cssW: w, cssH: h, left: (cssW - w) / 2, top: (cssH - h) / 2 };
}
