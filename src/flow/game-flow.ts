import type { SavedLevel } from '../save/progress';

export type Mode = 'title' | 'opening' | 'stage' | 'home' | 'end';

export interface FlowState {
  mode: Mode;
  saved: SavedLevel | null;
}

export type FlowEvent =
  | { type: 'start' }
  | { type: 'continue' }
  | { type: 'restart' }
  | { type: 'levelComplete' }
  | { type: 'levelFailed' }
  | { type: 'endFinished' }
  | { type: 'quitToTitle' };

export type SaveOp = { kind: 'none' } | { kind: 'write'; level: SavedLevel } | { kind: 'clear' };

export interface FlowResult {
  state: FlowState;
  save: SaveOp;
  /** 为真时需要（重新）进入 state.mode：建新会话、换界面 */
  enter: boolean;
}

export type TitleMenu = 'fresh' | 'resume' | 'cleared';

export function createFlow(saved: SavedLevel | null): FlowState {
  return { mode: 'title', saved };
}

export function titleMenu(saved: SavedLevel | null): TitleMenu {
  if (saved === null) return 'fresh';
  if (saved === 'done') return 'cleared';
  return 'resume';
}

const NONE: SaveOp = { kind: 'none' };

export function dispatch(s: FlowState, e: FlowEvent): FlowResult {
  const go = (mode: Mode, save: SaveOp = NONE, saved: SavedLevel | null = s.saved): FlowResult => ({
    state: { mode, saved },
    save,
    enter: true,
  });
  const stay: FlowResult = { state: s, save: NONE, enter: false };

  switch (s.mode) {
    case 'title':
      if (e.type === 'start') return s.saved === null ? go('opening') : stay;
      if (e.type === 'continue' && (s.saved === 'opening' || s.saved === 'stage' || s.saved === 'home')) return go(s.saved);
      if (e.type === 'restart') return go('opening', { kind: 'clear' }, null);
      return stay;
    case 'opening':
      if (e.type === 'levelComplete') return go('stage', { kind: 'write', level: 'stage' }, 'stage');
      break;
    case 'stage':
      if (e.type === 'levelComplete') return go('home', { kind: 'write', level: 'home' }, 'home');
      if (e.type === 'levelFailed') return go('stage');
      break;
    case 'home':
      if (e.type === 'levelComplete') return go('end', { kind: 'write', level: 'done' }, 'done');
      break;
    case 'end':
      if (e.type === 'endFinished') return go('title');
      break;
  }
  if (e.type === 'quitToTitle') return go('title');
  return stay;
}
