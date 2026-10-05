import { describe, it, expect } from 'vitest';
import { ConfirmGate } from '../../src/ui/confirm';

describe('ConfirmGate', () => {
  it('第一次只是上膛，3 秒内第二次才确认', () => {
    const g = new ConfirmGate(3000);
    expect(g.press(1000)).toBe(false);
    expect(g.isArmed(2000)).toBe(true);
    expect(g.press(3999)).toBe(true);
    expect(g.isArmed(4000)).toBe(false);
  });

  it('超过 3 秒重新上膛', () => {
    const g = new ConfirmGate(3000);
    g.press(0);
    expect(g.isArmed(3001)).toBe(false);
    expect(g.press(3001)).toBe(false);
    expect(g.press(3500)).toBe(true);
  });

  it('reset 取消上膛', () => {
    const g = new ConfirmGate(3000);
    g.press(0);
    g.reset();
    expect(g.press(100)).toBe(false);
  });
});
