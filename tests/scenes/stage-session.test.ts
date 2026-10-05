import { describe, it, expect } from 'vitest';
import {
  FAIL_DONE_AT,
  FOOTSTEP_INTERVAL,
  PASS_DONE_AT,
  STAGE_INTRO,
  createStageSession,
  stepStage,
  type StageSession,
} from '../../src/scenes/stage-session';
import type { FrameInput } from '../../src/input/frame-input';

const DT = 1 / 60;
const none: FrameInput = { dir: 0, jumpPressed: false, jumpHeld: false, interactPressed: false, advancePressed: false };
const tap: FrameInput = { ...none, advancePressed: true };

const skipIntro = (s0: StageSession): StageSession => {
  let s = s0;
  for (let i = 0; i < STAGE_INTRO.length * 2; i++) s = stepStage(s, tap, DT).session;
  return s;
};

const walkTo = (s0: StageSession, footX: number): StageSession => {
  let s = s0;
  for (let i = 0; i < 2000; i++) {
    const fx = s.actor.body.x + s.actor.body.w / 2;
    if (Math.abs(fx - footX) < 2) break;
    s = stepStage(s, { ...none, dir: fx < footX ? 1 : -1 }, DT).session;
  }
  return s;
};

describe('stage session', () => {
  it('开局是引导想法，期间角色不动、期待值不变', () => {
    const s0 = createStageSession();
    expect(s0.phase).toBe('intro');
    expect(s0.talk.current?.line.text).toBe('这是……哪里？');
    const s1 = stepStage(s0, { ...none, dir: 1 }, 1).session;
    expect(s1.actor.body.x).toBe(s0.actor.body.x);
    expect(s1.expect.value).toBe(29);
  });

  it('点完引导进入 play', () => {
    expect(skipIntro(createStageSession()).phase).toBe('play');
  });

  it('在地上走动按间隔发出嘎吱声', () => {
    let s = skipIntro(createStageSession());
    let creaks = 0;
    for (let i = 0; i < 60; i++) {
      const out = stepStage(s, { ...none, dir: 1 }, DT);
      creaks += out.sounds.filter((x) => x === 'creak').length;
      s = out.session;
    }
    expect(creaks).toBe(Math.floor(1 / FOOTSTEP_INTERVAL));
  });

  it('首次调查：+6% 飘字、打开想法；再次调查不加分', () => {
    let s = walkTo(skipIntro(createStageSession()), 30 * 16 + 8);
    expect(s.nearby?.id).toBe('trapdoor');
    const before = s.expect.value;
    const out = stepStage(s, { ...none, interactPressed: true }, DT);
    expect(out.popups.map((p) => p.text)).toEqual(['+6%']);
    expect(out.session.expect.value).toBeGreaterThan(before + 5.9);
    expect(out.session.talk.current?.line.text).toBe('地板上有块活板。');
    s = out.session;
    for (let i = 0; i < 4; i++) s = stepStage(s, tap, DT).session;
    expect(s.talk.current).toBeNull();
    const again = stepStage(s, { ...none, interactPressed: true }, DT);
    expect(again.popups).toEqual([]);
  });

  it('读想法期间期待值暂停', () => {
    let s = walkTo(skipIntro(createStageSession()), 30 * 16 + 8);
    s = stepStage(s, { ...none, interactPressed: true }, DT).session;
    const v = s.expect.value;
    for (let i = 0; i < 600; i++) s = stepStage(s, none, DT).session;
    expect(s.expect.value).toBe(v);
  });

  it('期待值低于 20% 时 heartbeat 为真；撑满 5 秒进入 failing，再过一会儿 outcome = failed', () => {
    let s = skipIntro(createStageSession());
    s = { ...s, expect: { ...s.expect, value: 19.5 } };
    let out = stepStage(s, none, DT);
    expect(out.heartbeat).toBe(true);
    s = out.session;
    let sawRumble = false;
    for (let i = 0; i < 60 * 6 && s.phase === 'play'; i++) {
      out = stepStage(s, none, DT);
      sawRumble = sawRumble || out.sounds.includes('rumble');
      s = out.session;
    }
    expect(s.phase).toBe('failing');
    expect(sawRumble).toBe(true);
    for (let i = 0; i < Math.ceil(FAIL_DONE_AT / DT) + 1; i++) s = stepStage(s, none, DT).session;
    expect(s.outcome).toBe('failed');
  });

  it('达到 60%：铃声 → 碎裂声 → outcome = passed', () => {
    let s = walkTo(skipIntro(createStageSession()), 30 * 16 + 8);
    s = { ...s, expect: { ...s.expect, value: 58 } };
    const out = stepStage(s, { ...none, interactPressed: true }, DT);
    expect(out.sounds).toContain('bell');
    expect(out.session.phase).toBe('passing');
    s = out.session;
    let shatters = 0;
    for (let i = 0; i < Math.ceil(PASS_DONE_AT / DT) + 1; i++) {
      const o = stepStage(s, none, DT);
      shatters += o.sounds.filter((x) => x === 'shatter').length;
      s = o.session;
    }
    expect(shatters).toBe(1);
    expect(s.outcome).toBe('passed');
  });
});
