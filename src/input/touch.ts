import type { ActionName, Actions } from './actions';

const UP_EVENTS = ['pointerup', 'pointercancel', 'lostpointercapture'] as const;

function bindPointerHold(el: HTMLElement, action: ActionName, actions: Actions, prefix: string, markHeld: boolean): () => void {
  const active = new Set<number>();
  const down = (e: Event): void => {
    const id = (e as PointerEvent).pointerId;
    e.preventDefault();
    active.add(id);
    try {
      el.setPointerCapture?.(id);
    } catch {
      // jsdom 与部分旧浏览器没有指针捕获，忽略即可
    }
    actions.press(action, `${prefix}:${id}`);
    if (markHeld) el.classList.add('held');
  };
  const up = (e: Event): void => {
    const id = (e as PointerEvent).pointerId;
    if (!active.delete(id)) return;
    actions.release(action, `${prefix}:${id}`);
    if (markHeld && active.size === 0) el.classList.remove('held');
  };
  el.addEventListener('pointerdown', down);
  for (const t of UP_EVENTS) el.addEventListener(t, up);
  return () => {
    el.removeEventListener('pointerdown', down);
    for (const t of UP_EVENTS) el.removeEventListener(t, up);
  };
}

/** 屏幕上的按钮：每根手指是独立来源，所以能同时按住 ▶ 和「跳」。 */
export function bindTouchButton(el: HTMLElement, action: ActionName, actions: Actions): () => void {
  return bindPointerHold(el, action, actions, `ptr-${action}`, true);
}

/** 点画面任意处推进对话。只绑在画布上（按钮是画布的兄弟节点，点按钮不会冒泡到这里）。 */
export function bindTapToAdvance(el: HTMLElement, actions: Actions): () => void {
  return bindPointerHold(el, 'advance', actions, 'tap', false);
}
