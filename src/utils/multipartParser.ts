/**
 * Zero-dependency multipart/form-data parser.
 * Extracts text fields and file buffers from incoming HTTP requests.
 */

import http from 'http';

export interface ParsedField {
  name: string;
  value: string;
}

export interface ParsedFile {
  name: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface ParsedFormData {
  fields: ParsedField[];
  files: ParsedFile[];
}

/** Reads the full request body into a Buffer. */
function readBody(req: http.IncomingMessage, maxBytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > maxBytes) {
        req.destroy();
        reject(new Error(`Request body exceeds ${maxBytes} bytes limit`));
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/** Extracts the boundary string from the Content-Type header. */
function extractBoundary(contentType: string): string | null {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^\s;]+))/i);
  return match ? (match[1] || match[2]) : null;
}

/** Parses a single part's headers to extract name, filename, and content-type. */
function parsePartHeaders(headerBlock: string): {
  name: string;
  filename?: string;
  contentType?: string;
} {
  const nameMatch = headerBlock.match(/name="([^"]+)"/);
  const filenameMatch = headerBlock.match(/filename="([^"]+)"/);
  const ctMatch = headerBlock.match(/Content-Type:\s*(.+)/i);

  return {
    name: nameMatch?.[1] ?? '',
    filename: filenameMatch?.[1],
    contentType: ctMatch?.[1]?.trim(),
  };
}

/**
 * Parses a multipart/form-data request body.
 * @param req    Incoming HTTP request
 * @param maxBytes  Maximum body size (default 50MB)
 */
export async function parseMultipart(
  req: http.IncomingMessage,
  maxBytes = 200 * 1024 * 1024,
): Promise<ParsedFormData> {
  const contentType = req.headers['content-type'] ?? '';
  const boundary = extractBoundary(contentType);

  if (!boundary) {
    throw new Error('Missing or invalid multipart boundary');
  }

  const body = await readBody(req, maxBytes);
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const result: ParsedFormData = { fields: [], files: [] };

  // Split body by boundary markers
  const parts: Buffer[] = [];
  let searchStart = 0;

  while (true) {
    const idx = body.indexOf(boundaryBuffer, searchStart);
    if (idx === -1) break;

    if (searchStart > 0) {
      // Extract part between previous boundary end and current boundary
      const partStart = searchStart;
      const partEnd = idx;
      if (partEnd > partStart) {
        // Trim CRLF from start and end
        let pStart = partStart;
        let pEnd = partEnd;
        if (body[pStart] === 0x0d && body[pStart + 1] === 0x0a) pStart += 2;
        if (body[pEnd - 2] === 0x0d && body[pEnd - 1] === 0x0a) pEnd -= 2;
        if (pEnd > pStart) {
          parts.push(body.subarray(pStart, pEnd));
        }
      }
    }

    searchStart = idx + boundaryBuffer.length;

    // Check for closing boundary (--boundary--)
    if (body[searchStart] === 0x2d && body[searchStart + 1] === 0x2d) break;
  }

  // Parse each part
  const headerBodySeparator = Buffer.from('\r\n\r\n');

  for (const part of parts) {
    const sepIdx = part.indexOf(headerBodySeparator);
    if (sepIdx === -1) continue;

    const headerBlock = part.subarray(0, sepIdx).toString('utf-8');
    const bodyContent = part.subarray(sepIdx + 4);
    const { name, filename, contentType: partCT } = parsePartHeaders(headerBlock);

    if (!name) continue;

    if (filename) {
      result.files.push({
        name,
        filename,
        mimeType: partCT ?? 'application/octet-stream',
        buffer: Buffer.from(bodyContent),
      });
    } else {
      result.fields.push({
        name,
        value: bodyContent.toString('utf-8'),
      });
    }
  }

  return result;
}
