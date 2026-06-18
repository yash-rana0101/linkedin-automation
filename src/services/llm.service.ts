/**
 * LLM service — generates LinkedIn posts using HuggingFace Inference API.
 * Uses Llama-3.1-8B-Instruct via OpenAI-compatible chat completions.
 * Supports multiple content modes and applies Unicode formatting.
 */

import axios, { AxiosError } from 'axios';
import { NewsItem, GeneratedPost, ContentMode } from '../types';
import {
  PROMPTS,
  HF_API_URL,
  HF_MODEL_ID,
  HF_MAX_RETRIES,
  HF_RETRY_DELAY_MS,
  LINKEDIN_CHAR_LIMIT,
} from '../constants/prompts';
import { log } from '../utils/logger';
import { formatForLinkedIn } from '../utils/unicodeFormat';

/** Chat completions response shape. */
interface ChatCompletionResponse {
  choices: Array<{ message: { content: string }; finish_reason: string }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/** Waits for the specified number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extracts IMAGE_KEYWORDS from the LLM output and separates post text. */
function extractImageKeywords(text: string): { postText: string; imageKeywords: string } {
  const match = text.match(/IMAGE_KEYWORDS:\s*(.+)/i);
  const imageKeywords = match ? match[1].trim() : 'technology AI innovation';
  const postText = text.replace(/IMAGE_KEYWORDS:\s*.+/i, '').trim();
  return { postText, imageKeywords };
}

/** Builds the user message based on content mode. */
function buildUserMessage(mode: ContentMode, news: NewsItem | null): string {
  if (mode === 'news' && news) {
    return `News: ${news.title}\n${news.description}`;
  }
  if (mode === 'viral') return 'Write a viral hot take about the latest AI/tech trend.';
  if (mode === 'meme') return 'Write a funny, relatable tech meme post.';
  return 'Share one powerful, actionable tech/startup tip.';
}

/** Calls HuggingFace with retry logic. Optimized: low max_tokens, tight prompt. */
async function callHuggingFace(mode: ContentMode, news: NewsItem | null): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error('HUGGINGFACE_API_KEY not set in .env');

  const messages = [
    { role: 'system', content: PROMPTS[mode] },
    { role: 'user', content: buildUserMessage(mode, news) },
  ];

  for (let attempt = 1; attempt <= HF_MAX_RETRIES; attempt++) {
    try {
      log.info(`HuggingFace API call — attempt ${attempt}/${HF_MAX_RETRIES} (mode: ${mode})`);

      const response = await axios.post<ChatCompletionResponse>(
        HF_API_URL,
        {
          model: HF_MODEL_ID,
          messages,
          max_tokens: 250,         // Tight: 150 words ≈ 200 tokens max
          temperature: 0.8,         // Creative but not chaotic
          top_p: 0.9,              // Nucleus sampling for quality
          frequency_penalty: 0.3,  // Reduce repetition
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60_000,         // 60s timeout (reduced from 120s)
        },
      );

      // Log token usage for monitoring
      if (response.data.usage) {
        const { prompt_tokens, completion_tokens } = response.data.usage;
        log.info(`Tokens used — prompt: ${prompt_tokens}, completion: ${completion_tokens}`);
      }

      const content = response.data.choices?.[0]?.message?.content;
      if (content) return content.trim();

      throw new Error('HuggingFace returned empty response.');
    } catch (error) {
      const axiosErr = error as AxiosError;
      const status = axiosErr.response?.status;

      if (status === 503 && attempt < HF_MAX_RETRIES) {
        log.warn(`Model loading (503). Retrying in ${HF_RETRY_DELAY_MS / 1000}s...`);
        await delay(HF_RETRY_DELAY_MS);
        continue;
      }

      if (attempt === HF_MAX_RETRIES) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new Error(`HuggingFace failed after ${HF_MAX_RETRIES} attempts: ${msg}`);
      }

      log.warn(`HuggingFace error (attempt ${attempt}): ${axiosErr.message}. Retrying in 5s...`);
      await delay(5_000);
    }
  }

  throw new Error('HuggingFace: unexpected exit from retry loop.');
}

/** Generates a LinkedIn post. Applies Unicode formatting for bold/italic. */
export async function generatePost(
  mode: ContentMode,
  news: NewsItem | null,
): Promise<GeneratedPost> {
  log.info(`Generating post — mode: "${mode}"`);

  const rawText = await callHuggingFace(mode, news);
  const { postText: rawPost, imageKeywords } = extractImageKeywords(rawText);

  // Apply Unicode bold/italic formatting for LinkedIn
  let postText = formatForLinkedIn(rawPost);

  // Enforce LinkedIn character limit
  if (postText.length > LINKEDIN_CHAR_LIMIT) {
    log.warn(`Post exceeds ${LINKEDIN_CHAR_LIMIT} chars. Truncating...`);
    postText = postText.slice(0, LINKEDIN_CHAR_LIMIT);
  }

  const wordCount = postText.split(/\s+/).filter(Boolean).length;
  log.info(`Post ready — ${wordCount} words, ${postText.length} chars, keywords: "${imageKeywords}"`);

  return { postText, wordCount, contentMode: mode, imageKeywords };
}
