import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { Prospect, GENDER_OPTIONS } from '@/types/prospect';
import { useIsMobile } from '@/hooks/use-mobile';
import { addProspectSchema } from '@/lib/validations';
import { toast } from 'sonner';

interface AddProspectDialogProps {
  onAdd: (prospect: Partial<Prospect>) => Promise<Prospect | null>;
}

export function AddProspectDialog({ onAdd }: AddProspectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ageOrDob, setAgeOrDob] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [gender, setGender] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const isMobile = useIsMobile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate with zod
    const result = addProspectSchema.safeParse({
      name: name.trim(),
      phone: phone.trim(),
      age_or_dob: ageOrDob.trim() || '',
      city: city.trim() || '',
      state: state.trim() || '',
      gender: gender || '',
    });

    if (!result.success) {
      const fieldErrors: { name?: string; phone?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as 'name' | 'phone';
        if (field === 'name' || field === 'phone') {
          if (!fieldErrors[field]) {
            fieldErrors[field] = err.message;
          }
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const prospectResult = await onAdd({
      name: result.data.name,
      phone: result.data.phone,
      age_or_dob: result.data.age_or_dob,
      city: result.data.city,
      state: result.data.state,
      gender: result.data.gender,
    });

    if (prospectResult) {
      setName('');
      setPhone('');
      setAgeOrDob('');
      setCity('');
      setState('');
      setGender('');
      setErrors({});
      setOpen(false);
      toast.success('Prospect added successfully');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          {isMobile ? 'Add' : 'Add Prospect'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle>Add New Prospect</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              maxLength={100}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter phone number"
              maxLength={20}
              className={errors.phone ? 'border-destructive' : ''}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ageOrDob">Age / Date of Birth</Label>
              <Input
                id="ageOrDob"
                value={ageOrDob}
                onChange={(e) => setAgeOrDob(e.target.value)}
                placeholder="e.g. 25 or 1998-05-15"
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger id="gender">
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
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter city"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="Enter state"
                maxLength={100}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Prospect'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
