import { useState, useEffect } from 'react';
import { Prospect, GENDER_OPTIONS } from '@/types/prospect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Phone, Trash2, ChevronDown, MapPin, User } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface MobileProspectCardProps {
  prospect: Prospect;
  index: number;
  onUpdate: (id: string, updates: Partial<Prospect>) => Promise<Prospect | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function MobileProspectCard({ prospect, index, onUpdate, onDelete }: MobileProspectCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localData, setLocalData] = useState({
    name: prospect.name,
    phone: prospect.phone,
    age_or_dob: prospect.age_or_dob || '',
    city: prospect.city || '',
    state: prospect.state || '',
    gender: prospect.gender || '',
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setLocalData({
      name: prospect.name,
      phone: prospect.phone,
      age_or_dob: prospect.age_or_dob || '',
      city: prospect.city || '',
      state: prospect.state || '',
      gender: prospect.gender || '',
    });
  }, [prospect]);

  const cleanPhoneNumber = (phone: string) => phone.replace(/[^0-9+]/g, '');

  const openWhatsApp = () => {
    window.location.href = `whatsapp://send?phone=${cleanPhoneNumber(prospect.phone)}`;
  };

  const openCall = () => {
    window.location.href = `tel:${cleanPhoneNumber(prospect.phone)}`;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(prospect.id);
    setIsDeleting(false);
  };

  const handleFieldUpdate = (field: keyof Prospect, value: any) => {
    if (value !== (prospect as any)[field]) {
      onUpdate(prospect.id, { [field]: value || null });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 shadow-sm overflow-hidden">
      {/* Header: Name + Phone + Quick Actions */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground bg-muted/60 rounded-md px-2 py-0.5">
                #{index}
              </span>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                  "group flex items-center gap-1.5 text-base font-bold text-foreground hover:text-primary transition-all duration-200 text-left truncate",
                  "hover:bg-primary/5 px-1.5 py-0.5 -ml-1.5 rounded-md active:scale-[0.98]",
                  isExpanded && "text-primary bg-primary/10"
                )}
              >
                <span className="truncate">{prospect.name}</span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform duration-200",
                  isExpanded && "rotate-180 text-primary"
                )} />
              </button>
            </div>
            <a 
              href={`tel:${cleanPhoneNumber(prospect.phone)}`}
              className="text-sm text-muted-foreground font-medium hover:text-accent transition-colors"
            >
              {localData.phone}
            </a>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={openCall}>
              <Phone className="h-4 w-4 text-accent" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600" onClick={openWhatsApp}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Info Chips Row */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 bg-muted/10">
        {prospect.age_or_dob && (
          <span className="text-xs bg-muted rounded-full px-2.5 py-1 text-muted-foreground">
            {prospect.age_or_dob}
          </span>
        )}
        {prospect.gender && (
          <span className="text-xs bg-muted rounded-full px-2.5 py-1 text-muted-foreground">
            {prospect.gender}
          </span>
        )}
        {(prospect.city || prospect.state) && (
          <span className="text-xs bg-muted rounded-full px-2.5 py-1 text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[prospect.city, prospect.state].filter(Boolean).join(', ')}
          </span>
        )}
      </div>

      {/* Expand/Delete Row */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-border/30">
        <span className="text-xs text-muted-foreground">
          Added {formatDistanceToNow(parseISO(prospect.date_added), { addSuffix: true })}
        </span>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-8 w-8 transition-all duration-200",
              isExpanded && "bg-primary/10 text-primary"
            )} 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete prospect?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {prospect.name}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive">
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Expanded Edit Card */}
      {isExpanded && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-muted/10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Edit Details</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <Input
                  value={localData.name}
                  onChange={(e) => setLocalData(prev => ({ ...prev, name: e.target.value }))}
                  onBlur={() => handleFieldUpdate('name', localData.name)}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                <Input
                  value={localData.phone}
                  onChange={(e) => setLocalData(prev => ({ ...prev, phone: e.target.value }))}
                  onBlur={() => handleFieldUpdate('phone', localData.phone)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Age / DOB</label>
                <Input
                  value={localData.age_or_dob}
                  onChange={(e) => setLocalData(prev => ({ ...prev, age_or_dob: e.target.value }))}
                  onBlur={() => handleFieldUpdate('age_or_dob', localData.age_or_dob)}
                  placeholder="25 or 1998-05-15"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Gender</label>
                <Select 
                  value={localData.gender || '__none__'} 
                  onValueChange={(val) => {
                    const newVal = val === '__none__' ? '' : val;
                    setLocalData(prev => ({ ...prev, gender: newVal }));
                    handleFieldUpdate('gender', newVal);
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="__none__">Select...</SelectItem>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">City</label>
                <Input
                  value={localData.city}
                  onChange={(e) => setLocalData(prev => ({ ...prev, city: e.target.value }))}
                  onBlur={() => handleFieldUpdate('city', localData.city)}
                  placeholder="City"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">State</label>
                <Input
                  value={localData.state}
                  onChange={(e) => setLocalData(prev => ({ ...prev, state: e.target.value }))}
                  onBlur={() => handleFieldUpdate('state', localData.state)}
                  placeholder="State"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
