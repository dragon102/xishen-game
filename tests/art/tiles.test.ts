import { describe, it, expect } from 'vitest';
import { TILE_KINDS, tileColors } from '../../src/art/tiles';

describe('tileColors', () => {
  for (const kind of TILE_KINDS) {
    it(`${kind}：16×16，每格都是 #rrggbb，生成结果固定`, () => {
      const a = tileColors(kind);
      expect(a).toHaveLength(16);
      for (const row of a) {
        expect(row).toHaveLength(16);
        for (const c of row) expect(c).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(tileColors(kind)).toEqual(a);
    });
  }
});
