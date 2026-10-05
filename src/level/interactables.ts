import { TILE, type Body } from '../physics/platformer';
import { interactableBox, type InteractableDef, type LevelDef, type TriggerDef } from './level';

/** 角色中心与物件中心的最大水平距离。 */
export const REACH = 16;

export function findNearby(level: LevelDef, body: Body): InteractableDef | null {
  const cx = body.x + body.w / 2;
  let best: InteractableDef | null = null;
  let bestD = Infinity;
  for (const it of level.interactables) {
    const box = interactableBox(it);
    const vertical = body.y < box.y + box.h && body.y + body.h > box.y;
    if (!vertical) continue;
    const d = Math.abs(cx - (box.x + box.w / 2));
    if (d <= REACH && d < bestD) {
      best = it;
      bestD = d;
    }
  }
  return best;
}

export function markFound(found: ReadonlySet<string>, id: string): { found: ReadonlySet<string>; firstTime: boolean } {
  if (found.has(id)) return { found, firstTime: false };
  const next = new Set(found);
  next.add(id);
  return { found: next, firstTime: true };
}

export function crossedTriggers(
  triggers: readonly TriggerDef[],
  fired: ReadonlySet<string>,
  prevX: number,
  x: number,
): TriggerDef[] {
  return triggers.filter((t) => {
    if (fired.has(t.id)) return false;
    const cx = t.tileX * TILE + TILE / 2;
    return (prevX < cx && x >= cx) || (prevX > cx && x <= cx);
  });
}
