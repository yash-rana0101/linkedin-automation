/**
 * LinkedIn service — uploads images and creates UGC posts via LinkedIn API v2.
 */

import axios from 'axios';
import { ImageResult, PostResult, LinkedInUploadResponse } from '../types';
import { log } from '../utils/logger';

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2';

/** Returns common LinkedIn API headers. */
function getHeaders(): Record<string, string> {
  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) throw new Error('LINKEDIN_ACCESS_TOKEN not set in .env');

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };
}

/** Returns the LinkedIn person URN. */
function getPersonUrn(): string {
  const urn = process.env.LINKEDIN_PERSON_URN;
  if (!urn) throw new Error('LINKEDIN_PERSON_URN not set in .env');
  return `urn:li:person:${urn}`;
}

/** Registers an image upload and uploads the buffer to LinkedIn. */
async function uploadImage(image: ImageResult): Promise<string> {
  log.info('Registering image upload with LinkedIn...');
  const headers = getHeaders();
  const personUrn = getPersonUrn();

  // Step A: Register upload
  const registerResponse = await axios.post<LinkedInUploadResponse>(
    `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
    {
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: personUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    },
    { headers, timeout: 30_000 },
  );

  const uploadUrl =
    registerResponse.data.value.uploadMechanism[
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
    ].uploadUrl;

  const assetUrn = registerResponse.data.value.asset;

  // Step B: Upload image buffer
  log.info('Uploading image to LinkedIn...');
  await axios.put(uploadUrl, image.imageBuffer, {
    headers: {
      Authorization: headers.Authorization,
      'Content-Type': 'application/octet-stream',
    },
    timeout: 60_000,
  });

  log.info(`Image uploaded — asset: ${assetUrn}`);
  return assetUrn;
}

/** Builds the UGC post body for LinkedIn API. */
function buildPostBody(
  postText: string,
  personUrn: string,
  newsTitle: string,
  image: ImageResult | null,
  assetUrn: string | null,
) {
  const media =
    image && assetUrn
      ? [
          {
            status: 'READY',
            description: { text: image.imageDescription },
            media: assetUrn,
            title: { text: newsTitle },
          },
        ]
      : [];

  return {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text: postText },
        shareMediaCategory: image && assetUrn ? 'IMAGE' : 'NONE',
        media,
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };
}

/** Posts content to LinkedIn. Optionally uploads an image first. */
export async function postToLinkedIn(
  postText: string,
  image: ImageResult | null,
  newsTitle: string,
): Promise<PostResult> {
  log.info('Posting to LinkedIn...');

  const headers = getHeaders();
  const personUrn = getPersonUrn();
  let assetUrn: string | null = null;

  // Upload image if available
  if (image) {
    assetUrn = await uploadImage(image);
  }

  // Create UGC post
  const body = buildPostBody(postText, personUrn, newsTitle, image, assetUrn);

  const response = await axios.post(`${LINKEDIN_API_BASE}/ugcPosts`, body, {
    headers,
    timeout: 30_000,
  });

  const postId = response.data.id || response.headers['x-restli-id'] || 'unknown';
  const timestamp = new Date().toISOString();

  log.info(`LinkedIn post created — ID: ${postId}`);

  return { postId, success: true, timestamp };
}
