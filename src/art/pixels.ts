/** 字符 → 颜色。'.' 永远是透明。 */
export type Palette = Readonly<Record<string, string>>;
export const TRANSPARENT = '.';

export function gridProblems(grid: readonly string[], palette: Palette): string[] {
  if (grid.length === 0) return ['空网格'];
  const problems: string[] = [];
  const w = grid[0].length;
  grid.forEach((row, y) => {
    if (row.length !== w) problems.push(`第 ${y} 行宽 ${row.length}，应为 ${w}`);
    for (const ch of row) {
      if (ch !== TRANSPARENT && !(ch in palette)) problems.push(`第 ${y} 行有未定义颜色 ${ch}`);
    }
  });
  return problems;
}

export function withOutline(grid: readonly string[], outlineChar: string): string[] {
  const h = grid.length;
  const w = grid[0].length;
  const filled = (x: number, y: number): boolean => y >= 0 && y < h && x >= 0 && x < w && grid[y][x] !== TRANSPARENT;
  return grid.map((row, y) =>
    Array.from(row, (ch, x) => {
      if (ch !== TRANSPARENT) return ch;
      return filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? outlineChar : TRANSPARENT;
    }).join(''),
  );
}

export function mirrorGrid(grid: readonly string[]): string[] {
  return grid.map((row) => Array.from(row).reverse().join(''));
}

export function paintGrid(ctx: CanvasRenderingContext2D, grid: readonly string[], palette: Palette, ox: number, oy: number): void {
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === TRANSPARENT) continue;
      ctx.fillStyle = palette[ch];
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
}

const cache = new Map<string, HTMLCanvasElement>();

/** 把网格画成一张小 canvas 并按 key 缓存。仅在浏览器里调用。 */
export function gridCanvas(key: string, grid: readonly string[], palette: Palette): HTMLCanvasElement {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = grid[0].length;
  cv.height = grid.length;
  const ctx = cv.getContext('2d');
  if (ctx) paintGrid(ctx, grid, palette, 0, 0);
  cache.set(key, cv);
  return cv;
}
