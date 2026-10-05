import { moveDir, type Actions } from './actions';

export interface FrameInput {
  dir: -1 | 0 | 1;
  jumpPressed: boolean;
  jumpHeld: boolean;
  interactPressed: boolean;
  advancePressed: boolean;
}

export function readInput(a: Actions): FrameInput {
  return {
    dir: moveDir(a),
    jumpPressed: a.justPressed('jump'),
    jumpHeld: a.isDown('jump'),
    interactPressed: a.justPressed('interact'),
    advancePressed: a.justPressed('advance'),
  };
}
