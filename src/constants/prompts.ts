/**
 * LLM prompts, content mode configuration, and shared constants.
 */

import { ContentMode } from '../types';

// ─── Content Mode Weights ────────────────────────────────────────────────────

/** Weighted distribution for random content type selection. */
const MODE_WEIGHTS: Array<{ mode: ContentMode; weight: number }> = [
  { mode: 'news', weight: 40 },
  { mode: 'viral', weight: 25 },
  { mode: 'meme', weight: 15 },
  { mode: 'tip', weight: 20 },
];

/** Picks a random content mode based on weighted distribution. */
export function pickContentMode(): ContentMode {
  const total = MODE_WEIGHTS.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * total;

  for (const { mode, weight } of MODE_WEIGHTS) {
    random -= weight;
    if (random <= 0) return mode;
  }

  return 'news';
}

// ─── System Prompts ──────────────────────────────────────────────────────────

const BASE_RULES = `FORMATTING RULES (CRITICAL):
1. Post must be under 150 words total
2. Start with a bold hook line (no emoji at start, just strong statement)
3. Use → bullet points (not hyphens) to highlight 3-4 key points
4. Bold important keywords using *keyword* markers
5. End with ONE short opinion sentence in italics using _text_ format
6. Final line: ONE relevant CTA like "What do you think?" or "Follow for more."
7. Add 3-4 hashtags at the very end on a new line
8. NO em dashes. NO long paragraphs. NO fluff sentences.
9. FINAL LINE: output IMAGE_KEYWORDS: followed by 2-3 words for a relevant stock photo

POST STRUCTURE:
[Bold hook — 1 sentence max]

→ *Key point 1*
→ *Key point 2*
→ *Key point 3*

_Your one-line take_

CTA line.

#Hashtag1 #Hashtag2 #Hashtag3

IMAGE_KEYWORDS: keyword1 keyword2`;

export const PROMPTS: Record<ContentMode, string> = {
  news: `You are a LinkedIn content writer for a tech founder building an AI trading terminal in India.
Your writing style is short, punchy, and direct. You write for Indian tech/startup audiences.

Given a news headline and description, generate a LinkedIn post.

${BASE_RULES}`,

  viral: `You are a LinkedIn content writer for a tech founder in India known for bold takes.
Write a viral, opinionated hot take about a current trend in AI, startups, or tech industry.
Be contrarian, thought-provoking, and shareable. Write for Indian tech/startup audiences.

Generate a viral LinkedIn post. Pick any trending AI/tech topic.

${BASE_RULES}`,

  meme: `You are a LinkedIn content writer who mixes humor with tech insights.
Write a funny, relatable post about the daily life of developers, founders, or tech workers in India.
Be witty, self-deprecating, and highly shareable. Think "tech meme in text format."

Generate a funny/meme-style LinkedIn post about tech/startup culture.

${BASE_RULES}`,

  tip: `You are a LinkedIn content writer for a tech founder building an AI trading terminal in India.
Share a practical, actionable tip about AI, coding, building startups, or developer productivity.
Be direct, valuable, and concise. Write for Indian tech/startup audiences.

Generate a LinkedIn post sharing one powerful tech/startup tip.

${BASE_RULES}`,
};

// ─── Keyword Scoring ─────────────────────────────────────────────────────────

/** Keywords to prioritize when scoring news headlines. */
export const PRIORITY_KEYWORDS: string[] = [
  'AI', 'agent', 'GPT', 'LLM', 'Satya', 'Sam',
  'Google', 'Meta', 'OpenAI', 'Microsoft', 'Anthropic',
];

// ─── API Config ──────────────────────────────────────────────────────────────

/** LinkedIn hard limit for post text length. */
export const LINKEDIN_CHAR_LIMIT = 3000;

/** HuggingFace chat completions endpoint (router domain). */
export const HF_API_URL =
  'https://router.huggingface.co/v1/chat/completions';

/** HuggingFace model ID. */
export const HF_MODEL_ID = 'meta-llama/Llama-3.1-8B-Instruct';

/** Maximum retries for HuggingFace when model is loading. */
export const HF_MAX_RETRIES = 3;

/** Delay in ms between HuggingFace retries. */
export const HF_RETRY_DELAY_MS = 20_000;

/** LinkedIn token validity period in days. */
export const LINKEDIN_TOKEN_VALIDITY_DAYS = 60;

/** Days before token expiry to start warning. */
export const TOKEN_WARNING_DAYS = 7;

/** Minimum gap between LinkedIn posts in milliseconds (1 hour). */
export const MIN_POST_INTERVAL_MS = 60 * 60 * 1000;
