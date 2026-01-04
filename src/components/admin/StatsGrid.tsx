import { Users, TrendingUp, Calendar, Target, Activity, Database, UserPlus, Crown } from 'lucide-react';

interface StatsGridProps {
  neveraiTotalUsers: number;
  neveraiTodayActive: number;
  neveraiWeekActive: number;
  activeProUsers: number;
  totalLeads: number;
  todayLeads: number;
  weekLeads: number;
  totalSignups: number;
}

export function StatsGrid({
  neveraiTotalUsers,
  neveraiTodayActive,
  neveraiWeekActive,
  activeProUsers,
  totalLeads,
  todayLeads,
  weekLeads,
  totalSignups,
}: StatsGridProps) {
  const stats = [
    {
      label: 'Total Signups',
      value: totalSignups,
      icon: UserPlus,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Total Pro',
      value: activeProUsers,
      icon: Crown,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Total Users',
      value: neveraiTotalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'DAU',
      value: neveraiTodayActive,
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'WAU',
      value: neveraiWeekActive,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-500/10',
    },
    {
      label: 'Total Leads',
      value: totalLeads,
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Today Leads',
      value: todayLeads,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'Week Leads',
      value: weekLeads,
      icon: Target,
      color: 'text-pink-600',
      bgColor: 'bg-pink-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center justify-center p-2 rounded-xl bg-card border border-border/50"
        >
          <div className={`p-1.5 rounded-lg ${stat.bgColor} mb-1`}>
            <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
          </div>
          <span className="text-sm font-bold">{stat.value.toLocaleString()}</span>
          <span className="text-[9px] text-muted-foreground text-center leading-tight">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
