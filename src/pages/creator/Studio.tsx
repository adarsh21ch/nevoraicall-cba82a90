import { PenLine } from 'lucide-react';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';

/**
 * Tab 2 — STUDIO: turn an idea into a ready-to-film piece (hook + script +
 * caption + hashtags), in the user's voice. See spec §3.
 */
export default function Studio() {
  return (
    <CreatorTabLayout title="Studio" subtitle="Idea → ready to film">
      <CreatorEmptyState
        icon={PenLine}
        headline="Script in your voice"
        body="Nev AI drafts a Hook → Body → CTA patterned on your winning formats, plus caption, hashtags and a shot list. Tweak it, then drop it into your Calendar."
        bullets={[
          'AI Scriptwriter — Hook (0–3s) → Body → CTA in your voice',
          'Shot list + B-roll suggestions + on-screen text',
          'Caption + hashtag set generated for the post',
          'Repurpose — one long video → Reel + carousel + thread',
        ]}
        cta="Start a script"
      />
    </CreatorTabLayout>
  );
}
