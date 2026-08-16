// Fastify routes that the Mexus plugin (running inside the agent CLI) calls
// to bind a pane to its agent session_id.
//
// All endpoints are localhost-only and gated by a one-shot token.
//
//   POST /api/internal/session-bind
//        body { paneId, sessionId, agent, source }
//        header X-Mexus-Token: <one-shot token issued via PtyManager>
//
// Dev-only endpoints (gated by createSessionBindModule({devEndpoints: true})):
//
//   GET  /api/internal/session-bind/state
//        debug — list current bindings + token-store size
//
//   POST /api/internal/session-bind/_issue-token
//        body { paneId }
//        returns { token } — used by the verify-session-bind E2E script;
//        production code uses sessionBindModule.issueToken(paneId) directly.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { SessionBindModule } from './index.ts'

const LOCAL_IPS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])

interface BindBody {
  paneId?: unknown
  sessionId?: unknown
  agent?: unknown
  source?: unknown
}

function isLocal(request: FastifyRequest): boolean {
  return LOCAL_IPS.has(request.ip)
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function rejectNonLocal(request: FastifyRequest, reply: FastifyReply): boolean {
  if (isLocal(request)) return false
  reply.code(403)
  reply.send({ error: '禁止访问：非本地来源' })
  return true
}

export function registerSessionBindRoute(
  fastify: FastifyInstance,
  module: SessionBindModule,
): void {
  fastify.post('/api/internal/session-bind', async (request, reply) => {
    if (rejectNonLocal(request, reply)) return

    const token = request.headers['x-mexus-token']
    if (typeof token !== 'string' || token.length === 0) {
      reply.code(401)
      return { error: '缺少 X-Mexus-Token' }
    }

    const body = (request.body ?? {}) as BindBody
    const paneId = stringField(body.paneId)
    const sessionId = stringField(body.sessionId)
    const agent = stringField(body.agent) ?? 'unknown'
    const source = stringField(body.source) ?? 'unknown'

    if (!paneId) {
      reply.code(400)
      return { error: '缺少 paneId' }
    }
    if (!sessionId) {
      reply.code(400)
      return { error: '缺少 sessionId' }
    }

    if (!module.tokens.consume(paneId, token)) {
      reply.code(401)
      return { error: '无效或已使用的 token' }
    }

    module.sessions.set({
      paneId,
      sessionId,
      agent,
      source,
      receivedAt: Date.now(),
    })

    return { ok: true }
  })

  if (module.devEndpoints) {
    fastify.get('/api/internal/session-bind/state', async (request, reply) => {
      if (rejectNonLocal(request, reply)) return
      return {
        bindings: module.sessions.list(),
        pendingTokens: module.tokens.size(),
      }
    })

    fastify.post('/api/internal/session-bind/_issue-token', async (request, reply) => {
      if (rejectNonLocal(request, reply)) return
      const body = (request.body ?? {}) as { paneId?: unknown }
      const paneId = stringField(body.paneId)
      if (!paneId) {
        reply.code(400)
        return { error: '缺少 paneId' }
      }
      const token = module.tokens.issue(paneId)
      return { token }
    })
  }
}
