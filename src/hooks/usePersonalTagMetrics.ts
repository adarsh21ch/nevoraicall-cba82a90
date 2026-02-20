import { useMemo } from 'react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackingFormatContext } from '@/contexts/TrackingFormatContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { getISTDateFromISO, getISTMonthBoundsUTC, getTodayIST } from '@/lib/dateUtils';

export interface PersonalTagDailyMetric {
  date: string;
  tagCounts: Record<string, number>;
}

export interface PersonalTagData {
  tagNames: string[];
  dailyMetrics: PersonalTagDailyMetric[];
  monthlyTotals: Record<string, number>;
}

export function usePersonalTagMetrics(monthYear: string): PersonalTagData {
  const { user } = useAuth();
  const { leadsNonTrackingTags, stageNonTrackingTags } = useTrackingFormatContext();

  const allPersonalTags = useMemo(() => {
    const combined = new Set([...leadsNonTrackingTags, ...stageNonTrackingTags]);
    return Array.from(combined);
  }, [leadsNonTrackingTags, stageNonTrackingTags]);

  const { data: prospects } = useQuery({
    queryKey: ['personal-tag-metrics', user?.id, monthYear, allPersonalTags],
    queryFn: async () => {
      if (!user || allPersonalTags.length === 0) return [];
      const bounds = getISTMonthBoundsUTC(monthYear);
      const { data, error } = await supabase
        .from('prospects')
        .select('date_added, action_taken, funnel_stage, personal_tags')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .gte('date_added', bounds.start)
        .lte('date_added', bounds.end);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && allPersonalTags.length > 0,
    staleTime: 30_000,
  });

  return useMemo(() => {
    if (allPersonalTags.length === 0) {
      return { tagNames: [], dailyMetrics: [], monthlyTotals: {} };
    }

    const [year, month] = monthYear.split('-').map(Number);
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));

    const dayMap: Record<string, Record<string, number>> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthYear}-${String(d).padStart(2, '0')}`;
      dayMap[dateStr] = {};
      allPersonalTags.forEach((t) => (dayMap[dateStr][t] = 0));
    }

    (prospects || []).forEach((p) => {
      const dateStr = getISTDateFromISO(p.date_added);
      if (!dayMap[dateStr]) return;
      if (p.action_taken && allPersonalTags.includes(p.action_taken)) {
        dayMap[dateStr][p.action_taken]++;
      }
      if (p.funnel_stage && allPersonalTags.includes(p.funnel_stage)) {
        dayMap[dateStr][p.funnel_stage]++;
      }
      const pTags = p.personal_tags as string[] | null;
      if (Array.isArray(pTags)) {
        pTags.forEach((t) => {
          if (dayMap[dateStr][t] !== undefined) dayMap[dateStr][t]++;
        });
      }
    });

    const dailyMetrics: PersonalTagDailyMetric[] = [];
    const totalCounts: Record<string, number> = {};
    allPersonalTags.forEach((t) => (totalCounts[t] = 0));

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${monthYear}-${String(d).padStart(2, '0')}`;
      const tagCounts = dayMap[dateStr];
      allPersonalTags.forEach((t) => {
        totalCounts[t] += tagCounts[t] || 0;
      });
      dailyMetrics.push({ date: dateStr, tagCounts });
    }

    return { tagNames: allPersonalTags, dailyMetrics, monthlyTotals: totalCounts };
  }, [prospects, monthYear, allPersonalTags]);
}
