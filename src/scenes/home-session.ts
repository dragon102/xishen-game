import { createActor, footX, stepActor, type Actor } from '../actor/controller';
import { startTalk, stepTalk, think, type Talk } from '../dialogue/dialogue';
import { crossedTriggers, findNearby } from '../level/interactables';
import { isSolidIn, spawnFoot, type InteractableDef } from '../level/level';
import { HOME } from '../level/home';
import type { FrameInput } from '../input/frame-input';
import type { SoundId } from '../audio/sound-ids';

export const WAKE_DELAY = 1.0;
export const EYES_TIME = 0.5;
export const FLICKER_TIME = 0.6;
export const FINALE_FADE_AT = 1.5;
export const FINALE_DONE_AT = 3.0;
/** 说完一段想法后，这么久之内不能再开新的（防连按互动把同一段想法循环）。 */
export const INTERACT_COOLDOWN = 0.35;

export type HomePhase = 'wake' | 'play' | 'finale' | 'done';

export interface HomeSession {
  phase: HomePhase;
  phaseTime: number;
  time: number;
  actor: Actor;
  sitting: boolean;
  talk: Talk;
  nearby: InteractableDef | null;
  fired: ReadonlySet<string>;
  eyes: number;
  flicker: number;
  finalePending: boolean;
  interactCooldown: number;
  outcome: 'none' | 'complete';
}

export interface HomeOutput {
  session: HomeSession;
  sounds: SoundId[];
}

const solid = isSolidIn(HOME);

export function createHomeSession(): HomeSession {
  const f = spawnFoot(HOME);
  return {
    phase: 'wake',
    phaseTime: 0,
    time: 0,
    actor: createActor(f.x, f.y),
    sitting: true,
    talk: startTalk([]),
    nearby: null,
    fired: new Set(),
    eyes: 0,
    flicker: 0,
    finalePending: false,
    interactCooldown: 0,
    outcome: 'none',
  };
}

export function stepHome(s0: HomeSession, input: FrameInput, dt: number): HomeOutput {
  const sounds: SoundId[] = [];
  const s: HomeSession = {
    ...s0,
    time: s0.time + dt,
    eyes: Math.max(0, s0.eyes - dt),
    flicker: Math.max(0, s0.flicker - dt),
    interactCooldown: Math.max(0, s0.interactCooldown - dt),
  };
  const advance = input.advancePressed || input.interactPressed;

  switch (s.phase) {
    case 'done':
      return { session: s0, sounds };

    case 'wake': {
      const phaseTime = s.phaseTime + dt;
      if (s.talk.current) {
        const talk = stepTalk(s.talk, dt, advance);
        if (!talk.current) return { session: { ...s, phaseTime, talk, phase: 'play', sitting: false }, sounds };
        return { session: { ...s, phaseTime, talk }, sounds };
      }
      if (s.phaseTime < WAKE_DELAY && phaseTime >= WAKE_DELAY) {
        return { session: { ...s, phaseTime, talk: startTalk([think('……是梦？')]) }, sounds };
      }
      return { session: { ...s, phaseTime }, sounds };
    }

    case 'finale': {
      const phaseTime = s.phaseTime + dt;
      if (phaseTime >= FINALE_DONE_AT) return { session: { ...s, phaseTime, phase: 'done', outcome: 'complete' }, sounds };
      return { session: { ...s, phaseTime }, sounds };
    }

    case 'play': {
      if (s.talk.current) {
        const talk = stepTalk(s.talk, dt, advance);
        if (!talk.current && s.finalePending) {
          sounds.push('rumble');
          return { session: { ...s, talk, phase: 'finale', phaseTime: 0, finalePending: false }, sounds };
        }
        const interactCooldown = talk.current ? s.interactCooldown : INTERACT_COOLDOWN;
        return { session: { ...s, talk, interactCooldown }, sounds };
      }

      const prevX = footX(s.actor);
      const r = stepActor(s.actor, { dir: input.dir, jumpPressed: input.jumpPressed, jumpHeld: input.jumpHeld }, dt, solid);
      let { fired, eyes, flicker } = s;
      const hits = crossedTriggers(HOME.triggers, fired, prevX, footX(r.actor));
      if (hits.length > 0) {
        const next = new Set(fired);
        for (const h of hits) {
          next.add(h.id);
          if (h.effect === 'eyesWall') {
            eyes = EYES_TIME;
            sounds.push('rumble');
          } else {
            flicker = FLICKER_TIME;
            sounds.push('blip');
          }
        }
        fired = next;
      }

      const nearby = findNearby(HOME, r.actor.body);
      let talk = s.talk;
      let finalePending = s.finalePending;
      if (input.interactPressed && nearby && s0.interactCooldown <= 0) {
        talk = startTalk(nearby.lines.map((text) => think(text)));
        if (nearby.finale) finalePending = true;
        sounds.push('blip');
      }

      return { session: { ...s, actor: r.actor, fired, eyes, flicker, nearby, talk, finalePending }, sounds };
    }
  }
}
