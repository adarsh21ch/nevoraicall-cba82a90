import { Calendar as CalendarIcon } from 'lucide-react';
import { CreatorTabLayout, CreatorEmptyState } from '@/components/creator/CreatorTabLayout';

/**
 * Tab 3 — CALENDAR: plan + ship. Reuses the NM prospects pipeline engine for a
 * content pipeline (Idea → Scripting → Filming → Editing → Scheduled → Posted).
 * See spec §3.
 */
export default function Calendar() {
  return (
    <CreatorTabLayout title="Calendar" subtitle="Plan & ship your content">
      <CreatorEmptyState
        icon={CalendarIcon}
        headline="Your content pipeline"
        body="Move each piece through the pipeline and schedule posts across platforms. Film-day and post-time reminders reuse the follow-up + WhatsApp reminder system."
        bullets={[
          'Pipeline — Idea → Scripting → Filming → Editing → Scheduled → Posted',
          'Calendar view (week / month), per platform (Reels, YT, X…)',
          'Reminders — "film by 4pm", "post at 7pm" via WhatsApp',
        ]}
        cta="Plan a post"
      />
    </CreatorTabLayout>
  );
}
