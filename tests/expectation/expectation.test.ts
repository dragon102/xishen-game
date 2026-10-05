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

  it('走动每秒 +0.25%，但观众会看腻：走 4 秒净涨 (0.25 − 0.21) × 4 = 0.16', () => {
    const s = ticks(createExpectation(), { ...still, moving: true }, 16);
    expect(s.value).toBeCloseTo(29 + (EXPECT.walkPerSec - EXPECT.boredomPerSec) * 4, 6);
    expect(s.value).toBeCloseTo(29.16, 6);
  });

  it('观众看腻：不管动不动、在不在空中，每秒都掉 0.21%', () => {
    expect(ticks(createExpectation(), airborne, 16).value).toBeCloseTo(29 - 0.84, 6);
    expect(ticks(createExpectation(), { ...still, moving: true }, 16).value).toBeGreaterThan(
      ticks(createExpectation(), airborne, 16).value,
    );
  });

  it('跳跃收益：4 秒内连跳逐次减半，最低 0.1%', () => {
    expect(jumpGain(0)).toBe(1.5);
    expect(jumpGain(1)).toBe(0.75);
    expect(jumpGain(2)).toBe(0.375);
    expect(jumpGain(10)).toBe(EXPECT.jumpMin);
    let s = createExpectation();
    const gains: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t = tickExpectation(s, { ...airborne, jumped: true }, DT);
      gains.push(...t.gains);
      s = t.state;
    }
    expect(gains).toEqual([1.5, 0.75, 0.375]);
  });

  it('跳跃收益在 4 秒后恢复', () => {
    let s = tickExpectation(createExpectation(), { ...airborne, jumped: true }, DT).state;
    s = ticks(s, airborne, 16);
    const t = tickExpectation(s, { ...airborne, jumped: true }, DT);
    expect(t.gains).toEqual([1.5]);
  });

  it('首次调查 +5%，一步里两个就加两次', () => {
    const t = tickExpectation(createExpectation(), { ...airborne, newHotspots: 2 }, DT);
    expect(t.state.value).toBeCloseTo(39 - EXPECT.boredomPerSec * DT, 6);
    expect(t.gains).toEqual([5, 5]);
  });

  it('发呆 1.5 秒内只掉「看腻」那一点，没有发呆惩罚', () => {
    expect(ticks(createExpectation(), still, 6).value).toBeCloseTo(29 - EXPECT.boredomPerSec * 1.5, 6);
  });

  it('发呆超过 1.5 秒开始掉，每多 1 秒速率 +0.5%/s', () => {
    expect(idleRate(1.5)).toBe(0);
    expect(idleRate(1.75)).toBe(1);
    expect(idleRate(2.5)).toBe(1.5);
    expect(idleRate(4)).toBe(2);
    expect(idleRate(100)).toBe(EXPECT.idleMax);
    // 第 7~10 步 idleTime = 1.75/2/2.25/2.5 → 速率 1/1/1/1.5 → 共掉 1.125；另有 10 步的看腻 0.525
    expect(ticks(createExpectation(), still, 10).value).toBeCloseTo(29 - 1.125 - 0.525, 6);
  });

  it('一动就把发呆计时清零', () => {
    let s = ticks(createExpectation(), still, 12);
    s = tickExpectation(s, { ...still, moving: true }, DT).state;
    expect(s.idleTime).toBe(0);
  });

  it('在空中不算发呆', () => {
    // 只有看腻在掉：10 秒 × 0.21
    expect(ticks(createExpectation(), airborne, 40).value).toBeCloseTo(29 - 2.1, 6);
  });

  it('不会低于 0、不会高于 100', () => {
    const low: ExpectState = { ...createExpectation(), value: 0.5 };
    expect(ticks(low, still, 80).value).toBe(0);
    const high: ExpectState = { ...createExpectation(), value: 59 };
    const t = tickExpectation(high, { ...airborne, newHotspots: 12 }, DT);
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

  it('达到 70% 过关，之后不再变化', () => {
    const start: ExpectState = { ...createExpectation(), value: 66 };
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

  it('formatGain：整数原样，带小数保留一位（首跳 1.5 不能显示成 +2）', () => {
    expect(formatGain(5)).toBe('5');
    expect(formatGain(1.5)).toBe('1.5');
    expect(formatGain(0.75)).toBe('0.8');
    expect(formatGain(0.1)).toBe('0.1');
  });

  describe('边界', () => {
    // dt = 0 的那一步不走时间、不掉「看腻」，用来精确卡在整数边界上。
    const exact = (value: number, ev: ExpectEvents) => tickExpectation({ ...createExpectation(), value }, ev, 0).state;

    it('69.9% 再走 0.25 秒只净涨 0.01，还没过关', () => {
      const s: ExpectState = { ...createExpectation(), value: 69.9 };
      const t = tickExpectation(s, { ...still, moving: true }, DT).state;
      expect(t.value).toBeCloseTo(69.91, 6);
      expect(t.status).toBe('ok');
    });

    it('正好 70% 算过关，69.99% 还不算', () => {
      expect(exact(70, still).status).toBe('passed');
      expect(exact(69.99, still).status).toBe('ok');
    });

    it('65% + 一个调查点正好 70%，算过关', () => {
      const t = exact(65, { ...airborne, newHotspots: 1 });
      expect(t.value).toBe(70);
      expect(t.status).toBe('passed');
    });

    it('正好 20% 还不算危险，19.99% 才是', () => {
      const t = exact(20, airborne);
      expect(t.value).toBe(20);
      expect(t.status).toBe('ok');
      expect(t.dangerTime).toBe(0);
      expect(exact(19.99, airborne).status).toBe('danger');
    });

    it('第一跳后正好满 4 秒的那一跳，收益恢复成 1.5', () => {
      let s = tickExpectation(createExpectation(), { ...airborne, jumped: true }, DT).state; // time 0.25
      s = ticks(s, airborne, 15); // time 4.0
      const t = tickExpectation(s, { ...airborne, jumped: true }, DT); // time 4.25
      expect(t.state.time).toBe(4.25);
      expect(t.gains).toEqual([1.5]);
    });

    it('少 0.25 秒（第一跳后 3.75 秒）还在窗口里，收益只有 0.75', () => {
      let s = tickExpectation(createExpectation(), { ...airborne, jumped: true }, DT).state; // time 0.25
      s = ticks(s, airborne, 14); // time 3.75
      const t = tickExpectation(s, { ...airborne, jumped: true }, DT); // time 4.0
      expect(t.gains).toEqual([0.75]);
    });
  });
});
