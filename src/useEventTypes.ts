import { useEffect, useState } from 'react'
import { type EventType, listEventTypes } from './api'

type State = { status: 'loading' } | { status: 'failed' } | { status: 'loaded'; eventTypes: EventType[] }

/** Loads the event type list. `retry` shows the loader again; `reload` refreshes in place. */
export function useEventTypes() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    listEventTypes({ throwOnError: true }).then(
      ({ data }) => setState({ status: 'loaded', eventTypes: data }),
      () => setState({ status: 'failed' }),
    )
  }, [attempt])

  const reload = () => setAttempt((n) => n + 1)
  const retry = () => {
    setState({ status: 'loading' })
    reload()
  }

  return { state, retry, reload }
}
