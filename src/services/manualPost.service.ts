/**
 * Manual post service — handles user-composed LinkedIn posts with media attachments.
 * Supports multiple images or a single video upload.
 */

import axios from 'axios';
import { MediaAttachment, ManualPostResult, LinkedInUploadResponse } from '../types';
import { getHeaders, getPersonUrn } from './linkedin.service';
import { log } from '../utils/logger';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

/** Recipe URNs for different media types. */
const MEDIA_RECIPES: Record<string, string> = {
  image: 'urn:li:digitalmediaRecipe:feedshare-image',
  video: 'urn:li:digitalmediaRecipe:feedshare-video',
};

/** Registers and uploads a single media file to LinkedIn. Returns the asset URN. */
async function uploadMedia(media: MediaAttachment): Promise<string> {
  const headers = getHeaders();
  const personUrn = getPersonUrn();
  const recipe = MEDIA_RECIPES[media.type];

  log.info(`Registering ${media.type} upload: "${media.filename}"...`);

  // Step 1: Register upload
  const registerRes = await axios.post<LinkedInUploadResponse>(
    `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
    {
      registerUploadRequest: {
        recipes: [recipe],
        owner: personUrn,
        serviceRelationships: [
          { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
        ],
      },
    },
    { headers, timeout: 30_000 },
  );

  const uploadUrl =
    registerRes.data.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl;

  const assetUrn = registerRes.data.value.asset;

  // Step 2: Upload binary data
  log.info(`Uploading ${media.type} (${(media.buffer.length / 1024).toFixed(0)} KB)...`);
  await axios.put(uploadUrl, media.buffer, {
    headers: {
      Authorization: headers.Authorization,
      'Content-Type': 'application/octet-stream',
    },
    timeout: 120_000,
  });

  log.info(`${media.type} uploaded — asset: ${assetUrn}`);
  return assetUrn;
}

/** Determines the share media category from attached media. */
function getMediaCategory(media: MediaAttachment[]): string {
  if (media.length === 0) return 'NONE';
  if (media[0].type === 'video') return 'VIDEO';
  return 'IMAGE';
}

/** Builds the UGC post body for a manual post. */
function buildManualPostBody(
  text: string,
  personUrn: string,
  mediaCategory: string,
  mediaEntries: Array<{ status: string; media: string; title: { text: string } }>,
) {
  return {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: mediaCategory,
        media: mediaEntries,
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };
}

/**
 * Creates a manual LinkedIn post with optional media attachments.
 * Supports multiple images (up to 9) or a single video.
 */
export async function createManualPost(
  text: string,
  media: MediaAttachment[],
): Promise<ManualPostResult> {
  log.info(`Creating manual post — ${text.length} chars, ${media.length} media files`);

  const headers = getHeaders();
  const personUrn = getPersonUrn();

  // Upload all media files
  const assetUrns: string[] = [];
  for (const file of media) {
    const urn = await uploadMedia(file);
    assetUrns.push(urn);
  }

  // Build media entries for UGC post
  const mediaEntries = assetUrns.map((urn, i) => ({
    status: 'READY',
    media: urn,
    title: { text: media[i].filename },
  }));

  const mediaCategory = getMediaCategory(media);
  const body = buildManualPostBody(text, personUrn, mediaCategory, mediaEntries);

  // Create UGC post
  const response = await axios.post(`${LINKEDIN_API_BASE}/ugcPosts`, body, {
    headers,
    timeout: 30_000,
  });

  const postId = response.data.id || response.headers['x-restli-id'] || 'unknown';
  const timestamp = new Date().toISOString();

  log.info(`Manual post created — ID: ${postId}`);

  return {
    postId,
    success: true,
    timestamp,
    mediaCount: media.length,
  };
}
