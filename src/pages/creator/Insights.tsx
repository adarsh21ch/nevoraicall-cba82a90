import { BarChart3 } from 'lucide-react';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';

/**
 * Tab 4 — INSIGHTS: analyze. Reuses TrackUp. Per-post metrics that matter in
 * 2026 (sends/saves/retention/hook-rate) → Nev Score → feeds Nev AI. Input is
 * 3 admin-switchable tiers (manual / screenshot-parse / IG API). See spec §3.
 */
export default function Insights() {
  return (
    <CreatorTabLayout title="Insights" subtitle="What's winning">
      <CreatorEmptyState
        icon={BarChart3}
        headline="Know what's working"
        body="Log a post's numbers and get a Nev Score from the metrics that actually move reach in 2026. Winners feed Nev AI so tomorrow's ideas get smarter."
        bullets={[
          'Sends/shares + saves + retention + 3-sec hook hold-rate',
          'Screenshot → AI parse — upload your IG insights, auto-fill the row',
          'Manual entry — fast form fallback',
          'Each post gets a Nev Score; winners flagged for Nev AI',
        ]}
        cta="Add a post's insights"
      />
    </CreatorTabLayout>
  );
}
