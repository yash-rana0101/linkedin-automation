/**
 * Mail service — sends success/failure email notifications via Gmail SMTP.
 */

import nodemailer from 'nodemailer';
import { AutomationRun } from '../types';
import { log } from '../utils/logger';

/** Creates the Nodemailer Gmail SMTP transport. */
function createTransport() {
  const user = process.env.EMAIL_FROM;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('EMAIL_FROM or GMAIL_APP_PASSWORD not set in .env');
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

/** Returns current date string in IST for email subjects. */
function getDateIST(): string {
  return new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Returns current timestamp in IST. */
function getTimestampIST(): string {
  return new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/** Sends a success notification email. */
export async function sendSuccessMail(run: AutomationRun): Promise<void> {
  log.info('Sending success notification email...');

  const transport = createTransport();
  const emailTo = process.env.EMAIL_TO;
  if (!emailTo) throw new Error('EMAIL_TO not set in .env');

  const preview = run.post.postText.slice(0, 100);
  const newsSource = run.news
    ? `${run.news.source} — ${run.news.title}`
    : `Original (${run.post.contentMode} mode)`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0a66c2;">✅ LinkedIn Post Published</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Post Preview</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${preview}...</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Content Source</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${newsSource}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Post ID</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${run.linkedInPost.postId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Image</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">by ${run.image.photographer}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Timestamp (IST)</td>
          <td style="padding: 8px;">${getTimestampIST()}</td>
        </tr>
      </table>
    </div>
  `;

  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: emailTo,
    subject: `✅ LinkedIn Post Published — ${getDateIST()}`,
    html,
  });

  log.info('Success email sent.');
}

/** Sends a failure notification email. */
export async function sendFailureMail(step: string, error: Error): Promise<void> {
  log.info(`Sending failure notification email (step: ${step})...`);

  const transport = createTransport();
  const emailTo = process.env.EMAIL_TO;
  if (!emailTo) throw new Error('EMAIL_TO not set in .env');

  const stackLines = (error.stack || '').split('\n').slice(0, 5).join('<br>');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #cc0000;">❌ LinkedIn Automation Failed</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Failed Step</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${step}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Error Message</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; color: #cc0000;">${error.message}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Stack Trace</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; font-family: monospace;">${stackLines}</td>
        </tr>
        <tr>
          <td style="padding: 8px; font-weight: bold;">Timestamp (IST)</td>
          <td style="padding: 8px;">${getTimestampIST()}</td>
        </tr>
      </table>
    </div>
  `;

  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: emailTo,
    subject: `❌ LinkedIn Automation Failed — ${getDateIST()}`,
    html,
  });

  log.info('Failure email sent.');
}
