import { describe, it, expect } from 'vitest';
import { createFlow, dispatch, titleMenu, type FlowState } from '../../src/flow/game-flow';

describe('titleMenu', () => {
  it('按存档决定标题菜单', () => {
    expect(titleMenu(null)).toBe('fresh');
    expect(titleMenu('opening')).toBe('resume');
    expect(titleMenu('stage')).toBe('resume');
    expect(titleMenu('home')).toBe('resume');
    expect(titleMenu('done')).toBe('cleared');
  });
});

describe('dispatch', () => {
  it('从标题开始 → 开场', () => {
    const r = dispatch(createFlow(null), { type: 'start' });
    expect(r.state.mode).toBe('opening');
    expect(r.enter).toBe(true);
    expect(r.save).toEqual({ kind: 'none' });
  });

  it('有存档时 start 无效（必须选继续或从头开始）', () => {
    const r = dispatch(createFlow('stage'), { type: 'start' });
    expect(r.state.mode).toBe('title');
    expect(r.enter).toBe(false);
  });

  it('继续 → 进到存档那一关', () => {
    expect(dispatch(createFlow('home'), { type: 'continue' }).state.mode).toBe('home');
    expect(dispatch(createFlow('done'), { type: 'continue' }).state.mode).toBe('title');
  });

  it('从头开始 → 清档并进开场', () => {
    const r = dispatch(createFlow('home'), { type: 'restart' });
    expect(r.state).toEqual({ mode: 'opening', saved: null });
    expect(r.save).toEqual({ kind: 'clear' });
  });

  it('开场 → 剧场 → 家 → 结尾，每过一关存档', () => {
    let s: FlowState = { mode: 'opening', saved: null };
    let r = dispatch(s, { type: 'levelComplete' });
    expect(r.state.mode).toBe('stage');
    expect(r.save).toEqual({ kind: 'write', level: 'stage' });
    s = r.state;
    r = dispatch(s, { type: 'levelComplete' });
    expect(r.state.mode).toBe('home');
    expect(r.save).toEqual({ kind: 'write', level: 'home' });
    s = r.state;
    r = dispatch(s, { type: 'levelComplete' });
    expect(r.state).toEqual({ mode: 'end', saved: 'done' });
    expect(r.save).toEqual({ kind: 'write', level: 'done' });
    r = dispatch(r.state, { type: 'endFinished' });
    expect(r.state).toEqual({ mode: 'title', saved: 'done' });
  });

  it('剧场失败 → 重开剧场（enter 为真，不改存档）', () => {
    const r = dispatch({ mode: 'stage', saved: 'stage' }, { type: 'levelFailed' });
    expect(r.state.mode).toBe('stage');
    expect(r.enter).toBe(true);
    expect(r.save).toEqual({ kind: 'none' });
  });

  it('游玩中回到标题，存档不变', () => {
    const r = dispatch({ mode: 'home', saved: 'home' }, { type: 'quitToTitle' });
    expect(r.state).toEqual({ mode: 'title', saved: 'home' });
  });

  it('不相干的事件不改变状态', () => {
    const s: FlowState = { mode: 'home', saved: 'home' };
    const r = dispatch(s, { type: 'levelFailed' });
    expect(r.state).toBe(s);
    expect(r.enter).toBe(false);
  });
});
