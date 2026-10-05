import { describe, it, expect } from 'vitest';
import { PHYS, TILE, createBody, step, type Body, type IsSolid, type MoveInput } from '../../src/physics/platformer';

/** '#' 是实心；地图外一律空。 */
const mapOf = (rows: string[]): IsSolid => (tx, ty) =>
  ty >= 0 && ty < rows.length && tx >= 0 && tx < rows[ty].length && rows[ty][tx] === '#';

const DT = 1 / 60;
const idle: MoveInput = { dir: 0, jumpPressed: false, jumpHeld: false };
const run = (b: Body, input: MoveInput, steps: number, solid: IsSolid): Body => {
  let cur = b;
  for (let i = 0; i < steps; i++) cur = step(cur, input, DT, solid).body;
  return cur;
};

// 10 宽、6 高，第 5 行是地面（地面顶 y = 80）
const FLOOR = mapOf(['..........', '..........', '..........', '..........', '..........', '##########']);

describe('platformer.step', () => {
  it('从空中落下，站在地面上', () => {
    const b = run(createBody(40, 0, 12, 38), idle, 120, FLOOR);
    expect(b.y).toBe(80 - 38);
    expect(b.onGround).toBe(true);
    expect(b.vy).toBe(0);
  });

  it('landed 只在第一次接触地面的那一步为真', () => {
    let b: Body = { ...createBody(40, 80 - 38 - 1, 12, 38), vy: 60 };
    const first = step(b, idle, DT, FLOOR);
    expect(first.landed).toBe(true);
    b = first.body;
    expect(step(b, idle, DT, FLOOR).landed).toBe(false);
  });

  it('往右走撞墙停在墙边', () => {
    const wall = mapOf(['......#...', '......#...', '......#...', '......#...', '......#...', '##########']);
    const start = run(createBody(40, 0, 12, 38), idle, 60, wall);
    const b = run(start, { dir: 1, jumpPressed: false, jumpHeld: false }, 120, wall);
    expect(b.x).toBe(6 * TILE - 12);
    expect(b.vx).toBe(0);
  });

  it('站在地上按跳会起跳，最高约 3 格（≈50 像素）', () => {
    const start = run(createBody(40, 0, 12, 38), idle, 60, FLOOR);
    const r = step(start, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR);
    expect(r.jumped).toBe(true);
    expect(r.body.vy).toBeLessThan(0);
    let b = r.body;
    let top = b.y;
    for (let i = 0; i < 60; i++) {
      b = step(b, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, FLOOR).body;
      top = Math.min(top, b.y);
    }
    const height = start.y - top;
    expect(height).toBeGreaterThan(45);
    expect(height).toBeLessThan(53);
  });

  it('松开跳键会截断上升（小跳）', () => {
    const start = run(createBody(40, 0, 12, 38), idle, 60, FLOOR);
    let b = step(start, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR).body;
    let top = b.y;
    for (let i = 0; i < 60; i++) {
      b = step(b, idle, DT, FLOOR).body;
      top = Math.min(top, b.y);
    }
    expect(start.y - top).toBeLessThan(20);
  });

  it('头顶撞到砖块会停住上升', () => {
    // 第 1 行（y 16~32）有砖；角色站在地上时头顶 y = 42，起跳本可升到 y ≈ -5
    const ceil = mapOf(['..........', '###.......', '..........', '..........', '..........', '##########']);
    const start = run(createBody(8, 42, 12, 38), idle, 30, ceil);
    expect(start.y).toBe(42);
    let b = step(start, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, ceil).body;
    for (let i = 0; i < 10; i++) b = step(b, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, ceil).body;
    expect(b.y).toBeGreaterThanOrEqual(2 * TILE);
    expect(b.y).toBeLessThan(42);
  });

  it('土狼时间：刚离开地面 0.05 秒内还能跳', () => {
    const air: Body = { ...createBody(40, 10, 12, 38), onGround: false, coyote: 0.05 };
    expect(step(air, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR).jumped).toBe(true);
    const late: Body = { ...air, coyote: 0 };
    expect(step(late, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR).jumped).toBe(false);
  });

  it('跳跃缓冲：落地前一小会儿按跳，落地后自动起跳', () => {
    let b: Body = { ...createBody(40, 80 - 38 - 2, 12, 38), vy: 60, onGround: false };
    const s1 = step(b, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, FLOOR);
    expect(s1.jumped).toBe(false);
    b = s1.body;
    const s2 = step(b, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, FLOOR);
    expect(s2.landed).toBe(true);
    const s3 = step(s2.body, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, FLOOR);
    expect(s3.jumped).toBe(true);
  });

  it('跳跃缓冲会过期：提前 0.2 秒按跳，落地后不跳', () => {
    let b: Body = { ...createBody(40, 0, 12, 38), onGround: false };
    b = step(b, { dir: 0, jumpPressed: true, jumpHeld: false }, DT, FLOOR).body;
    let jumped = false;
    for (let i = 0; i < 120; i++) {
      const r = step(b, idle, DT, FLOOR);
      jumped = jumped || r.jumped;
      b = r.body;
    }
    expect(jumped).toBe(false);
  });

  it('下落速度有上限', () => {
    const b = run(createBody(0, 0, 12, 38), idle, 300, () => false);
    expect(b.vy).toBe(PHYS.maxFall);
  });

  it('一次给很大的 dt 也只按 1/30 秒推进', () => {
    const b = step(createBody(0, 0, 12, 38), { dir: 1, jumpPressed: false, jumpHeld: false }, 1, () => false).body;
    expect(b.x).toBeCloseTo(PHYS.walkSpeed * PHYS.maxDt, 5);
  });
});
