/** tracePath 只需要 canvas 路径 API 的这几个方法，测试里可以换成记录器。 */
export type PathSink = Pick<CanvasRenderingContext2D, 'moveTo' | 'lineTo' | 'bezierCurveTo' | 'rect'> & {
  arc(x: number, y: number, r: number, start: number, end: number): void;
};

/**
 * 路径小语言：M x y / L x y / B x1 y1 x2 y2 x y（三次贝塞尔）/ A cx cy r（整圆）/ R x y w h。
 * 用空格或逗号分隔，命令字母可与第一个数字连写（如 M48 43）。
 */
export function tracePath(c: PathSink, d: string): void {
  // 字母和数字可以连写（M48 43），先把命令字母单独隔开再切词
  const tok = d.replace(/([A-Za-z])/g, ' $1 ').trim().split(/[\s,]+/);
  let i = 0;
  const n = (): number => {
    const v = Number(tok[i++]);
    if (Number.isNaN(v)) throw new Error(`路径里有非数字：${d}`);
    return v;
  };
  while (i < tok.length) {
    const cmd = tok[i++];
    switch (cmd) {
      case 'M':
        c.moveTo(n(), n());
        break;
      case 'L':
        c.lineTo(n(), n());
        break;
      case 'B':
        c.bezierCurveTo(n(), n(), n(), n(), n(), n());
        break;
      case 'A': {
        const x = n();
        const y = n();
        const r = n();
        c.arc(x, y, r, 0, Math.PI * 2);
        break;
      }
      case 'R':
        c.rect(n(), n(), n(), n());
        break;
      default:
        throw new Error(`不认识的路径命令 ${cmd}：${d}`);
    }
  }
}

export type ColorGrid = (string | null)[][];

export interface PixelPainter {
  fill(color: string, path: string): void;
  stroke(color: string, lineWidth: number, path: string): void;
  px(x: number, y: number, color: string): void;
}

/**
 * 按形状落格：每画一个形状就把 alpha ≥ 120 的格子涂成该色（不混色，像素干净）。
 * offset 用来从大画布上裁一块（头像从全身立绘的头部裁出）。仅在浏览器里调用。
 */
export function paintPixels(width: number, height: number, draw: (p: PixelPainter) => void, offset = { x: 0, y: 0 }): ColorGrid {
  const grid: ColorGrid = Array.from({ length: height }, () => Array<string | null>(width).fill(null));
  const cv = document.createElement('canvas');
  cv.width = width;
  cv.height = height;
  const c = cv.getContext('2d', { willReadFrequently: true });
  if (!c) return grid;
  const commit = (color: string): void => {
    const d = c.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (d[(y * width + x) * 4 + 3] >= 120) grid[y][x] = color;
      }
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, width, height);
  };
  const begin = (): void => {
    c.setTransform(1, 0, 0, 1, -offset.x, -offset.y);
    c.beginPath();
  };
  draw({
    fill(color, path) {
      begin();
      tracePath(c, path);
      c.closePath();
      c.fillStyle = '#000';
      c.fill();
      commit(color);
    },
    stroke(color, lineWidth, path) {
      begin();
      tracePath(c, path);
      c.strokeStyle = '#000';
      c.lineWidth = lineWidth;
      c.lineCap = 'round';
      c.stroke();
      commit(color);
    },
    px(x, y, color) {
      const gx = x - offset.x;
      const gy = y - offset.y;
      if (gy >= 0 && gy < height && gx >= 0 && gx < width) grid[gy][gx] = color;
    },
  });
  return grid;
}

export function outlineColorGrid(grid: ColorGrid, color: string): ColorGrid {
  const h = grid.length;
  const w = grid[0].length;
  const filled = (x: number, y: number): boolean => y >= 0 && y < h && x >= 0 && x < w && grid[y][x] !== null;
  return grid.map((row, y) =>
    row.map((c, x) => (c !== null ? c : filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? color : null)),
  );
}

export function colorGridCanvas(grid: ColorGrid): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = grid[0].length;
  cv.height = grid.length;
  const ctx = cv.getContext('2d');
  if (!ctx) return cv;
  grid.forEach((row, y) =>
    row.forEach((c, x) => {
      if (c === null) return;
      ctx.fillStyle = c;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  return cv;
}
