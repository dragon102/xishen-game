import { describe, it, expect } from 'vitest';
import {
  EYES_TIME,
  FINALE_DONE_AT,
  FLICKER_TIME,
  WAKE_DELAY,
  createHomeSession,
  stepHome,
  type HomeSession,
} from '../../src/scenes/home-session';
import type { FrameInput } from '../../src/input/frame-input';

const DT = 1 / 60;
const none: FrameInput = { dir: 0, jumpPressed: false, jumpHeld: false, interactPressed: false, advancePressed: false };
const tap: FrameInput = { ...none, advancePressed: true };

const wakeUp = (): HomeSession => {
  let s = createHomeSession();
  for (let i = 0; i < Math.ceil(WAKE_DELAY / DT) + 1; i++) s = stepHome(s, none, DT).session;
  s = stepHome(s, tap, DT).session;
  s = stepHome(s, tap, DT).session;
  return s;
};

const walkTo = (s0: HomeSession, footX: number): { s: HomeSession; sounds: string[] } => {
  let s = s0;
  const sounds: string[] = [];
  for (let i = 0; i < 4000; i++) {
    const fx = s.actor.body.x + s.actor.body.w / 2;
    if (Math.abs(fx - footX) < 2) break;
    const out = stepHome(s, { ...none, dir: fx < footX ? 1 : -1 }, DT);
    sounds.push(...out.sounds);
    s = out.session;
  }
  return { s, sounds };
};

describe('home session', () => {
  it('开局坐在床上，过一会儿弹出「……是梦？」，点掉后可以走', () => {
    let s = createHomeSession();
    expect(s.phase).toBe('wake');
    expect(s.sitting).toBe(true);
    for (let i = 0; i < Math.ceil(WAKE_DELAY / DT) + 1; i++) s = stepHome(s, none, DT).session;
    expect(s.talk.current?.line.text).toBe('……是梦？');
    s = stepHome(s, tap, DT).session;
    s = stepHome(s, tap, DT).session;
    expect(s.phase).toBe('play');
    expect(s.sitting).toBe(false);
  });

  it('走过客厅中间：墙上的红眼睛出现 0.5 秒，只触发一次', () => {
    const { s, sounds } = walkTo(wakeUp(), 45 * 16);
    expect(s.fired.has('eyes')).toBe(true);
    expect(sounds.filter((x) => x === 'rumble')).toHaveLength(1);
    expect(s.eyes).toBeGreaterThan(0);
    expect(s.eyes).toBeLessThanOrEqual(EYES_TIME);
    const back = walkTo(s, 40 * 16);
    const again = walkTo(back.s, 46 * 16);
    expect(again.sounds.filter((x) => x === 'rumble')).toHaveLength(0);
  });

  it('走进厨房门口：期待值屏闪一下', () => {
    const { s } = walkTo(wakeUp(), 62 * 16);
    expect(s.fired.has('flicker')).toBe(true);
    expect(s.flicker).toBeLessThanOrEqual(FLICKER_TIME);
  });

  it('调查普通物件只弹想法', () => {
    let { s } = walkTo(wakeUp(), 36 * 16 + 8);
    s = stepHome(s, { ...none, interactPressed: true }, DT).session;
    expect(s.talk.current?.line.text).toBe('饮水机空了。');
    for (let i = 0; i < 4; i++) s = stepHome(s, tap, DT).session;
    expect(s.phase).toBe('play');
  });

  it('调查厨房水桶：想法说完进入 finale，之后 outcome = complete', () => {
    let { s } = walkTo(wakeUp(), 77 * 16 + 8);
    s = stepHome(s, { ...none, interactPressed: true }, DT).session;
    s = stepHome(s, tap, DT).session;
    expect(s.phase).toBe('play');
    expect(s.talk.current).not.toBeNull();
    for (let i = 0; i < 3; i++) s = stepHome(s, tap, DT).session;
    expect(s.phase).toBe('finale');
    for (let i = 0; i < Math.ceil(FINALE_DONE_AT / DT) + 1; i++) s = stepHome(s, none, DT).session;
    expect(s.outcome).toBe('complete');
  });
});
