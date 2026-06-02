import type { AppMode } from './types';

/**
 * Founder — the business-cockpit mode. Phase 1 ships a 7-function operating
 * system (Manage home + Marketing + Sales tabs). The nav surfaces the three
 * functions a solo founder touches daily; the remaining four functions live
 * inside the Manage home and its /manage/:functionKey detail pages.
 */
export const founderMode: AppMode = {
  id: 'founder',
  label: 'Founder',
  shortLabel: 'Founder',
  nav: [
    { path: '/manage', label: 'Manage', iconKey: 'manage', onboardingId: 'nav-manage' },
    { path: '/marketing', label: 'Marketing', iconKey: 'fnMarketing', onboardingId: 'nav-marketing' },
    { path: '/sales', label: 'Sales', iconKey: 'fnSales', onboardingId: 'nav-sales' },
    { path: '/profile', label: 'Profile', iconKey: 'profile', isProfile: true, onboardingId: 'nav-profile' },
  ],
  terms: {
    prospect: 'Customer',
    prospects: 'Customers',
    pipeline: 'Sales',
    lead: 'Customer',
    team: 'Team',
    primaryAction: 'Manage',
    tracker: 'Business health',
    tagline: 'Run your whole business in one place.',
  },
  aiPersona: 'founder',
  enabled: true,
};
