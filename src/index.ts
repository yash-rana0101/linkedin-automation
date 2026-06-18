/**
 * LinkedIn Automation — Entry Point
 * Schedules daily LinkedIn posting at 9:00 AM IST via node-cron.
 */

import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import { log } from './utils/logger';
import { checkTokenExpiry } from './utils/tokenExpiry';
import { canRunNow, recordRun } from './utils/runLog';
import { pickContentMode } from './constants/prompts';
import { fetchNews } from './services/news.service';
import { generatePost } from './services/llm.service';
import { fetchImage } from './services/image.service';
import { postToLinkedIn } from './services/linkedin.service';
import { sendSuccessMail, sendFailureMail } from './services/mail.service';
import { startHealthServer } from './utils/healthServer';
import { AutomationRun, NewsItem } from './types';

/** Core automation pipeline — runs one full cycle. */
async function runAutomation(): Promise<void> {
  log.info('═══ LinkedIn Automation — Starting pipeline ═══');

  if (!canRunNow()) {
    log.warn('Skipping run — last post was less than 1 hour ago.');
    return;
  }

  // Pick content mode (news, viral, meme, or tip)
  const mode = pickContentMode();
  log.info(`Content mode selected: "${mode}"`);

  // Step 1: Fetch news (only for news mode)
  let news: NewsItem | null = null;
  if (mode === 'news') {
    log.info('Step 1/5 — Fetching news...');
    news = await fetchNews();
    log.info(`News: "${news.title}" (${news.source})`);
  } else {
    log.info('Step 1/5 — Skipped (non-news mode)');
  }

  // Step 2: Generate post
  log.info('Step 2/5 — Generating LinkedIn post...');
  const post = await generatePost(mode, news);
  log.info(`Post generated — ${post.wordCount} words`);

  // Step 3: Fetch image (MANDATORY — pipeline fails if no image)
  log.info('Step 3/5 — Fetching image...');
  const image = await fetchImage(post.imageKeywords);
  log.info(`Image ready — by ${image.photographer}`);

  // Step 4: Post to LinkedIn
  log.info('Step 4/5 — Posting to LinkedIn...');
  const linkedInPost = await postToLinkedIn(post.postText, image, news?.title || post.imageKeywords);
  log.info(`LinkedIn post created — ID: ${linkedInPost.postId}`);

  recordRun({
    lastRunAt: new Date().toISOString(),
    postId: linkedInPost.postId,
    success: true,
  });

  // Step 5: Send success email
  log.info('Step 5/5 — Sending success email...');
  const run: AutomationRun = {
    news,
    post,
    image,
    linkedInPost,
    ranAt: new Date().toISOString(),
  };
  await sendSuccessMail(run);

  log.info('═══ LinkedIn Automation — Pipeline completed successfully ═══');
}

/** Wraps the pipeline with error handling and failure notifications. */
async function safeRun(): Promise<void> {
  try {
    await runAutomation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error(`Pipeline failed: ${err.message}`, err);

    const step = detectFailedStep(err.message);
    try {
      await sendFailureMail(step, err);
    } catch (mailError) {
      const msg = mailError instanceof Error ? mailError.message : String(mailError);
      log.error(`Failed to send failure email: ${msg}`);
    }
  }
}

/** Infers which pipeline step failed from the error message. */
function detectFailedStep(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('newsapi') || lower.includes('gnews') || lower.includes('news')) return 'news';
  if (lower.includes('huggingface') || lower.includes('hf') || lower.includes('llm')) return 'llm';
  if (lower.includes('unsplash') || lower.includes('image')) return 'image';
  if (lower.includes('linkedin')) return 'linkedin';
  return 'unknown';
}

// ─── Startup ─────────────────────────────────────────────────────────────────

log.info('LinkedIn Automation Tool — Initializing...');

try {
  checkTokenExpiry();
} catch (tokenError) {
  const err = tokenError instanceof Error ? tokenError : new Error(String(tokenError));
  log.error(err.message, err);
  process.exit(1);
}

// Schedule: 03:30 UTC = 09:00 IST
cron.schedule('30 3 * * *', () => {
  log.info('Cron triggered — 9:00 AM IST daily job');
  safeRun();
});

log.info('Cron job scheduled — runs daily at 9:00 AM IST (03:30 UTC)');

// Start health check server (required for Render to keep the process alive)
startHealthServer();

log.info('Ready — waiting for next scheduled run...');

export { safeRun as runNow };
