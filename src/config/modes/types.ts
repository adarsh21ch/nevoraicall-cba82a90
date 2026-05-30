/**
 * Mode system types.
 *
 * A "Mode" re-skins the whole app (nav, terminology, AI persona) for a
 * profession, while keeping ONE codebase + ONE data store. Each mode is a
 * single config preset — adding a profession later is just one new file.
 *
 * See docs/modes/content-creator-mode.md for the full design.
 */

export type ModeId = 'network_marketing' | 'content_creator' | 'founder';

/** One bottom-nav item. `iconKey` maps to the icon registry in BottomNav. */
export interface ModeNavItem {
  path: string;
  label: string;
  iconKey: string;
  onboardingId?: string;
  isProfile?: boolean;
}

/**
 * Terminology dictionary. Keys are generic concepts; values are the words a
 * given profession actually uses. Consumers call `t('prospect')` and get the
 * right word for the active mode. Open-ended so modes can add their own keys.
 */
export interface ModeTerms {
  /** A single person in the pipeline (Prospect / Idea-Post / Customer). */
  prospect: string;
  /** Plural of prospect. */
  prospects: string;
  /** The pipeline/funnel concept ("Follow-Up" / "Content Pipeline"). */
  pipeline: string;
  /** A captured contact ("Lead" / "Audience" / "Customer"). */
  lead: string;
  /** Group concept ("Team / Downline" / "Collabs" / "Customers"). */
  team: string;
  /** The primary daily action ("Calling" / "Create"). */
  primaryAction: string;
  /** The analytics surface ("TrackUp" / "Insights"). */
  tracker: string;
  /** One-line tagline shown in branding spots. */
  tagline: string;
  [key: string]: string;
}

export interface AppMode {
  id: ModeId;
  /** Full display name, e.g. "Network Marketing". */
  label: string;
  /** Short chip label, e.g. "Marketing". */
  shortLabel: string;
  /** Bottom navigation for this mode. */
  nav: ModeNavItem[];
  /** Profession-specific terminology. */
  terms: ModeTerms;
  /** Which Nev AI system-prompt persona this mode uses. */
  aiPersona: string;
  /**
   * Whether the mode is live for users. Built-but-unfinished modes stay
   * `false` so they don't show in the switcher until ready.
   */
  enabled: boolean;
}
