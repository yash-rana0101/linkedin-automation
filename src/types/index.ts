// ─── News ────────────────────────────────────────────────────────────────────

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  source: string;
}

export interface NewsApiArticle {
  title: string;
  description: string | null;
  url: string;
  source: { name: string };
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

export interface GNewsArticle {
  title: string;
  description: string;
  url: string;
  source: { name: string };
}

export interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

// ─── Content Mode ────────────────────────────────────────────────────────────

/** Weighted content types for post variety. */
export type ContentMode = 'news' | 'viral' | 'meme' | 'tip';

// ─── LLM ─────────────────────────────────────────────────────────────────────

export interface GeneratedPost {
  postText: string;
  wordCount: number;
  contentMode: ContentMode;
  imageKeywords: string;
}

// ─── Image ───────────────────────────────────────────────────────────────────

export interface ImageResult {
  imageUrl: string;
  imageBuffer: Buffer;
  imageDescription: string;
  photographer: string;
}

export interface UnsplashPhoto {
  urls: { regular: string; small: string };
  alt_description: string | null;
  description: string | null;
  user: { name: string };
}

export interface UnsplashSearchResponse {
  total: number;
  results: UnsplashPhoto[];
}

// ─── LinkedIn ────────────────────────────────────────────────────────────────

export interface PostResult {
  postId: string;
  success: boolean;
  timestamp: string;
}

export interface LinkedInUploadResponse {
  value: {
    uploadMechanism: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
        uploadUrl: string;
      };
    };
    asset: string;
  };
}

// ─── Automation ──────────────────────────────────────────────────────────────

export interface AutomationRun {
  news: NewsItem | null;
  post: GeneratedPost;
  image: ImageResult;
  linkedInPost: PostResult;
  ranAt: string;
}

// ─── Run Log ─────────────────────────────────────────────────────────────────

export interface RunLogEntry {
  lastRunAt: string;
  postId: string;
  success: boolean;
}
