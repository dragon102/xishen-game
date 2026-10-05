import { describe, it, expect, vi } from 'vitest';
import { Actions } from '../../src/input/actions';
import { createUi, type UiCallbacks } from '../../src/ui/ui';

function setup() {
  document.body.innerHTML = '<div id="app"></div>';
  const cb: UiCallbacks = {
    onStart: vi.fn(), onContinue: vi.fn(), onRestart: vi.fn(), onPause: vi.fn(),
    onResume: vi.fn(), onQuit: vi.fn(), onSkip: vi.fn(), onEndDone: vi.fn(),
  };
  const ui = createUi(document.getElementById('app') as HTMLElement, new Actions(), cb);
  return { ui, cb };
}
const press = (code: string): void => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code }));
};

describe('标题画面的键盘快捷键', () => {
  it('标题可见时 Enter / Space / E 点第一个按钮', () => {
    const { ui, cb } = setup();
    ui.setMode('title');
    ui.showTitle('fresh');
    press('Enter');
    press('Space');
    press('KeyE');
    expect(cb.onStart).toHaveBeenCalledTimes(3);
  });

  it('有存档时第一个按钮是「继续」', () => {
    const { ui, cb } = setup();
    ui.setMode('title');
    ui.showTitle('resume');
    press('Enter');
    expect(cb.onContinue).toHaveBeenCalledTimes(1);
    expect(cb.onRestart).not.toHaveBeenCalled();
  });

  it('不在标题时不响应', () => {
    const { ui, cb } = setup();
    ui.setMode('title');
    ui.showTitle('fresh');
    ui.setMode('stage');
    press('Enter');
    expect(cb.onStart).not.toHaveBeenCalled();
  });

  it('其他键不响应', () => {
    const { ui, cb } = setup();
    ui.setMode('title');
    ui.showTitle('fresh');
    press('KeyA');
    expect(cb.onStart).not.toHaveBeenCalled();
  });

  it('对话框能跟着期待值屏避让', () => {
    const { ui } = setup();
    const dlg = document.querySelector('.dialogue') as HTMLElement;
    ui.renderExpect('50%', false);
    expect(dlg.classList.contains('beside-expect')).toBe(true);
    ui.renderExpect(null, false);
    expect(dlg.classList.contains('beside-expect')).toBe(false);
  });
});
