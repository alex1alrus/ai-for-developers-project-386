import { Alert, Anchor, Button, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { type ApiError, type EventType, listEventTypes, listSlots, type Slot } from '../api'

type State =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'notFound' }
  | { status: 'loaded'; eventType: EventType; slots: Slot[]; dates: string[] }

const DAY = 24 * 60 * 60_000

/** Local `YYYY-MM-DD` of the guest's browser. */
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Local dates that can hold a slot of the window: from today 09:00 UTC to the 14th day 17:30 UTC (14 or 15 dates). */
function windowDates(now: number) {
  const today = Math.floor(now / DAY) * DAY
  const last = localDate(new Date(today + 13 * DAY + (17 * 60 + 30) * 60_000))
  const first = new Date(today + 9 * 60 * 60_000)
  const dates: string[] = []
  for (let day = 0; dates.at(-1) !== last; day++) {
    dates.push(localDate(new Date(first.getFullYear(), first.getMonth(), first.getDate() + day)))
  }
  return dates
}

const parseLocal = (date: string) => new Date(`${date}T00:00`)
const dayLabel = new Intl.DateTimeFormat('ru', { weekday: 'short', day: 'numeric', month: 'short' })
const longDay = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' })
const time = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' })

function CatalogLink() {
  return (
    <Anchor component={Link} to="/book">
      В каталог
    </Anchor>
  )
}

export default function BookingPage() {
  const { eventTypeId = '' } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    Promise.all([
      listEventTypes({ throwOnError: true }),
      listSlots({ path: { id: eventTypeId }, throwOnError: true }),
    ]).then(
      ([{ data: eventTypes }, { data: slots }]) => {
        const eventType = eventTypes.find((eventType) => eventType.id === eventTypeId)
        setState(eventType ? { status: 'loaded', eventType, slots, dates: windowDates(Date.now()) } : { status: 'notFound' })
      },
      (error) =>
        setState({ status: (error as Partial<ApiError>)?.code === 'EVENT_TYPE_NOT_FOUND' ? 'notFound' : 'failed' }),
    )
  }, [eventTypeId, attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  const slots = state.status === 'loaded' ? state.slots : []
  const byDate = new Map<string, Slot[]>()
  for (const slot of slots) {
    const date = localDate(new Date(slot.start))
    byDate.set(date, [...(byDate.get(date) ?? []), slot])
  }
  const dates = state.status === 'loaded' ? state.dates : []
  const freeDates = dates.filter((date) => byDate.has(date))
  const selected = searchParams.get('date') ?? ''
  const selectDate = (date: string, replace = false) => setSearchParams({ date }, { replace })

  const needsDate = state.status === 'loaded' && freeDates.length > 0 && !dates.includes(selected)
  useEffect(() => {
    if (needsDate) selectDate(freeDates[0], true)
  })

  if (state.status === 'loading' || needsDate) return <Loader role="status" aria-label="Загрузка" />
  if (state.status === 'failed') {
    return (
      <Alert color="red" title="Не удалось загрузить данные">
        <Button variant="light" color="red" onClick={retry}>
          Повторить
        </Button>
      </Alert>
    )
  }
  if (state.status === 'notFound') {
    return (
      <Stack align="start">
        <Text>Тип встречи не найден</Text>
        <CatalogLink />
      </Stack>
    )
  }

  const nearest = freeDates.find((date) => date > selected) ?? freeDates.at(-1)

  return (
    <Stack>
      <Title>{state.eventType.title}</Title>
      <Text c="dimmed">
        {state.eventType.durationMinutes} мин. {state.eventType.description}
      </Text>
      {freeDates.length === 0 ? (
        <Stack align="start">
          <Text>В ближайшие 14 дней свободного времени нет</Text>
          <CatalogLink />
        </Stack>
      ) : (
        <>
          <Group gap="xs">
            {dates.map((date) => (
              <Button
                key={date}
                variant={date === selected ? 'filled' : 'default'}
                aria-pressed={date === selected}
                disabled={!byDate.has(date)}
                onClick={() => selectDate(date)}
              >
                {dayLabel.format(parseLocal(date))}
              </Button>
            ))}
          </Group>
          {byDate.has(selected) ? (
            <Group gap="xs">
              {byDate.get(selected)!.map((slot) => (
                <Button key={slot.start} variant="light">
                  {time.format(new Date(slot.start))}
                </Button>
              ))}
            </Group>
          ) : (
            <Stack align="start">
              <Text>На эту дату свободного времени нет</Text>
              {nearest && (
                <Button variant="light" onClick={() => selectDate(nearest)}>
                  Ближайшая свободная дата: {longDay.format(parseLocal(nearest))}
                </Button>
              )}
            </Stack>
          )}
        </>
      )}
    </Stack>
  )
}
