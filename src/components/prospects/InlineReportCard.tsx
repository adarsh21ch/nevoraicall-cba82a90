import { useState, useEffect } from 'react';
import { Prospect, FUNNEL_STAGES, ACTIONS, STATUSES, PRIORITIES } from '@/types/prospect';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { StageBadge, StatusBadge, PriorityBadge } from './StatusBadge';
import { Phone, MessageCircle, Calendar as CalendarIcon, Clock, MapPin, Cake, Target, Mail } from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { useActivityLogs } from '@/hooks/useActivityLogs';

interface InlineReportCardProps {
  prospect: Prospect;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  colSpan: number;
}

export function InlineReportCard({ prospect, onUpdate, colSpan }: InlineReportCardProps) {
  const [localData, setLocalData] = useState<Partial<Prospect>>({});
  const { activities } = useActivityLogs();

  // Filter activities for this prospect (last 5)
  const prospectActivities = activities
    .filter(log => log.prospect_id === prospect.id)
    .slice(0, 5);

  useEffect(() => {
    setLocalData({
      name: prospect.name,
      phone: prospect.phone,
      email: prospect.email || '',
      city: prospect.city || '',
      age: prospect.age || undefined,
      date_of_birth: prospect.date_of_birth || '',
      why_need: prospect.why_need || '',
      notes: prospect.notes || '',
      funnel_stage: prospect.funnel_stage,
      action_taken: prospect.action_taken,
      prospect_status: prospect.prospect_status,
      priority: prospect.priority,
      last_contact_date: prospect.last_contact_date,
    });
  }, [prospect]);

  const handleUpdate = (field: keyof Prospect, value: any) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    onUpdate(prospect.id, { [field]: value });
  };

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const openWhatsApp = () => {
    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(prospect.phone)}`;
  };

  const openCall = () => {
    window.location.href = `tel:${cleanPhoneNumber(prospect.phone)}`;
  };

  return (
    <tr className="bg-muted/20 animate-fade-in">
      <td colSpan={colSpan} className="p-0">
        <div className="p-4 border-t border-b border-border/30 bg-gradient-to-b from-muted/30 to-transparent">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <Button onClick={openCall} variant="outline" size="sm" className="gap-2">
              <Phone className="h-3.5 w-3.5" />
              Call
            </Button>
            <Button onClick={openWhatsApp} variant="outline" size="sm" className="gap-2 text-green-600 hover:text-green-600">
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </Button>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Basic Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Info</h4>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={localData.email || ''}
                    onChange={(e) => setLocalData(prev => ({ ...prev, email: e.target.value }))}
                    onBlur={() => localData.email !== prospect.email && handleUpdate('email', localData.email || null)}
                    placeholder="Email address"
                    className="h-8 text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={localData.city || ''}
                      onChange={(e) => setLocalData(prev => ({ ...prev, city: e.target.value }))}
                      onBlur={() => localData.city !== prospect.city && handleUpdate('city', localData.city || null)}
                      placeholder="City"
                      className="h-8 text-sm"
                    />
                  </div>
                  <Input
                    type="number"
                    value={localData.age || ''}
                    onChange={(e) => setLocalData(prev => ({ ...prev, age: e.target.value ? parseInt(e.target.value) : undefined }))}
                    onBlur={() => localData.age !== prospect.age && handleUpdate('age', localData.age || null)}
                    placeholder="Age"
                    className="h-8 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Cake className="h-3.5 w-3.5 text-muted-foreground" />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal h-8">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {localData.date_of_birth ? format(parseISO(localData.date_of_birth), 'PPP') : 'Date of birth'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-popover border-border z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={localData.date_of_birth ? parseISO(localData.date_of_birth) : undefined}
                        onSelect={(date) => {
                          const dateStr = date ? format(date, 'yyyy-MM-dd') : null;
                          setLocalData(prev => ({ ...prev, date_of_birth: dateStr || '' }));
                          handleUpdate('date_of_birth', dateStr);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Middle Column - Why/Need & Notes */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" />
                Why / Need
              </h4>
              <Textarea
                value={localData.why_need || ''}
                onChange={(e) => setLocalData(prev => ({ ...prev, why_need: e.target.value }))}
                onBlur={() => localData.why_need !== prospect.why_need && handleUpdate('why_need', localData.why_need || null)}
                placeholder="Why do they want to earn? Motivation..."
                className="min-h-[60px] text-sm resize-none"
              />
              
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</h4>
              <Textarea
                value={localData.notes || ''}
                onChange={(e) => setLocalData(prev => ({ ...prev, notes: e.target.value }))}
                onBlur={() => localData.notes !== prospect.notes && handleUpdate('notes', localData.notes || null)}
                placeholder="Call notes, action items..."
                className="min-h-[80px] text-sm resize-none"
              />
            </div>

            {/* Right Column - Activity */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Recent Activity
              </h4>
              
              {prospectActivities.length > 0 ? (
                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                  {prospectActivities.map((activity) => (
                    <div key={activity.id} className="text-xs bg-background/50 rounded-lg p-2 border border-border/30">
                      <p className="text-foreground">{activity.description}</p>
                      <p className="text-muted-foreground mt-1">
                        {formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No recent activity</p>
              )}

              {/* Meta Info */}
              <div className="pt-2 border-t border-border/30 space-y-1 text-xs text-muted-foreground">
                <p>Added {formatDistanceToNow(parseISO(prospect.date_added), { addSuffix: true })}</p>
                <p>Updated {formatDistanceToNow(parseISO(prospect.updated_at), { addSuffix: true })}</p>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}
