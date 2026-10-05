import { describe, it, expect } from 'vitest';
import mainSource from '../src/main.ts?raw';

/** 先剥注释：注释里的字样不许喂饱正向断言（voxel-builder 七期踩过的坑）。 */
const stripComments = (source: string): string => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const SRC = stripComments(mainSource);

const fnBody = (signature: string): string => {
  const start = SRC.indexOf(signature);
  expect(start, `main.ts 里没找到 ${signature}`).toBeGreaterThanOrEqual(0);
  const open = SRC.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < SRC.length; i++) {
    if (SRC[i] === '{') depth++;
    else if (SRC[i] === '}') {
      depth--;
      if (depth === 0) return SRC.slice(open, i + 1);
    }
  }
  throw new Error(`${signature} 的花括号不配对`);
};

describe('main.ts 接线', () => {
  it('剥注释真的剥干净了', () => {
    expect(SRC).not.toMatch(/\/\/|\/\*/);
  });

  it('两个关卡会话都吃 readInput(actions)', () => {
    expect(SRC).toMatch(/stepStage\(\s*stage\s*,\s*readInput\(actions\)\s*,\s*dt\s*\)/);
    expect(SRC).toMatch(/stepHome\(\s*home\s*,\s*readInput\(actions\)\s*,\s*dt\s*\)/);
  });

  it('开场动画的推进键是 advance 或 interact 的刚按下', () => {
    expect(SRC).toMatch(/tickRunner\(\s*opening\s*,\s*dt\s*,\s*actions\.justPressed\('advance'\)\s*\|\|\s*actions\.justPressed\('interact'\)\s*\)/);
  });

  it('固定步长循环里每跑一步就 endStep', () => {
    const loop = fnBody('function frame(');
    expect(loop).toMatch(/while\s*\(\s*acc\s*>=\s*STEP\s*\)\s*\{[^}]*update\(STEP\)[^}]*actions\.endStep\(\)/);
  });

  it('切后台：清键并暂停', () => {
    const i = SRC.indexOf("'visibilitychange'");
    expect(i).toBeGreaterThanOrEqual(0);
    const handler = SRC.slice(i, SRC.indexOf('});', i));
    expect(handler).toMatch(/actions\.releaseAll\(\)/);
    expect(handler).toMatch(/setPaused\(true\)/);
  });

  it('存档操作落到 saveProgress / clearProgress', () => {
    const apply = fnBody('function apply(');
    expect(apply).toMatch(/saveProgress\(\s*storage\s*,\s*r\.save\.level\s*\)/);
    expect(apply).toMatch(/clearProgress\(\s*storage\s*\)/);
  });

  it('从暂停继续时先 sfx.unlock()（切后台后音频可能被系统挂起）', () => {
    const i = SRC.indexOf('onResume:');
    expect(i).toBeGreaterThanOrEqual(0);
    const line = SRC.slice(i, SRC.indexOf('\n', i));
    expect(line).toMatch(/sfx\.unlock\(\)/);
  });

  it('暂停时挂起音频，竖屏时暂停', () => {
    expect(fnBody('function setPaused(')).toMatch(/sfx\.suspend\(\)/);
    expect(SRC).toMatch(/matchMedia\(\s*'\(orientation: portrait\)'\s*\)/);
  });

  it('标题的三个入口都先 sfx.unlock()', () => {
    for (const k of ['onStart', 'onContinue', 'onRestart']) {
      const i = SRC.indexOf(`${k}:`);
      expect(i, k).toBeGreaterThanOrEqual(0);
      const line = SRC.slice(i, SRC.indexOf('\n', i));
      expect(line, k).toMatch(/sfx\.unlock\(\)/);
    }
  });
});
