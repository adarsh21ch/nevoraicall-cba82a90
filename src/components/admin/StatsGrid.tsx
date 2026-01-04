import { Users, TrendingUp, Calendar, Activity, Database, Crown } from 'lucide-react';

interface StatsGridProps {
  totalSignups: number;
  activeProUsers: number;
  neveraiTodayActive: number;
  neveraiWeekActive: number;
  totalLeads: number;
  todayLeads: number;
}

export function StatsGrid({
  totalSignups,
  activeProUsers,
  neveraiTodayActive,
  neveraiWeekActive,
  totalLeads,
  todayLeads,
}: StatsGridProps) {
  const stats = [
    {
      label: 'Total Users',
      value: totalSignups,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Pro Users',
      value: activeProUsers,
      icon: Crown,
      color: 'text-amber-600',
      bgColor: 'bg-amber-500/10',
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
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-card border border-border/50"
        >
          <div className={`p-2 rounded-lg ${stat.bgColor} mb-1.5`}>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </div>
          <span className="text-lg font-bold">{stat.value.toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground text-center">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
