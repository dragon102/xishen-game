import { describe, it, expect } from 'vitest';
import { ACTOR_H, ACTOR_W, LAND_TIME, createActor, footX, stepActor } from '../../src/actor/controller';
import type { IsSolid } from '../../src/physics/platformer';

const DT = 1 / 60;
// 地面顶 y = 224（第 14 行起实心），x=0 与 x=40 两列是墙
const solid: IsSolid = (tx, ty) => ty >= 14 || tx <= 0 || tx >= 40;

describe('controller', () => {
  it('createActor 以脚底中点定位，开局站在地上', () => {
    const a = createActor(100, 224);
    expect(a.body.x).toBe(100 - ACTOR_W / 2);
    expect(a.body.y).toBe(224 - ACTOR_H);
    expect(a.body.onGround).toBe(true);
    expect(footX(a)).toBe(100);
    expect(a.anim).toBe('idle');
  });

  it('走动：朝向跟着方向，动画为 walk，moving 为真', () => {
    let a = createActor(100, 224);
    const r = stepActor(a, { dir: -1, jumpPressed: false, jumpHeld: false }, DT, solid);
    a = r.actor;
    expect(a.facing).toBe(-1);
    expect(a.anim).toBe('walk');
    expect(r.moving).toBe(true);
    const r2 = stepActor(a, { dir: 0, jumpPressed: false, jumpHeld: false }, DT, solid);
    expect(r2.actor.facing).toBe(-1);
    expect(r2.actor.anim).toBe('idle');
  });

  it('贴着墙往墙里走：moving 为假', () => {
    let a = createActor(24, 224);
    for (let i = 0; i < 30; i++) a = stepActor(a, { dir: -1, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    const r = stepActor(a, { dir: -1, jumpPressed: false, jumpHeld: false }, DT, solid);
    expect(r.moving).toBe(false);
  });

  it('起跳 → jump，下落 → fall，落地 → land，之后回到 idle', () => {
    let a = createActor(100, 224);
    let r = stepActor(a, { dir: 0, jumpPressed: true, jumpHeld: true }, DT, solid);
    expect(r.jumped).toBe(true);
    expect(r.actor.anim).toBe('jump');
    a = r.actor;
    let sawFall = false;
    let landedAt = -1;
    for (let i = 0; i < 120; i++) {
      r = stepActor(a, { dir: 0, jumpPressed: false, jumpHeld: true }, DT, solid);
      a = r.actor;
      if (a.anim === 'fall') sawFall = true;
      if (r.landed) {
        landedAt = i;
        expect(a.anim).toBe('land');
        expect(a.landTimer).toBe(LAND_TIME);
        break;
      }
    }
    expect(sawFall).toBe(true);
    expect(landedAt).toBeGreaterThan(0);
    for (let i = 0; i < 10; i++) a = stepActor(a, { dir: 0, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    expect(a.anim).toBe('idle');
  });

  it('同一个动画持续时 animTime 累加，切换时归零', () => {
    let a = createActor(100, 224);
    a = stepActor(a, { dir: 1, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    a = stepActor(a, { dir: 1, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    expect(a.animTime).toBeCloseTo(DT, 6);
    a = stepActor(a, { dir: 0, jumpPressed: false, jumpHeld: false }, DT, solid).actor;
    expect(a.animTime).toBe(0);
  });
});
