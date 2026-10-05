import { describe, it, expect } from 'vitest';
import { buildRows, interactableBox, isSolidIn, spawnFoot, type LevelDef } from '../../src/level/level';
import { STAGE } from '../../src/level/stage';
import { HOME } from '../../src/level/home';
import { STREET } from '../../src/level/street';
import { TILE } from '../../src/physics/platformer';

const standable = (level: LevelDef, tx: number, row: number): boolean => {
  const solid = isSolidIn(level);
  return solid(tx, row) && !solid(tx, row - 1) && !solid(tx, row - 2) && !solid(tx, row - 3);
};

describe('level 工具', () => {
  it('buildRows 按矩形填字符，越界忽略', () => {
    expect(buildRows(4, 2, [{ x0: 1, x1: 9, y0: 1, y1: 1, ch: '=' }])).toEqual(['....', '.===']);
  });

  it('isSolidIn：左右越界是墙，上方越界是空，下方越界是地', () => {
    const lv: LevelDef = { id: 'street', width: 2, height: 2, rows: ['..', '=.'], spawnTileX: 0, floorRow: 1, interactables: [], triggers: [] };
    const solid = isSolidIn(lv);
    expect(solid(-1, 0)).toBe(true);
    expect(solid(2, 0)).toBe(true);
    expect(solid(0, -5)).toBe(false);
    expect(solid(1, 9)).toBe(true);
    expect(solid(0, 1)).toBe(true);
    expect(solid(1, 1)).toBe(false);
  });

  it('interactableBox：站在 tileY 那一行的表面上，16×32', () => {
    expect(interactableBox({ id: 'a', tileX: 3, tileY: 14, lines: [], scoring: false, finale: false })).toEqual({ x: 48, y: 192, w: 16, h: 32 });
  });
});

describe('三张地图', () => {
  for (const level of [STAGE, HOME, STREET]) {
    it(`${level.id}：每行宽度一致、行数正确`, () => {
      expect(level.rows).toHaveLength(level.height);
      for (const row of level.rows) expect(row).toHaveLength(level.width);
    });
    it(`${level.id}：出生点站在地面上`, () => {
      expect(standable(level, level.spawnTileX, level.floorRow)).toBe(true);
      expect(spawnFoot(level)).toEqual({ x: level.spawnTileX * TILE + TILE / 2, y: level.floorRow * TILE });
    });
    it(`${level.id}：每个调查点下面是能站的地面`, () => {
      for (const it of level.interactables) expect(standable(level, it.tileX, it.tileY), it.id).toBe(true);
    });
  }

  it('剧场：60×17，6 个计分调查点（spec §4.2）', () => {
    expect(STAGE.width).toBe(60);
    expect(STAGE.height).toBe(17);
    expect(STAGE.interactables.map((i) => i.id)).toEqual(['crack', 'curtainL', 'edge', 'trapdoor', 'fakeDoor', 'curtainR']);
    expect(STAGE.interactables.every((i) => i.scoring && !i.finale)).toBe(true);
  });

  it('剧场：假门在台子上，要跳上去', () => {
    const door = STAGE.interactables.find((i) => i.id === 'fakeDoor')!;
    expect(door.tileY).toBeLessThan(STAGE.floorRow);
  });

  it('家：90×17，7 个调查点、唯一的结尾在厨房最右，2 个幻觉触发区', () => {
    expect(HOME.width).toBe(90);
    expect(HOME.interactables).toHaveLength(7);
    const finales = HOME.interactables.filter((i) => i.finale);
    expect(finales.map((i) => i.id)).toEqual(['bucket']);
    expect(Math.max(...HOME.interactables.map((i) => i.tileX))).toBe(finales[0].tileX);
    expect(HOME.interactables.every((i) => !i.scoring)).toBe(true);
    expect(HOME.triggers.map((t) => t.effect)).toEqual(['eyesWall', 'screenFlicker']);
  });
});
