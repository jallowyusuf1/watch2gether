require("dotenv").config();

const express = require("express");
const axios = require("axios");
const ytdl = require("@distube/ytdl-core");
const cors = require("cors");
const puppeteer = require("puppeteer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend
app.use(cors());

// === YOUTUBE METADATA PROXY (LEGAL) =====================
app.get("/api/youtube", async (req, res) => {
  const videoId = req.query.id;
  const apiKey = process.env.YT_API_KEY;

  // Validate video ID
  if (!videoId) {
    console.error('[YouTube API] Missing video ID');
    return res.status(400).json({ 
      error: "Missing video ID",
      message: "Please provide a valid YouTube video ID"
    });
  }

  // Validate API key
  if (!apiKey) {
    console.error('[YouTube API] Missing API key');
    return res.status(500).json({ 
      error: "Server configuration error",
      message: "YouTube API key is not configured. Please set YT_API_KEY in your .env file."
    });
  }

  // Validate video ID format (YouTube IDs are 11 characters)
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    console.error(`[YouTube API] Invalid video ID format: ${videoId}`);
    return res.status(400).json({ 
      error: "Invalid video ID",
      message: "YouTube video IDs must be 11 characters long"
    });
  }

  try {
    console.log(`[YouTube API] Fetching metadata for video: ${videoId}`);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
    
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      validateStatus: (status) => status < 500, // Don't throw on 4xx errors
    }).catch((err) => {
      // Handle axios errors (network, timeout, etc.)
      if (err.response) {
        // YouTube API returned an error response
        return err.response;
      }
      throw err;
    });

    // Check if YouTube returned an error
    if (response.data.error) {
      const error = response.data.error;
      const errorMessage = error.errors?.[0]?.message || error.message || 'Unknown YouTube API error';
      const errorReason = error.errors?.[0]?.reason;
      
      console.error(`[YouTube API] YouTube API error:`, errorMessage, `Reason: ${errorReason}`);
      
      // Map common error reasons to user-friendly messages
      let userMessage = errorMessage;
      if (errorReason === 'quotaExceeded') {
        userMessage = 'YouTube API quota exceeded. Please try again later.';
      } else if (errorReason === 'invalidCredentials') {
        userMessage = 'Invalid YouTube API key. Please check your configuration.';
      } else if (errorReason === 'videoNotFound') {
        userMessage = 'Video not found. The video may have been deleted or is unavailable.';
      } else if (errorReason === 'forbidden') {
        userMessage = 'Access denied. The video may be private or restricted.';
      }
      
      return res.status(response.status || 400).json({ 
        error: "YouTube API error",
        message: userMessage,
        reason: errorReason
      });
    }

    // Check if video was found
    if (!response.data.items || response.data.items.length === 0) {
      console.error(`[YouTube API] Video not found: ${videoId}`);
      return res.status(404).json({ 
        error: "Video not found",
        message: "The video you requested could not be found. Please check the video ID."
      });
    }

    console.log(`[YouTube API] Successfully fetched metadata for: ${response.data.items[0].snippet.title}`);
    res.json(response.data);
    
  } catch (err) {
    console.error('[YouTube API] Error fetching metadata:', err.message);
    
    // Handle axios errors
    if (err.response) {
      const status = err.response.status;
      const data = err.response.data;
      
      if (status === 403) {
        const errorReason = data?.error?.errors?.[0]?.reason;
        let message = 'Access denied by YouTube API.';
        
        if (errorReason === 'quotaExceeded') {
          message = 'YouTube API quota exceeded. Please try again later.';
        } else if (errorReason === 'invalidCredentials') {
          message = 'Invalid YouTube API key. Please check your configuration.';
        }
        
        return res.status(403).json({ 
          error: "Access denied",
          message: message,
          reason: errorReason
        });
      }
      
      if (status === 404) {
        return res.status(404).json({ 
          error: "Video not found",
          message: "The video you requested could not be found."
        });
      }
      
      return res.status(status).json({ 
        error: "YouTube API error",
        message: data?.error?.message || `HTTP ${status} error from YouTube API`
      });
    }
    
    // Handle network errors
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: "Request timeout",
        message: "The request to YouTube API timed out. Please try again."
      });
    }
    
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: "Network error",
        message: "Unable to connect to YouTube API. Please check your internet connection."
      });
    }
    
    // Generic error
    return res.status(500).json({ 
      error: "Failed to fetch metadata",
      message: err.message || "An unexpected error occurred while fetching video metadata."
    });
  }
});

