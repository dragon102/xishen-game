export const TILE_KINDS = ['stageFloor', 'stageWall', 'crate', 'homeFloor', 'homeWall', 'cobble'] as const;
export type TileKind = (typeof TILE_KINDS)[number];

const SEED: Record<TileKind, number> = { stageFloor: 11, stageWall: 23, crate: 37, homeFloor: 41, homeWall: 53, cobble: 67 };

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function pick(kind: TileKind, x: number, y: number, r: () => number): string {
  const v = r();
  switch (kind) {
    case 'stageFloor': {
      if (y % 4 === 3) return '#2a1c12';
      const off = (Math.floor(y / 4) * 5) % 16;
      if ((x + off) % 16 === 0) return '#33231a';
      if ((x === 3 || x === 12) && y % 4 === 1) return '#1f150e';
      return v < 0.2 ? '#4a3220' : v > 0.92 ? '#6b4a2f' : '#5a3d26';
    }
    case 'homeFloor': {
      if (y % 4 === 3) return '#5a3d26';
      const off = (Math.floor(y / 4) * 7) % 16;
      if ((x + off) % 16 === 0) return '#6b4a2f';
      return v < 0.2 ? '#7a5838' : v > 0.92 ? '#9c7650' : '#8a6644';
    }
    case 'stageWall': {
      const off = Math.floor(y / 4) % 2 ? 4 : 0;
      if (y % 4 === 3 || (x + off) % 8 === 7) return '#1f1f25';
      return v < 0.2 ? '#34343c' : v > 0.88 ? '#4a4a54' : '#3d3d46';
    }
    case 'crate': {
      if (x === 0 || x === 15 || y === 0 || y === 15) return '#2a1c12';
      if (x === y || x === 15 - y) return '#4a3220';
      return v < 0.2 ? '#6b4a2f' : '#7d5a3a';
    }
    case 'homeWall':
      return x % 8 === 0 ? '#3e3f48' : v < 0.1 ? '#4a4b55' : '#45464f';
    case 'cobble': {
      const ox = Math.floor(y / 5) % 2 ? 4 : 0;
      if (y % 5 === 4 || (x + ox) % 8 === 7) return '#1a1c22';
      return v < 0.2 ? '#3a3d46' : v > 0.9 ? '#545866' : '#464a55';
    }
  }
}

/** 纯函数：16×16 颜色表，同一种瓦片每次结果相同。 */
export function tileColors(kind: TileKind): string[][] {
  const r = rng(SEED[kind]);
  const g: string[][] = [];
  for (let y = 0; y < 16; y++) {
    const row: string[] = [];
    for (let x = 0; x < 16; x++) row.push(pick(kind, x, y, r));
    g.push(row);
  }
  return g;
}

const cache = new Map<TileKind, HTMLCanvasElement>();

export function tileCanvas(kind: TileKind): HTMLCanvasElement {
  const hit = cache.get(kind);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = 16;
  const ctx = cv.getContext('2d');
  if (ctx) {
    tileColors(kind).forEach((row, y) =>
      row.forEach((c, x) => {
        ctx.fillStyle = c;
        ctx.fillRect(x, y, 1, 1);
      }),
    );
  }
  cache.set(kind, cv);
  return cv;
}
