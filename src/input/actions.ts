export type ActionName = 'left' | 'right' | 'jump' | 'interact' | 'advance' | 'pause';

/**
 * 统一的动作状态。同一个动作可以被多个来源同时按住（某个键、某根手指），
 * 全部来源松开才算松开；「刚按下」只在从没人按变成有人按时记一次，
 * 一直保留到 endStep()——所以某一帧没跑物理步也不会丢掉一次点按。
 */
export class Actions {
  private readonly held = new Map<ActionName, Set<string>>();
  private readonly pressed = new Set<ActionName>();

  press(action: ActionName, source: string): void {
    const sources = this.sourcesOf(action);
    if (sources.size === 0) this.pressed.add(action);
    sources.add(source);
  }

  release(action: ActionName, source: string): void {
    this.sourcesOf(action).delete(source);
  }

  isDown(action: ActionName): boolean {
    return this.sourcesOf(action).size > 0;
  }

  justPressed(action: ActionName): boolean {
    return this.pressed.has(action);
  }

  endStep(): void {
    this.pressed.clear();
  }

  releaseAll(): void {
    this.held.clear();
    this.pressed.clear();
  }

  private sourcesOf(action: ActionName): Set<string> {
    let s = this.held.get(action);
    if (!s) {
      s = new Set();
      this.held.set(action, s);
    }
    return s;
  }
}

export function moveDir(a: Actions): -1 | 0 | 1 {
  const d = (a.isDown('right') ? 1 : 0) - (a.isDown('left') ? 1 : 0);
  return d as -1 | 0 | 1;
}