// === DOWNLOAD ENDPOINT (ONLY FOR CONTENT YOU OWN!) ====
app.get("/api/youtube/download", async (req, res) => {
  const videoId = req.query.id;
  const quality = req.query.quality || '720p';
  const format = req.query.format || 'mp4';

  if (!videoId) {
    return res.status(400).json({ error: "Missing id" });
  }

  try {
    console.log(`[YouTube Download] Starting download for video: ${videoId}, quality: ${quality}, format: ${format}`);
    
    // Try to get video info for title (optional, may fail)
    let title = `video_${videoId}`;
    try {
    const info = await ytdl.getInfo(videoId);
      title = info.videoDetails.title || title;
      console.log(`[YouTube Download] Video title: ${title}`);
    } catch (infoError) {
      console.warn(`[YouTube Download] Could not get video info, using default title:`, infoError.message);
    }

    // Sanitize filename
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '_').substring(0, 100);
    const fileExtension = format === 'mp3' ? 'mp3' : 'mp4';
    const filename = `${sanitizedTitle}.${fileExtension}`;

    // Set response headers
    res.setHeader("Content-Type", format === 'mp3' ? "audio/mpeg" : "video/mp4");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Select format based on quality and format type
    let downloadOptions = {};
    
    if (format === 'mp3') {
      // For audio, get the best audio format
      downloadOptions = { filter: 'audioonly', quality: 'highestaudio' };
    } else {
      // For video, use quality parameter
      // ytdl-core quality options: 'lowest', 'lowestvideo', 'highest', 'highestvideo', or itag number
      const qualityMap = {
        '1080p': 'highest',
        '720p': 'highest',
        '480p': 'highest',
        '360p': 'lowest'
      };
      
      const qualityOption = qualityMap[quality] || 'highest';
      downloadOptions = { quality: qualityOption };
    }

    console.log(`[YouTube Download] Download options: ${JSON.stringify(downloadOptions)}`);

    // Helper function to download with ytdl-core
    const downloadWithYtdlCore = () => {
      // Download and stream - use direct ytdl call (simpler, more reliable)
      const stream = ytdl(videoId, downloadOptions);
      
      // Handle stream errors
      stream.on('error', (error) => {
        console.error('[YouTube Download] Stream error:', error);
        if (!res.headersSent) {
          let statusCode = 500;
          let errorMessage = "Stream error";
          
          if (error.statusCode === 403) {
            statusCode = 403;
            errorMessage = "YouTube is blocking this download. This may be due to YouTube's recent API changes. Please try again later or use a different video.";
          } else if (error.statusCode === 404) {
            statusCode = 404;
            errorMessage = "Video not found or unavailable.";
          } else if (error.message?.includes('403')) {
            statusCode = 403;
            errorMessage = "Access denied. YouTube may be blocking downloads for this video.";
          }
          
          res.status(statusCode).json({ 
            error: errorMessage, 
            details: error.message 
          });
        } else {
          // Headers already sent, end the response
          res.end();
        }
      });

      // Pipe to response
      stream.pipe(res);
      
      console.log(`[YouTube Download] Stream started for ${videoId}`);
    };

    // Try yt-dlp first (more reliable), fallback to ytdl-core
    const useYtDlp = process.env.USE_YT_DLP !== 'false'; // Default to true
    
    if (useYtDlp) {
      // Check if yt-dlp is available
      exec('which yt-dlp', (checkError) => {
        if (checkError) {
          console.log('[YouTube Download] yt-dlp not found, using ytdl-core');
          return downloadWithYtdlCore();
        }
        
        try {
          // Use yt-dlp for more reliable downloads
          const tempDir = path.join(__dirname, 'temp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFile = path.join(tempDir, `${videoId}.${fileExtension}`);
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          
          // Build yt-dlp command
          let ytDlpCmd = 'yt-dlp';
          if (format === 'mp3') {
            ytDlpCmd += ` -f "bestaudio" -x --audio-format mp3 -o "${tempFile}" "${videoUrl}"`;
          } else {
            // Map quality to yt-dlp format
            const qualityMap = {
              '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
              '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
              '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
              '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]'
            };
            const formatSpec = qualityMap[quality] || 'best';
            ytDlpCmd += ` -f "${formatSpec}" -o "${tempFile}" "${videoUrl}"`;
          }
          
          console.log(`[YouTube Download] Using yt-dlp: ${ytDlpCmd}`);
          
          exec(ytDlpCmd, { timeout: 300000 }, (error, stdout, stderr) => {
            if (error) {
              console.error('[YouTube Download] yt-dlp error:', error);
              // Fallback to ytdl-core
              console.log('[YouTube Download] Falling back to ytdl-core...');
              return downloadWithYtdlCore();
            }
            
            // Check if file exists
            if (!fs.existsSync(tempFile)) {
              console.error('[YouTube Download] yt-dlp file not found');
              return downloadWithYtdlCore();
            }
            
            // Stream the file
            const fileStream = fs.createReadStream(tempFile);
            fileStream.pipe(res);
            
            fileStream.on('end', () => {
              // Clean up temp file
              fs.unlinkSync(tempFile);
              console.log(`[YouTube Download] Completed and cleaned up: ${videoId}`);
            });
            
            fileStream.on('error', (err) => {
              console.error('[YouTube Download] File stream error:', err);
              if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
              }
              if (!res.headersSent) {
                res.status(500).json({ error: "File stream error", details: err.message });
              }
            });
          });
        } catch (ytDlpError) {
          console.warn('[YouTube Download] yt-dlp failed, falling back:', ytDlpError.message);
          downloadWithYtdlCore();
        }
      });
    } else {
      // Use ytdl-core directly
      downloadWithYtdlCore();
    }
    
  } catch (err) {
    console.error('[YouTube Download] Error:', err);
    let errorMessage = err.message || 'Download failed';
    let statusCode = 500;
    
    // Handle specific error types
    if (err.message?.includes('not found') || err.statusCode === 404) {
      statusCode = 404;
      errorMessage = 'Video not found or unavailable for download.';
    } else if (err.message?.includes('private') || err.statusCode === 403 || err.message?.includes('403')) {
      statusCode = 403;
      errorMessage = 'Access denied. The video may be private, age-restricted, or YouTube is blocking downloads.';
    } else if (err.message?.includes('Could not extract')) {
      statusCode = 503;
      errorMessage = 'YouTube download service is temporarily unavailable due to API changes. Please try again later.';
    }
    
    if (!res.headersSent) {
      res.status(statusCode).json({ 
        error: "Download failed", 
        details: errorMessage 
      });
    }
  }
});

