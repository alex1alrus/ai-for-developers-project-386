import { Alert, Anchor, Button, Group, Loader, Stack, Text, TextInput, Title } from '@mantine/core'
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { type ApiError, type Booking, createBooking, type EventType, listEventTypes, listSlots, type Slot } from '../api'
import { BookingRequestSchema } from '../api/schemas.gen.ts'
import { stringError } from '../validate.ts'

type State =
  | { status: 'loading' }
  | { status: 'failed' }
  | { status: 'notFound' }
  | { status: 'loaded'; eventType: EventType; slots: Slot[]; dates: string[] }

const schema = BookingRequestSchema.properties
const emptyForm = { guestName: '', guestEmail: '' }
type Form = typeof emptyForm
type Errors = Partial<Record<keyof Form, string>>
type Submit = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'failed'; message: string }

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

const page = (children: ReactNode, heading = 'Выберите время') => (
  <Stack>
    <Title>{heading}</Title>
    {children}
  </Stack>
)

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
  const [picked, setPicked] = useState<Slot>()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [submitState, setSubmit] = useState<Submit>({ kind: 'idle' })
  const [booked, setBooked] = useState<Booking>()

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

  if (state.status === 'loading' || needsDate) return page(<Loader role="status" aria-label="Загрузка" />)
  if (state.status === 'failed') {
    return page(
      <Alert color="red" title="Не удалось загрузить данные">
        <Button variant="light" color="red" onClick={retry}>
          Повторить
        </Button>
      </Alert>
    )
  }
  if (state.status === 'notFound') {
    return page(
      <Stack align="start">
        <Text>Тип встречи не найден</Text>
        <CatalogLink />
      </Stack>
    )
  }

  if (booked) {
    const start = new Date(booked.start)
    return page(
      <Stack align="start" gap="xs">
        <Text>{state.eventType.title}</Text>
        <Text>
          {longDay.format(start)}, {time.format(start)}
        </Text>
        <Text>{booked.guestName}</Text>
        <Text>{booked.guestEmail}</Text>
        <CatalogLink />
      </Stack>,
      'Вы записаны',
    )
  }

  const nearest = freeDates.find((date) => date > selected) ?? freeDates.at(-1)

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!picked) return
    const body = {
      eventTypeId,
      start: picked.start,
      guestName: form.guestName.trim(),
      guestEmail: form.guestEmail.trim(),
    }
    const found: Errors = {
      guestName: stringError(schema.guestName, body.guestName, 'Без переносов строки'),
      guestEmail: stringError(schema.guestEmail, body.guestEmail, 'Введите email вида name@example.com'),
    }
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    setSubmit({ kind: 'submitting' })
    try {
      const { data } = await createBooking({ body, throwOnError: true })
      setBooked(data)
    } catch (error) {
      const code = (error as Partial<ApiError> | undefined)?.code
      if (code === 'EVENT_TYPE_NOT_FOUND') {
        setState({ status: 'notFound' })
      } else if (code === 'BOOKING_CONFLICT' || code === 'INVALID_START') {
        setPicked(undefined)
        setSubmit({ kind: 'failed', message: 'Это время уже недоступно. Выберите другое.' })
        setAttempt((n) => n + 1) // fresh slots without the loader; ?date= stays
      } else {
        const message =
          code === 'VALIDATION_ERROR' ? 'Проверьте поля и попробуйте ещё раз' : 'Не удалось отправить. Попробуйте ещё раз.'
        setSubmit({ kind: 'failed', message })
      }
    }
  }

  const change = (key: keyof Form) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [key]: event.currentTarget.value })
    setErrors({ ...errors, [key]: undefined })
  }

  const alert = submitState.kind === 'failed' && <Alert color="red" title={submitState.message} />

  return page(
    <>
      <Title order={2}>{state.eventType.title}</Title>
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
          {!picked && alert}
          {byDate.has(selected) ? (
            <Group gap="xs">
              {byDate.get(selected)!.map((slot) => (
                <Button
                  key={slot.start}
                  variant={slot.start === picked?.start ? 'filled' : 'light'}
                  aria-pressed={slot.start === picked?.start}
                  onClick={() => {
                    setPicked(slot)
                    setSubmit({ kind: 'idle' })
                  }}
                >
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
          {picked && (
            <form onSubmit={send} noValidate>
              <Stack>
                {alert}
                <TextInput label="Имя" value={form.guestName} onChange={change('guestName')} error={errors.guestName} />
                <TextInput
                  label="Email"
                  type="email"
                  value={form.guestEmail}
                  onChange={change('guestEmail')}
                  error={errors.guestEmail}
                />
                <Button type="submit" disabled={submitState.kind === 'submitting'}>
                  Записаться
                </Button>
              </Stack>
            </form>
          )}
        </>
      )}
    </>,
  )
}
