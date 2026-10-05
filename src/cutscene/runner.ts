import { advanceDialogue, openLine, tickDialogue, type DialogueState, type Line } from '../dialogue/dialogue';
import type { SoundId } from '../audio/sound-ids';

export type SceneId = 'black' | 'street' | 'home';
export type ActorId = 'chenling' | 'lixiuchun' | 'chentan';
export type Pose = 'stand' | 'drink' | 'scared';

/** follow 时镜头左缘 = 角色 x − 这个值（让角色在画面偏左的位置往右走）。 */
export const FOLLOW_OFFSET = 200;

export interface ActorView {
  x: number;
  facing: 1 | -1;
  visible: boolean;
  pose: Pose;
  walking: boolean;
  stagger: boolean;
}

export interface CutsceneWorld {
  scene: SceneId;
  cameraX: number;
  follow: ActorId | null;
  fade: number;
  shakeTime: number;
  shakeStrength: number;
  rain: boolean;
  actors: Record<ActorId, ActorView>;
  props: Record<string, string>;
  dialogue: DialogueState | null;
}

export type Step =
  | { kind: 'fade'; to: number; duration: number }
  | { kind: 'cut'; scene: SceneId; cameraX: number }
  | { kind: 'pan'; toX: number; duration: number }
  | { kind: 'follow'; actor: ActorId | null }
  | { kind: 'place'; actor: ActorId; x: number; facing: 1 | -1; visible: boolean }
  | { kind: 'walk'; actor: ActorId; toX: number; speed: number; stagger?: boolean }
  | { kind: 'pose'; actor: ActorId; pose: Pose }
  | { kind: 'prop'; prop: string; state: string }
  | { kind: 'say'; line: Line }
  | { kind: 'wait'; duration: number }
  | { kind: 'shake'; duration: number; strength: number }
  | { kind: 'sfx'; sound: SoundId }
  | { kind: 'rain'; on: boolean };

export interface Runner {
  steps: readonly Step[];
  index: number;
  t: number;
  from: number;
  world: CutsceneWorld;
  finished: boolean;
}

export interface RunnerTick {
  runner: Runner;
  sounds: SoundId[];
}

export function createWorld(): CutsceneWorld {
  const actor = (): ActorView => ({ x: 0, facing: 1, visible: false, pose: 'stand', walking: false, stagger: false });
  return {
    scene: 'black',
    cameraX: 0,
    follow: null,
    fade: 1,
    shakeTime: 0,
    shakeStrength: 0,
    rain: false,
    actors: { chenling: actor(), lixiuchun: actor(), chentan: actor() },
    props: {},
    dialogue: null,
  };
}

export function createRunner(steps: readonly Step[], world: CutsceneWorld = createWorld()): Runner {
  return { steps, index: 0, t: 0, from: NaN, world, finished: steps.length === 0 };
}

function withActor(w: CutsceneWorld, id: ActorId, patch: Partial<ActorView>): CutsceneWorld {
  return { ...w, actors: { ...w.actors, [id]: { ...w.actors[id], ...patch } } };
}

function applyFollow(w: CutsceneWorld): CutsceneWorld {
  return w.follow ? { ...w, cameraX: w.actors[w.follow].x - FOLLOW_OFFSET } : w;
}

/** 某一步演完之后世界的样子。正常演完与跳过共用这一个函数，保证两条路终态一致。 */
export function applyFinal(w: CutsceneWorld, s: Step): CutsceneWorld {
  switch (s.kind) {
    case 'fade':
      return { ...w, fade: s.to };
    case 'cut':
      return { ...w, scene: s.scene, cameraX: s.cameraX };
    case 'pan':
      return { ...w, cameraX: s.toX };
    case 'follow':
      return applyFollow({ ...w, follow: s.actor });
    case 'place':
      return applyFollow(withActor(w, s.actor, { x: s.x, facing: s.facing, visible: s.visible, walking: false, stagger: false }));
    case 'walk':
      return applyFollow(withActor(w, s.actor, { x: s.toX, walking: false, stagger: false }));
    case 'pose':
      return withActor(w, s.actor, { pose: s.pose });
    case 'prop':
      return { ...w, props: { ...w.props, [s.prop]: s.state } };
    case 'rain':
      return { ...w, rain: s.on };
    case 'say':
      return { ...w, dialogue: null };
    case 'wait':
    case 'shake':
    case 'sfx':
      return w;
  }
}

export function tickRunner(r: Runner, dt: number, advancePressed: boolean): RunnerTick {
  if (r.finished) return { runner: r, sounds: [] };
  const sounds: SoundId[] = [];
  let world: CutsceneWorld = { ...r.world, shakeTime: Math.max(0, r.world.shakeTime - dt) };
  let { index, t, from } = r;

  while (index < r.steps.length) {
    const s = r.steps[index];
    if (s.kind === 'sfx') {
      sounds.push(s.sound);
      index++;
      continue;
    }
    if (s.kind === 'shake') {
      world = { ...world, shakeTime: s.duration, shakeStrength: s.strength };
      index++;
      continue;
    }
    if (s.kind === 'cut' || s.kind === 'place' || s.kind === 'pose' || s.kind === 'prop' || s.kind === 'rain' || s.kind === 'follow') {
      world = applyFinal(world, s);
      index++;
      continue;
    }
    // 下面是有时长的步骤：一个 tick 只推进当前这一个
    if (s.kind === 'say') {
      // 「看没看完」要在这一步计时之前判断：玩家点下去的那一刻没看完，就只补全、不翻页。
      // 对话还没打开时先打开（此时一定没看完），所以打开那一帧的点击也只补全。
      const cur = world.dialogue ?? openLine(s.line);
      if (advancePressed) {
        const res = advanceDialogue(cur);
        if (res.finished) {
          world = applyFinal(world, s);
          index++;
          t = 0;
          from = NaN;
          break;
        }
        world = { ...world, dialogue: res.state };
        break;
      }
      world = { ...world, dialogue: tickDialogue(cur, dt) };
      break;
    }
    if (s.kind === 'walk') {
      const a = world.actors[s.actor];
      const dir = Math.sign(s.toX - a.x);
      const nx = a.x + dir * s.speed * dt;
      const arrived = dir === 0 || s.speed <= 0 || (dir > 0 ? nx >= s.toX : nx <= s.toX);
      if (arrived) {
        world = applyFinal(world, s);
        index++;
        t = 0;
        from = NaN;
      } else {
        world = applyFollow(withActor(world, s.actor, { x: nx, facing: dir > 0 ? 1 : -1, walking: true, stagger: !!s.stagger }));
      }
      break;
    }
    // fade / pan / wait
    if (Number.isNaN(from)) from = s.kind === 'fade' ? world.fade : s.kind === 'pan' ? world.cameraX : 0;
    t += dt;
    const p = s.duration <= 0 ? 1 : Math.min(1, t / s.duration);
    if (s.kind === 'fade') world = { ...world, fade: from + (s.to - from) * p };
    if (s.kind === 'pan') world = { ...world, cameraX: from + (s.toX - from) * p };
    if (p >= 1) {
      world = applyFinal(world, s);
      index++;
      t = 0;
      from = NaN;
    }
    break;
  }

  return { runner: { ...r, index, t, from, world, finished: index >= r.steps.length }, sounds };
}

export function skipRunner(r: Runner): Runner {
  let world = r.world;
  for (let i = r.index; i < r.steps.length; i++) world = applyFinal(world, r.steps[i]);
  return { ...r, index: r.steps.length, t: 0, from: NaN, world: { ...world, dialogue: null, shakeTime: 0 }, finished: true };
}
