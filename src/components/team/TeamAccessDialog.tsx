import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, X, UserPlus, Eye, EyeOff, Mail, Loader2 } from 'lucide-react';
import { useTeamAccess } from '@/hooks/useTeamAccess';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

export function TeamAccessDialog() {
  const { 
    teamMembers, 
    sharedWithMe, 
    loading, 
    shareWithUpline,
    stopSharingWithLeader,
    removeFromTeam
  } = useTeamAccess();
  
  const [open, setOpen] = useState(false);
  const [uplineEmail, setUplineEmail] = useState('');
  const [sharing, setSharing] = useState(false);

  const handleShareWithUpline = async () => {
    if (!uplineEmail.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(uplineEmail.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    setSharing(true);
    const result = await shareWithUpline(uplineEmail.trim().toLowerCase());
    setSharing(false);
    
    if (result.success) {
      setUplineEmail('');
    } else {
      toast.error(result.error);
    }
  };

  const handleStopSharing = async (accessId: string) => {
    await stopSharingWithLeader(accessId);
  };

  const handleRemoveFromTeam = async (accessId: string) => {
    await removeFromTeam(accessId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Access
          </DialogTitle>
          <DialogDescription>Manage team sharing and access permissions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Share with Upline */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Share with Upline
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Enter upline's email address"
                  value={uplineEmail}
                  onChange={(e) => setUplineEmail(e.target.value.toLowerCase())}
                  className="pl-10"
                />
              </div>
              <Button 
                onClick={handleShareWithUpline}
                disabled={sharing || !uplineEmail.trim()}
                size="sm"
              >
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Share'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share your Follow Up list with your upline. They will be able to view your data immediately (read-only).
            </p>
          </div>


          {/* Team Members Sharing with Me (I can view their data) */}
          {sharedWithMe.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-500" />
                  Your Team (you can view their data)
                </Label>
                <div className="space-y-2">
                  {sharedWithMe.map(access => (
                    <div key={access.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{access.owner_display_name}</p>
                        <p className="text-xs text-muted-foreground">{access.owner_email || access.owner_nevorid}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFromTeam(access.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  View their Follow Up lists in the Follow Up page using the Team selector.
                </p>
              </div>
            </>
          )}

          {/* Uplines I'm Sharing With */}
          {teamMembers.filter(m => m.status === 'active').length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <EyeOff className="h-4 w-4 text-blue-500" />
                  You're sharing with
                </Label>
                <div className="space-y-2">
                  {teamMembers.filter(m => m.status === 'active').map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">
                          {member.display_name || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email || member.nevorid}</p>
                        <p className="text-xs text-muted-foreground">Can view your Follow Up list</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleStopSharing(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          )}

          {!loading && sharedWithMe.length === 0 && teamMembers.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No team connections yet</p>
              <p className="text-xs">Enter your upline's email to share your data with them.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
