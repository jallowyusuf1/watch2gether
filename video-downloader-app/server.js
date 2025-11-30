require("dotenv").config();

const express = require("express");
const axios = require("axios");
const ytdl = require("ytdl-core");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend
app.use(cors());

// === YOUTUBE METADATA PROXY (LEGAL) =====================
app.get("/api/youtube", async (req, res) => {
  const videoId = req.query.id;
  const apiKey = process.env.YT_API_KEY;

  if (!videoId) return res.status(400).json({ error: "Missing id" });

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
    const response = await axios.get(url);

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch metadata" });
  }
});

// === DOWNLOAD ENDPOINT (ONLY FOR CONTENT YOU OWN!) ====
app.get("/api/youtube/download", async (req, res) => {
  const videoId = req.query.id;

  if (!videoId) {
    return res.status(400).json({ error: "Missing id" });
  }

  try {
    // This must only be used for your own rights-controlled content.
    const info = await ytdl.getInfo(videoId);
    const title = info.videoDetails.title;

    res.setHeader("Content-Disposition", `attachment; filename="${title}.mp4"`);

    ytdl(videoId, { format: "mp4" }).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Download failed" });
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

