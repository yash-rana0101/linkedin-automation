/**
 * Image service — fetches relevant photos from Unsplash for LinkedIn posts.
 * Uses LLM-provided keywords with cascading fallback strategy to always find an image.
 */

import axios from 'axios';
import { ImageResult, UnsplashSearchResponse, UnsplashPhoto } from '../types';
import { log } from '../utils/logger';

const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos';

/** Broad fallback keywords guaranteed to return results on Unsplash. */
const FALLBACK_QUERIES = [
  'artificial intelligence technology',
  'coding programming laptop',
  'startup office workspace',
  'technology innovation',
  'developer workspace',
];

/** Searches Unsplash for photos matching a query. */
async function searchUnsplash(
  query: string,
  accessKey: string,
): Promise<UnsplashPhoto | null> {
  log.info(`Searching Unsplash: "${query}"`);

  const response = await axios.get<UnsplashSearchResponse>(UNSPLASH_SEARCH_URL, {
    params: { query, per_page: 3, orientation: 'landscape' },
    headers: { Authorization: `Client-ID ${accessKey}` },
    timeout: 10_000,
  });

  const { results } = response.data;
  if (!results || results.length === 0) return null;

  // Pick a random result from top 3 for variety
  const index = Math.floor(Math.random() * results.length);
  return results[index];
}

/** Downloads an image as a Buffer for LinkedIn upload. */
async function downloadImage(url: string): Promise<Buffer> {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    timeout: 30_000,
  });
  return Buffer.from(response.data);
}

/** Converts a photo result into an ImageResult with attribution. */
async function photoToResult(photo: UnsplashPhoto): Promise<ImageResult> {
  const imageUrl = photo.urls.regular;
  const imageBuffer = await downloadImage(imageUrl);
  const photographer = photo.user.name;
  const description =
    photo.alt_description || photo.description || 'Technology';

  log.info(`Image ready — by ${photographer} (${imageBuffer.length} bytes)`);

  return {
    imageUrl,
    imageBuffer,
    imageDescription: `${description} | Photo by ${photographer} on Unsplash`,
    photographer,
  };
}

/**
 * Fetches a landscape photo from Unsplash.
 * Uses LLM-provided keywords first, then falls back through broader queries.
 * Throws if no image can be found after all attempts.
 */
export async function fetchImage(imageKeywords: string): Promise<ImageResult> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) throw new Error('UNSPLASH_ACCESS_KEY not set in .env');

  // Build search cascade: LLM keywords → individual words → fallbacks
  const queries = [
    imageKeywords,
    ...imageKeywords.split(/\s+/).filter((w) => w.length > 2),
    ...FALLBACK_QUERIES,
  ];

  // Deduplicate
  const uniqueQueries = [...new Set(queries)].filter(Boolean);

  for (const query of uniqueQueries) {
    try {
      const photo = await searchUnsplash(query, accessKey);
      if (photo) {
        return await photoToResult(photo);
      }
      log.warn(`No results for "${query}", trying next...`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      log.warn(`Unsplash error for "${query}": ${msg}, trying next...`);
    }
  }

  throw new Error('Failed to find an image after all fallback attempts.');
}
