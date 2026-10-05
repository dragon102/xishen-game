import { describe, it, expect } from 'vitest';
import { outlineColorGrid, tracePath, type PathSink } from '../../src/art/painter';

describe('tracePath', () => {
  it('把路径小语言翻译成 canvas 调用', () => {
    const calls: string[] = [];
    const sink: PathSink = {
      moveTo: (x, y) => calls.push(`M${x},${y}`),
      lineTo: (x, y) => calls.push(`L${x},${y}`),
      bezierCurveTo: (a, b, c, d, e, f) => calls.push(`B${a},${b},${c},${d},${e},${f}`),
      arc: (x, y, r) => calls.push(`A${x},${y},${r}`),
      rect: (x, y, w, h) => calls.push(`R${x},${y},${w},${h}`),
    };
    tracePath(sink, 'M1 2 L3 4 B5 6 7 8 9 10 A 76 55 4.5 R 51 38 10 6');
    expect(calls).toEqual(['M1,2', 'L3,4', 'B5,6,7,8,9,10', 'A76,55,4.5', 'R51,38,10,6']);
  });

  it('遇到不认识的命令直接报错（防止路径写错还静默画歪）', () => {
    const noop = () => undefined;
    const sink: PathSink = { moveTo: noop, lineTo: noop, bezierCurveTo: noop, arc: noop, rect: noop };
    expect(() => tracePath(sink, 'M1 2 Q3 4')).toThrow();
  });
});

describe('outlineColorGrid', () => {
  it('实心格四周的空格变成描边色', () => {
    const g = [
      [null, null, null],
      [null, '#f00', null],
      [null, null, null],
    ];
    expect(outlineColorGrid(g, '#000')).toEqual([
      [null, '#000', null],
      ['#000', '#f00', '#000'],
      [null, '#000', null],
    ]);
  });
});
