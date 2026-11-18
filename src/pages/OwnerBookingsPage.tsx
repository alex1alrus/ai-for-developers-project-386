import { Alert, Anchor, Button, Card, List, Loader, Stack, Text } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { type Booking, listBookings, listEventTypes } from '../api'

type State = { status: 'loading' } | { status: 'failed' } | { status: 'loaded'; bookings: Booking[]; titles: Map<string, string> }

const day = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' })
const time = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' })

export default function OwnerBookingsPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    Promise.all([listBookings({ throwOnError: true }), listEventTypes({ throwOnError: true })]).then(
      ([bookings, eventTypes]) =>
        setState({
          status: 'loaded',
          bookings: bookings.data,
          titles: new Map(eventTypes.data.map((eventType) => [eventType.id, eventType.title])),
        }),
      () => setState({ status: 'failed' }),
    )
  }, [attempt])

  if (state.status === 'loading') return <Loader role="status" aria-label="Загрузка" />
  if (state.status === 'failed')
    return (
      <Alert color="red" title="Не удалось загрузить данные">
        <Button
          variant="light"
          color="red"
          onClick={() => {
            setState({ status: 'loading' })
            setAttempt((n) => n + 1)
          }}
        >
          Повторить
        </Button>
      </Alert>
    )
  if (state.bookings.length === 0)
    return (
      <Stack align="flex-start">
        <Text c="dimmed">Предстоящих записей нет.</Text>
        <Anchor component={Link} to="/book">
          Открыть каталог
        </Anchor>
      </Stack>
    )

  return (
    <List listStyleType="none" spacing="sm">
      {state.bookings.map((booking) => {
        const start = new Date(booking.start)
        return (
          <List.Item key={booking.id}>
            <Card withBorder>
              <Text fw={600}>{state.titles.get(booking.eventTypeId) ?? booking.eventTypeId}</Text>
              <Text>
                {day.format(start)}, {time.format(start)}–{time.format(new Date(booking.end))}
              </Text>
              <Text c="dimmed">
                {booking.guestName} · {booking.guestEmail}
              </Text>
            </Card>
          </List.Item>
        )
      })}
    </List>
  )
}
