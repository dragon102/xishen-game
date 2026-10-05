import { describe, it, expect } from 'vitest';
import { createStageSession, stepStage, type StageSession } from '../../src/scenes/stage-session';
import { EXPECT } from '../../src/expectation/expectation';
import type { FrameInput } from '../../src/input/frame-input';

const DT = 1 / 60;
const none: FrameInput = { dir: 0, jumpPressed: false, jumpHeld: false, interactPressed: false, advancePressed: false };
const SPOTS: Record<number, string> = { 2: 'crack', 8: 'curtainL', 20: 'edge', 30: 'trapdoor', 40: 'fakeDoor', 52: 'curtainR' };
const fx = (s: StageSession) => s.actor.body.x + s.actor.body.w / 2;
const isBlockedAhead = (s: StageSession, dir: number) => {
  const tx = Math.floor((fx(s) + dir * 14) / 16);
  return (tx >= 14 && tx <= 15) || (tx >= 38 && tx <= 43);
};

interface Report { passedAt: number | null; failedAt: number | null; afterSpot: number[]; playTime: number; session: StageSession }

type Mode = 'good' | 'spotsThenStill' | 'idle';

function run(mode: Mode, route: number[], hopEvery = 1.2, maxSec = 600): Report {
  let s = createStageSession();
  const afterSpot: number[] = [];
  let ri = 0;
  let tapTimer = 0;
  let hopTimer = 0;
  let hopHold = 0;
  let dirPace: 1 | -1 = 1;
  let pending = false;
  const frames = Math.round(maxSec / DT);
  let passedAt: number | null = null;
  let failedAt: number | null = null;
  for (let f = 0; f < frames && s.phase !== 'done'; f++) {
    let inp: FrameInput = { ...none };
    if (s.talk.current) {
      tapTimer -= DT;
      if (tapTimer <= 0) { inp = { ...none, advancePressed: true }; tapTimer = 0.4; }
    } else if (s.phase === 'play' && mode !== 'idle') {
      tapTimer = 0;
      const moving = mode === 'good' || ri < route.length;
      if (ri < route.length) {
        const target = route[ri] * 16 + 8;
        const dx = target - fx(s);
        const stand = s.actor.body.onGround;
        if (Math.abs(dx) < 2 && stand) {
          const id = SPOTS[route[ri]];
          if (s.nearby?.id === id && s.interactCooldown <= 0) {
            inp = { ...none, interactPressed: true };
            pending = true;
          }
        } else {
          const dir: 1 | -1 = dx > 0 ? 1 : -1;
          inp = { ...none, dir: Math.abs(dx) < 2 ? 0 : dir };
          if (isBlockedAhead(s, dir) && stand) inp = { ...inp, jumpPressed: true, jumpHeld: true };
          else if (!stand && s.actor.body.vy < 0) inp = { ...inp, jumpHeld: true };
        }
      } else if (mode === 'good') {
        // 走完所有点：来回走并每 hopEvery 秒跳一下
        const x = fx(s);
        if (x > 52 * 16) dirPace = -1;
        if (x < 22 * 16) dirPace = 1;
        inp = { ...none, dir: dirPace };
        if (isBlockedAhead(s, dirPace) && s.actor.body.onGround) inp = { ...inp, jumpPressed: true, jumpHeld: true };
      }
      if (moving && mode === 'good') {
        hopTimer += DT;
        if (hopTimer >= hopEvery && s.actor.body.onGround && !inp.jumpPressed) {
          hopTimer = 0; hopHold = 0.25;
          inp = { ...inp, jumpPressed: true, jumpHeld: true };
        }
      }
      if (hopHold > 0) { hopHold -= DT; inp = { ...inp, jumpHeld: true }; }
    }
    const before = s.found.size;
    s = stepStage(s, inp, DT).session;
    if (pending && s.found.size > before) {
      afterSpot.push(Math.round(s.expect.value * 100) / 100);
      pending = false; ri++;
    }
    if (s.phase === 'passing' && passedAt === null) passedAt = s.time;
    if (s.phase === 'failing' && failedAt === null) failedAt = s.time;
  }
  return { passedAt, failedAt, afterSpot, playTime: s.expect.time, session: s };
}

const RIGHT_FIRST = [30, 40, 52, 20, 8, 2];

/** 用机器人把整关打一遍，守住 spec §4.2 的目标：正常玩家 2~3 分钟、6 个调查点缺一不可。 */
describe('剧场关难度（机器人模拟）', () => {
  it('好玩家：6 个点走完再来回走、每 1.2 秒蹦一下，约 1.5~3 分钟过关；6 个点走完时还差一截', () => {
    const r = run('good', RIGHT_FIRST);
    expect(r.afterSpot).toHaveLength(6);
    expect(r.afterSpot[5]).toBeLessThan(EXPECT.pass);
    expect(r.passedAt).not.toBeNull();
    expect(r.passedAt!).toBeGreaterThan(90);
    expect(r.passedAt!).toBeLessThan(180);
  });

  it('少看两个点的好玩家要磨很久（> 4 分钟）才过得了关', () => {
    const r = run('good', [30, 40, 52, 20], 1.2, 900);
    expect(r.passedAt === null || r.passedAt > 240).toBe(true);
  });

  it('只查完 6 个点然后站着不动：到不了 70%，最后失败', () => {
    const r = run('spotsThenStill', RIGHT_FIRST);
    expect(r.afterSpot).toHaveLength(6);
    expect(r.afterSpot[5]).toBeLessThan(EXPECT.pass);
    expect(r.passedAt).toBeNull();
    expect(r.failedAt).not.toBeNull();
  });

  it('开局就发呆：半分钟内失败', () => {
    const r = run('idle', []);
    expect(r.passedAt).toBeNull();
    expect(r.failedAt).not.toBeNull();
    expect(r.failedAt!).toBeLessThan(30);
  });
});
