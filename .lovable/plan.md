

# Add "How Tracking Works" Guide — Simple English with ❓ Icon

## Overview
Add a ❓ (HelpCircle) button in the TrackUp header that opens a bottom sheet with a simple, easy-to-understand guide explaining how tracking numbers work — written in plain everyday English with real examples.

## Files to Change

### 1. Create `src/components/tracking/TrackingGuideSheet.tsx`
A Sheet (bottom on mobile, side on desktop) with scrollable content in 5 sections:

**Section 1 — "What are Tracking Tags?"**
> When you add a prospect and set tags like "Video Sent" or "Day 2 Done", those are tracking tags. They tell the app what stage each prospect is at.
> Example: You add Rohit → set his tag to "Video Sent" → now Rohit counts as 1 Response and 1 Video Sent.

**Section 2 — "How are numbers counted automatically?"**
> The app counts your numbers from the tags you set on your prospects in the Calling tab.
> - **Leads** = How many prospects you added
> - **Responses** = How many have at least one tag set
> - **Stages** = If someone reaches Stage 3, they automatically count for Stage 1 and 2 also
> Example: You have 10 prospects. 6 have tags. 2 reached "Day 3". Your numbers: Leads=10, Responses=6, Day 1=2, Day 2=2, Day 3=2

**Section 3 — "What about Personal Tags?"**
> Personal tags (like "Hot Lead", "Follow Up") only count as a Response. They don't affect stage numbers.

**Section 4 — "Manual vs Automatic Mode"**
> Automatic = numbers come from your prospect tags (recommended)
> Manual = you type numbers yourself each day

**Section 5 — "Tips to get accurate numbers"**
> - Always update tags when something changes
> - Use the correct stage tag, not just personal tags
> - Don't skip stages — but if you do, the app handles it

Each section uses a Card with an icon, title, body text, and example callout box (muted background).

### 2. Edit `src/pages/Tracking.tsx`
- Add `HelpCircle` icon button (with `?` styling) next to the Settings gear in the header
- Add state `showGuide` and render `<TrackingGuideSheet>`

## Design
- Icon: `HelpCircle` from lucide-react (looks like ❓)
- Sheet: bottom on mobile (full height minus header), right side on desktop
- Language: Simple, conversational English — no jargon
- Example boxes: light blue/muted background callouts

