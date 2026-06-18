/**
 * Manual test runner — triggers the full automation pipeline once.
 * Usage: npx ts-node scripts/test-run.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { log } from '../src/utils/logger';
import { checkTokenExpiry } from '../src/utils/tokenExpiry';
import { pickContentMode } from '../src/constants/prompts';
import { fetchNews } from '../src/services/news.service';
import { generatePost } from '../src/services/llm.service';
import { fetchImage } from '../src/services/image.service';
import { postToLinkedIn } from '../src/services/linkedin.service';
import { sendSuccessMail, sendFailureMail } from '../src/services/mail.service';
import { AutomationRun, NewsItem } from '../src/types';
import { recordRun } from '../src/utils/runLog';

async function testRun(): Promise<void> {
  log.info('═══ TEST RUN — LinkedIn Automation Pipeline ═══');

  try {
    checkTokenExpiry();
  } catch (err) {
    log.error('Token expired!', err instanceof Error ? err : new Error(String(err)));
    return;
  }

  try {
    // Pick content mode
    const mode = pickContentMode();
    log.info(`Content mode: "${mode}"`);

    // Step 1: Fetch news (only for news mode)
    let news: NewsItem | null = null;
    if (mode === 'news') {
      log.info('Step 1/5 — Fetching news...');
      news = await fetchNews();
      log.info(`✅ News: "${news.title}" (${news.source})`);
    } else {
      log.info(`Step 1/5 — Skipped (${mode} mode)`);
    }

    // Step 2: Generate post
    log.info('Step 2/5 — Generating LinkedIn post...');
    const post = await generatePost(mode, news);
    log.info(`✅ Post generated — ${post.wordCount} words`);
    console.log('\n--- Generated Post Preview ---');
    console.log(post.postText);
    console.log('--- End Preview ---\n');

    // Step 3: Fetch image (MANDATORY)
    log.info('Step 3/5 — Fetching image...');
    const image = await fetchImage(post.imageKeywords);
    log.info(`✅ Image: by ${image.photographer} (${image.imageBuffer.length} bytes)`);

    // Step 4: Post to LinkedIn
    log.info('Step 4/5 — Posting to LinkedIn...');
    const linkedInPost = await postToLinkedIn(post.postText, image, news?.title || post.imageKeywords);
    log.info(`✅ LinkedIn post created — ID: ${linkedInPost.postId}`);

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
    log.info('✅ Success email sent!');

    log.info('═══ TEST RUN — Pipeline completed successfully! ═══');
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error(`❌ Pipeline failed: ${err.message}`, err);

    try {
      const step = detectFailedStep(err.message);
      await sendFailureMail(step, err);
      log.info('Failure email sent.');
    } catch (mailErr) {
      log.error('Also failed to send failure email.', mailErr instanceof Error ? mailErr : undefined);
    }
  }
}

function detectFailedStep(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('newsapi') || lower.includes('gnews') || lower.includes('news')) return 'news';
  if (lower.includes('huggingface') || lower.includes('hf') || lower.includes('llm')) return 'llm';
  if (lower.includes('unsplash') || lower.includes('image')) return 'image';
  if (lower.includes('linkedin')) return 'linkedin';
  return 'unknown';
}

testRun();
