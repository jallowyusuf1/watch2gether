# YouTube Download Issue - Known Limitation

## Current Status
YouTube downloads are currently experiencing issues due to YouTube's frequent API changes. The `@distube/ytdl-core` library (and other ytdl libraries) need frequent updates to keep up with YouTube's changes.

## Error Messages You May See
- **403 Forbidden**: YouTube is blocking the download request
- **Could not extract functions**: YouTube's player script has changed
- **Status code: 403**: Access denied by YouTube

## Solutions

### Option 1: Wait for Library Update
The `@distube/ytdl-core` library is actively maintained. Check for updates:
```bash
npm update @distube/ytdl-core
```

### Option 2: Use yt-dlp (Recommended)
`yt-dlp` is a more robust Python-based YouTube downloader that's updated more frequently:

1. Install yt-dlp:
```bash
brew install yt-dlp  # macOS
# or
pip install yt-dlp
```

2. Update server.cjs to use yt-dlp:
```javascript
const { exec } = require('child_process');
const fs = require('fs');

// In download endpoint:
const tempFile = `/tmp/${videoId}.mp4`;
exec(`yt-dlp -f "best[height<=${quality.replace('p', '')}]" -o "${tempFile}" "https://www.youtube.com/watch?v=${videoId}"`, 
  (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: "Download failed" });
    }
    const fileStream = fs.createReadStream(tempFile);
    fileStream.pipe(res);
    fileStream.on('end', () => fs.unlinkSync(tempFile));
  }
);
```

### Option 3: Use YouTube Data API (Metadata Only)
The metadata endpoint works fine. You can:
- Get video information
- Display thumbnails
- Show video details
- But actual downloads require the above solutions

## Current Workaround
The app will show a clear error message when downloads fail, explaining that YouTube is blocking the request. Users can try:
1. Different videos
2. Waiting a few hours/days for library updates
3. Using the yt-dlp solution above

## Testing
To test if downloads are working:
```bash
curl "http://localhost:3000/api/youtube/download?id=TEST_VIDEO_ID&quality=720p&format=mp4"
```

If you get a 403 error, YouTube is blocking downloads at the moment.

