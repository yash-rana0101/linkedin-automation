/**
 * HTTP server for Render deployment.
 * Serves the compose UI, health endpoint, and manual post API.
 * Render requires a web service to bind to a port.
 */

import http from 'http';
import { log } from './logger';
import { handleRequest } from '../server/router';

const PORT = parseInt(process.env.PORT || '3000', 10);

/** Starts the HTTP server with routing. */
export function startHealthServer(): void {
  const server = http.createServer(handleRequest);

  server.listen(PORT, () => {
    log.info(`Server listening on port ${PORT}`);
    log.info(`Compose UI available at http://localhost:${PORT}/compose`);
  });
}
