import { Alert, Button, Card, Loader, NativeSelect, Stack, Text, Textarea, TextInput, Title } from '@mantine/core'
import { type ChangeEvent, type FormEvent, useState } from 'react'
import { type ApiError, createEventType } from '../api'
import { EventTypeSchema } from '../api/schemas.gen.ts'
import { useEventTypes } from '../useEventTypes.ts'
import { stringError } from '../validate.ts'

const schema = EventTypeSchema.properties
const duration = schema.durationMinutes
const durationOptions = Array.from(
  { length: (duration.maximum - duration.minimum) / duration.multipleOf + 1 },
  (_, i) => String(duration.minimum + i * duration.multipleOf),
)

const emptyForm = { id: '', title: '', description: '', durationMinutes: durationOptions[0] }
type Form = typeof emptyForm
type Errors = Partial<Record<keyof Form, string>>
type Status = { kind: 'idle' } | { kind: 'submitting' } | { kind: 'created' } | { kind: 'failed'; message: string }

export default function OwnerEventTypesPage() {
  const { state, retry, reload } = useEventTypes()
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Errors>({})
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const change = (key: keyof Form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [key]: event.currentTarget.value })
    setErrors({ ...errors, [key]: undefined })
    if (status.kind !== 'submitting') setStatus({ kind: 'idle' })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const body = { ...form, title: form.title.trim(), durationMinutes: Number(form.durationMinutes) }
    const found: Errors = {
      id: stringError(schema.id, body.id, 'Только строчные латинские буквы и цифры, слова через дефис'),
      title: stringError(schema.title, body.title, 'Без переносов строки'),
      description: stringError(schema.description, body.description),
    }
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    setStatus({ kind: 'submitting' })
    try {
      await createEventType({ body, throwOnError: true })
      setForm(emptyForm)
      setStatus({ kind: 'created' })
      reload()
    } catch (error) {
      const code = (error as Partial<ApiError> | undefined)?.code
      if (code === 'EVENT_TYPE_EXISTS') {
        setErrors({ id: 'Тип встречи с таким идентификатором уже есть' })
        setStatus({ kind: 'idle' })
      } else {
        const message =
          code === 'VALIDATION_ERROR' ? 'Проверьте поля и попробуйте ещё раз' : 'Не удалось отправить. Попробуйте ещё раз.'
        setStatus({ kind: 'failed', message })
      }
    }
  }

  return (
    <Stack>
      {state.status === 'loading' ? (
        <Loader role="status" aria-label="Загрузка" />
      ) : state.status === 'failed' ? (
        <Alert color="red" title="Не удалось загрузить данные">
          <Button variant="light" color="red" onClick={retry}>
            Повторить
          </Button>
        </Alert>
      ) : state.eventTypes.length === 0 ? (
        <Text c="dimmed">Типов встреч пока нет. Создайте первый в форме ниже.</Text>
      ) : (
        state.eventTypes.map((eventType) => (
          <Card key={eventType.id} withBorder>
            <Text fw={600}>{eventType.title}</Text>
            <Text c="dimmed">
              /book/{eventType.id} · {eventType.durationMinutes} мин
            </Text>
          </Card>
        ))
      )}

      <Title order={2}>Новый тип встречи</Title>
      {status.kind === 'created' && <Alert color="green" title="Тип встречи создан" />}
      {status.kind === 'failed' && <Alert color="red" title={status.message} />}
      <form onSubmit={submit} noValidate>
        <Stack>
          <TextInput label="Идентификатор" description="Часть ссылки: /book/<идентификатор>" value={form.id} onChange={change('id')} error={errors.id} />
          <TextInput label="Название" value={form.title} onChange={change('title')} error={errors.title} />
          <Textarea label="Описание" value={form.description} onChange={change('description')} error={errors.description} />
          <NativeSelect
            label="Длительность, мин"
            data={durationOptions}
            value={form.durationMinutes}
            onChange={change('durationMinutes')}
          />
          <Button type="submit" disabled={status.kind === 'submitting'}>
            Создать
          </Button>
        </Stack>
      </form>
    </Stack>
  )
}
