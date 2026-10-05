import { TILE, type IsSolid } from '../physics/platformer';

export type MapId = 'stage' | 'home' | 'street';

/** 瓦片坐标的闭区间矩形。 */
export interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  ch: string;
}

export interface InteractableDef {
  id: string;
  /** 物件所在的瓦片列 */
  tileX: number;
  /** 物件「站」在哪一行的表面上（那一行的顶边就是地面） */
  tileY: number;
  lines: readonly string[];
  /** 首次调查是否加期待值（只有剧场的调查点是） */
  scoring: boolean;
  /** 调查完是否进入关卡结尾（只有厨房的水桶是） */
  finale: boolean;
}

export interface TriggerDef {
  id: string;
  tileX: number;
  effect: 'eyesWall' | 'screenFlicker';
}

export interface LevelDef {
  id: MapId;
  width: number;
  height: number;
  rows: readonly string[];
  spawnTileX: number;
  floorRow: number;
  interactables: readonly InteractableDef[];
  triggers: readonly TriggerDef[];
}

/** '=' 地板，'#' 墙，'x' 箱子/台子。'.' 是空。 */
export const SOLID_TILES: ReadonlySet<string> = new Set(['=', '#', 'x']);

export function buildRows(width: number, height: number, rects: readonly Rect[]): string[] {
  const g = Array.from({ length: height }, () => Array<string>(width).fill('.'));
  for (const r of rects) {
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        if (y >= 0 && y < height && x >= 0 && x < width) g[y][x] = r.ch;
      }
    }
  }
  return g.map((row) => row.join(''));
}

export function isSolidIn(level: LevelDef): IsSolid {
  return (tx, ty) => {
    if (tx < 0 || tx >= level.width) return true;
    if (ty < 0) return false;
    if (ty >= level.height) return true;
    return SOLID_TILES.has(level.rows[ty][tx]);
  };
}

export function interactableBox(item: InteractableDef): { x: number; y: number; w: number; h: number } {
  return { x: item.tileX * TILE, y: item.tileY * TILE - 32, w: TILE, h: 32 };
}

export function spawnFoot(level: LevelDef): { x: number; y: number } {
  return { x: level.spawnTileX * TILE + TILE / 2, y: level.floorRow * TILE };
}

export function levelWidthPx(level: LevelDef): number {
  return level.width * TILE;
}
