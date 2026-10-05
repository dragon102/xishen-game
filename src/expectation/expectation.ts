/** spec §4.2 的期待值规则。所有数字都是初值，调手感只改这里。 */
export const EXPECT = {
  start: 29,
  walkPerSec: 0.25,
  jumpBase: 1.5,
  jumpWindow: 4,
  jumpMin: 0.1,
  hotspot: 5,
  idleGrace: 1.5,
  boredomPerSec: 0.21,
  idleBase: 1,
  idleAccel: 0.5,
  idleMax: 4,
  danger: 20,
  failAfter: 5,
  pass: 70,
} as const;

export type ExpectStatus = 'ok' | 'danger' | 'failed' | 'passed';

export interface ExpectState {
  value: number;
  time: number;
  idleTime: number;
  recentJumps: readonly number[];
  dangerTime: number;
  status: ExpectStatus;
}

export interface ExpectEvents {
  moving: boolean;
  jumped: boolean;
  onGround: boolean;
  newHotspots: number;
}

export interface ExpectTick {
  state: ExpectState;
  /** 本步的每一笔加分（跳跃、调查点），用来飘「+N%」。走动的细水长流不飘字。 */
  gains: number[];
}

export function createExpectation(): ExpectState {
  return { value: EXPECT.start, time: 0, idleTime: 0, recentJumps: [], dangerTime: 0, status: 'ok' };
}

export function idleRate(idleTime: number): number {
  if (idleTime <= EXPECT.idleGrace) return 0;
  return Math.min(EXPECT.idleMax, EXPECT.idleBase + EXPECT.idleAccel * Math.floor(idleTime - EXPECT.idleGrace));
}

export function jumpGain(recentCount: number): number {
  return Math.max(EXPECT.jumpMin, EXPECT.jumpBase * 0.5 ** recentCount);
}

export function formatGain(g: number): string {
  return Number.isInteger(g) ? String(g) : g.toFixed(1);
}

export function tickExpectation(s: ExpectState, ev: ExpectEvents, dt: number): ExpectTick {
  if (s.status === 'failed' || s.status === 'passed') return { state: s, gains: [] };

  const time = s.time + dt;
  let value = s.value;
  const gains: number[] = [];

  if (ev.moving) value += EXPECT.walkPerSec * dt;
  // 观众会慢慢看腻：不管动不动都在掉（读想法时不 tick，所以暂停）。
  value -= EXPECT.boredomPerSec * dt;

  let recentJumps = s.recentJumps.filter((t) => t > time - EXPECT.jumpWindow);
  if (ev.jumped) {
    const g = jumpGain(recentJumps.length);
    value += g;
    gains.push(g);
    recentJumps = [...recentJumps, time];
  }

  for (let i = 0; i < ev.newHotspots; i++) {
    value += EXPECT.hotspot;
    gains.push(EXPECT.hotspot);
  }

  const idle = !ev.moving && !ev.jumped && ev.onGround;
  const idleTime = idle ? s.idleTime + dt : 0;
  value -= idleRate(idleTime) * dt;

  value = Math.min(100, Math.max(0, value));

  let dangerTime = 0;
  let status: ExpectStatus = 'ok';
  if (value >= EXPECT.pass) {
    status = 'passed';
  } else if (value < EXPECT.danger) {
    dangerTime = s.dangerTime + dt;
    status = dangerTime >= EXPECT.failAfter ? 'failed' : 'danger';
  }

  return { state: { value, time, idleTime, recentJumps, dangerTime, status }, gains };
}
