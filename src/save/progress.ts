export type SavedLevel = 'opening' | 'stage' | 'home' | 'done';

export const SAVE_KEY = 'xishen:progress:v1';
const LEVELS: readonly SavedLevel[] = ['opening', 'stage', 'home', 'done'];

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** 读档绝不让游戏打不开：读不到、格式不对、版本不对，一律当没存过。 */
export function loadProgress(store: KeyValueStore): SavedLevel | null {
  try {
    const raw = store.getItem(SAVE_KEY);
    if (raw === null) return null;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return null;
    const rec = data as Record<string, unknown>;
    if (rec.v !== 1) return null;
    return LEVELS.includes(rec.level as SavedLevel) ? (rec.level as SavedLevel) : null;
  } catch {
    return null;
  }
}

export function saveProgress(store: KeyValueStore, level: SavedLevel): void {
  try {
    store.setItem(SAVE_KEY, JSON.stringify({ v: 1, level }));
  } catch {
    // 隐私模式 / 空间满：静默放弃，不影响游玩
  }
}

export function clearProgress(store: KeyValueStore): void {
  try {
    store.removeItem(SAVE_KEY);
  } catch {
    // 同上
  }
}

/** 拿不到 localStorage（被禁用）时退回内存存储。 */
export function safeLocalStorage(): KeyValueStore {
  try {
    const ls = window.localStorage;
    ls.setItem(SAVE_KEY + ':probe', '1');
    ls.removeItem(SAVE_KEY + ':probe');
    return ls;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => {
        mem.set(k, v);
      },
      removeItem: (k) => {
        mem.delete(k);
      },
    };
  }
}
