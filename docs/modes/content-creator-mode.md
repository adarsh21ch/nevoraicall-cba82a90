# Content Creator Mode — Deep Design Spec

> One app, one login, one data store. The user switches **Mode** and the whole
> UI (nav, terminology, dashboard, Nev AI persona) re-skins to their profession.
> Modes (priority order): **1. Network Marketing** (built) · **2. Content Creator** (this doc) · **3. Founder**.
> This is the pilot mode we go deep on first.

### Decisions locked (2026-05-30)
- **Platform first:** Instagram **Reels** (matches the niche; deepest design here, others later).
- **Insights input = 3 tiers, admin-switchable** (see §4): **Screenshot→AI parse is the hero/default**
  (users won't hand-type), **Manual entry is the minimal fallback**, **Instagram Graph API is a
  future paid-automation tier** flipped on per-user from the **Admin panel** once Meta verifies the app.
- **Mode of work now:** keep designing deeper before building.

---

## 1. The Creator Loop (this loop IS the navigation)

Research-confirmed universal workflow (2026):

```
        ┌─────────────────────────────────────────────┐
        ▼                                             │
   IDEAS  →  SCRIPT/HOOK  →  PRODUCE  →  PUBLISH  →  ANALYZE
   (what       (hook+body     (film/      (schedule/   (retention,
    to make)    +CTA)          edit)       post)        saves, sends)
        ▲                                             │
        └──────────────  LEARN (feed winners back) ───┘
                         ▲
            INPUTS: Audience signals + Competitor intel
```

Nev AI sits in the middle of this loop and **closes it**: it learns from ANALYZE
(what worked) and competitor intel, then feeds better IDEAS and SCRIPTS back in.
That closed loop is the moat — every existing tool only does one slice.

---

## 2. Bottom Nav (5 tabs — mirrors the loop, parallels NM mode's 5 tabs)

| # | Tab | Icon | Job-to-be-done | Reuses (NM engine) |
|---|-----|------|----------------|---------------------|
| 1 | **Ideas** | lightbulb | Capture/generate ideas + hooks; swipe file; trending in niche | new |
| 2 | **Studio** | wand/pen | Turn an idea into hook + script + caption + hashtags (AI) | new |
| 3 | **Calendar** | calendar | Content pipeline + scheduling (Idea→Script→Film→Edit→Scheduled→Posted) | **Prospects pipeline engine** |
| 4 | **Insights** | bar-chart | Per-post performance; what's winning; feeds Nev AI | **TrackUp** |
| 5 | **Profile** | avatar | Same as NM | shared |

Nev AI = persistent assistant (center action button / floating), creator persona.

> NM mode nav today: `Calling · Follow-Up · To-Do · TrackUp · Profile`
> (hardcoded in `src/components/layout/BottomNav.tsx`). Creator mode swaps this
> array via the Mode config — same component, different data.

---

## 3. Each Tab in Detail

### Tab 1 — IDEAS (the "what do I make" engine)
- **Idea Vault**: quick-capture (title + optional hook). Tag by pillar/niche.
- **Hook Bank**: AI-generated hooks, each tagged by proven hook type
  (story, contrarian, listicle, question, jump-cut/visual). One-tap → Studio.
- **Trending in your niche**: pulled from tracked competitors (see Nev AI §5).
- **Swipe file**: save competitor/viral posts as inspiration → "remix" with AI.
- Status per idea: `spark → developing → scripted → done`.

### Tab 2 — STUDIO (idea → ready-to-film)
- **AI Scriptwriter**: generates `Hook (0-3s) → Body → CTA`, in the user's voice,
  patterned on THEIR winning formats (learned, not generic).
- **Shot list / B-roll suggestions**, **caption**, **hashtag set**, **on-screen text**.
- **Repurpose engine**: 1 long video → Reel + carousel + X thread + newsletter blurb.
- Output saved as a **content piece** → drops into Calendar pipeline.

### Tab 3 — CALENDAR (plan + ship) — *reuses the CRM pipeline engine*
- Pipeline stages (same kanban/board tech as NM prospects):
  `Idea → Scripting → Filming → Editing → Scheduled → Posted`.
- Calendar view (week/month) + per-platform (Reels/YT/X/LinkedIn).
- Reminders/automation reuse the NM follow-up + WhatsApp reminder system
  ("film day", "post at 7pm").

### Tab 4 — INSIGHTS (analyze) — *reuses TrackUp*
Metrics that matter in 2026 (Mosseri-confirmed weighting), per post:
1. **Sends/Shares** (weighted 3–5× likes; >2% share rate = strong) ← top
2. **Saves** (1–3% good, >3% great)
3. **Watch time / % watched / retention** (retention > length)
4. **3-sec hook hold-rate** (>60% strong, <40% weak → 5–10× reach gap)
5. **Comments per 1k views**
6. Likes (secondary in 2026)
- Each post gets a **Nev Score** from these → winners flagged → feed Nev AI.

**Input = 3 switchable tiers (admin-controlled feature flag per user/plan):**

| Tier | How | Status | Monetization |
|------|-----|--------|--------------|
| **Manual** | User types numbers into a fast form | v1 — minimal fallback | Free / all plans |
| **Screenshot → AI parse** ⭐ | User uploads the IG "Insights" screenshot → Nev AI (vision) reads saves/shares/views/reach → auto-fills | v1 — **HERO/default** | Core paid feature |
| **Instagram Graph API** | Auto-pull, no user action | v2 — after Meta app review | **Premium "automation" tier** |

- Admin panel gets a toggle: `insights_source = manual | screenshot | api` per user/plan.
  Ship screenshot+manual now; when API approval lands, flip the flag → screenshot UI hides,
  auto-sync turns on → sell it as an automation upgrade. No rebuild, just a switch.
- Screenshot parse implementation: vision model reads the IG insights panel layout
  (Reels insights screen) → maps to `content_metrics` fields. One screenshot = one post's row.
  Needs a small parser prompt + field validation/confirm step before save.

### Tab 5 — PROFILE
Shared with NM. Adds: connected social handles, content pillars, brand voice
sample (trains Nev AI tone), tracked competitors.

---

## 4. Terminology Dictionary (Creator Mode `terms`)

| Generic key | Network Marketing | **Content Creator** |
|-------------|-------------------|----------------------|
| prospect | Prospect | **Idea / Post** |
| pipeline | Follow-Up pipeline | **Content Pipeline** |
| contact/lead | Lead | **Audience / Follower** |
| team | Team / Downline | **Collabs / Brand Deals** |
| primary action | Calling | **Create (Studio)** |
| tracker | TrackUp | **Insights** |
| tagline | "CRM for network marketers" | **"Your content command center"** |

---

## 5. Nev AI for Creators (the killer layer — "trained to think like the user")

**A. Learns from the user's own winners.** Reads Insights → derives patterns:
"your story-hooks + 7–9pm + how-to topics get 2× saves" → biases future
hooks/scripts toward that. Stored as per-user training signals.

**B. Competitor intelligence (real-time-ish).** User adds competitor handles →
Nev AI surfaces their viral posts, hook patterns, topics, posting cadence, and
"what's hot in the niche this week" → turns into ready ideas/hooks adapted to
the user's voice (not copied).

**C. Generators.** Hooks, full scripts, captions, hashtags, repurposing,
**daily brief**: "3 ideas + 1 hook to film today, based on your wins + niche trends."

**D. Persona.** System-prompt = "expert short-form content strategist + the user's
own winning patterns." Per-mode system prompt selected via `mode.aiPersona`.

Backend: `nev-ai` / `ai-assistant` edge functions receive `mode` + user training
signals + competitor data in context. Same functions, mode-aware prompt.

---

## 6. Backend Data Model (Lovable Cloud / Supabase additions)

> Claude writes SQL → user runs it in Lovable Cloud → SQL editor.

- `profiles.mode` text default `'network_marketing'` — drives the whole switch.
- `content_ideas` (id, user_id, title, hook, hook_type, source[self|ai|competitor], status, niche_tag, created_at)
- `content_pieces` (id, user_id, idea_id, script, caption, hashtags, platform, stage, scheduled_at, posted_at)
- `content_metrics` (id, piece_id, hook_rate, watch_pct, avg_watch_s, saves, shares, sends, comments, reach, nev_score)
- `competitors` (id, user_id, handle, platform, niche)
- `competitor_posts` (id, competitor_id, url, hook, topic, metrics_json, captured_at)
- `ai_training_signals` (id, user_id, pattern, evidence_json, confidence) — derived winners

All RLS-scoped to `user_id` (reuse existing RLS pattern from NM tables).

---

## 7. How It Slots Into the Mode Architecture

1. `src/config/modes/types.ts` — `AppMode` interface (nav, terms, dashboardWidgets, aiPersona).
2. `src/config/modes/networkMarketing.ts` — extract today's hardcoded NM setup (Step 1, non-destructive).
3. `src/config/modes/contentCreator.ts` — this spec as config.
4. `src/contexts/ModeContext.tsx` — reads `profiles.mode`, exposes `mode` + `t('prospect')` helper.
5. Refactor `BottomNav.tsx` + labels to consume `useMode()`.
6. Mode switcher in Profile → updates `profiles.mode` → UI re-skins live.

**Build order:** extract NM to config (app unchanged) → ModeContext + t() →
`profiles.mode` + switcher → build Content Creator tabs → wire Nev AI persona +
competitor intel. Each step ships independently.

---

## 8. Open Questions to Resolve (the "dig in for days" list)
- [ ] Which platforms first? (Instagram Reels-first seems right for the niche.)
- [ ] Insights v1 input: manual form vs screenshot-parse vs wait for IG API?
- [ ] Competitor intel source: IG Graph API limits → may need a scraper/3rd-party. Research.
- [ ] How much of NM's pipeline/TrackUp can be reused as-is vs forked?
- [ ] Nev AI: how to store + apply "winning patterns" concretely (prompt-injection vs fine-tune-lite).

---

## 9. Day-in-the-life walkthrough (Reels-first — validates the design)

Morning:
1. Open app (Content Creator Mode) → **Nev AI daily brief** on home:
   "Yesterday's Reel held 68% at 3s (great). Your how-to + story-hook combo is your
   top pattern this week. 3 ideas to film today: [A][B][C]. Tap to script."
2. Tap idea A → lands in **Studio** → Nev AI drafts `Hook → Body → CTA` in the user's
   voice + caption + hashtags + a 3-shot list. User tweaks, hits "Add to Calendar."
3. **Calendar**: the piece sits in `Filming` for today, 7pm post scheduled. WhatsApp
   reminder auto-set ("film by 4pm").

Evening (after posting):
4. **Insights** → user uploads the IG insights **screenshot** → Nev AI parses
   saves/shares/sends/reach/retention → confirm → saved. Post gets a **Nev Score**.
5. If it's a winner, Nev AI updates the user's **winning-pattern signals** → tomorrow's
   brief gets smarter. Loop closed.

Weekly:
6. **Ideas → Trending in your niche**: Nev AI shows what the user's tracked competitors
   posted that popped this week → one tap turns any into a scripted idea (in user's voice).

## 10. Nev AI mechanics (concrete)

**Winning-pattern store.** After each scored post, derive simple, explainable signals
into `ai_training_signals`, e.g. `{pattern:"story-hook", metric:"save_rate", lift:2.1x,
confidence:0.7, n:9}`. These are injected into the script/hook prompt as
"this creator's proven patterns" (prompt-conditioning in v1 — no fine-tuning needed).

**Competitor intel pipeline.** User adds handles → a fetch job captures recent posts'
hook + topic + visible metrics into `competitor_posts` → Nev AI clusters topics/hooks,
ranks by engagement, and produces niche-trend ideas. (Feasibility of the fetch source —
IG Graph API vs 3rd-party — is the key open research item, see §8.)

**Where it runs.** Existing `nev-ai` / `ai-assistant` edge functions, extended to accept
`mode`, the user's `ai_training_signals`, and competitor context. Same functions,
mode-aware system prompt selected by `mode.aiPersona`.

---
_Last updated: 2026-05-30. Pilot mode design; iterate before building. Decisions: Reels-first; screenshot-parse hero + manual fallback + API later (admin-switchable)._
