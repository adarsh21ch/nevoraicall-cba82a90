import { useState } from 'react';
import { useAdminOffers, useAdminPlans, Offer } from '@/hooks/useAdminConfig';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Plus, Pencil, Trash2, Tag, Percent, IndianRupee, Calendar, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export function OffersManager() {
  const { offers, loading, createOffer, updateOffer, deleteOffer } = useAdminOffers();
  const { plans } = useAdminPlans();
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleToggleActive = async (offer: Offer) => {
    try {
      await updateOffer(offer.id, { is_active: !offer.is_active });
      toast.success(`Offer ${offer.is_active ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast.error('Failed to update offer');
    }
  };

  const handleDelete = async (offer: Offer) => {
    if (!confirm(`Delete "${offer.offer_name}"?`)) return;
    try {
      await deleteOffer(offer.id);
      toast.success('Offer deleted');
    } catch (err) {
      toast.error('Failed to delete offer');
    }
  };

  const openEditSheet = (offer: Offer | null) => {
    setEditingOffer(offer);
    setIsCreating(!offer);
    setSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeOffers = offers.filter(o => o.is_active && new Date(o.end_date) >= new Date());
  const expiredOffers = offers.filter(o => !o.is_active || new Date(o.end_date) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Offers & Discounts</h2>
          <p className="text-sm text-muted-foreground">Manage promotional offers and coupon codes</p>
        </div>
        <Button size="sm" onClick={() => openEditSheet(null)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Offer
        </Button>
      </div>

      {/* Active Offers */}
      {activeOffers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Active Offers</h3>
          <div className="grid gap-3">
            {activeOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                plans={plans}
                onEdit={() => openEditSheet(offer)}
                onToggleActive={() => handleToggleActive(offer)}
                onDelete={() => handleDelete(offer)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Expired/Inactive Offers */}
      {expiredOffers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Expired / Inactive</h3>
          <div className="grid gap-3 opacity-60">
            {expiredOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                plans={plans}
                onEdit={() => openEditSheet(offer)}
                onToggleActive={() => handleToggleActive(offer)}
                onDelete={() => handleDelete(offer)}
              />
            ))}
          </div>
        </div>
      )}

      {offers.length === 0 && (
        <Card className="p-8 text-center">
          <Gift className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No offers yet</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => openEditSheet(null)}>
            Create First Offer
          </Button>
        </Card>
      )}

      {/* Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{isCreating ? 'Create New Offer' : 'Edit Offer'}</SheetTitle>
          </SheetHeader>
          <OfferEditForm
            offer={editingOffer}
            plans={plans}
            onSave={async (data) => {
              try {
                if (isCreating) {
                  await createOffer(data);
                  toast.success('Offer created');
                } else if (editingOffer) {
                  await updateOffer(editingOffer.id, data);
                  toast.success('Offer updated');
                }
                setSheetOpen(false);
              } catch (err) {
                toast.error('Failed to save offer');
              }
            }}
            onCancel={() => setSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function OfferCard({
  offer,
  plans,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  offer: Offer;
  plans: any[];
  onEdit: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const applicablePlanNames = plans
    .filter(p => offer.applicable_plan_ids.includes(p.id))
    .map(p => p.plan_name);

  const isExpired = new Date(offer.end_date) < new Date();

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="h-4 w-4 text-primary" />
            <span className="font-semibold">{offer.offer_name}</span>
            {offer.promo_code && (
              <Badge variant="secondary" className="text-xs font-mono">
                {offer.promo_code}
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                Expired
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">
              {offer.discount_type === 'percent' ? (
                <Percent className="h-3 w-3" />
              ) : (
                <IndianRupee className="h-3 w-3" />
              )}
              {offer.discount_value}{offer.discount_type === 'percent' ? '%' : '₹'} off
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(offer.start_date), 'dd MMM')} - {format(new Date(offer.end_date), 'dd MMM yyyy')}
            </span>
            {applicablePlanNames.length > 0 && (
              <span className="truncate max-w-[200px]">
                Plans: {applicablePlanNames.join(', ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Switch
            checked={offer.is_active}
            onCheckedChange={onToggleActive}
            aria-label="Toggle active"
          />
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function OfferEditForm({
  offer,
  plans,
  onSave,
  onCancel,
}: {
  offer: Offer | null;
  plans: any[];
  onSave: (data: Partial<Offer>) => Promise<void>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    offer_name: offer?.offer_name || '',
    discount_type: offer?.discount_type || 'percent',
    discount_value: offer?.discount_value || 10,
    promo_code: offer?.promo_code || '',
    start_date: offer?.start_date ? format(new Date(offer.start_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    end_date: offer?.end_date ? format(new Date(offer.end_date), 'yyyy-MM-dd') : '',
    max_uses_per_user: offer?.max_uses_per_user || '',
    applicable_plan_ids: offer?.applicable_plan_ids || [],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...formData,
        discount_type: formData.discount_type as 'percent' | 'flat',
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        max_uses_per_user: formData.max_uses_per_user ? parseInt(formData.max_uses_per_user as string) : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePlan = (planId: string) => {
    setFormData(prev => ({
      ...prev,
      applicable_plan_ids: prev.applicable_plan_ids.includes(planId)
        ? prev.applicable_plan_ids.filter(id => id !== planId)
        : [...prev.applicable_plan_ids, planId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div className="space-y-2">
        <Label htmlFor="offer_name">Offer Name</Label>
        <Input
          id="offer_name"
          placeholder="e.g., Welcome 50% Off"
          value={formData.offer_name}
          onChange={(e) => setFormData(prev => ({ ...prev, offer_name: e.target.value }))}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Discount Type</Label>
          <Select
            value={formData.discount_type}
            onValueChange={(value: 'percent' | 'flat') => setFormData(prev => ({ ...prev, discount_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percent">Percentage (%)</SelectItem>
              <SelectItem value="flat">Flat Amount (₹)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount_value">Value</Label>
          <Input
            id="discount_value"
            type="number"
            min="1"
            value={formData.discount_value}
            onChange={(e) => setFormData(prev => ({ ...prev, discount_value: parseInt(e.target.value) || 0 }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="promo_code">Promo Code (optional)</Label>
        <Input
          id="promo_code"
          placeholder="WELCOME50"
          value={formData.promo_code}
          onChange={(e) => setFormData(prev => ({ ...prev, promo_code: e.target.value.toUpperCase() }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_uses">Max Uses per User (optional)</Label>
        <Input
          id="max_uses"
          type="number"
          min="1"
          placeholder="Unlimited"
          value={formData.max_uses_per_user}
          onChange={(e) => setFormData(prev => ({ ...prev, max_uses_per_user: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Applicable Plans</Label>
        <div className="flex flex-wrap gap-2">
          {plans.map((plan) => (
            <Badge
              key={plan.id}
              variant={formData.applicable_plan_ids.includes(plan.id) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => togglePlan(plan.id)}
            >
              {plan.plan_name}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Click to select/deselect plans</p>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Offer
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
