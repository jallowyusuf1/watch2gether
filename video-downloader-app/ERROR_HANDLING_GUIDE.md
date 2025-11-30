# Error Handling Guide - YouTube API Integration

## Overview
This document outlines the comprehensive error handling system implemented to prevent and handle YouTube API errors gracefully.

## Error Handling Layers

### 1. Server-Side (server.cjs)
**Location:** `/api/youtube` endpoint

**Validations:**
- ✅ Video ID presence check
- ✅ API key presence check
- ✅ Video ID format validation (11 characters)
- ✅ Request timeout (10 seconds)

**Error Responses:**
- `400` - Missing or invalid video ID
- `403` - Access denied (quota exceeded, invalid credentials, forbidden)
- `404` - Video not found
- `500` - Server configuration error (missing API key)
- `503` - Network error (connection refused)
- `504` - Request timeout

**Error Message Format:**
```json
{
  "error": "Error type",
  "message": "User-friendly message",
  "reason": "YouTube API error reason (if available)"
}
```

### 2. Client-Side Service (youtubeService.ts)
**Location:** `src/services/youtubeService.ts`

**Error Handling:**
- Maps HTTP status codes to user-friendly messages
- Handles network errors (timeout, connection refused)
- Provides specific messages for common error reasons:
  - `quotaExceeded` → "YouTube API quota exceeded..."
  - `invalidCredentials` → "Invalid YouTube API key..."
  - `videoNotFound` → "Video not found..."
  - `forbidden` → "Access denied..."

### 3. UI Component (DownloadForm.tsx)
**Location:** `src/components/DownloadForm.tsx`

**Error Display:**
- Shows user-friendly error messages
- Provides actionable guidance
- Handles all error types with specific messages

## Common Errors and Solutions

### 1. YouTube API Quota Exceeded
**Error:** `quotaExceeded`
**Message:** "YouTube API quota exceeded. The daily limit has been reached."

**Solutions:**
- Wait 24 hours for quota reset
- Use a different YouTube API key
- Reduce API usage frequency

### 2. Invalid API Key
**Error:** `invalidCredentials`
**Message:** "Invalid YouTube API key. Please check your configuration."

**Solutions:**
- Verify API key in `.env` file
- Ensure key is not expired
- Check API key permissions in Google Cloud Console

### 3. Video Not Found
**Error:** `videoNotFound` or `404`
**Message:** "Video not found. The video may have been deleted..."

**Solutions:**
- Verify video URL is correct
- Check if video is still available on YouTube
- Ensure video is not private or deleted

### 4. Access Denied
**Error:** `forbidden` or `403`
**Message:** "Access denied. The video may be private or restricted."

**Solutions:**
- Video may be private or age-restricted
- API key may lack necessary permissions
- Check video privacy settings

### 5. Network Errors
**Error:** `ECONNREFUSED`, `ENOTFOUND`, `ETIMEDOUT`
**Message:** "Cannot connect to download server..." or "Request timeout..."

**Solutions:**
- Ensure server is running (`npm run server`)
- Check internet connection
- Verify server is accessible on port 3000
- Check firewall settings

### 6. Server Configuration Error
**Error:** Missing API key
**Message:** "YouTube API key is not configured..."

**Solutions:**
- Add `YT_API_KEY` to `.env` file
- Restart server after adding key
- Verify key is loaded correctly

## Prevention Measures

### 1. Input Validation
- ✅ Video ID format validation (11 characters)
- ✅ URL parsing with regex patterns
- ✅ Empty/null checks

### 2. Error Logging
- ✅ Server-side console logging
- ✅ Client-side error logging
- ✅ Detailed error information for debugging

### 3. Graceful Degradation
- ✅ Clear error messages
- ✅ Actionable user guidance
- ✅ No application crashes

### 4. Monitoring
- ✅ Server logs in `/tmp/server-output.log`
- ✅ Browser console error tracking
- ✅ Error message tracking

## Testing Checklist

- [ ] Test with valid video ID
- [ ] Test with invalid video ID
- [ ] Test with missing API key
- [ ] Test with quota exceeded
- [ ] Test with network errors
- [ ] Test with private video
- [ ] Test with deleted video
- [ ] Test server timeout scenarios

## Server Restart Command
```bash
cd video-downloader-app
npm run server
```

## Debugging Steps

1. **Check server logs:**
   ```bash
   tail -f /tmp/server-output.log
   ```

2. **Test API endpoint directly:**
   ```bash
   curl "http://localhost:3000/api/youtube?id=VIDEO_ID"
   ```

3. **Verify API key:**
   ```bash
   cd video-downloader-app
   node -e "require('dotenv').config(); console.log('API Key:', process.env.YT_API_KEY ? 'Set' : 'Missing');"
   ```

4. **Check browser console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed requests

## Error Recovery

The system automatically:
- ✅ Provides clear error messages
- ✅ Suggests solutions
- ✅ Prevents application crashes
- ✅ Allows retry after fixing issues

## Future Improvements

- [ ] Add error retry mechanism with exponential backoff
- [ ] Implement error rate limiting
- [ ] Add error notification system
- [ ] Create error analytics dashboard
- [ ] Add automatic API key rotation

