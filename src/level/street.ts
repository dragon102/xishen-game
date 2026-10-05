import { buildRows, type LevelDef } from './level';

const W = 60;
const H = 17;

/** 开场动画的雨夜街道。只用来画，不跑物理。陈伶家的门在第 52 列。 */
export const STREET_DOOR_TILE = 52;

export const STREET: LevelDef = {
  id: 'street',
  width: W,
  height: H,
  rows: buildRows(W, H, [{ x0: 0, x1: W - 1, y0: 14, y1: 16, ch: '=' }]),
  spawnTileX: 2,
  floorRow: 14,
  interactables: [],
  triggers: [],
};
