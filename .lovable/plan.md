

# Fix Plan: QR Code Upload Error

## Problem Analysis

The QR code upload is failing because:

1. **Missing `file_size`** - The frontend sends `file_name`, `content_type`, and `folder`, but the backend requires `file_size`
2. **Missing Authorization** - The frontend doesn't send the JWT token, so the request fails authentication (returns 401)
3. **Image type not allowed** - The backend only allows video types for JWT auth (`video/mp4`, `video/webm`, `video/quicktime`), not images

## Root Cause

The `r2-get-upload-url` edge function was designed for video uploads, but `QRCodeUploader` is trying to use it for QR code images. The backend needs to support image uploads for authenticated funnel owners.

---

## Solution

### 1. Update `QRCodeUploader.tsx`

**Changes needed:**
- Add `file_size` to the request body
- Include the user's JWT token in the Authorization header
- Remove unused `folder` parameter

```typescript
// Current (broken):
body: JSON.stringify({
  file_name: file.name,
  content_type: file.type,
  folder: 'qr-codes',
})

// Fixed:
body: JSON.stringify({
  file_name: file.name,
  file_size: file.size,
  content_type: file.type,
})
```

Also need to get the auth token from Supabase client.

---

### 2. Update `r2-get-upload-url` Edge Function

**Changes needed:**
- Allow image types for JWT-authenticated users (funnel owners uploading QR codes)
- Use different paths for different upload types

Currently the backend only allows:
- **JWT auth**: Videos only (`video/mp4`, `video/webm`, `video/quicktime`)
- **Lead token**: Images only (for payment proofs)

Need to change to:
- **JWT auth**: Videos OR images (for QR codes, thumbnails, etc.)
- **Lead token**: Images only (for payment proofs)

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/funnels/QRCodeUploader.tsx` | Add `file_size`, add Authorization header |
| `supabase/functions/r2-get-upload-url/index.ts` | Allow image uploads for JWT auth |

---

## Technical Implementation

### QRCodeUploader.tsx Changes

```typescript
import { supabase } from '@/integrations/supabase/client';

const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // ... validation ...

  setIsUploading(true);

  try {
    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      toast.error('Please log in to upload files');
      return;
    }

    const response = await fetch(`${APP_SUPABASE_URL}/functions/v1/r2-get-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        file_name: file.name,
        file_size: file.size,  // ← Add this
        content_type: file.type,
      }),
    });
    // ... rest of upload logic
  }
}
```

### r2-get-upload-url Changes

```typescript
// For JWT auth, allow both videos AND images
if (!isLeadAuth) {
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedTypes = [...allowedVideoTypes, ...allowedImageTypes];
  
  if (!allowedTypes.includes(content_type)) {
    return new Response(
      JSON.stringify({ error: 'Invalid file type' }),
      { status: 400, ... }
    );
  }

  // Different size limits
  const isVideo = allowedVideoTypes.includes(content_type);
  const maxSize = isVideo ? 500 * 1024 * 1024 : 10 * 1024 * 1024;
  
  if (file_size > maxSize) {
    return new Response(
      JSON.stringify({ error: `File too large. Max ${isVideo ? '500MB' : '10MB'}` }),
      { status: 400, ... }
    );
  }
}

// Different storage paths based on content type
let objectKey: string;
if (isLeadAuth) {
  objectKey = `payment-proofs/${leadId}/${timestamp}-${sanitizedName}`;
} else if (content_type.startsWith('image/')) {
  objectKey = `qr-codes/${userId}/${timestamp}-${sanitizedName}`;  // New path for images
} else {
  objectKey = `videos/${userId}/${timestamp}-${sanitizedName}`;
}

// Only create video_assets record for actual videos
if (!isLeadAuth && content_type.startsWith('video/')) {
  // Create video_assets record
}
```

---

## Summary

Two changes needed:

1. **Frontend**: Add `file_size` and `Authorization` header to QRCodeUploader
2. **Backend**: Allow image types for JWT-authenticated users and skip video_assets record for images

