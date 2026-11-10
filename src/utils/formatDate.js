export function formatEventDate(date) {
  if (!date) return 'Fecha no informada'

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`)).replace('.', '')
}
