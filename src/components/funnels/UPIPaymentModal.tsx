import { useState, useRef } from 'react';
import { FunnelPriceOption } from '@/types/funnels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, Loader2, CheckCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

const APP_SUPABASE_URL = 'https://kisankusogixarejjphi.supabase.co';

interface UPIPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceOptions: FunnelPriceOption[];
  funnelId: string;
  leadId: string;
  accessToken: string;
  defaultAmount?: number;
  defaultUpiId?: string;
  onPaymentSubmitted?: () => void;
}

type PaymentPhase = 'select' | 'uploading' | 'submitted';

export function UPIPaymentModal({
  open,
  onOpenChange,
  priceOptions,
  funnelId,
  leadId,
  accessToken,
  defaultAmount,
  defaultUpiId,
  onPaymentSubmitted,
}: UPIPaymentModalProps) {
  const [phase, setPhase] = useState<PaymentPhase>('select');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    priceOptions.find(o => o.is_default)?.id || priceOptions[0]?.id || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = priceOptions.find(o => o.id === selectedOptionId);
  
  // Fallback to funnel defaults if no price options
  const displayAmount = selectedOption?.amount || defaultAmount || 0;
  const displayUpiId = selectedOption?.upi_id || defaultUpiId || '';
  const displayQr = selectedOption?.qr_image_url;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be smaller than 10MB');
      return;
    }

    setIsUploading(true);
    setPhase('uploading');

    try {
      // Get presigned URL for payment screenshot
      const urlResponse = await fetch(`${APP_SUPABASE_URL}/functions/v1/upload-payment-screenshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: leadId,
          access_token: accessToken,
          file_name: file.name,
          content_type: file.type,
        }),
      });

      if (!urlResponse.ok) {
        const error = await urlResponse.json();
        throw new Error(error.error || 'Failed to get upload URL');
      }

      const { upload_url, public_url } = await urlResponse.json();

      // Upload file to R2
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload screenshot');
      }

      // Submit payment proof
      const proofResponse = await fetch(`${APP_SUPABASE_URL}/functions/v1/submit-payment-proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: leadId,
          funnel_id: funnelId,
          price_option_id: selectedOptionId,
          amount: displayAmount,
          screenshot_url: public_url,
          access_token: accessToken,
        }),
      });

      if (!proofResponse.ok) {
        const error = await proofResponse.json();
        throw new Error(error.error || 'Failed to submit payment proof');
      }

      setPhase('submitted');
      onPaymentSubmitted?.();
    } catch (error) {
      console.error('Payment submission failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit payment');
      setPhase('select');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClose = () => {
    if (phase === 'submitted') {
      onOpenChange(false);
    } else if (!isUploading) {
      onOpenChange(false);
    }
  };

  const resetState = () => {
    setPhase('select');
    setSelectedOptionId(priceOptions.find(o => o.is_default)?.id || priceOptions[0]?.id || null);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleClose();
        setTimeout(resetState, 300);
      } else {
        onOpenChange(true);
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {phase === 'submitted' ? 'Payment Submitted' : 'Complete Payment'}
          </DialogTitle>
        </DialogHeader>

        {phase === 'submitted' ? (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Payment Pending Verification</h3>
            <p className="text-muted-foreground text-sm">
              Your payment screenshot has been submitted. We'll verify it shortly and grant you access.
            </p>
            <Button className="mt-6" onClick={handleClose}>
              Got it
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Price Options Selection */}
            {priceOptions.length > 1 && (
              <div className="space-y-3">
                <Label>Select Plan</Label>
                <RadioGroup
                  value={selectedOptionId || ''}
                  onValueChange={setSelectedOptionId}
                >
                  {priceOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedOptionId === option.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={option.id} />
                        <span className="font-medium">{option.label}</span>
                      </div>
                      <span className="font-bold">₹{option.amount}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Amount Display */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Amount to Pay</div>
              <div className="text-3xl font-bold">₹{displayAmount}</div>
            </div>

            {/* QR Code */}
            {displayQr && (
              <div className="flex justify-center">
                <img 
                  src={displayQr} 
                  alt="UPI QR Code" 
                  className="w-48 h-48 object-contain bg-white rounded-lg border p-2"
                />
              </div>
            )}

            {/* UPI ID */}
            {displayUpiId && (
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Or pay to UPI ID</div>
                <div className="font-mono font-medium text-lg">{displayUpiId}</div>
              </div>
            )}

            {/* Upload Screenshot */}
            <div className="space-y-2">
              <Label>Upload Payment Screenshot</Label>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isUploading 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-primary/50'
                }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Uploading...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Click to upload payment screenshot
                    </span>
                  </div>
                )}
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              After payment, upload a screenshot of the successful transaction. 
              We'll verify and grant access within 24 hours.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
