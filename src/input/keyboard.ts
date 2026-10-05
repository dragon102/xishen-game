import type { ActionName, Actions } from './actions';

export const KEY_MAP: Readonly<Record<string, ActionName>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  Space: 'jump',
  ArrowUp: 'jump',
  KeyW: 'jump',
  KeyE: 'interact',
  Enter: 'interact',
  Escape: 'pause',
  KeyP: 'pause',
};

export function bindKeyboard(target: Window, actions: Actions): () => void {
  const down = (e: KeyboardEvent): void => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const action = KEY_MAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (e.repeat) return;
    const source = `key:${e.code}`;
    actions.press(action, source);
    // 互动键同时负责推进对话
    if (action === 'interact') actions.press('advance', source);
  };
  const up = (e: KeyboardEvent): void => {
    const action = KEY_MAP[e.code];
    if (!action) return;
    const source = `key:${e.code}`;
    actions.release(action, source);
    if (action === 'interact') actions.release('advance', source);
  };
  const blur = (): void => actions.releaseAll();
  target.addEventListener('keydown', down);
  target.addEventListener('keyup', up);
  target.addEventListener('blur', blur);
  return () => {
    target.removeEventListener('keydown', down);
    target.removeEventListener('keyup', up);
    target.removeEventListener('blur', blur);
  };
}
