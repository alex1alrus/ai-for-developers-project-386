import Fastify from 'fastify'
import glue from 'fastify-openapi-glue'
import { join } from 'node:path'
import type { RouteHandlers } from './api/fastify.gen.ts'
import type { EventType } from './api/types.gen.ts'

const specification = join(import.meta.dirname, '../spec/generated/openapi.yaml')

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
  const eventTypes: EventType[] = []

  const serviceHandlers: RouteHandlers = {
    listEventTypes(_req, reply) {
      reply.code(200).send(eventTypes.toSorted((a, b) => a.title.localeCompare(b.title)))
    },
  }

  app.get('/api/health', async () => ({ status: 'ok' }))
  app.register(glue, { specification, serviceHandlers })

  return app
}
