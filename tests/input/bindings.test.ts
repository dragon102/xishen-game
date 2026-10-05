import { describe, it, expect } from 'vitest';
import { Actions } from '../../src/input/actions';
import { bindKeyboard } from '../../src/input/keyboard';
import { bindTapToAdvance, bindTouchButton } from '../../src/input/touch';

const key = (type: 'keydown' | 'keyup', code: string, repeat = false) =>
  window.dispatchEvent(new KeyboardEvent(type, { code, repeat, cancelable: true }));

const pointer = (el: HTMLElement, type: string, pointerId: number) => {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'pointerId', { value: pointerId });
  el.dispatchEvent(ev);
};

describe('bindKeyboard', () => {
  it('方向键与 A/D 映射到左右，空格映射到跳', () => {
    const a = new Actions();
    const off = bindKeyboard(window, a);
    key('keydown', 'ArrowLeft');
    key('keydown', 'Space');
    expect(a.isDown('left')).toBe(true);
    expect(a.isDown('jump')).toBe(true);
    key('keyup', 'ArrowLeft');
    expect(a.isDown('left')).toBe(false);
    key('keydown', 'KeyD');
    expect(a.isDown('right')).toBe(true);
    off();
  });

  it('E 同时按下互动与推进对话；Esc 是暂停', () => {
    const a = new Actions();
    const off = bindKeyboard(window, a);
    key('keydown', 'KeyE');
    expect(a.justPressed('interact')).toBe(true);
    expect(a.justPressed('advance')).toBe(true);
    key('keyup', 'KeyE');
    expect(a.isDown('advance')).toBe(false);
    key('keydown', 'Escape');
    expect(a.justPressed('pause')).toBe(true);
    off();
  });

  it('系统连发的 keydown 不重复触发', () => {
    const a = new Actions();
    const off = bindKeyboard(window, a);
    key('keydown', 'Space');
    a.endStep();
    key('keydown', 'Space', true);
    expect(a.justPressed('jump')).toBe(false);
    off();
  });

  it('窗口失焦时松开全部按键（防止卡键一直走）', () => {
    const a = new Actions();
    const off = bindKeyboard(window, a);
    key('keydown', 'ArrowRight');
    window.dispatchEvent(new Event('blur'));
    expect(a.isDown('right')).toBe(false);
    off();
  });

  it('解绑后不再响应', () => {
    const a = new Actions();
    bindKeyboard(window, a)();
    key('keydown', 'ArrowLeft');
    expect(a.isDown('left')).toBe(false);
  });
});

describe('bindTouchButton', () => {
  it('两根手指按同一个键，全部抬起才松开', () => {
    const a = new Actions();
    const el = document.createElement('div');
    bindTouchButton(el, 'jump', a);
    pointer(el, 'pointerdown', 1);
    pointer(el, 'pointerdown', 2);
    expect(a.isDown('jump')).toBe(true);
    expect(el.classList.contains('held')).toBe(true);
    pointer(el, 'pointerup', 1);
    expect(a.isDown('jump')).toBe(true);
    pointer(el, 'pointercancel', 2);
    expect(a.isDown('jump')).toBe(false);
    expect(el.classList.contains('held')).toBe(false);
  });

  it('不同按钮互不干扰（按住右的同时按跳）', () => {
    const a = new Actions();
    const right = document.createElement('div');
    const jump = document.createElement('div');
    bindTouchButton(right, 'right', a);
    bindTouchButton(jump, 'jump', a);
    pointer(right, 'pointerdown', 1);
    pointer(jump, 'pointerdown', 2);
    pointer(jump, 'pointerup', 2);
    expect(a.isDown('right')).toBe(true);
    expect(a.isDown('jump')).toBe(false);
  });
});

describe('bindTapToAdvance', () => {
  it('点画面按下推进，抬起松开', () => {
    const a = new Actions();
    const el = document.createElement('canvas');
    bindTapToAdvance(el, a);
    pointer(el, 'pointerdown', 7);
    expect(a.justPressed('advance')).toBe(true);
    pointer(el, 'pointerup', 7);
    expect(a.isDown('advance')).toBe(false);
  });
});
