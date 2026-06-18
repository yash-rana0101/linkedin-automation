/**
 * Run log manager — enforces the 1-hour minimum gap between LinkedIn posts.
 * Reads/writes to run-log.json in the project root.
 */

import * as fs from 'fs';
import * as path from 'path';
import { RunLogEntry } from '../types';
import { MIN_POST_INTERVAL_MS } from '../constants/prompts';
import { log } from './logger';

const RUN_LOG_PATH = path.resolve(__dirname, '../../run-log.json');

/** Reads all entries from the run log file. */
export function readRunLog(): RunLogEntry[] {
  try {
    if (!fs.existsSync(RUN_LOG_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(RUN_LOG_PATH, 'utf-8');
    return JSON.parse(raw) as RunLogEntry[];
  } catch {
    log.warn('Failed to read run-log.json, returning empty log.');
    return [];
  }
}

/** Returns the timestamp of the most recent run, or null if no runs. */
export function getLastRunTime(): string | null {
  const entries = readRunLog();
  if (entries.length === 0) return null;
  return entries[entries.length - 1].lastRunAt;
}

/** Returns true if enough time has passed since the last run. */
export function canRunNow(): boolean {
  const lastRun = getLastRunTime();
  if (!lastRun) return true;

  const elapsed = Date.now() - new Date(lastRun).getTime();
  return elapsed >= MIN_POST_INTERVAL_MS;
}

/** Records a new run entry to the log file. */
export function recordRun(entry: RunLogEntry): void {
  const entries = readRunLog();
  entries.push(entry);

  // Keep only the last 100 entries to prevent unbounded growth
  const trimmed = entries.slice(-100);

  fs.writeFileSync(RUN_LOG_PATH, JSON.stringify(trimmed, null, 2), 'utf-8');
  log.info(`Run recorded: postId=${entry.postId}, success=${entry.success}`);
}
