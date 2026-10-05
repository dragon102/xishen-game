export type Speaker = 'chenling' | 'lixiuchun' | 'chentan';

export const SPEAKER_NAMES: Readonly<Record<Speaker, string>> = {
  chenling: '陈伶',
  lixiuchun: '李秀春',
  chentan: '陈坛',
};

export interface Line {
  speaker: Speaker | null;
  text: string;
  style: 'say' | 'think';
}

export const CHARS_PER_SEC = 30;

export interface DialogueState {
  line: Line;
  shown: number;
}

export const say = (speaker: Speaker, text: string): Line => ({ speaker, text, style: 'say' });
export const think = (text: string): Line => ({ speaker: null, text, style: 'think' });

const totalChars = (line: Line): number => Array.from(line.text).length;

export function openLine(line: Line): DialogueState {
  return { line, shown: 0 };
}

export function isComplete(s: DialogueState): boolean {
  return s.shown >= totalChars(s.line);
}

export function tickDialogue(s: DialogueState, dt: number): DialogueState {
  return { ...s, shown: Math.min(totalChars(s.line), s.shown + CHARS_PER_SEC * dt) };
}

export function advanceDialogue(s: DialogueState): { state: DialogueState; finished: boolean } {
  if (!isComplete(s)) return { state: { ...s, shown: totalChars(s.line) }, finished: false };
  return { state: s, finished: true };
}

export function visibleText(s: DialogueState): string {
  return Array.from(s.line.text).slice(0, Math.floor(s.shown + 1e-9)).join('');
}

/** 一串要依次说完的台词（调查物件的想法、关卡开头的引导）。 */
export interface Talk {
  current: DialogueState | null;
  queue: readonly Line[];
}

export function startTalk(lines: readonly Line[]): Talk {
  if (lines.length === 0) return { current: null, queue: [] };
  return { current: openLine(lines[0]), queue: lines.slice(1) };
}

export function stepTalk(t: Talk, dt: number, advance: boolean): Talk {
  if (!t.current) return t;
  // 「看没看完」要在这一步计时之前判断：玩家点下去的那一刻没看完，就只补全、不翻页。
  if (advance) {
    const r = advanceDialogue(t.current);
    return r.finished ? startTalk(t.queue) : { current: r.state, queue: t.queue };
  }
  return { current: tickDialogue(t.current, dt), queue: t.queue };
}
