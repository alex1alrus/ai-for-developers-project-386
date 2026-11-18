import { expect, test } from 'vitest'
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
