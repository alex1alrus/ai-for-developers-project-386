import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { buildApp } from './app.ts'

test('app starts and answers health check', async () => {
  const app = buildApp()
  const res = await app.inject({ method: 'GET', url: '/api/health' })

  expect(res.statusCode).toBe(200)
  expect(res.json()).toEqual({ status: 'ok' })
  await app.close()
})

test('GET /api/event-types returns an empty catalog', async () => {
  const app = buildApp()
  const res = await app.inject({ method: 'GET', url: '/api/event-types' })

  expect(res.statusCode).toBe(200)
  expect(res.json()).toEqual([])
  await app.close()
})

const intro = { id: 'intro', title: 'Знакомство', description: 'Короткий звонок', durationMinutes: 30 }

const createEventType = (app: ReturnType<typeof buildApp>, payload: object) =>
  app.inject({ method: 'POST', url: '/api/event-types', payload })

const listEventTypes = async (app: ReturnType<typeof buildApp>) =>
  (await app.inject({ method: 'GET', url: '/api/event-types' })).json()

test('POST /api/event-types creates an event type that the catalog lists sorted by title', async () => {
  const app = buildApp()
  const deep = { id: 'deep-dive', title: 'Разбор проекта', description: '', durationMinutes: 540 }

  const res = await createEventType(app, deep)
  await createEventType(app, intro)

  expect(res.statusCode).toBe(201)
  expect(res.json()).toEqual(deep)
  expect(await listEventTypes(app)).toEqual([intro, deep])
  await app.close()
})

test.each([
  ['id with uppercase', { id: 'Intro' }],
  ['id with a trailing hyphen', { id: 'intro-' }],
  ['id longer than 64', { id: 'a'.repeat(65) }],
  ['empty title', { title: '' }],
  ['title with surrounding spaces', { title: ' Знакомство' }],
  ['title with a line break', { title: 'Знако\nмство' }],
  ['title longer than 100', { title: 'a'.repeat(101) }],
  ['missing description', { description: undefined }],
  ['description longer than 500', { description: 'a'.repeat(501) }],
  ['duration below 15', { durationMinutes: 0 }],
  ['duration above 540', { durationMinutes: 555 }],
  ['duration not a multiple of 15', { durationMinutes: 20 }],
  ['fractional duration', { durationMinutes: 15.5 }],
])('POST /api/event-types rejects %s with VALIDATION_ERROR', async (_case, patch) => {
  const app = buildApp()
  const res = await createEventType(app, { ...intro, ...patch })

  expect(res.statusCode).toBe(400)
  expect(res.json()).toMatchObject({ code: 'VALIDATION_ERROR', message: expect.any(String) })
  expect(await listEventTypes(app)).toEqual([])
  await app.close()
})

test('POST /api/event-types rejects a taken id with EVENT_TYPE_EXISTS', async () => {
  const app = buildApp()
  await createEventType(app, intro)

  const res = await createEventType(app, { ...intro, title: 'Другой' })

  expect(res.statusCode).toBe(409)
  expect(res.json()).toMatchObject({ code: 'EVENT_TYPE_EXISTS', message: expect.any(String) })
  expect(await listEventTypes(app)).toEqual([intro])
  await app.close()
})

describe('GET /api/event-types/{id}/slots', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-18T17:10:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  test('returns free slots of the window sorted by start', async () => {
    const app = buildApp()
    await createEventType(app, intro)

    const res = await app.inject({ method: 'GET', url: '/api/event-types/intro/slots' })

    expect(res.statusCode).toBe(200)
    const slots = res.json()
    expect(slots.slice(0, 2)).toEqual([
      { start: '2026-11-18T17:30:00.000Z', end: '2026-11-18T18:00:00.000Z' },
      { start: '2026-11-19T09:00:00.000Z', end: '2026-11-19T09:30:00.000Z' },
    ])
    expect(slots.at(-1)).toEqual({ start: '2026-12-01T17:30:00.000Z', end: '2026-12-01T18:00:00.000Z' })
    expect(slots).toHaveLength(1 + 13 * 18)
    await app.close()
  })

  test('answers 404 EVENT_TYPE_NOT_FOUND for an unknown event type', async () => {
    const app = buildApp()

    const res = await app.inject({ method: 'GET', url: '/api/event-types/missing/slots' })

    expect(res.statusCode).toBe(404)
    expect(res.json()).toMatchObject({ code: 'EVENT_TYPE_NOT_FOUND', message: expect.any(String) })
    await app.close()
  })
})