// === INSTAGRAM METADATA PROXY ===========================
app.get("/api/instagram", async (req, res) => {
  const postId = req.query.id || req.query.postId;
  const userId = process.env.IG_USER_ID; // Instagram Business Account ID
  const token = process.env.IG_ACCESS_TOKEN;

  if (!postId && !userId) {
    return res.status(400).json({ error: "Missing id or userId" });
  }

  if (!token) {
    return res.status(500).json({ error: "Instagram access token not configured" });
  }

  try {
    // If postId is provided, fetch specific post
    // Otherwise, fetch user's media
    const url = postId
      ? `https://graph.instagram.com/${postId}?fields=id,caption,media_url,thumbnail_url,media_type,timestamp,username,like_count&access_token=${token}`
      : `https://graph.instagram.com/${userId}/media?fields=id,caption,media_url,thumbnail_url,media_type,timestamp&access_token=${token}`;

    const response = await axios.get(url);

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Instagram API failed" });
  }
});

// === TIKTOK SCRAPING HELPER ============================
async function scrapeTikTokVideo(url) {
  let browser;
  try {
    // Resolve shortened URLs
    let fullUrl = url;
    if (url.includes('vm.tiktok.com') || url.includes('vt.tiktok.com')) {
      const response = await axios.get(url, { maxRedirects: 5 });
      fullUrl = response.request.res.responseUrl || url;
    }

    // Ensure we have a full TikTok URL
    if (!fullUrl.includes('tiktok.com/@')) {
      throw new Error('Invalid TikTok URL format');
    }

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    );

    // Navigate to TikTok video
    await page.goto(fullUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Extract video data from page
    const videoData = await page.evaluate(() => {
      // Try to find video data in script tags
      const scripts = Array.from(document.querySelectorAll('script'));
      for (const script of scripts) {
        const content = script.textContent || '';
        // TikTok stores video data in __UNIVERSAL_DATA_FOR_REHYDRATION__
        if (content.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__')) {
          try {
            const match = content.match(/window\.__UNIVERSAL_DATA_FOR_REHYDRATION__\s*=\s*({.+?});/);
            if (match) {
              const data = JSON.parse(match[1]);
              // Navigate through TikTok's data structure
              const videoInfo = data?.defaultScope?.webapp?.video?.video || 
                               data?.__DEFAULT_SCOPE__?.webapp?.video?.video ||
                               data?.webapp?.video?.video;
              
              if (videoInfo) {
                return {
                  videoId: videoInfo.id,
                  description: videoInfo.desc || '',
                  author: videoInfo.author?.uniqueId || videoInfo.author?.nickname || '',
                  likeCount: videoInfo.stats?.diggCount || 0,
                  shareCount: videoInfo.stats?.shareCount || 0,
                  commentCount: videoInfo.stats?.commentCount || 0,
                  playCount: videoInfo.stats?.playCount || 0,
                  videoUrl: videoInfo.downloadAddr || videoInfo.playAddr || '',
                  coverUrl: videoInfo.cover || videoInfo.dynamicCover || '',
                  createTime: videoInfo.createTime || Date.now(),
                };
              }
            }
          } catch (e) {
            console.error('Error parsing TikTok data:', e);
          }
        }
      }
      return null;
    });

    if (!videoData) {
      throw new Error('Could not extract video data from TikTok page');
    }

    return videoData;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// === TIKTOK METADATA PROXY ==============================
app.get("/api/tiktok", async (req, res) => {
  const videoId = req.query.id;
  const videoUrl = req.query.url;

  if (!videoId && !videoUrl) {
    return res.status(400).json({ error: "Missing id or url" });
  }

  try {
    // Construct URL if only ID provided
    let url = videoUrl;
    if (!url && videoId) {
      // Try to construct URL - this is a fallback, URL is preferred
      url = `https://www.tiktok.com/@user/video/${videoId}`;
    }

    const videoData = await scrapeTikTokVideo(url);

    // Format response to match expected structure
    res.json({
      videoId: videoData.videoId,
      description: videoData.description,
      thumbnail: videoData.coverUrl,
      duration: 0, // TikTok doesn't expose duration easily
      author: videoData.author,
      likeCount: videoData.likeCount,
      shareCount: videoData.shareCount,
      commentCount: videoData.commentCount,
      uploadDate: new Date(videoData.createTime * 1000).toISOString(),
      videoUrl: videoData.videoUrl,
    });
  } catch (error) {
    console.error('TikTok scraping error:', error);
    res.status(500).json({ 
      error: "TikTok scraping failed", 
      details: error.message 
    });
  }
});

// === TIKTOK DOWNLOAD PROXY ==============================
app.get("/api/tiktok/download", async (req, res) => {
  const videoId = req.query.id;
  const videoUrl = req.query.url;
  const watermarkFree = req.query.watermarkFree === 'true';

  if (!videoId && !videoUrl) {
    return res.status(400).json({ error: "Missing id or url" });
  }

  try {
    // Construct URL if only ID provided
    let url = videoUrl;
    if (!url && videoId) {
      url = `https://www.tiktok.com/@user/video/${videoId}`;
    }

    // Scrape video data to get video URL
    const videoData = await scrapeTikTokVideo(url);

    if (!videoData.videoUrl) {
      throw new Error('Could not extract video URL');
    }

    // TikTok videos with watermarks have 'downloadAddr', without watermarks use 'playAddr'
    // Note: Removing watermarks completely may require additional processing
    let downloadUrl = videoData.videoUrl;
    
    if (watermarkFree) {
      // Try to get watermark-free version (may not always be available)
      // TikTok's playAddr is usually watermark-free but lower quality
      downloadUrl = videoData.videoUrl.replace('downloadAddr', 'playAddr') || videoData.videoUrl;
    }

    // Set headers for video download
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="tiktok_${videoData.videoId}.mp4"`);

    // Stream video from TikTok CDN
    const videoResponse = await axios.get(downloadUrl, {
      responseType: 'stream',
      headers: {
        'Referer': 'https://www.tiktok.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    videoResponse.data.pipe(res);
  } catch (error) {
    console.error('TikTok download error:', error);
    res.status(500).json({ 
      error: "TikTok download failed", 
      details: error.message 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", port: PORT });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

