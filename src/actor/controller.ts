import { createBody, step, type Body, type IsSolid, type MoveInput } from '../physics/platformer';

/**
 * 会走会跳的角色。只认识「输入 + 物理」，不知道关卡、剧情、期待值的存在——
 * 以后联机对战直接复用这一层（spec §1 联机准备）。
 */
export const ACTOR_W = 12;
export const ACTOR_H = 38;
export const LAND_TIME = 0.1;

export type Anim = 'idle' | 'walk' | 'jump' | 'fall' | 'land';

export interface Actor {
  body: Body;
  facing: 1 | -1;
  anim: Anim;
  animTime: number;
  landTimer: number;
}

export interface ActorStep {
  actor: Actor;
  jumped: boolean;
  landed: boolean;
  moving: boolean;
}

export function createActor(footXPos: number, footY: number): Actor {
  const body = { ...createBody(footXPos - ACTOR_W / 2, footY - ACTOR_H, ACTOR_W, ACTOR_H), onGround: true };
  return { body, facing: 1, anim: 'idle', animTime: 0, landTimer: 0 };
}

export function footX(a: Actor): number {
  return a.body.x + a.body.w / 2;
}

export function stepActor(a: Actor, input: MoveInput, dt: number, isSolid: IsSolid): ActorStep {
  const r = step(a.body, input, dt, isSolid);
  const facing: 1 | -1 = input.dir === 0 ? a.facing : input.dir;
  const landTimer = r.landed ? LAND_TIME : Math.max(0, a.landTimer - dt);
  const moving = Math.abs(r.body.x - a.body.x) > 0.01;
  const anim: Anim = !r.body.onGround
    ? r.body.vy < 0
      ? 'jump'
      : 'fall'
    : moving
      ? 'walk'
      : landTimer > 0
        ? 'land'
        : 'idle';
  const animTime = anim === a.anim ? a.animTime + dt : 0;
  return { actor: { body: r.body, facing, anim, animTime, landTimer }, jumped: r.jumped, landed: r.landed, moving };
}
