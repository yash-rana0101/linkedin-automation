/**
 * LinkedIn token expiry checker.
 * Warns 7 days before expiry and throws if the token has expired.
 */

import { LINKEDIN_TOKEN_VALIDITY_DAYS, TOKEN_WARNING_DAYS } from '../constants/prompts';
import { log } from './logger';

/** Checks the LinkedIn token expiry based on LINKEDIN_TOKEN_CREATED_AT env var. */
export function checkTokenExpiry(): void {
  const createdAt = process.env.LINKEDIN_TOKEN_CREATED_AT;

  if (!createdAt) {
    log.warn(
      'LINKEDIN_TOKEN_CREATED_AT not set in .env — cannot check token expiry. ' +
      'Set it to the date you generated your LinkedIn access token (YYYY-MM-DD).'
    );
    return;
  }

  const createdDate = new Date(createdAt);
  if (isNaN(createdDate.getTime())) {
    log.warn(`Invalid LINKEDIN_TOKEN_CREATED_AT value: "${createdAt}". Use YYYY-MM-DD format.`);
    return;
  }

  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + LINKEDIN_TOKEN_VALIDITY_DAYS);

  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry <= 0) {
    throw new Error(
      `LinkedIn access token EXPIRED ${Math.abs(daysUntilExpiry)} day(s) ago. ` +
      `Created: ${createdAt}, Expired: ${expiryDate.toISOString().split('T')[0]}. ` +
      'Please generate a new token and update .env.'
    );
  }

  if (daysUntilExpiry <= TOKEN_WARNING_DAYS) {
    log.warn(
      `LinkedIn access token expires in ${daysUntilExpiry} day(s) ` +
      `(on ${expiryDate.toISOString().split('T')[0]}). Renew it soon!`
    );
  } else {
    log.info(`LinkedIn token valid — expires in ${daysUntilExpiry} days.`);
  }
}
