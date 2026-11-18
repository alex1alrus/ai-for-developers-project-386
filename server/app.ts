import Fastify, { type FastifyError } from 'fastify'
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
    // Synchronous: no await between the id check and the push, so concurrent requests cannot both pass.
    createEventType(req, reply) {
      if (eventTypes.some((eventType) => eventType.id === req.body.id)) {
        reply.code(409).send({ code: 'EVENT_TYPE_EXISTS', message: `Event type "${req.body.id}" already exists` })
        return
      }
      eventTypes.push(req.body)
      reply.code(201).send(req.body)
    },
  }

  app.setErrorHandler<FastifyError>((error, _req, reply) => {
    if (!error.validation) throw error
    reply.code(400).send({ code: 'VALIDATION_ERROR', message: error.message })
  })

  app.get('/api/health', async () => ({ status: 'ok' }))
  app.register(glue, { specification, serviceHandlers })

  return app
}
