

# Fix Broken R2 Image Display (Stability Fix)

## Problem Summary
Images stored in Cloudflare R2 are displaying as broken (❓ icon) because:
1. **2 existing records** use private S3 API URLs (`r2.cloudflarestorage.com`) instead of the public endpoint
2. Edge functions need to consistently return `r2.dev` URLs for new uploads

## Current State Analysis

### Database Records Needing Migration
| Table | URL Type | Count |
|-------|----------|-------|
| `funnel_price_options` | QR code image | 1 |
| `funnel_payments` | Payment screenshot | 1 |
| `funnels` | Thumbnail | 0 |

### Edge Function Status
- `R2_PUBLIC_URL` secret is **already configured** ✓
- `r2-get-upload-url` has public URL logic but may not include bucket name in path
- `upload-payment-screenshot` has similar issue

## Implementation Tasks

### Task 1: Database Migration (SQL)
Update existing private URLs to public format:

```sql
-- Funnel price option QR images
UPDATE funnel_price_options
SET qr_image_url = REPLACE(
  qr_image_url,
  'https://b2cc3a6e16425fd28d16161e9acaa822.r2.cloudflarestorage.com/nevorai/',
  'https://pub-d0cae7c30eea4f949d9c33c730813937.r2.dev/nevorai/'
)
WHERE qr_image_url IS NOT NULL
  AND qr_image_url LIKE '%r2.cloudflarestorage.com%';

-- Payment screenshots
UPDATE funnel_payments
SET upi_screenshot_url = REPLACE(
  upi_screenshot_url,
  'https://b2cc3a6e16425fd28d16161e9acaa822.r2.cloudflarestorage.com/nevorai/',
  'https://pub-d0cae7c30eea4f949d9c33c730813937.r2.dev/nevorai/'
)
WHERE upi_screenshot_url IS NOT NULL
  AND upi_screenshot_url LIKE '%r2.cloudflarestorage.com%';

-- Funnel thumbnails (precautionary)
UPDATE funnels
SET thumbnail_url = REPLACE(
  thumbnail_url,
  'https://b2cc3a6e16425fd28d16161e9acaa822.r2.cloudflarestorage.com/nevorai/',
  'https://pub-d0cae7c30eea4f949d9c33c730813937.r2.dev/nevorai/'
)
WHERE thumbnail_url IS NOT NULL
  AND thumbnail_url LIKE '%r2.cloudflarestorage.com%';
```

### Task 2: Fix Edge Functions for Future Uploads

#### `r2-get-upload-url/index.ts`
**Issue:** The public URL construction doesn't include the bucket name (`nevorai/`) in the path when using `R2_PUBLIC_URL`.

**Current code (line 242-245):**
```typescript
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL');
const publicUrl = R2_PUBLIC_URL 
  ? `${R2_PUBLIC_URL}/${objectKey}`
  : `https://${host}/${R2_BUCKET_NAME}/${objectKey}`;
```

**Fixed code:**
```typescript
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL');
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')!;
const publicUrl = R2_PUBLIC_URL 
  ? `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${objectKey}`
  : `https://${host}/${R2_BUCKET_NAME}/${objectKey}`;
```

#### `upload-payment-screenshot/index.ts`
**Issue:** Same problem - missing bucket name in public URL path.

**Current code (line 151-154):**
```typescript
const publicUrl = Deno.env.get('R2_PUBLIC_URL') 
  ? `${Deno.env.get('R2_PUBLIC_URL')}/${objectKey}`
  : `https://${host}/${bucketName}/${objectKey}`;
```

**Fixed code:**
```typescript
const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL');
const publicUrl = R2_PUBLIC_URL 
  ? `${R2_PUBLIC_URL}/${bucketName}/${objectKey}`
  : `https://${host}/${bucketName}/${objectKey}`;
```

### Task 3: Add Download QR Button with Blob Fetch

Add a download helper function to `QRCodeUploader.tsx` that fetches the image as a blob and triggers a browser download (avoiding cross-origin issues):

```typescript
const handleDownload = async () => {
  if (!value) return;
  
  try {
    const response = await fetch(value);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    toast.success('QR code downloaded');
  } catch (error) {
    toast.error('Failed to download QR code');
  }
};
```

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/r2-get-upload-url/index.ts` | Fix public URL to include bucket name |
| `supabase/functions/upload-payment-screenshot/index.ts` | Fix public URL to include bucket name |
| `src/components/funnels/QRCodeUploader.tsx` | Add download button with blob fetch |
| Database migration | Update 2 existing records |

## Verification Checklist
After implementation:
- [ ] Existing QR code images display correctly
- [ ] Existing payment screenshots display correctly  
- [ ] New QR uploads store `r2.dev` URLs
- [ ] New payment screenshots store `r2.dev` URLs
- [ ] Download QR button works correctly
- [ ] Thumbnails display in funnel cards
- [ ] QR codes display in UPI payment modal

## What's NOT Changing
- Video playback (continues using signed URLs)
- No new edge functions
- No backend architecture changes
- No signed URLs for images

