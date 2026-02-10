import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { messages, monthYear } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build data context for the AI
    const now = new Date();
    const currentMonthYear = monthYear || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const todayStr = now.toISOString().split("T")[0];

    // Fetch user data in parallel
    const [profileRes, prospectsCountRes, todayProspectsRes, snapshotRes, teamRes] = await Promise.all([
      supabase.from("profiles").select("display_name, leader_id, leaders_id_of_my_leader").eq("user_id", userId).maybeSingle(),
      supabase.from("prospects").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("prospects").select("id, action_taken, funnel_stage, prospect_status").eq("user_id", userId).gte("created_at", todayStr),
      supabase.from("personal_snapshot_v2").select("*").eq("user_id", userId).eq("month_year", currentMonthYear),
      // Team members: people who have this user as their leader
      supabase.from("profiles").select("user_id, display_name").eq("leaders_id_of_my_leader", userId),
    ]);

    const profile = profileRes.data;
    const totalProspects = prospectsCountRes.count || 0;
    const todayProspects = todayProspectsRes.data || [];
    const snapshots = snapshotRes.data || [];
    const teamMembers = teamRes.data || [];

    // Compute response tag distribution from today's prospects
    const todayResponseCounts: Record<string, number> = {};
    const todayStageCounts: Record<string, number> = {};
    todayProspects.forEach((p: any) => {
      if (p.action_taken) todayResponseCounts[p.action_taken] = (todayResponseCounts[p.action_taken] || 0) + 1;
      if (p.funnel_stage) todayStageCounts[p.funnel_stage] = (todayStageCounts[p.funnel_stage] || 0) + 1;
    });

    // Compute monthly totals from snapshots
    let monthlyTotal: Record<string, number> = {};
    snapshots.forEach((s: any) => {
      if (s.response_tags && typeof s.response_tags === "object") {
        for (const [tag, val] of Object.entries(s.response_tags)) {
          monthlyTotal[tag] = (monthlyTotal[tag] || 0) + (typeof val === "number" ? val : 0);
        }
      }
    });

    // Build context string
    let dataContext = `
## User Data Context
- User: ${profile?.display_name || "Unknown"}
- Month: ${currentMonthYear}
- Total Prospects (all time): ${totalProspects}
- Today's New Leads: ${todayProspects.length}
`;

    if (Object.keys(todayResponseCounts).length > 0) {
      dataContext += `- Today's Response Distribution: ${Object.entries(todayResponseCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}\n`;
    }
    if (Object.keys(todayStageCounts).length > 0) {
      dataContext += `- Today's Stage Distribution: ${Object.entries(todayStageCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}\n`;
    }
    if (Object.keys(monthlyTotal).length > 0) {
      dataContext += `- Monthly Tracking Totals: ${Object.entries(monthlyTotal).map(([k, v]) => `${k}: ${v}`).join(", ")}\n`;
    }
    if (snapshots.length > 0) {
      dataContext += `- Days tracked this month: ${snapshots.length}\n`;
    }
    if (teamMembers.length > 0) {
      dataContext += `- Team Members (${teamMembers.length}): ${teamMembers.map((m: any) => m.display_name || "Unknown").join(", ")}\n`;
    }

    // If user has team, fetch team snapshots
    if (teamMembers.length > 0) {
      const teamIds = teamMembers.map((m: any) => m.user_id);
      const { data: teamSnapshots } = await supabase
        .from("personal_snapshot_v2")
        .select("user_id, response_tags, stage_tags")
        .in("user_id", teamIds)
        .eq("month_year", currentMonthYear);

      if (teamSnapshots && teamSnapshots.length > 0) {
        const teamSummary: Record<string, { total: number }> = {};
        teamSnapshots.forEach((s: any) => {
          const member = teamMembers.find((m: any) => m.user_id === s.user_id);
          const name = member?.display_name || "Unknown";
          if (!teamSummary[name]) teamSummary[name] = { total: 0 };
          if (s.response_tags && typeof s.response_tags === "object") {
            for (const val of Object.values(s.response_tags)) {
              teamSummary[name].total += typeof val === "number" ? val : 0;
            }
          }
        });
        dataContext += `- Team Performance This Month:\n`;
        for (const [name, data] of Object.entries(teamSummary)) {
          dataContext += `  - ${name}: Total activities = ${data.total}\n`;
        }
      }
    }

    const systemPrompt = `You are NevorAI Assistant — a smart, friendly AI assistant embedded inside the NevorAI app, which is a CRM & performance tracker for network marketers and direct sellers.

Your role:
- Help users understand their data: leads, prospects, response rates, funnel stages, team performance
- Give actionable tips to improve their numbers
- Be concise, encouraging, and data-driven
- Use the user's actual data provided below to answer questions accurately
- When the user asks about stats, always reference specific numbers from their data
- If asked about something not in the data, say so honestly

Key concepts in NevorAI:
- Prospects: People added to the user's list (potential leads)
- Response Tags: Tags like "Interested", "Not Interested", "Call Back" etc. assigned after contacting prospects
- Stage Tags: Funnel stages like "Video Sent", "Presented", "Enrolled" etc.
- Tracking: Daily numbers the user logs (leads generated, calls made, videos sent, enrollments)
- Personal vs Total: Personal = user's own numbers; Total = includes team
- Team: The user's downline members whose leader is this user

${dataContext}

Guidelines:
- Keep responses brief (2-4 sentences for simple questions, up to a short paragraph for analysis)
- Use emoji sparingly for friendliness (1-2 per response max)
- Format numbers clearly
- If suggesting improvements, be specific and actionable
- Respond in the same language the user writes in`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
