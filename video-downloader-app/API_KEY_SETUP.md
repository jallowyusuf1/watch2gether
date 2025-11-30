# YouTube API Key Setup Guide

## ✅ API Key Updated

Your new API key has been successfully updated:
- `YT_API_KEY` in `.env` → Updated
- `VITE_YOUTUBE_API_KEY` in `.env` → Updated
- Server restarted → Using new key

**New Key:** `AIzaSyC-cYmJXGA0X6tnF-QOumQzQNyp-VhBO-8`

## ⚠️ Current Status

The new API key is also showing quota exceeded. This could mean:

### Possible Causes:

1. **Same Google Cloud Project**
   - If the new key is from the same project, it shares the same quota
   - Solution: Create a new project with a new API key

2. **YouTube Data API v3 Not Enabled**
   - The API might not be enabled for this key
   - Solution: Enable YouTube Data API v3 in Google Cloud Console

3. **IP-Based Rate Limiting**
   - Google may be rate limiting your IP address
   - Solution: Wait a few hours or use a different network

4. **Key Restrictions**
   - The key might have restrictions that prevent usage
   - Solution: Check key restrictions in Google Cloud Console

## 🔧 How to Fix

### Step 1: Verify API is Enabled
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Library"
4. Search for "YouTube Data API v3"
5. Click "Enable" if not already enabled

### Step 2: Check Quota
1. Go to "APIs & Services" → "Quotas"
2. Find "YouTube Data API v3"
3. Check your daily quota limit
4. Check current usage

### Step 3: Create New Project (If Needed)
1. Create a new Google Cloud project
2. Enable YouTube Data API v3
3. Create a new API key
4. Update `.env` with the new key
5. Restart server

### Step 4: Check Key Restrictions
1. Go to "APIs & Services" → "Credentials"
2. Click on your API key
3. Check "API restrictions" - should allow "YouTube Data API v3"
4. Check "Application restrictions" - should not block your usage

## 🧪 Test the Key

Test if the key works:
```bash
curl "https://www.googleapis.com/youtube/v3/videos?part=snippet&id=jNQXAC9IVRw&key=AIzaSyC-cYmJXGA0X6tnF-QOumQzQNyp-VhBO-8"
```

If you get quota exceeded, the key is working but quota is exhausted.
If you get "API key not valid", check the key configuration.

## 📝 Next Steps

1. **Immediate:** Check if YouTube Data API v3 is enabled
2. **Short-term:** Verify quota status in Google Cloud Console
3. **Long-term:** Consider creating a new project with fresh quota

## Current Configuration

- Server is using the new API key ✅
- Error handling is working correctly ✅
- Clear error messages displayed ✅

The app is ready to work once the API key quota issue is resolved.

