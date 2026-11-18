// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { useLocation } from 'react-router'
import App from '../App.tsx'
import { renderAt } from '../test/render.tsx'

// Slots are shown in the guest's local time; pin it to UTC+3 before modules create Intl formatters.
vi.hoisted(() => vi.stubEnv('TZ', 'Europe/Moscow'))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-18T06:00:00.000Z'))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const intro = { id: 'intro', title: 'Знакомство', description: 'Короткий звонок', durationMinutes: 30 }
const slot = (start: string) => ({ start, end: new Date(Date.parse(start) + 30 * 60_000).toISOString() })

function mockApi(slots: unknown, slotsStatus = 200) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = (input as Request).url
    return url.endsWith('/slots') ? json(slots, slotsStatus) : json([intro])
  })
}

function Location() {
  const { search } = useLocation()
  return <output data-testid="search">{search}</output>
}

const search = () => screen.getByTestId('search').textContent

const open = (path: string) =>
  renderAt(
    path,
    <>
      <App />
      <Location />
    </>,
  )

test('catalog card leads to the slots page of its event type', async () => {
  mockApi([])

  open('/book')

  expect((await screen.findByRole('link', { name: /Знакомство/ })).getAttribute('href')).toBe('/book/intro')
})

test('shows dates of the window in local time and the slots of the selected date; picking a date changes ?date=', async () => {
  mockApi([slot('2026-11-18T09:00:00.000Z'), slot('2026-11-19T10:00:00.000Z'), slot('2026-11-19T10:30:00.000Z')])

  open('/book/intro')

  expect(await screen.findByRole('heading', { level: 2, name: 'Знакомство' })).toBeTruthy()
  expect(screen.getByRole('heading', { level: 1, name: 'Выберите время' })).toBeTruthy()
  expect(search()).toBe('?date=2026-11-18')
  expect(screen.getByRole('button', { name: '12:00' })).toBeTruthy()
  expect(screen.getByRole('button', { name: /20 нояб/ }).hasAttribute('disabled')).toBe(true)
  expect(screen.getByRole('button', { name: /1 дек/ })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: /19 нояб/ }))

  expect(search()).toBe('?date=2026-11-19')
  expect(screen.getByRole('button', { name: '13:00' })).toBeTruthy()
  expect(screen.getByRole('button', { name: '13:30' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: '12:00' })).toBeNull()
})

test('an empty date offers the nearest free date', async () => {
  mockApi([slot('2026-11-18T09:00:00.000Z'), slot('2026-11-22T09:00:00.000Z')])

  open('/book/intro?date=2026-11-20')

  expect(await screen.findByText('На эту дату свободного времени нет')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Ближайшая свободная дата: 22 ноября' }))

  expect(search()).toBe('?date=2026-11-22')
  expect(screen.getByRole('button', { name: '12:00' })).toBeTruthy()
})

test.each(['?date=2026-12-02', '?date=2026-11-17', '?date=garbage', ''])(
  'date %j outside the window or malformed is replaced by the first date with slots',
  async (query) => {
    mockApi([slot('2026-11-19T10:00:00.000Z')])

    open(`/book/intro${query}`)

    expect(await screen.findByRole('button', { name: '13:00' })).toBeTruthy()
    expect(search()).toBe('?date=2026-11-19')
  },
)

test('no slots in the whole window says so and links to the catalog', async () => {
  mockApi([])

  open('/book/intro')

  expect(await screen.findByText('В ближайшие 14 дней свободного времени нет')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'В каталог' }).getAttribute('href')).toBe('/book')
})

test('unknown event type says it is not found and links to the catalog', async () => {
  mockApi({ code: 'EVENT_TYPE_NOT_FOUND', message: 'not found' }, 404)

  open('/book/missing')

  expect(await screen.findByText('Тип встречи не найден')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'В каталог' }).getAttribute('href')).toBe('/book')
})

test('shows a loader while loading', () => {
  vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}))

  open('/book/intro')

  expect(screen.getByRole('heading', { level: 1, name: 'Выберите время' })).toBeTruthy()
  expect(screen.getByRole('status', { name: 'Загрузка' })).toBeTruthy()
})

test('a failed request shows one alert and Повторить reloads both', async () => {
  const fetch = mockApi([slot('2026-11-18T09:00:00.000Z')])
  fetch.mockImplementationOnce(() => Promise.reject(new TypeError('Failed to fetch')))

  open('/book/intro')

  expect((await screen.findByRole('alert')).textContent).toContain('Не удалось загрузить данные')
  fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))

  expect(await screen.findByRole('button', { name: '12:00' })).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})
