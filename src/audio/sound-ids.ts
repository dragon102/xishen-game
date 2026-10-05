export const SOUND_IDS = [
  'creak',
  'door',
  'crack',
  'gulp',
  'bell',
  'heartbeat',
  'rumble',
  'shatter',
  'splash',
  'pop',
  'blip',
] as const;

export type SoundId = (typeof SOUND_IDS)[number];
