import { Alert, Button, Card, Group, Loader, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router'
import { useEventTypes } from '../useEventTypes.ts'

export default function CatalogPage() {
  const { state, retry } = useEventTypes()

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
          <Card key={eventType.id} withBorder component={Link} to={`/book/${eventType.id}`}>
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
