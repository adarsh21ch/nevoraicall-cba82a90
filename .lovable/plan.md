

## AI Assistant Integration for NevoraI

### What You Get
A floating AI chat button in your app where users can ask questions like:
- "How many leads did I add this month?"
- "What's my response rate?"
- "Show my team's performance"
- "Tips to improve my enrollment"

The AI reads the user's real data and gives accurate, personalized answers.

### How It Works

1. User taps the AI button (sparkle icon, bottom-right)
2. A chat drawer slides up
3. User types a question or taps a quick suggestion chip
4. The backend fetches the user's actual data (prospects, tracking snapshots, team info)
5. Sends it to Lovable AI along with the question
6. Response streams back token-by-token into the chat

### What Gets Built

| File | What It Does |
|------|-------------|
| `supabase/functions/ai-assistant/index.ts` | Backend function that queries user data and calls AI |
| `src/components/ai/AIAssistantButton.tsx` | Floating sparkle button |
| `src/components/ai/AIAssistantChat.tsx` | Chat drawer with streaming messages and markdown |
| `src/pages/Dashboard.tsx` | Add AI button |
| `src/pages/Tracking.tsx` | Add AI button |
| `src/pages/ListUp.tsx` | Add AI button |

### Technical Details

**Edge Function (`ai-assistant`)**
- Authenticates user via JWT
- Queries their data from `prospects`, `personal_snapshot_v2`, `total_snapshot_v2`, and `profiles`
- Builds a data summary context (lead counts, response rates, stage distribution, team members)
- Sends to Lovable AI Gateway (`google/gemini-3-flash-preview`) with a domain-aware system prompt
- Streams SSE response back
- Handles 429 (rate limit) and 402 (credits) errors

**Frontend Chat Component**
- Sheet/drawer that opens from bottom
- Markdown rendering for AI responses (using simple inline parser)
- Streaming token-by-token display
- Quick suggestion chips: "My stats today", "Team performance", "Tips to improve"
- Conversation history kept in memory (resets on close)

**Floating Button Placement**
- Positioned above the existing FloatingUpdateButton on Tracking page
- On Dashboard and ListUp pages, placed at bottom-right above the bottom nav
- Uses a sparkle/brain icon to differentiate from the "+" button

**Security**
- `verify_jwt = false` in config.toml, but JWT validated in code
- Only queries data owned by the authenticated user
- Team data only shown if user has team members (via `leaders_id_of_my_leader`)

**For Website Integration**
The same edge function can be called from your website project using the same backend URL and auth token. The chat component can be copied or a simplified version embedded.

