import { Alert, Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { type EventType, listEventTypes } from '../api'

type State = { status: 'loading' } | { status: 'failed' } | { status: 'loaded'; eventTypes: EventType[] }

export default function CatalogPage() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    listEventTypes({ throwOnError: true }).then(
      ({ data }) => setState({ status: 'loaded', eventTypes: data }),
      () => setState({ status: 'failed' }),
    )
  }, [attempt])

  const retry = () => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }

  return (
    <Stack>
      <Title>Каталог типов встреч</Title>
      {state.status === 'loading' ? (
        <Loader role="status" aria-label="Загрузка" />
      ) : state.status === 'failed' ? (
        <Alert color="red" title="Не удалось загрузить данные">
          <Button variant="light" color="red" onClick={retry}>
            Повторить
          </Button>
        </Alert>
      ) : state.eventTypes.length === 0 ? (
        <Text c="dimmed">Владелец пока не добавил типы встреч.</Text>
      ) : (
        state.eventTypes.map((eventType) => (
          <Card key={eventType.id} withBorder>
            <Group justify="space-between">
              <Title order={2} size="h4">
                {eventType.title}
              </Title>
              <Text c="dimmed">{eventType.durationMinutes} мин</Text>
            </Group>
            <Text>{eventType.description}</Text>
          </Card>
        ))
      )}
    </Stack>
  )
}
