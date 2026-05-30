import { useCallback } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { getMode, type AppMode, type ModeId } from '@/config/modes';

/**
 * Active Mode for the current user.
 *
 * Reads `profile.mode` (defaults to network_marketing until the column exists
 * or is set). Exposes the resolved mode config plus a `t()` terminology helper.
 * No provider required — call it anywhere.
 *
 *   const { mode, t } = useMode();
 *   <span>{t('prospect')}</span>   // "Prospect" / "Idea" / "Customer"
 */
export function useMode(): {
  mode: AppMode;
  modeId: ModeId;
  t: (key: string) => string;
} {
  const { profile } = useProfile();
  // `mode` column may not exist on the row yet; read defensively.
  const rawMode = (profile as { mode?: string } | null | undefined)?.mode;
  const mode = getMode(rawMode);

  const t = useCallback(
    (key: string) => mode.terms[key] ?? key,
    [mode],
  );

  return { mode, modeId: mode.id, t };
}
