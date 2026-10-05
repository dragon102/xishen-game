import { describe, it, expect } from 'vitest';
import { OPENING } from '../../src/scenes/opening-script';
import { createRunner, skipRunner, tickRunner } from '../../src/cutscene/runner';

describe('opening script', () => {
  it('台词与 spec §4.1 一字不差、顺序一致', () => {
    const lines = OPENING.flatMap((s) => (s.kind === 'say' ? [[s.line.speaker, s.line.text]] : []));
    expect(lines).toEqual([
      ['lixiuchun', '阿伶……你、你是怎么回来的？'],
      ['chenling', '好渴……家里有水吗？'],
      ['chenling', '我先去睡了，爸妈你们也早点睡。'],
      ['chentan', '他是阿伶……那我们昨晚杀的，又是谁？'],
    ]);
  });

  it('以黑屏雨声开场', () => {
    expect(OPENING[0]).toEqual({ kind: 'rain', on: true });
    const firstVisual = OPENING.findIndex((s) => s.kind === 'cut');
    expect(OPENING.slice(0, firstVisual).some((s) => s.kind === 'wait')).toBe(true);
  });

  it('完整演完：最后是黑屏，雨停', () => {
    let r = createRunner(OPENING);
    for (let i = 0; i < 20000 && !r.finished; i++) r = tickRunner(r, 0.05, true).runner;
    expect(r.finished).toBe(true);
    expect(r.world.fade).toBe(1);
    expect(r.world.rain).toBe(false);
  });

  it('任何时候跳过，终态都是黑屏、雨停', () => {
    let r = createRunner(OPENING);
    for (let i = 0; i < 100; i++) r = tickRunner(r, 0.1, false).runner;
    const skipped = skipRunner(r);
    expect(skipped.world.fade).toBe(1);
    expect(skipped.world.rain).toBe(false);
  });

  it('碎桶口一刻同时有碎裂声与画面震动（不出现血）', () => {
    const i = OPENING.findIndex((s) => s.kind === 'prop' && s.prop === 'bucket' && s.state === 'broken');
    expect(i).toBeGreaterThan(0);
    const around = OPENING.slice(i - 2, i + 3);
    expect(around.some((s) => s.kind === 'sfx' && s.sound === 'crack')).toBe(true);
    expect(around.some((s) => s.kind === 'shake')).toBe(true);
  });
});
