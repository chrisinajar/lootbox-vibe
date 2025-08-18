import type { Request } from 'express';

export type RequestContext = {
  uid: string;
  reqId: string;
};

function genReqId() {
  // quick, dependency-free
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function buildContext(req: Request): RequestContext {
  const headerUid = (req.headers['x-user-id'] || req.headers['X-User-Id' as any]) as
    | string
    | undefined;
  const fallbackUid = process.env.DEFAULT_UID;
  const uid = headerUid || fallbackUid || 'anonymous';
  const reqId = (req.headers['x-request-id'] as string | undefined) || genReqId();
  return { uid, reqId };
}
