import Fastify, { type FastifyError } from 'fastify'
import glue from 'fastify-openapi-glue'
import { join } from 'node:path'
import type { RouteHandlers } from './api/fastify.gen.ts'
import type { Booking, EventType } from './api/types.gen.ts'
import { freeSlots } from './slots.ts'
import { randomUUID } from 'node:crypto'

const specification = join(import.meta.dirname, '../spec/generated/openapi.yaml')

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' })
  const eventTypes: EventType[] = []
  const bookings: Booking[] = []

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
    listSlots(req, reply) {
      const eventType = eventTypes.find((eventType) => eventType.id === req.params.id)
      if (!eventType) {
        reply.code(404).send({ code: 'EVENT_TYPE_NOT_FOUND', message: `Event type "${req.params.id}" not found` })
        return
      }
      reply.code(200).send(freeSlots(eventType.durationMinutes, bookings, new Date()))
    },
    // Synchronous: no await between the conflict check and the push, so concurrent requests cannot both pass.
    createBooking(req, reply) {
      const { eventTypeId, start } = req.body
      const eventType = eventTypes.find((eventType) => eventType.id === eventTypeId)
      if (!eventType) {
        reply.code(404).send({ code: 'EVENT_TYPE_NOT_FOUND', message: `Event type "${eventTypeId}" not found` })
        return
      }
      const now = new Date()
      const startIso = new Date(start).toISOString()
      const slot = freeSlots(eventType.durationMinutes, [], now).find((slot) => slot.start === startIso)
      if (!slot) {
        reply.code(400).send({ code: 'INVALID_START', message: `${start} is not a slot start of "${eventTypeId}"` })
        return
      }
      // The overlap rule itself lives in `freeSlots`: a slot that overlaps any booking is not free.
      if (!freeSlots(eventType.durationMinutes, bookings, now).some((free) => free.start === slot.start)) {
        reply.code(409).send({ code: 'BOOKING_CONFLICT', message: `${start} overlaps an existing booking` })
        return
      }
      const booking: Booking = { ...req.body, id: randomUUID(), start: slot.start, end: slot.end }
      bookings.push(booking)
      reply.code(201).send(booking)
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
