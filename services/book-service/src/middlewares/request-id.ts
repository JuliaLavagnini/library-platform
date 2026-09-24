import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Every request gets an ID that appears in each log line about it and in the
// X-Request-ID response header. The API gateway creates the ID and passes it on, so a
// request can be traced through the gateway's logs and each service's logs.

// Only simple IDs are accepted, so a client can't inject odd characters into the logs.
const VALID_ID = /^[\w-]{1,100}$/;

export function requestId(req: IncomingMessage, res: ServerResponse) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-ID', id);
  return id;
}
