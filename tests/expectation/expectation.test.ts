import { describe, it, expect } from 'vitest';
import {
  EXPECT,
  createExpectation,
  formatGain,
  idleRate,
  jumpGain,
  tickExpectation,
  type ExpectEvents,
  type ExpectState,
} from '../../src/expectation/expectation';

const DT = 0.25;
const still: ExpectEvents = { moving: false, jumped: false, onGround: true, newHotspots: 0 };
const airborne: ExpectEvents = { moving: false, jumped: false, onGround: false, newHotspots: 0 };
const ticks = (s: ExpectState, ev: ExpectEvents, n: number): ExpectState => {
  let cur = s;
  for (let i = 0; i < n; i++) cur = tickExpectation(cur, ev, DT).state;
  return cur;
};

describe('expectation', () => {
  it('开局 29%，状态正常', () => {
    const s = createExpectation();
    expect(s.value).toBe(29);
    expect(s.status).toBe('ok');
  });

  it('走动每秒 +0.3%', () => {
    const s = ticks(createExpectation(), { ...still, moving: true }, 40);
    expect(s.value).toBeCloseTo(32, 6);
  });

  it('跳跃收益：3 秒内连跳逐次减半，最低 0.1%', () => {
    expect(jumpGain(0)).toBe(2);
    expect(jumpGain(1)).toBe(1);
    expect(jumpGain(2)).toBe(0.5);
    expect(jumpGain(10)).toBe(EXPECT.jumpMin);
    let s = createExpectation();
    const gains: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t = tickExpectation(s, { ...airborne, jumped: true }, DT);
      gains.push(...t.gains);
      s = t.state;
    }
    expect(gains).toEqual([2, 1, 0.5]);
  });

  it('跳跃收益在 3 秒后恢复', () => {
    let s = tickExpectation(createExpectation(), { ...airborne, jumped: true }, DT).state;
    s = ticks(s, airborne, 12);
    const t = tickExpectation(s, { ...airborne, jumped: true }, DT);
    expect(t.gains).toEqual([2]);
  });

  it('首次调查 +6%，一步里两个就加两次', () => {
    const t = tickExpectation(createExpectation(), { ...airborne, newHotspots: 2 }, DT);
    expect(t.state.value).toBe(41);
    expect(t.gains).toEqual([6, 6]);
  });

  it('发呆 2 秒内不掉', () => {
    expect(ticks(createExpectation(), still, 8).value).toBe(29);
  });

  it('发呆超过 2 秒开始掉，每多 1 秒速率 +0.5%/s', () => {
    expect(idleRate(2)).toBe(0);
    expect(idleRate(2.25)).toBe(1);
    expect(idleRate(3)).toBe(1.5);
    expect(idleRate(4.5)).toBe(2);
    expect(idleRate(100)).toBe(EXPECT.idleMax);
    // 第 9~12 步 idleTime = 2.25/2.5/2.75/3 → 速率 1/1/1/1.5 → 共掉 1.125
    expect(ticks(createExpectation(), still, 12).value).toBeCloseTo(27.875, 6);
  });

  it('一动就把发呆计时清零', () => {
    let s = ticks(createExpectation(), still, 12);
    s = tickExpectation(s, { ...still, moving: true }, DT).state;
    expect(s.idleTime).toBe(0);
  });

  it('在空中不算发呆', () => {
    expect(ticks(createExpectation(), airborne, 40).value).toBe(29);
  });

  it('不会低于 0、不会高于 100', () => {
    const low: ExpectState = { ...createExpectation(), value: 0.5 };
    expect(ticks(low, still, 80).value).toBe(0);
    const high: ExpectState = { ...createExpectation(), value: 59 };
    const t = tickExpectation(high, { ...airborne, newHotspots: 10 }, DT);
    expect(t.state.value).toBe(100);
  });

  it('低于 20% 进入危险，连续 5 秒失败', () => {
    const start: ExpectState = { ...createExpectation(), value: 19 };
    let s = tickExpectation(start, airborne, DT).state;
    expect(s.status).toBe('danger');
    s = ticks(s, airborne, 18);
    expect(s.status).toBe('danger');
    s = tickExpectation(s, airborne, DT).state;
    expect(s.dangerTime).toBe(5);
    expect(s.status).toBe('failed');
  });

  it('回到 20% 以上危险计时清零', () => {
    const start: ExpectState = { ...createExpectation(), value: 19 };
    let s = ticks(start, airborne, 10);
    s = tickExpectation(s, { ...airborne, newHotspots: 1 }, DT).state;
    expect(s.status).toBe('ok');
    expect(s.dangerTime).toBe(0);
  });

  it('达到 60% 过关，之后不再变化', () => {
    const start: ExpectState = { ...createExpectation(), value: 55 };
    const s = tickExpectation(start, { ...airborne, newHotspots: 1 }, DT).state;
    expect(s.status).toBe('passed');
    const again = tickExpectation(s, { ...still, newHotspots: 3 }, DT);
    expect(again.state).toBe(s);
    expect(again.gains).toEqual([]);
  });

  it('失败之后不再变化', () => {
    const failed: ExpectState = { ...createExpectation(), value: 5, status: 'failed' };
    expect(tickExpectation(failed, { ...still, newHotspots: 1 }, DT).state).toBe(failed);
  });

  it('formatGain：≥1 取整，<1 保留一位小数', () => {
    expect(formatGain(6)).toBe('6');
    expect(formatGain(2)).toBe('2');
    expect(formatGain(0.5)).toBe('0.5');
    expect(formatGain(0.1)).toBe('0.1');
  });

  describe('边界', () => {
    it('59.9% 再走 0.25 秒只涨 0.075，还没过关', () => {
      const s: ExpectState = { ...createExpectation(), value: 59.9 };
      const t = tickExpectation(s, { ...still, moving: true }, DT).state;
      expect(t.value).toBeCloseTo(59.975, 6);
      expect(t.status).toBe('ok');
    });

    it('54% + 一个调查点正好 60%，算过关', () => {
      const s: ExpectState = { ...createExpectation(), value: 54 };
      const t = tickExpectation(s, { ...airborne, newHotspots: 1 }, DT).state;
      expect(t.value).toBe(60);
      expect(t.status).toBe('passed');
    });

    it('正好 20% 还不算危险', () => {
      const s: ExpectState = { ...createExpectation(), value: 20 };
      const t = tickExpectation(s, airborne, DT).state;
      expect(t.value).toBe(20);
      expect(t.status).toBe('ok');
      expect(t.dangerTime).toBe(0);
    });

    it('第一跳后正好满 3 秒的那一跳，收益恢复成 2', () => {
      let s = tickExpectation(createExpectation(), { ...airborne, jumped: true }, DT).state; // time 0.25
      s = ticks(s, airborne, 11); // time 3.0
      const t = tickExpectation(s, { ...airborne, jumped: true }, DT); // time 3.25
      expect(t.state.time).toBe(3.25);
      expect(t.gains).toEqual([2]);
    });
  });
});
