/** Date and time formats of the UI, in the browser's time zone. */
export const time = new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' })
/** «18 ноября» */
export const dayMonth = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' })
/** «ср, 18 нояб.» */
export const weekdayDay = new Intl.DateTimeFormat('ru', { weekday: 'short', day: 'numeric', month: 'short' })
