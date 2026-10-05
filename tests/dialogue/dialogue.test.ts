import { describe, it, expect } from 'vitest';
import {
  CHARS_PER_SEC,
  SPEAKER_NAMES,
  advanceDialogue,
  isComplete,
  openLine,
  say,
  startTalk,
  stepTalk,
  think,
  tickDialogue,
  visibleText,
} from '../../src/dialogue/dialogue';

describe('dialogue', () => {
  it('say / think 构造台词', () => {
    expect(say('chenling', '好渴')).toEqual({ speaker: 'chenling', text: '好渴', style: 'say' });
    expect(think('……是梦？')).toEqual({ speaker: null, text: '……是梦？', style: 'think' });
    expect(SPEAKER_NAMES.chentan).toBe('陈坛');
  });

  it('逐字显示：每秒 30 个字', () => {
    let d = openLine(say('lixiuchun', '阿伶……你、你是怎么回来的？'));
    expect(visibleText(d)).toBe('');
    d = tickDialogue(d, 2 / CHARS_PER_SEC);
    expect(visibleText(d)).toBe('阿伶');
    d = tickDialogue(d, 10);
    expect(visibleText(d)).toBe('阿伶……你、你是怎么回来的？');
    expect(isComplete(d)).toBe(true);
  });

  it('没显示完时点一下补全，显示完再点一下结束', () => {
    const d = openLine(say('chenling', '好渴……家里有水吗？'));
    const r1 = advanceDialogue(d);
    expect(r1.finished).toBe(false);
    expect(isComplete(r1.state)).toBe(true);
    const r2 = advanceDialogue(r1.state);
    expect(r2.finished).toBe(true);
  });

  it('对话队列：一句一句往下走，走完 current 为 null', () => {
    let t = startTalk([think('一'), think('二')]);
    expect(t.current?.line.text).toBe('一');
    t = stepTalk(t, 0, true);
    t = stepTalk(t, 0, true);
    expect(t.current?.line.text).toBe('二');
    t = stepTalk(t, 0, true);
    t = stepTalk(t, 0, true);
    expect(t.current).toBeNull();
  });

  it('不点就停在当前句', () => {
    let t = startTalk([think('一')]);
    t = stepTalk(t, 5, false);
    expect(t.current?.line.text).toBe('一');
    expect(isComplete(t.current!)).toBe(true);
  });

  it('空队列的 startTalk 没有 current', () => {
    expect(startTalk([]).current).toBeNull();
  });
});
