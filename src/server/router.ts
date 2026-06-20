/**
 * HTTP router — serves the compose UI, health endpoint, and manual post API.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { log } from '../utils/logger';
import { getLastRunTime } from '../utils/runLog';
import { parseMultipart } from '../utils/multipartParser';
import { createManualPost } from '../services/manualPost.service';
import { MediaAttachment } from '../types';

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/** MIME types for static file serving. */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
};

/** Sends a JSON response. */
function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: Record<string, unknown>,
): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/** Serves a static file from the public directory. */
function serveStaticFile(res: http.ServerResponse, filename: string): void {
  const filePath = path.join(PUBLIC_DIR, filename);
  const ext = path.extname(filename);
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: 'File not found' });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

/** Handles the health check endpoint. */
function handleHealth(res: http.ServerResponse): void {
  const lastRun = getLastRunTime();
  const uptime = Math.floor(process.uptime());

  sendJson(res, 200, {
    status: 'ok',
    service: 'linkedin-automation',
    uptime: `${uptime}s`,
    lastRun: lastRun || 'never',
    nextCron: '09:00 AM IST daily',
    timestamp: new Date().toISOString(),
  });
}

/** Determines media type from MIME string. */
function getMediaType(mimeType: string): 'image' | 'video' {
  return mimeType.startsWith('video/') ? 'video' : 'image';
}

/** Validates media attachments. */
function validateMedia(media: MediaAttachment[]): string | null {
  if (media.length > 9) return 'Maximum 9 media files allowed';

  const hasVideo = media.some((m) => m.type === 'video');
  const hasImage = media.some((m) => m.type === 'image');

  if (hasVideo && hasImage) return 'Cannot mix images and video in a single post';
  if (hasVideo && media.length > 1) return 'Only one video allowed per post';

  for (const file of media) {
    const maxSize = file.type === 'video' ? 200 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.buffer.length > maxSize) {
      const limitMB = maxSize / (1024 * 1024);
      return `${file.filename} exceeds ${limitMB}MB limit`;
    }
  }

  return null;
}

/** Handles POST /api/post — creates a manual LinkedIn post. */
async function handlePostApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  try {
    const formData = await parseMultipart(req);
    const textField = formData.fields.find((f) => f.name === 'text');
    const postText = textField?.value?.trim() ?? '';

    if (!postText) {
      sendJson(res, 400, { error: 'Post text is required' });
      return;
    }

    if (postText.length > 3000) {
      sendJson(res, 400, { error: 'Post text exceeds 3000 character limit' });
      return;
    }

    // Convert parsed files to MediaAttachment[]
    const media: MediaAttachment[] = formData.files
      .filter((f) => f.name === 'media')
      .map((f) => ({
        buffer: f.buffer,
        filename: f.filename,
        mimeType: f.mimeType,
        type: getMediaType(f.mimeType),
      }));

    // Validate media
    const validationError = validateMedia(media);
    if (validationError) {
      sendJson(res, 400, { error: validationError });
      return;
    }

    // Post to LinkedIn
    const result = await createManualPost(postText, media);
    sendJson(res, 200, { ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(`Manual post failed: ${msg}`);
    sendJson(res, 500, { error: msg });
  }
}

/** Adds CORS headers for local development. */
function setCorsHeaders(res: http.ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/** Main request handler — routes to appropriate handler. */
export function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): void {
  setCorsHeaders(res);

  const method = req.method?.toUpperCase() ?? 'GET';
  const url = req.url ?? '/';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Route: Health check
  if (url === '/health' || url === '/') {
    handleHealth(res);
    return;
  }

  // Route: Compose UI static files
  if (method === 'GET' && url === '/compose') {
    serveStaticFile(res, 'compose.html');
    return;
  }
  if (method === 'GET' && url === '/compose/styles') {
    serveStaticFile(res, 'compose.css');
    return;
  }
  if (method === 'GET' && url === '/compose/script') {
    serveStaticFile(res, 'compose.js');
    return;
  }
  if (method === 'GET' && url === '/compose/unicode-fonts') {
    serveStaticFile(res, 'unicode-fonts.js');
    return;
  }
  if (method === 'GET' && url === '/compose/emoji-data') {
    serveStaticFile(res, 'emoji-data.js');
    return;
  }
  if (method === 'GET' && url === '/compose/media-upload') {
    serveStaticFile(res, 'media-upload.js');
    return;
  }

  // Route: Post API
  if (method === 'POST' && url === '/api/post') {
    handlePostApi(req, res);
    return;
  }

  // 404
  sendJson(res, 404, { error: 'Not Found' });
}
