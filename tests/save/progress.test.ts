import { describe, it, expect } from 'vitest';
import { SAVE_KEY, clearProgress, loadProgress, saveProgress, type KeyValueStore } from '../../src/save/progress';

const memory = (init: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } => {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
};

describe('progress', () => {
  it('没存过 → null', () => {
    expect(loadProgress(memory())).toBeNull();
  });

  it('存了能读回来', () => {
    const s = memory();
    saveProgress(s, 'home');
    expect(JSON.parse(s.data[SAVE_KEY])).toEqual({ v: 1, level: 'home' });
    expect(loadProgress(s)).toBe('home');
  });

  it('坏档一律当没存过', () => {
    for (const bad of ['{', '[]', 'null', '{"v":2,"level":"home"}', '{"v":1,"level":"moon"}', '{"v":1}']) {
      expect(loadProgress(memory({ [SAVE_KEY]: bad })), bad).toBeNull();
    }
  });

  it('存储本身抛异常也不影响游戏', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadProgress(broken)).toBeNull();
    expect(() => saveProgress(broken, 'stage')).not.toThrow();
    expect(() => clearProgress(broken)).not.toThrow();
  });

  it('clearProgress 删掉存档', () => {
    const s = memory();
    saveProgress(s, 'done');
    clearProgress(s);
    expect(loadProgress(s)).toBeNull();
  });
});
