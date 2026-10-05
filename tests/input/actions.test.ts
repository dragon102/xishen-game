import { describe, it, expect } from 'vitest';
import { Actions, moveDir } from '../../src/input/actions';
import { readInput } from '../../src/input/frame-input';

describe('Actions', () => {
  it('按下后 isDown 为真，刚按下只在 endStep 之前为真', () => {
    const a = new Actions();
    a.press('jump', 'key:Space');
    expect(a.isDown('jump')).toBe(true);
    expect(a.justPressed('jump')).toBe(true);
    a.endStep();
    expect(a.isDown('jump')).toBe(true);
    expect(a.justPressed('jump')).toBe(false);
  });

  it('两个来源同时按住，松开一个仍算按住，且不重复触发刚按下', () => {
    const a = new Actions();
    a.press('left', 'key:ArrowLeft');
    a.endStep();
    a.press('left', 'ptr:3');
    expect(a.justPressed('left')).toBe(false);
    a.release('left', 'key:ArrowLeft');
    expect(a.isDown('left')).toBe(true);
    a.release('left', 'ptr:3');
    expect(a.isDown('left')).toBe(false);
  });

  it('松开后再按，会再次触发刚按下', () => {
    const a = new Actions();
    a.press('interact', 'k');
    a.endStep();
    a.release('interact', 'k');
    a.press('interact', 'k');
    expect(a.justPressed('interact')).toBe(true);
  });

  it('没跑 endStep 时刚按下一直保留（一帧没跑物理步也不丢键）', () => {
    const a = new Actions();
    a.press('jump', 'k');
    a.release('jump', 'k');
    expect(a.justPressed('jump')).toBe(true);
  });

  it('releaseAll 清空一切', () => {
    const a = new Actions();
    a.press('right', 'k');
    a.releaseAll();
    expect(a.isDown('right')).toBe(false);
    expect(a.justPressed('right')).toBe(false);
  });

  it('moveDir：左右同时按抵消', () => {
    const a = new Actions();
    expect(moveDir(a)).toBe(0);
    a.press('right', 'k1');
    expect(moveDir(a)).toBe(1);
    a.press('left', 'k2');
    expect(moveDir(a)).toBe(0);
    a.release('right', 'k1');
    expect(moveDir(a)).toBe(-1);
  });

  it('readInput 把各动作读成一帧输入', () => {
    const a = new Actions();
    a.press('right', 'k1');
    a.press('jump', 'k2');
    a.press('advance', 'k3');
    expect(readInput(a)).toEqual({
      dir: 1,
      jumpPressed: true,
      jumpHeld: true,
      interactPressed: false,
      advancePressed: true,
    });
  });
});
