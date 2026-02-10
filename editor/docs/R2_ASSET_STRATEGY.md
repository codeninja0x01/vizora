# R2 Asset Serving Strategy

## Current Implementation (Development)

**Approach:** API Proxy
**Endpoint:** `/api/assets/[...path]`

### Why This Works for Development:
- ✅ No CORS configuration needed
- ✅ Works immediately
- ✅ Easy to debug and monitor
- ⚠️ Not optimal for production (server load)

---

## Production Migration Strategy

### Step 1: Configure R2 CORS (One-time setup)

**Via Cloudflare Dashboard:**
1. Go to [Cloudflare R2](https://dash.cloudflare.com/) → **R2** → **videos** bucket
2. **Settings** tab → **CORS Policy**
3. Add:

```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com", "https://www.yourdomain.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 86400
  }
]
```

### Step 2: Enable Public Access

**Option A: Public R2 Domain**
- Settings → Public Access → Enable
- Use: `https://pub-xxx.r2.dev/`

**Option B: Custom Domain (Recommended)** ⭐
- Settings → Custom Domains → Add `assets.yourdomain.com`
- Use: `https://assets.yourdomain.com/`

### Step 3: Update Code

Create an environment variable to switch between modes:

**.env**
```bash
# Development: use proxy
R2_SERVE_MODE=proxy

# Production: use direct CDN
R2_SERVE_MODE=cdn
R2_CDN_URL=https://assets.yourdomain.com
# or
R2_CDN_URL=https://pub-xxx.r2.dev
```

**lib/r2.ts**
```typescript
export class R2StorageService {
  // ... existing code ...

  getAssetUrl(fileName: string): string {
    const mode = process.env.R2_SERVE_MODE || 'proxy';

    if (mode === 'cdn') {
      // Production: Direct CDN access
      const cdnUrl = process.env.R2_CDN_URL || this.cdn;
      return `${cdnUrl}/${fileName}`;
    }

    // Development: API proxy
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/assets/${fileName}`;
  }
}
```

**Update all API endpoints:**
```typescript
// Before:
const proxyUrl = `${baseUrl}/api/assets/${fileName}`;

// After:
const assetUrl = r2.getAssetUrl(fileName);
```

---

## Performance Comparison

| Metric | API Proxy | Direct CDN |
|--------|-----------|------------|
| **Latency** | ~200-500ms | ~20-50ms |
| **Server Load** | High | None |
| **Bandwidth Cost** | Your server | R2/CDN |
| **Scalability** | Limited | Unlimited |
| **Caching** | Server only | Edge locations |

---

## Cost Comparison (Example: 10,000 asset requests/day)

### API Proxy (Current)
- Server bandwidth: ~1GB/day
- Server compute: ~100ms per request
- **Estimate:** $5-10/month (server costs)

### Direct CDN
- R2 bandwidth: ~1GB/day (Class A operations)
- CDN cache hits: ~95%
- **Estimate:** $0.50-1/month (R2 + Cloudflare)

**Savings:** ~90% reduction in costs

---

## Security Considerations

### Public Assets (Audio, Video, Images)
✅ **Use Direct CDN** - Fast, efficient, cost-effective

### Private/Sensitive Assets (User uploads, private media)
✅ **Use Presigned URLs or API Proxy** with authentication

### Hybrid Approach (Recommended)
```typescript
// Public assets → Direct CDN
if (isPublicAsset) {
  return r2.getAssetUrl(fileName); // CDN
}

// Private assets → Authenticated proxy
return `/api/private-assets/${fileName}`; // Requires auth
```

---

## Testing Checklist

Before production migration:

- [ ] CORS configured in Cloudflare Dashboard
- [ ] Public access enabled (or custom domain configured)
- [ ] Test direct CDN URL in browser: `curl -I https://pub-xxx.r2.dev/test.mp3`
- [ ] Verify CORS headers present: `Access-Control-Allow-Origin: *`
- [ ] Update environment variables for production
- [ ] Test asset loading in production build
- [ ] Monitor R2 bandwidth usage
- [ ] Set up CDN cache monitoring

---

## Troubleshooting

### CORS Errors After Migration
**Problem:** "No 'Access-Control-Allow-Origin' header"
**Solution:** Verify CORS policy in R2 bucket settings

### 404 Errors
**Problem:** Assets not found
**Solution:** Check public access is enabled, verify file exists in R2

### Slow Performance
**Problem:** Assets loading slowly
**Solution:** Ensure using CDN URL, not internal endpoint

---

## Recommended: Use Feature Flag

Create a gradual rollout:

```typescript
// lib/feature-flags.ts
export const useDirectCDN = () => {
  // Gradually enable for users
  const rolloutPercentage = 10; // Start with 10%
  const userId = getCurrentUserId();
  return hashUserId(userId) % 100 < rolloutPercentage;
};

// In API endpoints:
if (useDirectCDN()) {
  return r2.getAssetUrl(fileName); // Direct CDN
}
return `${baseUrl}/api/assets/${fileName}`; // Proxy
```

This allows you to:
- Test with real traffic
- Monitor performance
- Rollback if issues occur
- Gradually increase percentage
