/**
 * Founder Mode — the 7-function business cockpit.
 *
 * Every small business runs on the same seven functions. This config is the
 * single source of truth for each function's identity, suggested review
 * cadence, and the concrete systems/SOPs that must exist for it to be
 * considered "consistent". The Manage home, the function detail pages, and the
 * Marketing/Sales tabs all read from here.
 *
 * Live status/cadence/notes/checklist progress are stored per-user in the
 * `founder_functions` table (see useFounderFunctions); this file only holds the
 * static scaffolding + sensible defaults for an Indian small-business founder.
 */

export const CADENCES = ['daily', 'weekly', 'monthly', 'quarterly', 'once'] as const;
export type FounderCadence = (typeof CADENCES)[number];

export type FounderFunctionKey =
  | 'management'
  | 'marketing'
  | 'sales'
  | 'operations'
  | 'accounts'
  | 'legal'
  | 'hr';

export interface FounderChecklistItem {
  id: string;
  label: string;
}

export interface FounderFunctionConfig {
  key: FounderFunctionKey;
  label: string;
  description: string;
  /** lucide-react icon name (resolved at render time). */
  iconKey: string;
  defaultCadence: FounderCadence;
  /** The systems/SOPs that make this function "consistent". */
  systemChecklist: FounderChecklistItem[];
}

export const FOUNDER_FUNCTIONS: readonly FounderFunctionConfig[] = [
  {
    key: 'management',
    label: 'Management',
    description: 'Your vision, goals and the weekly rhythm that keeps the business on track.',
    iconKey: 'Compass',
    defaultCadence: 'weekly',
    systemChecklist: [
      { id: 'vision_goals', label: 'Vision & yearly goals written down' },
      { id: 'quarterly_targets', label: 'Quarterly targets / OKRs set' },
      { id: 'weekly_review', label: 'Weekly review ritual in calendar' },
      { id: 'metrics_dashboard', label: 'Key metrics dashboard you check' },
      { id: 'decision_log', label: 'Decision / priority log maintained' },
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    description: 'How prospects find you — content, ads and a steady flow of new leads.',
    iconKey: 'Megaphone',
    defaultCadence: 'weekly',
    systemChecklist: [
      { id: 'content_calendar', label: 'Content calendar planned ahead' },
      { id: 'lead_tracker', label: 'Lead source tracker in place' },
      { id: 'brand_assets', label: 'Brand assets & messaging ready' },
      { id: 'ad_budget', label: 'Monthly ad budget & channels set' },
      { id: 'weekly_review', label: 'Weekly marketing review' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    description: 'Turning leads into paying customers with a repeatable pipeline.',
    iconKey: 'TrendingUp',
    defaultCadence: 'daily',
    systemChecklist: [
      { id: 'pipeline', label: 'Sales pipeline / stages defined' },
      { id: 'followup_cadence', label: 'Follow-up cadence for every lead' },
      { id: 'scripts', label: 'Pitch & objection-handling scripts' },
      { id: 'price_list', label: 'Price list / quotation template' },
      { id: 'close_tracking', label: 'Win/loss tracking reviewed' },
    ],
  },
  {
    key: 'operations',
    label: 'Operations',
    description: 'Delivering the product or service reliably, every single time.',
    iconKey: 'Settings2',
    defaultCadence: 'weekly',
    systemChecklist: [
      { id: 'fulfillment_sop', label: 'Fulfillment / delivery SOP written' },
      { id: 'vendor_list', label: 'Vendor & supplier list maintained' },
      { id: 'inventory', label: 'Inventory / stock tracking' },
      { id: 'quality_check', label: 'Quality / handover checklist' },
      { id: 'tools_access', label: 'Tools & access documented' },
    ],
  },
  {
    key: 'accounts',
    label: 'Accounts',
    description: 'Money in, money out — bookkeeping, GST and knowing your numbers.',
    iconKey: 'Wallet',
    defaultCadence: 'monthly',
    systemChecklist: [
      { id: 'bookkeeping', label: 'Bookkeeping kept up to date' },
      { id: 'gst_filing', label: 'GST returns filed on time' },
      { id: 'invoicing', label: 'Invoicing & receipts system' },
      { id: 'pnl_review', label: 'Monthly P&L reviewed' },
      { id: 'cashflow', label: 'Cash-flow / runway tracked' },
    ],
  },
  {
    key: 'legal',
    label: 'Legal',
    description: 'Contracts, registrations and compliance that keep you protected.',
    iconKey: 'Scale',
    defaultCadence: 'quarterly',
    systemChecklist: [
      { id: 'registration', label: 'Business registration & licenses current' },
      { id: 'contracts', label: 'Customer / vendor agreement templates' },
      { id: 'compliance_calendar', label: 'Compliance & filing calendar' },
      { id: 'ip_protection', label: 'Trademark / IP protection considered' },
      { id: 'data_privacy', label: 'Privacy policy & data handling in place' },
    ],
  },
  {
    key: 'hr',
    label: 'People & HR',
    description: 'Hiring, paying and growing the team as the business scales.',
    iconKey: 'Users',
    defaultCadence: 'monthly',
    systemChecklist: [
      { id: 'hiring_sop', label: 'Hiring & interview SOP' },
      { id: 'onboarding_doc', label: 'Onboarding document for new joiners' },
      { id: 'payroll', label: 'Payroll & salary process' },
      { id: 'roles_responsibilities', label: 'Roles & responsibilities defined' },
      { id: 'leave_policy', label: 'Leave & attendance policy' },
    ],
  },
] as const;

/** Resolve a single function's static config by key. */
export function getFounderFunction(key: FounderFunctionKey): FounderFunctionConfig | undefined {
  return FOUNDER_FUNCTIONS.find((f) => f.key === key);
}

/** All valid function keys (used for route validation). */
export const FOUNDER_FUNCTION_KEYS: readonly FounderFunctionKey[] = FOUNDER_FUNCTIONS.map((f) => f.key);

export function isFounderFunctionKey(value: string): value is FounderFunctionKey {
  return FOUNDER_FUNCTION_KEYS.includes(value as FounderFunctionKey);
}
