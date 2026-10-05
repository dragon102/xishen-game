import { describe, it, expect } from 'vitest';
import { FOLLOW_OFFSET, createRunner, createWorld, skipRunner, tickRunner, type Runner, type Step } from '../../src/cutscene/runner';
import { isComplete, say } from '../../src/dialogue/dialogue';

const playAll = (r0: Runner, dt = 0.1, maxTicks = 5000): Runner => {
  let r = r0;
  for (let i = 0; i < maxTicks && !r.finished; i++) r = tickRunner(r, dt, true).runner;
  return r;
};

describe('cutscene runner', () => {
  it('开局世界：黑屏、无人可见', () => {
    const w = createWorld();
    expect(w.fade).toBe(1);
    expect(w.scene).toBe('black');
    expect(w.actors.chenling.visible).toBe(false);
  });

  it('瞬时步骤在同一个 tick 里连着执行，音效只发一次', () => {
    const steps: Step[] = [
      { kind: 'rain', on: true },
      { kind: 'cut', scene: 'street', cameraX: 100 },
      { kind: 'sfx', sound: 'door' },
      { kind: 'place', actor: 'chenling', x: 50, facing: 1, visible: true },
      { kind: 'wait', duration: 1 },
    ];
    const t1 = tickRunner(createRunner(steps), 0.1, false);
    expect(t1.sounds).toEqual(['door']);
    expect(t1.runner.world.rain).toBe(true);
    expect(t1.runner.world.scene).toBe('street');
    expect(t1.runner.world.actors.chenling).toMatchObject({ x: 50, visible: true });
    expect(t1.runner.index).toBe(4);
    const t2 = tickRunner(t1.runner, 0.1, false);
    expect(t2.sounds).toEqual([]);
  });

  it('fade 按时长线性过渡', () => {
    let r = createRunner([{ kind: 'fade', to: 0, duration: 1 }]);
    r = tickRunner(r, 0.5, false).runner;
    expect(r.world.fade).toBeCloseTo(0.5, 6);
    r = tickRunner(r, 0.5, false).runner;
    expect(r.world.fade).toBe(0);
    expect(r.finished).toBe(true);
  });

  it('pan 移动镜头', () => {
    let r = createRunner([{ kind: 'pan', toX: 200, duration: 2 }]);
    r = tickRunner(r, 1, false).runner;
    expect(r.world.cameraX).toBeCloseTo(100, 6);
  });

  it('walk 以给定速度走到目标点，途中 walking 为真并朝向目标', () => {
    let r = createRunner([
      { kind: 'place', actor: 'chenling', x: 100, facing: 1, visible: true },
      { kind: 'walk', actor: 'chenling', toX: 40, speed: 30 },
    ]);
    r = tickRunner(r, 1, false).runner;
    expect(r.world.actors.chenling).toMatchObject({ x: 70, walking: true, facing: -1 });
    r = tickRunner(r, 1, false).runner;
    r = tickRunner(r, 1, false).runner;
    expect(r.world.actors.chenling).toMatchObject({ x: 40, walking: false });
    expect(r.finished).toBe(true);
  });

  it('say 停住等玩家：第一下补全文字，第二下结束', () => {
    let r = createRunner([{ kind: 'say', line: say('chenling', '好渴……家里有水吗？') }]);
    r = tickRunner(r, 0.01, false).runner;
    expect(r.world.dialogue).not.toBeNull();
    r = tickRunner(r, 10, false).runner;
    expect(r.finished).toBe(false);
    r = tickRunner(r, 0.01, true).runner;
    expect(r.world.dialogue).toBeNull();
    expect(r.finished).toBe(true);
  });

  it('say：点击落在文字刚好打完的那一帧，只算补全，不翻页', () => {
    let r = createRunner([{ kind: 'say', line: say('chenling', '好渴……家里有水吗？') }]);
    // 10 个字、每秒 30 字：0.3 秒后显示 9 个字，差一个字没打完
    r = tickRunner(r, 0.3, false).runner;
    expect(r.world.dialogue).not.toBeNull();
    expect(isComplete(r.world.dialogue!)).toBe(false);
    // 这一帧时间够把最后一个字打完，同时玩家点了一下
    r = tickRunner(r, 0.2, true).runner;
    expect(r.finished).toBe(false);
    expect(r.world.dialogue).not.toBeNull();
    expect(isComplete(r.world.dialogue!)).toBe(true);
    // 玩家看完整句后再点，才翻页
    r = tickRunner(r, 0.01, true).runner;
    expect(r.finished).toBe(true);
  });

  it('say：对话刚打开的那一帧就点击，只补全文字', () => {
    let r = createRunner([{ kind: 'say', line: say('chenling', '好渴……家里有水吗？') }]);
    r = tickRunner(r, 0.01, true).runner;
    expect(r.finished).toBe(false);
    expect(isComplete(r.world.dialogue!)).toBe(true);
  });

  it('shake 设定震动，之后随时间衰减', () => {
    let r = createRunner([
      { kind: 'shake', duration: 0.3, strength: 2 },
      { kind: 'wait', duration: 5 },
    ]);
    r = tickRunner(r, 0.1, false).runner;
    expect(r.world.shakeTime).toBeCloseTo(0.3, 6);
    r = tickRunner(r, 0.1, false).runner;
    expect(r.world.shakeTime).toBeCloseTo(0.2, 6);
  });

  it('follow 让镜头跟着角色（角色 x − FOLLOW_OFFSET）', () => {
    let r = createRunner([
      { kind: 'place', actor: 'chenling', x: 500, facing: 1, visible: true },
      { kind: 'follow', actor: 'chenling' },
      { kind: 'walk', actor: 'chenling', toX: 600, speed: 50 },
    ]);
    r = tickRunner(r, 1, false).runner;
    expect(r.world.cameraX).toBeCloseTo(550 - FOLLOW_OFFSET, 6);
  });

  it('跳过：终态与完整演完一致', () => {
    const steps: Step[] = [
      { kind: 'rain', on: true },
      { kind: 'cut', scene: 'home', cameraX: 480 },
      { kind: 'place', actor: 'lixiuchun', x: 750, facing: -1, visible: true },
      { kind: 'fade', to: 0, duration: 1 },
      { kind: 'say', line: say('lixiuchun', '阿伶……你、你是怎么回来的？') },
      { kind: 'pose', actor: 'lixiuchun', pose: 'scared' },
      { kind: 'walk', actor: 'lixiuchun', toX: 700, speed: 20 },
      { kind: 'prop', prop: 'bucket', state: 'empty' },
      { kind: 'pan', toX: 600, duration: 2 },
      { kind: 'fade', to: 1, duration: 1 },
    ];
    const played = playAll(createRunner(steps));
    const halfway = tickRunner(tickRunner(createRunner(steps), 0.5, false).runner, 0.5, false).runner;
    const skipped = skipRunner(halfway);
    expect(skipped.finished).toBe(true);
    expect(skipped.world).toEqual({ ...played.world, shakeTime: 0 });
  });
});
