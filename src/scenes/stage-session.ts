import { createActor, stepActor, type Actor } from '../actor/controller';
import { createExpectation, formatGain, tickExpectation, type ExpectState } from '../expectation/expectation';
import { startTalk, stepTalk, think, type Line, type Talk } from '../dialogue/dialogue';
import { findNearby, markFound } from '../level/interactables';
import { isSolidIn, spawnFoot, type InteractableDef } from '../level/level';
import { STAGE } from '../level/stage';
import type { FrameInput } from '../input/frame-input';
import type { SoundId } from '../audio/sound-ids';

export const FOOTSTEP_INTERVAL = 0.32;
export const PASS_SHATTER_AT = 0.8;
export const PASS_DONE_AT = 2.2;
export const FAIL_DONE_AT = 2.0;
/** 说完一段想法后，这么久之内不能再开新的（防连按互动把同一段想法循环）。 */
export const INTERACT_COOLDOWN = 0.35;

export const STAGE_INTRO: readonly Line[] = [think('这是……哪里？'), think('得找到出口。')];

export type StagePhase = 'intro' | 'play' | 'passing' | 'failing' | 'done';

export interface Popup {
  worldX: number;
  worldY: number;
  text: string;
}

export interface StageSession {
  phase: StagePhase;
  phaseTime: number;
  time: number;
  actor: Actor;
  expect: ExpectState;
  found: ReadonlySet<string>;
  talk: Talk;
  nearby: InteractableDef | null;
  footstep: number;
  interactCooldown: number;
  outcome: 'none' | 'passed' | 'failed';
}

export interface StageOutput {
  session: StageSession;
  sounds: SoundId[];
  popups: Popup[];
  heartbeat: boolean;
}

const solid = isSolidIn(STAGE);

export function createStageSession(): StageSession {
  const f = spawnFoot(STAGE);
  return {
    phase: 'intro',
    phaseTime: 0,
    time: 0,
    actor: createActor(f.x, f.y),
    expect: createExpectation(),
    found: new Set(),
    talk: startTalk(STAGE_INTRO),
    nearby: null,
    footstep: 0,
    interactCooldown: 0,
    outcome: 'none',
  };
}

export function stepStage(s: StageSession, input: FrameInput, dt: number): StageOutput {
  const sounds: SoundId[] = [];
  const popups: Popup[] = [];
  if (s.phase === 'done') return { session: s, sounds, popups, heartbeat: false };
  const time = s.time + dt;
  const cooldown = Math.max(0, s.interactCooldown - dt);

  if (s.phase === 'passing' || s.phase === 'failing') {
    const phaseTime = s.phaseTime + dt;
    if (s.phase === 'passing' && s.phaseTime < PASS_SHATTER_AT && phaseTime >= PASS_SHATTER_AT) sounds.push('shatter');
    const doneAt = s.phase === 'passing' ? PASS_DONE_AT : FAIL_DONE_AT;
    if (phaseTime >= doneAt) {
      const outcome = s.phase === 'passing' ? 'passed' : 'failed';
      return { session: { ...s, time, phaseTime, phase: 'done', outcome }, sounds, popups, heartbeat: false };
    }
    return { session: { ...s, time, phaseTime }, sounds, popups, heartbeat: false };
  }

  if (s.talk.current) {
    const talk = stepTalk(s.talk, dt, input.advancePressed || input.interactPressed);
    const phase: StagePhase = s.phase === 'intro' && !talk.current ? 'play' : s.phase;
    const interactCooldown = talk.current ? cooldown : INTERACT_COOLDOWN;
    return { session: { ...s, time, talk, phase, interactCooldown }, sounds, popups, heartbeat: s.expect.status === 'danger' };
  }

  const r = stepActor(s.actor, { dir: input.dir, jumpPressed: input.jumpPressed, jumpHeld: input.jumpHeld }, dt, solid);

  let footstep = s.footstep;
  if (r.moving && r.actor.body.onGround) {
    footstep += dt;
    if (footstep >= FOOTSTEP_INTERVAL) {
      sounds.push('creak');
      footstep -= FOOTSTEP_INTERVAL;
    }
  } else {
    footstep = 0;
  }

  const nearby = findNearby(STAGE, r.actor.body);
  let found = s.found;
  let talk = s.talk;
  let newHotspots = 0;
  if (input.interactPressed && nearby && s.interactCooldown <= 0) {
    const m = markFound(found, nearby.id);
    found = m.found;
    if (m.firstTime && nearby.scoring) newHotspots = 1;
    talk = startTalk(nearby.lines.map((text) => think(text)));
    sounds.push('blip');
  }

  const t = tickExpectation(s.expect, { moving: r.moving, jumped: r.jumped, onGround: r.actor.body.onGround, newHotspots }, dt);
  const headX = r.actor.body.x + r.actor.body.w / 2;
  const headY = r.actor.body.y - 4;
  for (const g of t.gains) {
    popups.push({ worldX: headX, worldY: headY, text: `+${formatGain(g)}%` });
    sounds.push('pop');
  }

  let phase: StagePhase = 'play';
  if (t.state.status === 'passed') {
    phase = 'passing';
    talk = startTalk([]);
    sounds.push('bell');
  } else if (t.state.status === 'failed') {
    phase = 'failing';
    talk = startTalk([]);
    sounds.push('rumble');
  }

  return {
    session: { ...s, time, phase, phaseTime: 0, actor: r.actor, expect: t.state, found, talk, nearby, footstep, interactCooldown: cooldown },
    sounds,
    popups,
    heartbeat: t.state.status === 'danger',
  };
}
