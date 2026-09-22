/**
 * router.mjs — the route table, and nothing else.
 *
 * Split out of `server.mjs` for rule 4. The seam is real: this is a pure function of
 * (method, path) with no closure, no config and no store, which also makes it the one
 * part of the gateway a test can exhaust without a socket.
 *
 * A new endpoint is a ROW here, not a new branch in the request handler.
 */

import {
  listModels, wallet, createQuote, createJob, getJob, cancelJob,
  getAsset, getAssetContent, estimate,
} from './routes.mjs';

/** @returns {{handler: Function, id?: string, extra?: object} | null} */
export function matchRoute(method, path) {
  if (method === 'GET' && path === '/health') return { handler: () => ({ status: 200, body: { ok: true } }) };
  if (method === 'GET' && path === '/v1/models') return { handler: listModels };
  if (method === 'GET' && path === '/v1/wallet') return { handler: wallet };
  if (method === 'POST' && path === '/v1/estimate') return { handler: estimate };
  if (method === 'POST' && path === '/v1/quotes') return { handler: createQuote };
  if (method === 'POST' && path === '/v1/jobs') return { handler: createJob };

  const job = path.match(/^\/v1\/jobs\/([^/]+)$/);
  if (method === 'GET' && job) return { handler: getJob, id: job[1] };

  const cancel = path.match(/^\/v1\/jobs\/([^/]+)\/cancel$/);
  if (method === 'POST' && cancel) return { handler: cancelJob, id: cancel[1] };

  const asset = path.match(/^\/v1\/assets\/([^/]+)$/);
  if (method === 'GET' && asset) return { handler: getAsset, id: asset[1] };

  const content = path.match(/^\/v1\/assets\/([^/]+)\/content$/);
  if (method === 'GET' && content) return { handler: getAssetContent, id: content[1] };

  return null;
}
