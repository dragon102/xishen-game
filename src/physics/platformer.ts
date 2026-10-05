export const TILE = 16;

/** 手感参数（spec §3.3）。起跳高度 ≈ jumpSpeed² / (2·gravity) = 50 像素 ≈ 3 格。 */
export const PHYS = {
  walkSpeed: 90,
  gravity: 900,
  jumpSpeed: 300,
  maxFall: 400,
  coyoteTime: 0.08,
  jumpBufferTime: 0.1,
  jumpCutSpeed: 150,
  maxDt: 1 / 30,
} as const;

export type IsSolid = (tx: number, ty: number) => boolean;

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  coyote: number;
  jumpBuffer: number;
}

export interface MoveInput {
  dir: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
}

export interface StepResult {
  body: Body;
  jumped: boolean;
  landed: boolean;
}

export function createBody(x: number, y: number, w: number, h: number): Body {
  return { x, y, w, h, vx: 0, vy: 0, onGround: false, coyote: 0, jumpBuffer: 0 };
}

export function overlapsSolid(x: number, y: number, w: number, h: number, isSolid: IsSolid): boolean {
  const x0 = Math.floor(x / TILE);
  const x1 = Math.floor((x + w - 0.001) / TILE);
  const y0 = Math.floor(y / TILE);
  const y1 = Math.floor((y + h - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(tx, ty)) return true;
    }
  }
  return false;
}

/** 唯一碰撞权威：先水平后竖直，逐轴推出实心瓦片。每步最大位移 400/30 ≈ 13 像素 < 1 格，不会穿墙。 */
export function step(prev: Body, input: MoveInput, rawDt: number, isSolid: IsSolid): StepResult {
  const dt = Math.min(rawDt, PHYS.maxDt);
  const b: Body = { ...prev };

  b.vx = input.dir * PHYS.walkSpeed;
  b.coyote = prev.onGround ? PHYS.coyoteTime : Math.max(0, prev.coyote - dt);
  b.jumpBuffer = input.jumpPressed ? PHYS.jumpBufferTime : Math.max(0, prev.jumpBuffer - dt);

  let jumped = false;
  if (b.jumpBuffer > 0 && b.coyote > 0) {
    b.vy = -PHYS.jumpSpeed;
    b.jumpBuffer = 0;
    b.coyote = 0;
    jumped = true;
  }
  if (!input.jumpHeld && b.vy < -PHYS.jumpCutSpeed) b.vy = -PHYS.jumpCutSpeed;

  b.vy = Math.min(b.vy + PHYS.gravity * dt, PHYS.maxFall);

  let nx = b.x + b.vx * dt;
  if (b.vx !== 0 && overlapsSolid(nx, b.y, b.w, b.h, isSolid)) {
    nx = b.vx > 0 ? Math.floor((nx + b.w) / TILE) * TILE - b.w : (Math.floor(nx / TILE) + 1) * TILE;
    b.vx = 0;
  }
  b.x = nx;

  let ny = b.y + b.vy * dt;
  let onGround = false;
  if (overlapsSolid(b.x, ny, b.w, b.h, isSolid)) {
    if (b.vy > 0) {
      ny = Math.floor((ny + b.h) / TILE) * TILE - b.h;
      onGround = true;
    } else {
      ny = (Math.floor(ny / TILE) + 1) * TILE;
    }
    b.vy = 0;
  }
  b.y = ny;
  b.onGround = onGround;

  return { body: b, jumped, landed: onGround && !prev.onGround };
}
