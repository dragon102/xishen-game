import { describe, it, expect } from 'vitest';
import { gridProblems, mirrorGrid, withOutline } from '../../src/art/pixels';
import {
  CHENLING_FRAMES,
  CHENLING_PALETTE,
  FATHER_GRID,
  FATHER_PALETTE,
  MOTHER_GRID,
  MOTHER_PALETTE,
  chenlingGrid,
  frameFor,
} from '../../src/art/sprites';

describe('pixels', () => {
  it('gridProblems 找出宽度不一致与未定义颜色', () => {
    expect(gridProblems(['ab', 'a'], { a: '#000', b: '#fff' })).toHaveLength(1);
    expect(gridProblems(['az'], { a: '#000' })).toHaveLength(1);
    expect(gridProblems(['a.', '.a'], { a: '#000' })).toEqual([]);
  });

  it('withOutline 在实心像素四周的透明格画描边', () => {
    expect(withOutline(['...', '.a.', '...'], 'O')).toEqual(['.O.', 'OaO', '.O.']);
  });

  it('mirrorGrid 左右翻转', () => {
    expect(mirrorGrid(['ab.', 'c..'])).toEqual(['.ba', '..c']);
  });
});

describe('人物精灵', () => {
  for (const frame of CHENLING_FRAMES) {
    it(`陈伶 ${frame}：24×40、颜色都有定义`, () => {
      const g = chenlingGrid(frame);
      expect(g).toHaveLength(40);
      expect(gridProblems(g, CHENLING_PALETTE)).toEqual([]);
      expect(g[0]).toHaveLength(24);
    });
  }

  it('李秀春、陈坛：24×40、颜色都有定义', () => {
    for (const [grid, pal] of [[MOTHER_GRID, MOTHER_PALETTE], [FATHER_GRID, FATHER_PALETTE]] as const) {
      expect(grid).toHaveLength(40);
      expect(gridProblems(grid, pal)).toEqual([]);
      expect(grid[0]).toHaveLength(24);
    }
  });

  it('陈伶的鞋底在第 38 行（脚底对齐用）', () => {
    const g = chenlingGrid('idle0');
    expect(g[38]).toMatch(/L/);
    expect(g[39]).not.toMatch(/L/);
  });

  it('frameFor：走路 0.12 秒换一帧、站立 0.6 秒换一帧、落地下沉 1 像素', () => {
    expect(frameFor('walk', 0).frame).toBe('walk0');
    expect(frameFor('walk', 0.13).frame).toBe('walk1');
    expect(frameFor('walk', 0.49).frame).toBe('walk0');
    expect(frameFor('idle', 0.7).frame).toBe('idle1');
    expect(frameFor('land', 0)).toEqual({ frame: 'idle0', dy: 1 });
    expect(frameFor('jump', 0).frame).toBe('jump');
    expect(frameFor('fall', 0).frame).toBe('fall');
  });
});
