import { useState } from 'react';
import { 
  useFunnelPriceOptions, 
  useCreatePriceOption, 
  useUpdatePriceOption, 
  useDeletePriceOption,
  FunnelPriceOption 
} from '@/hooks/useFunnelPriceOptions';
import { QRCodeUploader } from './QRCodeUploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PriceOptionsManagerProps {
  funnelId: string;
  defaultUpiId?: string;
}

interface PriceOptionFormData {
  label: string;
  amount: number;
  upi_id: string;
  qr_image_url: string;
  is_default: boolean;
}

const defaultFormData: PriceOptionFormData = {
  label: '',
  amount: 0,
  upi_id: '',
  qr_image_url: '',
  is_default: false,
};

export function PriceOptionsManager({ funnelId, defaultUpiId }: PriceOptionsManagerProps) {
  const { data: options = [], isLoading } = useFunnelPriceOptions(funnelId);
  const createOption = useCreatePriceOption();
  const updateOption = useUpdatePriceOption();
  const deleteOption = useDeletePriceOption();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<FunnelPriceOption | null>(null);
  const [formData, setFormData] = useState<PriceOptionFormData>(defaultFormData);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingOption(null);
    setFormData({
      ...defaultFormData,
      upi_id: defaultUpiId || '',
      is_default: options.length === 0,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (option: FunnelPriceOption) => {
    setEditingOption(option);
    setFormData({
      label: option.label,
      amount: option.amount,
      upi_id: option.upi_id || '',
      qr_image_url: option.qr_image_url || '',
      is_default: option.is_default,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.label.trim()) {
      toast.error('Please enter a label');
      return;
    }

    if (formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      if (editingOption) {
        await updateOption.mutateAsync({
          id: editingOption.id,
          label: formData.label,
          amount: formData.amount,
          upi_id: formData.upi_id || undefined,
          qr_image_url: formData.qr_image_url || undefined,
          is_default: formData.is_default,
        });
      } else {
        await createOption.mutateAsync({
          funnel_id: funnelId,
          label: formData.label,
          amount: formData.amount,
          upi_id: formData.upi_id || undefined,
          qr_image_url: formData.qr_image_url || undefined,
          is_default: formData.is_default,
        });
      }
      setIsDialogOpen(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteOption.mutateAsync(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base">Price Options</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Add Option
        </Button>
      </div>

      {options.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p>No price options yet.</p>
            <p className="text-sm">Add at least one price option for UPI payments.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {options.map((option) => (
            <Card key={option.id} className={option.is_default ? 'ring-2 ring-primary' : ''}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {option.qr_image_url && (
                      <img 
                        src={option.qr_image_url} 
                        alt="QR" 
                        className="w-10 h-10 object-contain bg-white rounded border"
                      />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{option.label}</span>
                        {option.is_default && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ₹{option.amount}
                        {option.upi_id && ` • ${option.upi_id}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(option)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmId(option.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? 'Edit Price Option' : 'Add Price Option'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="option-label">Label *</Label>
              <Input
                id="option-label"
                placeholder="e.g., Basic, Premium, VIP"
                value={formData.label}
                onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="option-amount">Amount (₹) *</Label>
              <Input
                id="option-amount"
                type="number"
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="option-upi">UPI ID</Label>
              <Input
                id="option-upi"
                placeholder="yourname@upi"
                value={formData.upi_id}
                onChange={(e) => setFormData(prev => ({ ...prev, upi_id: e.target.value }))}
              />
            </div>

            <QRCodeUploader
              value={formData.qr_image_url || undefined}
              onChange={(url) => setFormData(prev => ({ ...prev, qr_image_url: url || '' }))}
            />

            <div className="flex items-center justify-between">
              <div>
                <Label>Default Option</Label>
                <p className="text-sm text-muted-foreground">
                  Pre-selected when user opens payment
                </p>
              </div>
              <Switch
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSave}
              disabled={createOption.isPending || updateOption.isPending}
            >
              {(createOption.isPending || updateOption.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingOption ? 'Save Changes' : 'Add Option'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Price Option?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Are you sure you want to delete this price option?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
