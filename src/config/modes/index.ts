import type { AppMode, ModeId } from './types';
import { networkMarketingMode } from './networkMarketing';
import { contentCreatorMode } from './contentCreator';
import { founderMode } from './founder';

export * from './types';

/** Default mode for users with no mode set (everyone today). */
export const DEFAULT_MODE_ID: ModeId = 'network_marketing';

/** Registry of all modes, keyed by id. */
export const MODES: Record<ModeId, AppMode> = {
  network_marketing: networkMarketingMode,
  content_creator: contentCreatorMode,
  founder: founderMode,
};

/** Resolve a mode by id, falling back to the default for unknown/empty values. */
export function getMode(id: string | null | undefined): AppMode {
  if (id && id in MODES) return MODES[id as ModeId];
  return MODES[DEFAULT_MODE_ID];
}

/** Modes that are live and should appear in the switcher. */
export function getEnabledModes(): AppMode[] {
  return Object.values(MODES).filter((m) => m.enabled);
}
