/**
 * News fetcher service.
 * Fetches top tech/AI headlines from NewsAPI with GNews fallback.
 */

import axios from 'axios';
import { NewsItem, NewsApiResponse, GNewsResponse } from '../types';
import { PRIORITY_KEYWORDS } from '../constants/prompts';
import { log } from '../utils/logger';

const NEWSAPI_BASE = 'https://newsapi.org/v2/top-headlines';
const GNEWS_BASE = 'https://gnews.io/api/v4/top-headlines';

/** Scores an article headline against priority keywords. Higher = more relevant. */
function scoreHeadline(title: string): number {
  const lowerTitle = title.toLowerCase();
  return PRIORITY_KEYWORDS.reduce((score, keyword) => {
    return lowerTitle.includes(keyword.toLowerCase()) ? score + 1 : score;
  }, 0);
}

/** Picks the most impactful article from a list based on keyword scoring. */
function pickBestArticle(articles: NewsItem[]): NewsItem {
  if (articles.length === 0) {
    throw new Error('No articles available to pick from.');
  }

  let best = articles[0];
  let bestScore = scoreHeadline(best.title);

  for (let i = 1; i < articles.length; i++) {
    const score = scoreHeadline(articles[i].title);
    if (score > bestScore) {
      best = articles[i];
      bestScore = score;
    }
  }

  log.info(`Selected article: "${best.title}" (score: ${bestScore})`);
  return best;
}

/** Fetches headlines from NewsAPI.org. */
async function fetchFromNewsApi(): Promise<NewsItem[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) throw new Error('NEWSAPI_KEY not set in .env');

  const response = await axios.get<NewsApiResponse>(NEWSAPI_BASE, {
    params: {
      category: 'technology',
      language: 'en',
      pageSize: 5,
      apiKey,
    },
    headers: { 'User-Agent': 'LinkedInAutomation/1.0' },
    timeout: 10_000,
  });

  return response.data.articles
    .filter((a) => a.title && a.description)
    .map((a) => ({
      title: a.title,
      description: a.description ?? '',
      url: a.url,
      source: a.source.name,
    }));
}

/** Fetches headlines from GNews.io as a fallback. */
async function fetchFromGNews(): Promise<NewsItem[]> {
  const apiKey = process.env.GNEWS_API_KEY;
  if (!apiKey) throw new Error('GNEWS_API_KEY not set in .env (fallback)');

  const response = await axios.get<GNewsResponse>(GNEWS_BASE, {
    params: {
      topic: 'technology',
      lang: 'en',
      max: 5,
      apikey: apiKey,
    },
    timeout: 10_000,
  });

  return response.data.articles
    .filter((a) => a.title && a.description)
    .map((a) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source.name,
    }));
}

/** Fetches latest tech news. Tries NewsAPI first, falls back to GNews. */
export async function fetchNews(): Promise<NewsItem> {
  log.info('Fetching latest tech news...');

  try {
    const articles = await fetchFromNewsApi();
    if (articles.length > 0) {
      return pickBestArticle(articles);
    }
    log.warn('NewsAPI returned no articles, trying GNews fallback...');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.warn(`NewsAPI failed: ${msg}. Trying GNews fallback...`);
  }

  const fallbackArticles = await fetchFromGNews();
  if (fallbackArticles.length === 0) {
    throw new Error('Both NewsAPI and GNews returned no articles.');
  }

  return pickBestArticle(fallbackArticles);
}
