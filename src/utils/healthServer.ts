/**
 * Health check HTTP server for Render deployment.
 * Render requires a web service to bind to a port.
 * This lightweight server keeps the process alive and provides a /health endpoint.
 */

import http from 'http';
import { log } from './logger';
import { getLastRunTime } from './runLog';

const PORT = parseInt(process.env.PORT || '3000', 10);

/** Starts the health check HTTP server. */
export function startHealthServer(): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      const lastRun = getLastRunTime();
      const uptime = Math.floor(process.uptime());

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'linkedin-automation',
        uptime: `${uptime}s`,
        lastRun: lastRun || 'never',
        nextCron: '09:00 AM IST daily',
        timestamp: new Date().toISOString(),
      }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(PORT, () => {
    log.info(`Health server listening on port ${PORT}`);
  });
}
