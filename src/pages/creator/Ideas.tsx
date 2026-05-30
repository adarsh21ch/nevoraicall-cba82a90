import { Lightbulb } from 'lucide-react';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';

/**
 * Tab 1 — IDEAS: the "what do I make" engine. Idea vault + hook bank +
 * trending-in-niche + swipe file. See docs/modes/content-creator-mode.md §3.
 */
export default function Ideas() {
  return (
    <CreatorTabLayout title="Ideas" subtitle="What to make next">
      <CreatorEmptyState
        icon={Lightbulb}
        headline="Your idea engine"
        body="Capture sparks, bank proven hooks, and see what's trending in your niche — then send any idea straight to Studio to script it."
        bullets={[
          'Idea Vault — quick-capture titles + hooks, tagged by pillar',
          'Hook Bank — AI hooks tagged by proven type (story, contrarian, listicle…)',
          'Trending in your niche — pulled from tracked competitors',
          'Swipe file — save viral posts and remix with AI',
        ]}
        cta="Capture an idea"
      />
    </CreatorTabLayout>
  );
}
