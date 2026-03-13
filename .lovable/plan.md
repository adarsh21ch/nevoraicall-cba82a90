

# Move AI Insights Below AI Assistant + AI Feature Enhancements

## 1. Layout Fix (Simple)
Move the "AI Insights" card in `src/pages/Profile.tsx` from its current position (after Notifications toggle, line ~494) to directly below the "Nevorai AI Assistant" card (after line ~468).

## 2. New AI Features to Add

Based on the existing tool-calling architecture and the network marketing use case, here are high-impact additions:

### A. Streaming Responses
Currently the chat waits for the full response before displaying. Switch to **SSE streaming** so text appears word-by-word — feels much faster and more interactive. The edge function already returns `text/event-stream`.

### B. Conversation History Persistence
Currently messages reset when the drawer closes. Persist the last conversation in `localStorage` so users can resume where they left off.

### C. Quick Action Cards in Chat
After AI responses, show tappable action cards like:
- "Show breakdown by team member" (after a KPI response)
- "Show stale prospects" (after coaching tips)
- "Compare with last week" (after daily snapshot)
These contextual follow-ups make the AI much more usable without typing.

### D. Share/Copy Response Button
Add a copy button on each AI response so users can share insights via WhatsApp or clipboard — critical for leaders sharing data with their team.

### E. Voice Input
Add a microphone button next to the send button for voice-to-text input. Uses the browser's `SpeechRecognition` API. Many network marketers prefer speaking over typing on mobile.

### F. Pinned/Saved Insights
Let users long-press or tap a star on any AI response to save it. Saved insights appear in a "Saved" tab in the chat. Useful for bookmarking weekly summaries or coaching tips.

### G. Morning Briefing Prompt
When the user opens AI chat for the first time each day, auto-suggest a "Good morning! Here's your daily briefing" that triggers `get_daily_snapshot_summary` + `get_team_tracking_status` in one go.

### H. Expandable Suggestion Categories
Replace the flat suggestion chips with categorized groups:
- **My Numbers**: "Daily snapshot", "This week's stats", "Activity trend"
- **Team**: "Who hasn't updated?", "Team rankings", "Team performance"  
- **Prospects**: "Stale prospects", "Follow-up needed", "Funnel analysis"
- **Coaching**: "Coaching tips", "What should I improve?", "Weekly review"

## Implementation Plan

### Files to modify:
1. **`src/pages/Profile.tsx`** — Move AI Insights block below AI Assistant
2. **`src/components/ai/AIAssistantChat.tsx`** — Add streaming, localStorage persistence, copy button, voice input, categorized suggestions, contextual follow-up chips, morning briefing

### Files unchanged:
- No backend changes needed — all new features are frontend-only
- Edge function already supports streaming (`text/event-stream`)

### Implementation order:
1. Move AI Insights below AI Assistant in Profile
2. Add streaming response parsing (SSE reader)
3. Add localStorage conversation persistence
4. Add copy/share button on AI responses
5. Add categorized suggestion chips with sections
6. Add contextual follow-up action chips after responses
7. Add voice input button (SpeechRecognition API)
8. Add morning briefing auto-suggestion

