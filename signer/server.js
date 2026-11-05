const express = require('express');
const cors = require('cors');
const xbogus = require('xbogus');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/', (req, res) => {
  res.json({
    name: 'ReadTik Signature Server',
    status: 'online',
    version: '1.0.0',
    endpoints: ['/tiktok/sign_url', '/webcast/anchors/:unique_id/room_id'],
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// TikTok URL Signature Endpoint (required by tiktok-live-connector)
app.post('/tiktok/sign_url', (req, res) => {
  try {
    const { url, userAgent } = req.body;
    if (!url) {
      return res.status(400).json({ code: 400, message: 'URL is required' });
    }

    const ua =
      userAgent ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    // Remove old tokens if present
    let cleanUrl = url
      .replace(/([&?])(X-Bogus|msToken|X-Gnarly)=[^&]*/g, '$1')
      .replace(/[&?]$/, '');

    // Generate cryptographic X-Bogus token
    const token = xbogus(cleanUrl, ua);
    const separator = cleanUrl.includes('?') ? '&' : '?';
    const signedUrl = `${cleanUrl}${separator}X-Bogus=${encodeURIComponent(token)}`;

    return res.json({
      code: 200,
      message: 'OK',
      response: {
        signedUrl,
        userAgent: ua,
        tokens: {
          'X-Bogus': token,
        },
      },
    });
  } catch (err) {
    console.error('Error signing URL:', err);
    return res.status(500).json({
      code: 500,
      message: err.message || 'Internal Signature Error',
    });
  }
});

// Anchor Room ID Resolution Endpoint (fallback for tiktok-live-connector)
app.get('/webcast/anchors/:unique_id/room_id', async (req, res) => {
  const uniqueId = (req.params.unique_id || '').trim().replace(/^@/, '');
  if (!uniqueId) {
    return res.status(400).json({ code: 400, message: 'unique_id is required', ok: false });
  }

  // If already numeric room ID, return directly
  if (/^\d{15,}$/.test(uniqueId)) {
    return res.json({ code: 200, ok: true, room_id: uniqueId });
  }

  try {
    const response = await fetch(`https://www.tiktok.com/@${uniqueId}/live`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });

    const html = await response.text();

    const match =
      html.match(/"roomId":"?(\d{15,})"?/) ||
      html.match(/"liveRoomId":"?(\d{15,})"?/) ||
      html.match(/room_id=(\d{15,})/) ||
      html.match(/"room_id":"?(\d{15,})"?/);

    if (match && match[1]) {
      return res.json({
        code: 200,
        ok: true,
        room_id: match[1],
        unique_id: uniqueId,
      });
    }

    return res.status(404).json({
      code: 404,
      ok: false,
      message: `@${uniqueId} is not currently broadcasting live or room ID could not be scraped.`,
    });
  } catch (err) {
    console.error(`Error resolving room ID for ${uniqueId}:`, err);
    return res.status(500).json({
      code: 500,
      ok: false,
      message: err.message || 'Error resolving room ID',
    });
  }
});

// TikTok Webcast Room Connect (called by tiktok-live-connector to fetch initial live messages & websocket params)
app.get('/webcast/rooms/:roomId/connect', async (req, res) => {
  const { roomId } = req.params;
  const queryString = new URLSearchParams(req.query).toString();
  const forwardUrl = `https://api.eulerstream.com/webcast/rooms/${roomId}/connect${queryString ? `?${queryString}` : ''}`;

  try {
    const upstreamRes = await fetch(forwardUrl, {
      headers: {
        Accept: req.headers['accept'] || 'application/protobuf,application/json',
        'User-Agent':
          req.headers['user-agent'] ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });

    res.status(upstreamRes.status);

    const cookie = upstreamRes.headers.get('x-set-tt-cookie') || upstreamRes.headers.get('set-cookie');
    if (cookie) {
      res.setHeader('x-set-tt-cookie', cookie);
    }
    const rId = upstreamRes.headers.get('x-room-id') || roomId;
    res.setHeader('x-room-id', rId);

    const contentType = upstreamRes.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    const buffer = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (err) {
    console.error(`Error in /webcast/rooms/${roomId}/connect:`, err);
    return res.status(500).json({ error: 'Failed to connect to webcast room', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[ReadTik Signer] Microservice running on http://localhost:${PORT}`);
});
